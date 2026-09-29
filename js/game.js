(function () {
  "use strict";

  const CF = window.CardForge;
  const HERO_PORTRAIT = "assets/hero/novice-swordsman.png";
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const BOSS_ACTION_DELAY = 1000;
  const DIALOGUE_EXTRA_DURATION = 3000;
  const BOSS_DIALOGUE_DURATION = 4200 + DIALOGUE_EXTRA_DURATION;
  const PLAYER_EMOTE_DURATION = 2600;
  const EMOTE_REPLY_DELAY = 900;
  const EMOTE_COOLDOWN = 2500;
  const BOSS_DIALOGUE_SEQUENCE_GAP = 1300 + DIALOGUE_EXTRA_DURATION;
  const BOSS_DEFEAT_DIALOGUE_DELAY = 1900 + DIALOGUE_EXTRA_DURATION;
  const INITIAL_BATTLE_HAND = 10;
  // 冒险首领（handRefill）每个行动回合把手牌补到这个数量。
  const BOSS_HAND_SIZE = 10;
  // 战场中央的敌方行动播报：敌方回合内一直保留，轮到玩家后再停留 BATTLE_NOTICE_DURATION 毫秒；最多同时显示 BATTLE_NOTICE_LIMIT 条。
  const BATTLE_NOTICE_DURATION = 8000;
  const BATTLE_NOTICE_LIMIT = 8;
  const emptyBoard = () => ({ front: [null, null, null, null], back: [null, null, null, null] });
  const shuffle = cards => {
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const Rules = {
    isLaneOpen(board, column) {
      return !board.front[column] && !board.back[column];
    },
    openLanes(board) {
      return [0, 1, 2, 3].filter(column => this.isLaneOpen(board, column));
    },
    canTargetBack(board, column, keywords = []) {
      return keywords.includes("狙击") || !board.front[column];
    },
    // 传入 column（攻击者所在路线）时按随从的“分路”规则判断：只能攻击同一路的敌人，
    // 先前排、后排，整路清空后才能攻击英雄；不传 column 时（英雄武器）沿用全场规则。
    canAttackHero(board, column) {
      if (Number.isInteger(column)) return this.isLaneOpen(board, column);
      return this.openLanes(board).length > 0;
    },
    legalUnitTargets(attacker, board, column) {
      if (Number.isInteger(column)) {
        const result = [];
        if (board.front[column]) result.push({ row: "front", column, unit: board.front[column] });
        // 狙击随从可以越过本路前排攻击本路后排，但仍不能攻击其他路线。
        if (board.back[column] && (!board.front[column] || (attacker.keywords || []).includes("狙击"))) result.push({ row: "back", column, unit: board.back[column] });
        return result;
      }
      const result = [];
      board.front.forEach((unit, column) => { if (unit) result.push({ row: "front", column, unit }); });
      board.back.forEach((unit, column) => {
        if (unit && this.canTargetBack(board, column, attacker.keywords)) result.push({ row: "back", column, unit });
      });
      return result;
    }
  };

  class Battle {
    constructor(enemy, callbacks = {}) {
      this.enemyConfig = enemy;
      this.callbacks = callbacks;
      const save = CF.SaveSystem.data;
      const run = CF.Adventure.current();
      const availablePlayerDeck = CF.SaveSystem.availableDeck();
      const heroProfile = CF.currentHero?.() || { name: "罗兰·维克", portrait: HERO_PORTRAIT };
      this.state = {
        phase: "player",
        busy: false,
        ended: false,
        round: 1,
        enemyTurns: 0,
        selected: null,
        usedCards: [],
        enemyUnitsKilled: 0,
        cardsPlayed: { player: 0, enemy: 0 },
        log: [],
        battleNotices: [],
        announcedSkills: new Set(),
        noticeSeq: 0,
        bossDialogueNotice: null,
        bossDialogueSeq: 0,
        bossDialogueShown: {},
        rescueEpilogue: null,
        emoteMenuOpen: false,
        playerEmoteNotice: null,
        emoteSeq: 0,
        emoteReadyAt: 0,
        player: {
          name: heroProfile.name, icon: "🧑‍⚔️", portrait: heroProfile.portrait,
          hp: enemy.mode === "trial" ? save.hero.maxHealth : (run?.hp ?? save.hero.maxHealth),
          maxHp: enemy.mode === "trial" ? save.hero.maxHealth : (run?.maxHp ?? save.hero.maxHealth),
          mana: save.hero.maxMana, maxMana: save.hero.maxMana, board: emptyBoard(), hand: [], weapon: null,
          deck: shuffle(CF.makeDeck(availablePlayerDeck, save.cardProgress, id => CF.Restaurant?.cardBondBonus(id) || 0)), fatigue: 0, skillCooldown: 0
        },
        enemy: {
          id: enemy.id, name: enemy.name, icon: enemy.icon, portrait: enemy.portrait || "", battlefield: enemy.battlefield || "forest",
          hp: enemy.health, maxHp: enemy.health,
          mana: enemy.mana, maxMana: enemy.mana, board: emptyBoard(), hand: [], weapon: null,
          deck: this.buildEnemyDeck(enemy), fatigue: 0
        }
      };
      if (enemy.mode !== "trial") this.equipHeroWeapon();
      this.draw("player", Math.min(INITIAL_BATTLE_HAND, this.state.player.deck.length));
      if (!enemy.noCards) this.draw("enemy", enemy.openingHand || 4);
      if (enemy.handRefill && !enemy.noCards) this.refillEnemyHand();
      if (enemy.weapon) this.equipEnemyWeapon(enemy.weapon);
      CF.Trials?.configureBattle(this);
      this.addLog(`遭遇${enemy.name}「${enemy.title}」。击穿任意一路即可攻击敌方英雄。`, "system");
      if (enemy.dialogue?.intro) {
        this.state.bossDialogueShown.intro = true;
        this.bossSpeak(enemy.dialogue.intro, {}, false);
      }
      this.render();
    }

    buildEnemyDeck(enemy) {
      const progress = enemy.cardProgress || Object.fromEntries([...new Set(enemy.deck || [])].map(id => [id, { level: enemy.enemyCardLevel || 1 }]));
      return shuffle(CF.makeDeck(enemy.deck || [], progress));
    }

    // 首领的底气：手牌补到10张；牌库不够时把整副牌组重新洗入牌库底部，不会因此受到疲劳伤害。
    refillEnemyHand() {
      const enemy = this.state.enemy;
      const missing = BOSS_HAND_SIZE - enemy.hand.length;
      if (missing <= 0) return;
      if (enemy.deck.length < missing && this.enemyConfig.deck?.length) {
        enemy.deck = [...this.buildEnemyDeck(this.enemyConfig), ...enemy.deck];
        this.addLog(`${this.enemyConfig.name}重新洗入牌组。`, "enemy");
      }
      this.draw("enemy", Math.min(missing, enemy.deck.length));
    }

    // 首领随身武器：与英雄武器相同，不消耗耐久，每个行动回合都能攻击一次。
    equipEnemyWeapon(spec) {
      const card = CF.getCard(spec.id, { level: spec.level || 1 });
      if (!card || card.type !== "weapon") return false;
      this.state.enemy.weapon = this.weaponFromCard(card, true);
      this.addLog(`${this.enemyConfig.name}手持${card.name}（${card.attack}攻），每回合都能攻击一次。`, "enemy");
      return true;
    }

    // 敌方随从的分路站位：先堵住玩家随从能打脸的空路线（玩家该路火力越强越优先），再占玩家空着的路线施压；
    // 远程与治疗随从放在有己方前排保护的后排，守卫和高生命随从顶在玩家火力最强的前排。
    aiChooseSlot(unit = {}) {
      const own = this.state.enemy.board;
      const foe = this.state.player.board;
      const keywords = unit.keywords || [];
      const backline = unit.role === "healer" || unit.combatStyle === "ranged" || keywords.includes("远程");
      const tank = keywords.includes("守卫") || (unit.health || 0) >= 6;
      const laneAttack = column => [foe.front[column], foe.back[column]]
        .filter(other => other && other.role !== "healer").reduce((sum, other) => sum + this.currentAttack(other), 0);
      let best = null;
      ["front", "back"].forEach(row => own[row].forEach((slot, column) => {
        if (slot) return;
        const threat = laneAttack(column);
        let score = 0;
        if (Rules.isLaneOpen(own, column)) score += 100 + threat * 10;
        if (Rules.isLaneOpen(foe, column)) score += 25;
        if (row === "front") score += backline ? -30 : 20 + (tank ? threat * 3 : 0);
        else score += backline ? (own.front[column] ? 40 : 10) : -20;
        score -= column * 0.01;
        if (!best || score > best.score) best = { row, column, score };
      }));
      return best;
    }

    currentAttack(unit) { return unit.attack + (unit.tempAttack || 0); }
    isRanged(unit) { return Boolean(unit) && (unit.combatStyle === "ranged" || Boolean(unit.keywords?.includes("远程"))); }
    effectiveCost(card, side = "player") {
      if (!card) return Infinity;
      const actor = this.state[side];
      const opponent = this.state[side === "player" ? "enemy" : "player"];
      const unitCount = board => [...board.front, ...board.back].filter(Boolean).length;
      let discount = 0;
      if (card.discount === "allied_units") discount = unitCount(actor.board);
      if (card.discount === "enemy_units") discount = unitCount(opponent.board);
      if (card.discount === "missing_health") discount = Math.floor(Math.max(0, actor.maxHp - actor.hp) / 5);
      if (card.discount === "cards_played") discount = Math.floor((this.state.cardsPlayed?.[side] || 0) / 2);
      return Math.max(1, card.cost - discount);
    }
    recordCardPlayed(side, card) {
      this.state.cardsPlayed[side] = (this.state.cardsPlayed[side] || 0) + 1;
      if (side === "enemy") this.announceEnemyCard(card);
      if (side === "player") this.state.usedCards.push(card.id);
    }
    playerSkill() {
      const hero = CF.SaveSystem.data.hero;
      const id = hero.equippedSkill || "slash";
      const config = CF.HERO_SKILLS?.[id] || {
        id: "slash", icon: "⚔️", name: "斩击", cost: 1, target: "enemy-front",
        effect: "front_strike", amount: [2, 3, 4],
        playerDescription: level => `对一个敌方前排随从造成${level + 1}点伤害。`
      };
      const progress = CF.SaveSystem.heroSkillProgress(id) || { level: 1, xp: 0 };
      return { ...config, level: Math.max(1, Math.min(3, progress.level || 1)) };
    }
    skillValue(skill, key, level = skill?.level || 1) {
      const value = skill?.[key];
      if (!Array.isArray(value)) return Number(value) || 0;
      return Number(value[Math.max(0, Math.min(2, Number(level) - 1))] ?? value[value.length - 1]) || 0;
    }
    addLog(message, kind = "system") {
      this.state.log.unshift({ message, kind, round: this.state.round, enemyTurn: this.state.enemyTurns });
      this.state.log = this.state.log.slice(0, 100);
      if (kind === "boss") this.announceBossSkill(message);
    }
    // 战场中央只简要播报敌方做了什么：打出了哪张牌、发动了哪个技能；伤害与结算细节只记入右侧战斗日志。
    announceEnemyCard(card) {
      const verb = card.type === "unit" ? "打出随从" : card.type === "weapon" ? "装备武器" : "施放法术";
      this.showBattleNotice(`${this.enemyConfig.name} ${verb}「${card.name}」`, "enemy");
    }
    // 技能日志里取出技能名，同一回合同一技能只播报一次。
    announceBossSkill(message) {
      const name = message.match(/(?:发动(?:Lv\d+)?|触发|通过)「([^」]+)」/)?.[1];
      if (!name) return;
      const key = `${this.state.enemyTurns}:${name}`;
      if (this.state.announcedSkills.has(key)) return;
      this.state.announcedSkills.add(key);
      this.showBattleNotice(`${this.enemyConfig.name} 发动「${name}」`, "boss");
    }
    showBattleNotice(message, kind) {
      const notice = { id: ++this.state.noticeSeq, message, kind };
      this.state.battleNotices = [...this.state.battleNotices, notice].slice(-BATTLE_NOTICE_LIMIT);
      // 玩家回合中出现的播报（例如敌方随从被动）直接开始倒计时。
      if (this.state.phase === "player") this.expireBattleNotices();
    }
    // 让当前已有的播报在 BATTLE_NOTICE_DURATION 后消失。
    expireBattleNotices() {
      const lastId = this.state.noticeSeq;
      setTimeout(() => {
        const before = this.state.battleNotices.length;
        this.state.battleNotices = this.state.battleNotices.filter(item => item.id > lastId);
        if (before !== this.state.battleNotices.length && !this.state.ended) this.render();
      }, BATTLE_NOTICE_DURATION);
    }
    bossSpeak(text, options = {}, renderNow = true) {
      if (!text) return;
      const id = ++this.state.bossDialogueSeq;
      const notice = {
        id,
        text,
        name: options.name || this.enemyConfig.name,
        title: options.title || this.enemyConfig.title,
        portrait: options.portrait || this.enemyConfig.portrait || this.state.enemy.portrait
      };
      this.state.bossDialogueNotice = notice;
      this.state.log.unshift({ message: `${notice.name}：“${text}”`, kind: "dialogue", round: this.state.round, enemyTurn: this.state.enemyTurns });
      this.state.log = this.state.log.slice(0, 100);
      setTimeout(() => {
        if (this.state.bossDialogueNotice?.id === id) this.state.bossDialogueNotice = null;
        if (!this.state.ended) this.render();
      }, BOSS_DIALOGUE_DURATION);
      if (renderNow) this.render();
    }
    bossTurnDialogue() {
      const turns = this.enemyConfig.dialogue?.turns || [];
      const index = this.state.enemyTurns - 1;
      if (!turns[index] || this.state.bossDialogueShown[`turn-${index}`]) return;
      this.state.bossDialogueShown[`turn-${index}`] = true;
      this.bossSpeak(turns[index]);
    }
    bossHealthDialogue() {
      const dialogue = this.enemyConfig.dialogue;
      if (!dialogue || this.state.enemy.hp <= 0 || this.state.rescueEpilogue) return;
      const ratio = this.state.enemy.hp / Math.max(1, this.state.enemy.maxHp);
      if (ratio <= .25 && dialogue.desperate && !this.state.bossDialogueShown.desperate) {
        this.state.bossDialogueShown.desperate = true;
        this.bossSpeak(dialogue.desperate);
      } else if (ratio <= .6 && dialogue.wounded && !this.state.bossDialogueShown.wounded) {
        this.state.bossDialogueShown.wounded = true;
        this.bossSpeak(dialogue.wounded);
      }
    }
    bossDialogueHTML() {
      const notice = this.state.bossDialogueNotice;
      if (!notice) return "";
      return `<aside class="boss-dialogue-frame" aria-live="polite">${notice.portrait ? `<img src="${notice.portrait}" alt="${notice.name}">` : ""}<div><small>${notice.title}</small><strong>${notice.name}</strong><p>“${notice.text}”</p></div></aside>`;
    }
    clickPlayerPortrait() {
      const selected = this.state.selected;
      const healsHero = selected?.type === "healer" || (selected?.type === "card" && ["heal", "honey_salve", "slime_mend"].includes(this.selectedCard()?.effect));
      if (healsHero) return this.clickHero("player");
      if (selected || this.state.ended) return;
      this.state.emoteMenuOpen = !this.state.emoteMenuOpen;
      this.render();
    }
    closeEmoteMenu() {
      if (!this.state.emoteMenuOpen) return;
      this.state.emoteMenuOpen = false;
      this.render();
    }
    playerEmote(emoteId) {
      const Emotes = CF.Emotes;
      const text = Emotes?.playerLine(emoteId, Math.random, CF.currentHero?.()?.id);
      this.state.emoteMenuOpen = false;
      if (!text || this.state.ended) return this.render();
      this.sound("emote");
      const now = Date.now();
      if (now < this.state.emoteReadyAt) return this.render();
      this.state.emoteReadyAt = now + EMOTE_COOLDOWN;
      const id = ++this.state.emoteSeq;
      this.state.playerEmoteNotice = { id, text };
      this.state.log.unshift({ message: `${this.state.player.name}：“${text}”`, kind: "dialogue", round: this.state.round, enemyTurn: this.state.enemyTurns });
      this.state.log = this.state.log.slice(0, 100);
      setTimeout(() => {
        if (this.state.playerEmoteNotice?.id === id) this.state.playerEmoteNotice = null;
        if (!this.state.ended) this.render();
      }, PLAYER_EMOTE_DURATION);
      const rescue = this.state.rescueEpilogue;
      const hero = CF.currentHero?.();
      const reply = Emotes.replyFor(this.enemyConfig, emoteId, { rescueActive: !!rescue, heroId: hero?.id, heroName: hero?.name });
      if (reply) {
        setTimeout(() => {
          if (this.state.ended) return;
          const officers = (rescue?.config?.officers || []).slice(1);
          const speaker = rescue && officers.length ? officers[Math.floor(Math.random() * officers.length)] : {};
          this.bossSpeak(reply, speaker);
        }, EMOTE_REPLY_DELAY);
      }
      this.render();
    }
    emoteHTML() {
      const s = this.state;
      const menu = s.emoteMenuOpen && CF.Emotes
        ? `<div class="emote-menu" role="menu" aria-label="表情">${CF.Emotes.list.map(emote => `<button class="emote-option emote-${emote.id}" role="menuitem" data-action="emote" data-emote="${emote.id}"><span aria-hidden="true">${emote.icon}</span>${emote.label}</button>`).join("")}</div>`
        : "";
      const bubble = s.playerEmoteNotice ? `<div class="player-emote-bubble" aria-live="polite">${s.playerEmoteNotice.text}</div>` : "";
      return menu + bubble;
    }
    toast(message, kind = "") { this.callbacks.onToast?.(message, kind); }
    sound(name) { CF.SoundFX?.play(name); }
    render() { if (!this.abandoned) this.callbacks.onRender?.(this); }
    // 玩家中途返回主菜单：停止渲染并忽略之后到期的胜负回调。
    abandon() { this.abandoned = true; this.state.ended = true; this.state.selected = null; }

    draw(side, count = 1) {
      const actor = this.state[side];
      const drawn = [];
      for (let i = 0; i < count; i += 1) {
        if (!actor.deck.length) {
          actor.fatigue += 1;
          actor.hp -= actor.fatigue;
          this.addLog(`${side === "player" ? "你" : this.enemyConfig.name}牌库耗尽，受到${actor.fatigue}点疲劳伤害，剩余${Math.max(0, actor.hp)}点生命。`, side);
          this.checkOutcome();
          continue;
        }
        const card = actor.deck.pop();
        if (actor.hand.length >= 10) this.addLog(`${side === "player" ? "你的" : `${this.enemyConfig.name}的`}手牌已满，${side === "player" ? card.name : "抽到的牌"}被弃掉。`, side);
        else { actor.hand.push(card); drawn.push(card); }
      }
      if (drawn.length) {
        const detail = side === "player" ? `：${drawn.map(card => card.name).join("、")}` : "";
        this.addLog(`${side === "player" ? "你" : this.enemyConfig.name}抽取${drawn.length}张牌${detail}（手牌${actor.hand.length}/10，牌库${actor.deck.length}）。`, side);
      }
    }

    selectCard(index) {
      if (!this.canPlayerAct()) return;
      const card = this.state.player.hand[index];
      if (!card) return;
      if (this.effectiveCost(card, "player") > this.state.player.mana) return this.toast("法力不足。", "bad");
      this.sound("cardPick");
      if (card.type === "weapon") return this.equipWeapon("player", index);
      if (card.type === "unit" && this.allSlotsFull(this.state.player.board)) return this.toast("战场已经没有空位。", "bad");
      if ((card.effect === "front_aoe" || card.frontOnly) && !this.state.enemy.board.front.some(Boolean)) return this.toast("敌方前排没有目标。", "bad");
      if (["damage", "chain_damage", "execute_draw", "poison", "row_blast", "banish", "bear_paw", "bee_swarm", "earth_tremor", "viscous_prison", "forest_engulfment"].includes(card.effect) && ![...this.state.enemy.board.front, ...this.state.enemy.board.back].some(Boolean)) return this.toast("敌方战场上没有目标。", "bad");
      if (["summon_recruits", "goblin_tide", "queen_final", "bear_ambush", "bear_god", "slime_division", "verdant_flood", "all_returns_to_gel"].includes(card.effect) && this.allSlotsFull(this.state.player.board)) return this.toast("战场已经没有空位。", "bad");
      if (card.effect === "rescue" && ![...this.state.player.board.front, ...this.state.player.board.back].some(unit => unit && CF.CARD_LIBRARY[unit.cardId])) return this.toast("没有可以撤回的友方随从。", "bad");
      if (["army_buff", "wheat_barrier", "autumn_rally", "spore_assimilation", "regeneration_domain"].includes(card.effect) && ![...this.state.player.board.front, ...this.state.player.board.back].some(Boolean)) return this.toast("我方战场上没有随从。", "bad");
      this.state.selected = { type: "card", index, cardId: card.instanceId };
      if (["summon_recruits", "group_heal", "draw_cards", "goblin_tide", "army_buff", "enemy_aoe", "treasury", "queen_final", "wheat_barrier", "bee_swarm", "harvest_feast", "bear_ambush", "earth_tremor", "autumn_rally", "bear_god", "slime_division", "moonpool_surge", "spore_assimilation", "forest_engulfment", "regeneration_domain", "verdant_flood", "all_returns_to_gel"].includes(card.effect)) return this.castPlayerSpell("player", "auto", -1);
      this.render();
    }

    equipWeapon(side, index) {
      const actor = this.state[side];
      const card = actor.hand[index];
      const cost = this.effectiveCost(card, side);
      if (!card || card.type !== "weapon" || cost > actor.mana) return false;
      const replaced = actor.weapon;
      actor.mana -= cost;
      actor.hand.splice(index, 1);
      actor.weapon = this.weaponFromCard(card);
      this.recordCardPlayed(side, card);
      this.state.selected = null;
      this.sound("summon");
      this.addLog(`${side === "player" ? "你" : this.enemyConfig.name}装备${card.name}（${cost}费，${card.attack}攻/${card.durability}耐久）${replaced ? `，替换了${replaced.name}` : ""}；剩余${actor.mana}/${actor.maxMana}法力。`, side);
      this.render();
      return true;
    }

    weaponFromCard(card, permanent = false) {
      return {
        cardId: card.id, name: card.name, image: card.image, icon: card.icon,
        attack: card.attack, durability: card.durability, maxDurability: card.durability,
        combatStyle: card.combatStyle, keywords: [...card.keywords], effect: card.weaponEffect,
        level: card.level, ready: true, strikes: 0, permanent
      };
    }

    // 英雄武器：冒险与竞技场开战时自动装备英雄档案中选择的武器。
    // 不占手牌、不耗法力、不消耗耐久，每回合都可以攻击一次（统领试炼使用各自的固定规则，不带入）。
    equipHeroWeapon() {
      const id = CF.SaveSystem.equippedWeapon?.();
      if (!id) return false;
      const card = CF.getCard(id, CF.SaveSystem.data.cardProgress?.[id]);
      if (!card || card.type !== "weapon") return false;
      this.state.player.weapon = this.weaponFromCard(card, true);
      return true;
    }

    selectWeaponAttack() {
      if (!this.canPlayerAct()) return;
      const weapon = this.state.player.weapon;
      if (!weapon) return this.toast("当前没有装备武器。", "bad");
      if (!weapon.ready) return this.toast("本回合已经使用过武器。", "bad");
      this.state.selected = { type: "weapon", side: "player", cardId: weapon.cardId };
      this.render();
    }

    selectSkill() {
      if (!this.canPlayerAct()) return;
      const player = this.state.player;
      const skill = this.playerSkill();
      const friendlyUnits = [...player.board.front, ...player.board.back].filter(Boolean);
      const enemyUnits = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(Boolean);
      if (player.mana < skill.cost) return this.toast(`${skill.name}需要${skill.cost}点法力。`, "bad");
      if (player.skillCooldown > 0) return this.toast(`${skill.name}本回合已经使用。`, "bad");
      if (skill.target === "enemy-front" && !this.state.enemy.board.front.some(Boolean)) return this.toast("敌方前排没有可用目标。", "bad");
      if (skill.target === "friendly-unit" && !friendlyUnits.length) return this.toast("我方战场上没有可强化的随从。", "bad");
      if (skill.effect === "summon" && this.allSlotsFull(player.board)) return this.toast("我方战场已经没有空位。", "bad");
      if (["army_buff", "heal_all"].includes(skill.effect) && !friendlyUnits.length && !this.skillValue(skill, "heal")) return this.toast("我方战场上没有可强化的随从。", "bad");
      if (skill.effect === "enemy_aoe" && !enemyUnits.length && !this.skillValue(skill, "heroDamage")) return this.toast("敌方战场上没有随从。", "bad");
      if (skill.effect === "front_aoe" && !this.state.enemy.board.front.some(Boolean) && !this.skillValue(skill, "heroDamage")) return this.toast("敌方前排没有目标。", "bad");
      if (skill.effect === "hero_heal" && player.hp >= player.maxHp && !this.skillValue(skill, "draw")) return this.toast("英雄生命值已经全满。", "bad");
      if (skill.effect === "draw" && player.hp <= this.skillValue(skill, "selfDamage")) return this.toast("生命值过低，无法发动这个技能。", "bad");
      if (skill.target === "enemy-any" && !enemyUnits.length) return this.toast("敌方战场上没有随从。", "bad");
      if (skill.effect === "blood_frenzy" && player.hp <= this.skillValue(skill, "selfDamage")) return this.toast("生命值过低，无法发动这个技能。", "bad");
      if (skill.effect === "dawn_revival" && player.hp >= player.maxHp && !friendlyUnits.some(unit => unit.health < unit.maxHealth)) return this.toast("我方英雄与随从都已是满生命。", "bad");
      if (["forest_ambush", "sapling"].includes(skill.effect) && this.allSlotsFull(player.board)) return this.toast("我方战场已经没有空位。", "bad");
      if (skill.effect === "aegis_wall" && !player.board.front.some(Boolean) && this.allSlotsFull(player.board)) return this.toast("我方战场已经没有空位。", "bad");
      this.state.selected = { type: "skill", skillId: skill.id };
      if (skill.target === "auto") return this.castSkill("auto", -1);
      this.render();
    }

    clickSlot(side, row, column) {
      if (!this.canPlayerAct()) return;
      const unit = this.state[side].board[row][column];
      if (unit) return this.clickUnit(side, row, column);
      const selected = this.state.selected;
      if (selected?.type !== "card") return;
      const card = this.selectedCard();
      if (!card || card.type !== "unit" || side !== "player") return;
      this.summon("player", selected.index, row, column);
    }

    clickUnit(side, row, column) {
      if (!this.canPlayerAct()) return;
      const unit = this.state[side].board[row][column];
      if (!unit) return;
      const selected = this.state.selected;
      if (side === "player") {
        if (selected?.type === "skill" && this.playerSkill().target === "friendly-unit") return this.castSkill(row, column);
        if (selected?.type === "healer") return this.healWithUnit(selected.row, selected.column, side, row, column);
        if (selected?.type === "card") {
          const card = this.selectedCard();
          if (["heal", "buff", "swap_stats", "fortify", "rescue", "honey_salve", "growth_blessing", "slime_mend", "gel_barrier"].includes(card?.effect)) return this.castPlayerSpell(side, row, column);
        }
        if (unit.role === "healer") {
          if (unit.healUsed) return this.toast("治疗随从本回合已经使用过治疗。", "bad");
          this.state.selected = { type: "healer", side, row, column, unitId: unit.uid };
          this.render();
          return;
        }
        if (!unit.ready) return this.toast("这个随从本回合不能攻击。", "bad");
        this.state.selected = { type: "attacker", side, row, column, unitId: unit.uid };
        this.render();
        return;
      }
      if (selected?.type === "attacker") return this.playerAttack(row, column);
      if (selected?.type === "weapon") return this.playerWeaponAttack(row, column);
      if (selected?.type === "skill") return this.castSkill(row, column);
      if (selected?.type === "card") return this.castPlayerSpell(side, row, column);
    }

    clickHero(side) {
      if (!this.canPlayerAct()) return;
      const selected = this.state.selected;
      if (side === "player" && selected?.type === "healer") {
        return this.healWithUnit(selected.row, selected.column, side, "hero", -1);
      }
      if (side === "player" && selected?.type === "card" && ["heal", "honey_salve", "slime_mend"].includes(this.selectedCard()?.effect)) {
        return this.castPlayerSpell("player", "hero", -1);
      }
      if (side === "enemy" && selected?.type === "attacker") return this.playerAttackHero();
      if (side === "enemy" && selected?.type === "weapon") return this.playerWeaponAttackHero();
      if (side === "enemy" && selected?.type === "card" && CF.Trials?.isPuzzleFireFlask(this, this.selectedCard())) return this.castTrialFireFlask();
    }

    castTrialFireFlask() {
      const selected = this.state.selected;
      const card = this.selectedCard();
      if (!CF.Trials?.isPuzzleFireFlask(this, card)) return;
      this.spendCard(selected.index);
      this.state.selected = null;
      this.sound("fire");
      this.addLog(`你把火焰瓶砸向盾阵中央，烈焰没有伤到罗德里克，却令八面盾牌同时失去秩序。斩首窗口已经出现。`, "player");
      this.render();
    }

    selectedCard() {
      const selected = this.state.selected;
      if (selected?.type !== "card") return null;
      const card = this.state.player.hand[selected.index];
      return card?.instanceId === selected.cardId ? card : null;
    }

    healWithUnit(sourceRow, sourceColumn, targetSide, targetRow, targetColumn) {
      const healer = this.state.player.board[sourceRow]?.[sourceColumn];
      if (!healer || healer.role !== "healer" || healer.healUsed) return;
      if (targetSide !== "player") return;
      const target = targetRow === "hero" ? this.state.player : this.state.player.board[targetRow]?.[targetColumn];
      if (!target) return;
      const amount = this.currentAttack(healer);
      const before = targetRow === "hero" ? target.hp : target.health;
      if (targetRow === "hero") target.hp = Math.min(target.maxHp, target.hp + amount);
      else target.health = Math.min(target.maxHealth, target.health + amount);
      const after = targetRow === "hero" ? target.hp : target.health;
      healer.healUsed = true;
      this.state.selected = null;
      this.sound("heal");
      this.addLog(`${healer.name}为${targetRow === "hero" ? this.state.player.name : target.name}恢复${after - before}点生命（治疗力${amount}），本回合不能再次治疗。`, "player");
      this.render();
    }

    summon(side, handIndex, row, column) {
      const actor = this.state[side];
      const card = actor.hand[handIndex];
      const cost = this.effectiveCost(card, side);
      if (!card || card.type !== "unit" || actor.mana < cost || actor.board[row][column]) return false;
      if (side === "player" && CF.SaveSystem.isCardInjured(card.id)) return this.toast(`${card.name}仍在伤员名单中，需要先在队伍营地救治。`, "bad");
      actor.mana -= cost;
      actor.hand.splice(handIndex, 1);
      const unit = {
        uid: `${side}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cardId: card.id, name: card.name, icon: card.icon, image: card.image, portrait: card.portrait,
        attack: card.attack, health: card.health, maxHealth: card.health,
        level: card.level, bond: card.bond || 0, keywords: [...card.keywords], combatStyle: card.combatStyle, role: card.role || "",
        ready: card.role !== "healer" && card.keywords.includes("突袭"), justSummoned: true, tempAttack: 0, healUsed: false
      };
      if (row === "front" && unit.keywords.includes("守卫")) { unit.health += 2; unit.maxHealth += 2; }
      if (row === "back" && unit.keywords.includes("远程")) unit.attack += 1;
      // 武器品级：玩家随从读取存档里的装备；敌方随从按阵营固定配置——
      // 冒险模式（魔族阵营）统一白色T1，竞技场/试炼（人类阵营）统一绿色T2。
      if (side === "player") unit.weaponTier = CF.SaveSystem.data.cardEquipment?.[card.id]?.weapon || 0;
      else unit.weaponTier = (this.enemyConfig?.mode === "arena" || this.enemyConfig?.mode === "trial") ? 2 : 1;
      if (unit.weaponTier) unit.attack += unit.weaponTier;
      // 粮食不足时饿着肚子出战：本场我方随从攻击-1（最低为0）。
      if (side === "player" && this.state.hungry) unit.attack = Math.max(0, unit.attack - 1);
      actor.board[row][column] = unit;
      this.sound("summon");
      this.recordCardPlayed(side, card);
      const keywordText = unit.keywords.length ? `，关键词：${unit.keywords.join("、")}` : "";
      this.addLog(`${side === "player" ? "你" : this.enemyConfig.name}打出${card.name}（${cost}费，剩余${actor.mana}/${actor.maxMana}法力），部署到第${column + 1}路${row === "front" ? "前排" : "后排"}，当前${unit.attack}攻/${unit.health}血${keywordText}。`, side);
      this.resolveUnitDeployEffect(side, unit);
      if (side === "player") this.state.selected = null;
      this.render();
      return true;
    }

    resolveUnitDeployEffect(side, unit) {
      const actor = this.state[side];
      const opponentSide = side === "player" ? "enemy" : "player";
      if (unit.cardId === "pebble_scout") {
        this.draw(side, 1);
        this.addLog(`${unit.name}侦察成功：${side === "player" ? "你" : this.enemyConfig.name}抽1张牌。`, side);
      } else if (unit.cardId === "spore_alchemist") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 3);
        this.addLog(`${unit.name}调制荧光药剂，为${side === "player" ? "英雄" : this.enemyConfig.name}恢复${actor.hp - before}点生命。`, side);
      } else if (unit.cardId === "war_drum_ogre") {
        const allies = [...actor.board.front, ...actor.board.back].filter(ally => ally && ally.uid !== unit.uid);
        allies.forEach(ally => { ally.attack += 2; });
        this.addLog(`${unit.name}擂响战鼓，其他${allies.length}个友方随从永久获得+2攻击。`, side);
      } else if (unit.cardId === "emerald_drake_commander") {
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state[opponentSide].board[targetRow].forEach((target, targetColumn) => {
          if (target) targets.push({ row: targetRow, column: targetColumn });
        }));
        targets.forEach(target => this.damageUnit(opponentSide, target.row, target.column, 3, `${unit.name}的龙息`, false, side));
        this.addLog(`${unit.name}喷吐龙息，命中全部${targets.length}个敌方随从。`, side);
        this.cleanDead();
        this.checkOutcome();
      } else if (unit.cardId === "wheat_cub") {
        this.draw(side, 1);
        this.addLog(`${unit.name}从麦垛中找到补给，${side === "player" ? "你" : this.enemyConfig.name}抽1张牌。`, side);
      } else if (unit.cardId === "honey_slinger") {
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state[opponentSide].board[targetRow].forEach((target, targetColumn) => {
          if (target) targets.push({ row: targetRow, column: targetColumn, unit: target });
        }));
        targets.sort((a, b) => a.unit.health - b.unit.health);
        if (targets[0]) {
          this.damageUnit(opponentSide, targets[0].row, targets[0].column, 1, `${unit.name}的蜜罐`, false, side);
          this.addLog(`${unit.name}投出蜜罐，对${targets[0].unit.name}造成1点伤害。`, side);
          this.cleanDead(); this.checkOutcome();
        }
      } else if (unit.cardId === "straw_mage") {
        const location = ["front", "back"].flatMap(targetRow => actor.board[targetRow].map((ally, column) => ({ row: targetRow, column, ally }))).find(item => item.ally?.uid === unit.uid);
        const allies = location ? actor.board[location.row].filter((ally, column) => ally && ally.uid !== unit.uid && Math.abs(column - location.column) === 1) : [];
        allies.forEach(ally => { ally.attack += 1; ally.health += 1; ally.maxHealth += 1; });
        this.addLog(`${unit.name}唤醒土壤，使${allies.length}个相邻友方随从获得+1/+1。`, side);
      } else if (unit.cardId === "hive_priest") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 5);
        this.addLog(`${unit.name}献上蜂蜜祝福，为${side === "player" ? "英雄" : this.enemyConfig.name}恢复${actor.hp - before}点生命。`, side);
      } else if (unit.cardId === "harvest_war_bear") {
        const allies = [...actor.board.front, ...actor.board.back].filter(ally => ally && ally.uid !== unit.uid);
        allies.forEach(ally => { ally.attack += 1; ally.health += 1; ally.maxHealth += 1; });
        this.addLog(`${unit.name}举起丰收战旗，其他${allies.length}个友方随从获得+1/+1。`, side);
      } else if (unit.cardId === "golden_sheaf_king") {
        const bearIds = new Set(CF.CHAPTER_THREE_UNIT_CARD_IDS || []);
        const allies = [...actor.board.front, ...actor.board.back].filter(ally => ally && ally.uid !== unit.uid && bearIds.has(ally.cardId));
        allies.forEach(ally => { ally.attack += 2; ally.health += 2; ally.maxHealth += 2; });
        let summoned = 0;
        if (side === "player") [0, 1].forEach(() => { if (this.summonPlayerToken("田园熊卫", 4, 5, "assets/cards/chapter3/wheat-cub.png", "farm_bear_token")) summoned += 1; });
        else [0, 1].forEach(() => { if (this.summonArenaToken("田园熊卫", 4, 5, "assets/cards/chapter3/wheat-cub.png", "farm_bear_token")) summoned += 1; });
        this.addLog(`${unit.name}号召熊族，${allies.length}个友方熊族获得+2/+2，并召唤${summoned}个田园熊卫。`, side);
      } else if (unit.cardId === "dewdrop_scout") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 2);
        this.addLog(`${unit.name}献上晨露，为${side === "player" ? "英雄" : this.enemyConfig.name}恢复${actor.hp - before}点生命。`, side);
      } else if (unit.cardId === "spring_bubble_medic") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 4);
        this.addLog(`${unit.name}释放泡泉术，为${side === "player" ? "英雄" : this.enemyConfig.name}恢复${actor.hp - before}点生命。`, side);
      } else if (unit.cardId === "glowcap_slinger") {
        const allies = [...actor.board.front, ...actor.board.back].filter(ally => ally && ally.uid !== unit.uid && ally.health < ally.maxHealth).sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth));
        if (allies[0]) {
          const before = allies[0].health;
          allies[0].health = Math.min(allies[0].maxHealth, allies[0].health + 3);
          this.addLog(`${unit.name}投出荧蕈药剂，为${allies[0].name}恢复${allies[0].health - before}点生命。`, side);
        }
      } else if (unit.cardId === "splitting_vanguard") {
        const summoned = side === "player"
          ? this.summonPlayerToken("软泥分身", 1, 3, "assets/cards/chapter4/dewdrop-scout.png", "slime_splinter")
          : this.summonArenaToken("软泥分身", 1, 3, "assets/cards/chapter4/dewdrop-scout.png", "slime_splinter");
        this.addLog(`${unit.name}完成分裂，${summoned ? "召唤1个1/3软泥分身" : "但战场没有空位"}。`, side);
      } else if (unit.cardId === "dream_gel_sage") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 3);
        [...actor.board.front, ...actor.board.back].filter(Boolean).forEach(ally => { ally.health = Math.min(ally.maxHealth, ally.health + 3); });
        this.addLog(`${unit.name}展开幻林治愈，为英雄恢复${actor.hp - before}点生命并治疗全部友方随从。`, side);
      } else if (unit.cardId === "verdant_devourer") {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 6);
        this.addLog(`${unit.name}转化森林养分，为英雄恢复${actor.hp - before}点生命。`, side);
      } else if (unit.cardId === "azure_slime_king") {
        let summoned = 0;
        const summon = () => side === "player"
          ? this.summonPlayerToken("碧波胶卫", 2, 6, "assets/cards/chapter4/moss-gel-guard.png", "azure_gel_guard")
          : this.summonArenaToken("碧波胶卫", 2, 6, "assets/cards/chapter4/moss-gel-guard.png", "azure_gel_guard");
        [0, 1].forEach(() => { if (summon()) summoned += 1; });
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + 4);
        [...actor.board.front, ...actor.board.back].filter(Boolean).forEach(ally => { ally.health = Math.min(ally.maxHealth, ally.health + 4); });
        this.addLog(`${unit.name}号令胶质王庭，召唤${summoned}个碧波胶卫并治疗全部友方。`, side);
      }
    }

    castPlayerSpell(side, row, column) {
      const selected = this.state.selected;
      const card = this.selectedCard();
      if (!card || card.type !== "spell") return;
      const target = row === "hero" ? this.state.player : this.state[side]?.board?.[row]?.[column];
      if (card.effect === "damage") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        if (card.frontOnly && row !== "front") return this.toast(`${card.name}只能选择敌方前排随从。`, "bad");
        this.spendCard(selected.index);
        this.sound(card.id.includes("fire") ? "fire" : "darkSpell");
        this.addLog(`你施放${card.name}（${card.cost}费，剩余${this.state.player.mana}/${this.state.player.maxMana}法力），目标为第${column + 1}路${row === "front" ? "前排" : "后排"}的${target.name}。`, "player");
        this.damageUnit("enemy", row, column, card.value, card.name, true, "player");
      } else if (card.effect === "heal") {
        if (side !== "player" || !target) return this.toast("请选择一个友方目标。", "bad");
        this.spendCard(selected.index);
        this.sound("heal");
        const amount = row === "hero" ? card.heroValue : card.value;
        const before = target.hp ?? target.health;
        if (row === "hero") target.hp = Math.min(target.maxHp, target.hp + amount);
        else target.health = Math.min(target.maxHealth, target.health + amount);
        const after = target.hp ?? target.health;
        this.addLog(`你施放${card.name}（${card.cost}费），为${row === "hero" ? "英雄" : target.name}恢复${after - before}点生命，剩余${this.state.player.mana}/${this.state.player.maxMana}法力。`, "player");
      } else if (card.effect === "buff") {
        if (side !== "player" || row === "hero" || !target) return this.toast("请选择一个友方随从。", "bad");
        this.spendCard(selected.index);
        this.sound("buff");
        target.tempAttack = (target.tempAttack || 0) + card.value;
        this.addLog(`你施放${card.name}（${card.cost}费），${target.name}本回合获得+${card.value}攻击，剩余${this.state.player.mana}/${this.state.player.maxMana}法力。`, "player");
      } else if (card.effect === "front_aoe") {
        if (side !== "enemy" || row !== "front") return this.toast("选择任意敌方前排以释放箭雨。", "bad");
        this.spendCard(selected.index);
        this.sound("volley");
        const targets = this.state.enemy.board.front.map((unit, col) => unit ? col : -1).filter(col => col >= 0);
        this.addLog(`你施放${card.name}（${card.cost}费），命中敌方前排${targets.length}个目标，每个造成${card.value}点伤害。`, "player");
        targets.forEach(col => this.damageUnit("enemy", "front", col, card.value, card.name, false, "player"));
        this.cleanDead();
        this.checkOutcome();
      } else if (card.effect === "chain_damage") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        this.spendCard(selected.index);
        this.sound("darkSpell");
        const chainedTargets = this.state.enemy.board[row].map((unit, col) => unit && col !== column ? col : -1).filter(col => col >= 0);
        this.addLog(`你施放${card.name}：${target.name}受到${card.value}点伤害，同排其他${chainedTargets.length}个敌人各受到${card.splash}点伤害。`, "player");
        this.damageUnit("enemy", row, column, card.value, card.name, false, "player");
        chainedTargets.forEach(col => this.damageUnit("enemy", row, col, card.splash, card.name, false, "player"));
        this.cleanDead();
        this.checkOutcome();
      } else if (card.effect === "swap_stats") {
        if (side !== "player" || row === "hero" || !target) return this.toast("请选择一个友方随从。", "bad");
        this.spendCard(selected.index);
        this.sound("buff");
        const oldAttack = target.attack;
        target.attack = Math.max(1, target.health);
        target.health = Math.max(1, oldAttack);
        target.maxHealth = target.health;
        this.addLog(`你施放${card.name}，${target.name}的攻击力与生命值交换为${target.attack}/${target.health}。`, "player");
      } else if (card.effect === "fortify") {
        if (side !== "player" || row === "hero" || !target) return this.toast("请选择一个友方随从。", "bad");
        this.spendCard(selected.index);
        this.sound("buff");
        target.health += card.health;
        target.maxHealth += card.health;
        if (!target.keywords.includes("守卫")) target.keywords.push("守卫");
        this.addLog(`你施放${card.name}，${target.name}获得${card.health}点生命与守卫，当前${target.attack}/${target.health}。`, "player");
      } else if (card.effect === "summon_recruits") {
        this.spendCard(selected.index);
        this.sound("summon");
        const summoned = [0, 1].filter(() => this.summonPlayerRecruit(card.tokenAttack, card.tokenHealth)).length;
        this.addLog(`你施放${card.name}，召唤了${summoned}个${card.tokenAttack}/${card.tokenHealth}王庭卫兵。`, "player");
      } else if (card.effect === "group_heal") {
        this.spendCard(selected.index);
        this.sound("heal");
        const heroBefore = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.value);
        let unitHealing = 0;
        [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean).forEach(unit => {
          const before = unit.health;
          unit.health = Math.min(unit.maxHealth, unit.health + card.value);
          unitHealing += unit.health - before;
        });
        this.addLog(`你施放${card.name}，英雄恢复${this.state.player.hp - heroBefore}点生命，友方随从共恢复${unitHealing}点生命。`, "player");
      } else if (card.effect === "draw_cards") {
        const cost = this.spendCard(selected.index);
        this.sound("darkSpell");
        this.draw("player", card.count);
        this.addLog(`你施放${card.name}（${cost}费），抽取${card.count}张牌。`, "player");
      } else if (card.effect === "poison") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        const cost = this.spendCard(selected.index);
        this.sound("darkSpell");
        this.damageUnit("enemy", row, column, card.value, card.name, false, "player");
        if (target.health > 0) target.attack = Math.max(0, target.attack - card.weaken);
        this.addLog(`你施放${card.name}（${cost}费），${target.name}${target.health > 0 ? `永久失去${card.weaken}点攻击` : "被毒液消灭"}。`, "player");
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "rescue") {
        if (side !== "player" || row === "hero" || !target || !CF.CARD_LIBRARY[target.cardId]) return this.toast("请选择一个可以撤回的友方随从。", "bad");
        const cost = this.spendCard(selected.index);
        this.state.player.board[row][column] = null;
        this.state.player.hand.push({ ...CF.getCard(target.cardId, { level: target.level }, target.bond), instanceId: `${target.cardId}-rescued-${Date.now()}` });
        this.draw("player", 1);
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），将${target.name}撤回手牌并抽1张牌。`, "player");
      } else if (card.effect === "row_blast") {
        if (side !== "enemy" || !target) return this.toast("请选择敌方任意一排。", "bad");
        const cost = this.spendCard(selected.index);
        const targets = this.state.enemy.board[row].map((unit, col) => unit ? col : -1).filter(col => col >= 0);
        this.sound("fire");
        targets.forEach(col => this.damageUnit("enemy", row, col, card.value, card.name, false, "player"));
        this.addLog(`你引爆${card.name}（${cost}费），对敌方${row === "front" ? "前排" : "后排"}${targets.length}个随从各造成${card.value}点伤害。`, "player");
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "goblin_tide") {
        const cost = this.spendCard(selected.index);
        const summoned = [0, 1, 2].filter(() => this.summonPlayerToken("绿潮斗士", card.tokenAttack, card.tokenHealth, "assets/cards/enemies/goblin.png")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}绿潮斗士。`, "player");
      } else if (card.effect === "army_buff") {
        const cost = this.spendCard(selected.index);
        const allies = [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean);
        allies.forEach(unit => { unit.attack += card.attack; unit.health += card.health; unit.maxHealth += card.health; });
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${allies.length}个友方随从永久获得+${card.attack}/+${card.health}。`, "player");
      } else if (card.effect === "banish") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        const cost = this.spendCard(selected.index);
        const canReturn = this.state.enemy.hand.length < 10 && CF.CARD_LIBRARY[target.cardId];
        this.state.enemy.board[row][column] = null;
        if (!canReturn) this.state.enemyUnitsKilled += 1;
        if (canReturn) this.state.enemy.hand.push({ ...CF.getCard(target.cardId, { level: target.level }), instanceId: `${target.cardId}-banished-${Date.now()}` });
        this.sound("darkSpell");
        this.addLog(`你施放${card.name}（${cost}费），${target.name}${canReturn ? "被绑回敌方手牌" : "无处可逃并被消灭"}。`, "player");
      } else if (card.effect === "enemy_aoe") {
        const cost = this.spendCard(selected.index);
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state.enemy.board[targetRow].forEach((unit, targetColumn) => { if (unit) targets.push({ row: targetRow, column: targetColumn }); }));
        this.sound("volley");
        targets.forEach(item => this.damageUnit("enemy", item.row, item.column, card.value, card.name, false, "player"));
        this.addLog(`你施放${card.name}（${cost}费），轰击全部${targets.length}个敌方随从，每个受到${card.value}点伤害。`, "player");
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "treasury") {
        const cost = this.spendCard(selected.index);
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.heal);
        this.draw("player", 2);
        this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），英雄恢复${this.state.player.hp - before}点生命并抽2张牌。`, "player");
      } else if (card.effect === "queen_final") {
        const cost = this.spendCard(selected.index);
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state.enemy.board[targetRow].forEach((unit, targetColumn) => { if (unit) targets.push({ row: targetRow, column: targetColumn }); }));
        targets.forEach(item => this.damageUnit("enemy", item.row, item.column, card.value, card.name, false, "player"));
        this.cleanDead();
        const summoned = [0, 1].filter(() => this.summonPlayerToken("王庭幻卫", card.tokenAttack, card.tokenHealth, "assets/cards/enemies/goblin-guard.png")).length;
        this.sound("darkSpell");
        this.addLog(`你施放${card.name}（${cost}费），对全部敌人造成${card.value}点伤害并召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}王庭幻卫。`, "player");
        this.checkOutcome();
      } else if (card.effect === "honey_salve") {
        if (side !== "player" || !target) return this.toast("请选择一个友方随从或英雄。", "bad");
        const cost = this.spendCard(selected.index);
        const before = row === "hero" ? target.hp : target.health;
        if (row === "hero") target.hp = Math.min(target.maxHp, target.hp + card.heal);
        else { target.health = Math.min(target.maxHealth, target.health + card.heal); target.attack += card.attack; }
        const healed = (row === "hero" ? target.hp : target.health) - before;
        this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），为${row === "hero" ? "英雄" : target.name}恢复${healed}点生命${row === "hero" ? "" : `并永久增加${card.attack}点攻击`}。`, "player");
      } else if (card.effect === "growth_blessing") {
        if (side !== "player" || row === "hero" || !target) return this.toast("请选择一个友方随从。", "bad");
        const cost = this.spendCard(selected.index);
        target.attack += card.attack; target.health += card.health; target.maxHealth += card.health;
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${target.name}永久获得+${card.attack}/+${card.health}。`, "player");
      } else if (card.effect === "bear_paw") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        const cost = this.spendCard(selected.index);
        const others = this.state.enemy.board[row].map((unit, col) => unit && col !== column ? col : -1).filter(col => col >= 0);
        this.sound("melee");
        this.damageUnit("enemy", row, column, card.value, card.name, false, "player");
        others.forEach(col => this.damageUnit("enemy", row, col, card.splash, card.name, false, "player"));
        this.addLog(`你施放${card.name}（${cost}费），主目标受到${card.value}点伤害，同排其他${others.length}个敌人受到${card.splash}点伤害。`, "player");
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "wheat_barrier") {
        const cost = this.spendCard(selected.index);
        const allies = [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean);
        allies.forEach(unit => { unit.health += card.health; unit.maxHealth += card.health; });
        this.state.player.board.front.filter(Boolean).forEach(unit => { if (!unit.keywords.includes("守卫")) unit.keywords.push("守卫"); });
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${allies.length}个友方随从获得+${card.health}生命，前排获得守卫。`, "player");
      } else if (["bee_swarm", "earth_tremor"].includes(card.effect)) {
        const cost = this.spendCard(selected.index);
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state.enemy.board[targetRow].forEach((unit, targetColumn) => { if (unit) targets.push({ row: targetRow, column: targetColumn, unit }); }));
        this.sound(card.effect === "bee_swarm" ? "ranged" : "melee");
        targets.forEach(item => this.damageUnit("enemy", item.row, item.column, card.value, card.name, false, "player"));
        targets.forEach(item => { if (item.unit.health > 0) item.unit.attack = Math.max(0, item.unit.attack - card.weaken); });
        this.addLog(`你施放${card.name}（${cost}费），对${targets.length}个敌方随从造成${card.value}点伤害，存活者失去${card.weaken}点攻击。`, "player");
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "harvest_feast") {
        const cost = this.spendCard(selected.index);
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.heal);
        [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean).forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        this.draw("player", card.count); this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），英雄恢复${this.state.player.hp - before}点生命，友方全体得到治疗并抽${card.count}张牌。`, "player");
      } else if (card.effect === "bear_ambush") {
        const cost = this.spendCard(selected.index);
        const summoned = [0, 1, 2].filter(() => this.summonPlayerToken("谷仓熊战士", card.tokenAttack, card.tokenHealth, "assets/cards/chapter3/barn-charger.png", "barn_bear_token")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}谷仓熊战士。`, "player");
      } else if (card.effect === "autumn_rally") {
        const cost = this.spendCard(selected.index);
        const allies = [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean);
        allies.forEach(unit => { unit.attack += card.attack; unit.health += card.health; unit.maxHealth += card.health; });
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${allies.length}个友方随从永久获得+${card.attack}/+${card.health}。`, "player");
      } else if (card.effect === "bear_god") {
        const cost = this.spendCard(selected.index);
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.heal);
        const summoned = [0, 1, 2, 3].filter(() => this.summonPlayerToken("熊神化身", card.tokenAttack, card.tokenHealth, "assets/cards/chapter3/golden-sheaf-king.png", "bear_god_avatar")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），恢复${this.state.player.hp - before}点生命并召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}熊神化身。`, "player");
      } else if (card.effect === "slime_mend") {
        if (side !== "player" || !target) return this.toast("请选择一个友方随从或英雄。", "bad");
        const cost = this.spendCard(selected.index);
        const amount = row === "hero" ? card.heroValue : card.heal;
        const before = row === "hero" ? target.hp : target.health;
        if (row === "hero") target.hp = Math.min(target.maxHp, target.hp + amount);
        else target.health = Math.min(target.maxHealth, target.health + amount);
        const healed = (row === "hero" ? target.hp : target.health) - before;
        this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），为${row === "hero" ? "英雄" : target.name}恢复${healed}点生命。`, "player");
      } else if (card.effect === "gel_barrier") {
        if (side !== "player" || row === "hero" || !target) return this.toast("请选择一个友方随从。", "bad");
        const cost = this.spendCard(selected.index);
        target.health += card.health; target.maxHealth += card.health;
        if (!target.keywords.includes("再生")) target.keywords.push("再生");
        this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${target.name}获得+${card.health}最大生命与再生。`, "player");
      } else if (card.effect === "slime_division") {
        const cost = this.spendCard(selected.index);
        const summoned = [0, 1].filter(() => this.summonPlayerToken("软泥分身", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/dewdrop-scout.png", "slime_splinter")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}软泥分身。`, "player");
      } else if (card.effect === "moonpool_surge") {
        const cost = this.spendCard(selected.index);
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.heal);
        [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean).forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        if (card.count) this.draw("player", card.count);
        this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），英雄恢复${this.state.player.hp - before}点生命，友方全体恢复${card.heal}点生命${card.count ? `并抽${card.count}张牌` : ""}。`, "player");
      } else if (card.effect === "viscous_prison") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        const cost = this.spendCard(selected.index);
        const lost = Math.min(target.attack, card.weaken);
        target.attack = Math.max(0, target.attack - card.weaken); target.ready = false;
        this.sound("darkSpell");
        this.addLog(`你施放${card.name}（${cost}费），${target.name}永久失去${lost}点攻击并被禁锢。`, "player");
      } else if (card.effect === "spore_assimilation") {
        const cost = this.spendCard(selected.index);
        const allies = [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean);
        allies.forEach(unit => { unit.maxHealth += card.health; unit.health = Math.min(unit.maxHealth, unit.health + card.health + card.heal); });
        this.draw("player", 1); this.sound("buff");
        this.addLog(`你施放${card.name}（${cost}费），${allies.length}个友方随从获得+${card.health}最大生命、恢复${card.heal}点生命并抽1张牌。`, "player");
      } else if (card.effect === "forest_engulfment") {
        const cost = this.spendCard(selected.index);
        const targets = [];
        ["front", "back"].forEach(targetRow => this.state.enemy.board[targetRow].forEach((unit, targetColumn) => { if (unit) targets.push({ row: targetRow, column: targetColumn }); }));
        targets.forEach(item => this.damageUnit("enemy", item.row, item.column, card.value, card.name, false, "player"));
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + targets.length * card.heal);
        this.sound("darkSpell"); this.cleanDead();
        this.addLog(`你施放${card.name}（${cost}费），对${targets.length}个敌人造成${card.value}点伤害，并为英雄恢复${this.state.player.hp - before}点生命。`, "player");
        this.checkOutcome();
      } else if (card.effect === "regeneration_domain") {
        const cost = this.spendCard(selected.index);
        const allies = [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean);
        allies.forEach(unit => {
          unit.maxHealth += card.health; unit.health = Math.min(unit.maxHealth, unit.health + card.health + card.heal);
          if (!unit.keywords.includes("再生")) unit.keywords.push("再生");
        });
        this.sound("heal");
        this.addLog(`你施放${card.name}（${cost}费），${allies.length}个友方随从获得生命、治疗与再生。`, "player");
      } else if (card.effect === "verdant_flood") {
        const cost = this.spendCard(selected.index);
        const summoned = [0, 1, 2].filter(() => this.summonPlayerToken("洪流胶卫", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/moss-gel-guard.png", "verdant_flood_guard")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}洪流胶卫。`, "player");
      } else if (card.effect === "all_returns_to_gel") {
        const cost = this.spendCard(selected.index);
        const before = this.state.player.hp;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + card.heal);
        [...this.state.player.board.front, ...this.state.player.board.back].filter(Boolean).forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        const summoned = [0, 1, 2, 3].filter(() => this.summonPlayerToken("森灵凝胶", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/azure-slime-king.png", "forest_gel_spirit")).length;
        this.sound("summon");
        this.addLog(`你施放${card.name}（${cost}费），英雄恢复${this.state.player.hp - before}点生命并召唤${summoned}个${card.tokenAttack}/${card.tokenHealth}森灵凝胶。`, "player");
      } else if (card.effect === "execute_draw") {
        if (side !== "enemy" || !target) return this.toast("请选择一个敌方随从。", "bad");
        const defeated = target.health <= card.value;
        this.spendCard(selected.index);
        this.sound("darkSpell");
        this.addLog(`你施放${card.name}，对${target.name}造成${card.value}点伤害${defeated ? "并将其击败" : ""}。`, "player");
        this.damageUnit("enemy", row, column, card.value, card.name, false, "player");
        this.cleanDead();
        if (defeated) this.draw("player", 1);
        this.checkOutcome();
      }
      this.state.selected = null;
      this.render();
    }

    summonPlayerRecruit(attack, health) {
      return this.summonPlayerToken("王庭卫兵", attack, health, "assets/cards/recruit.png", "royal_recruit_token");
    }

    summonPlayerToken(name, attack, health, image = "assets/cards/recruit.png", cardId = "player_token") {
      const board = this.state.player.board;
      let row = "front";
      let column = board.front.findIndex(slot => !slot);
      if (column < 0) { row = "back"; column = board.back.findIndex(slot => !slot); }
      if (column < 0) return false;
      board[row][column] = {
        uid: `player-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cardId, name, icon: "🛡️", image,
        attack, health, maxHealth: health, level: 1, keywords: [], combatStyle: "melee", role: "",
        ready: false, justSummoned: true, tempAttack: 0, healUsed: false
      };
      return true;
    }

    spendCard(index) {
      const card = this.state.player.hand[index];
      const cost = this.effectiveCost(card, "player");
      this.state.player.mana -= cost;
      this.state.player.hand.splice(index, 1);
      this.recordCardPlayed("player", card);
      return cost;
    }

    castSkill(row, column) {
      const skill = this.playerSkill();
      const level = skill.level;
      if (this.state.selected?.type !== "skill" || this.state.selected.skillId !== skill.id) return;
      if (skill.target === "enemy-front" && (row !== "front" || !this.state.enemy.board.front[column])) return this.toast(`${skill.name}只能选择敌方前排随从。`, "bad");
      if (skill.target === "friendly-unit" && !this.state.player.board[row]?.[column]) return this.toast("请选择一个我方随从。", "bad");
      if (skill.target === "enemy-any" && !this.state.enemy.board[row]?.[column]) return this.toast("请选择一个敌方随从。", "bad");
      this.state.player.mana -= skill.cost;
      this.state.player.skillCooldown = 1;
      this.state.selected = null;
      const suffix = `剩余${this.state.player.mana}/${this.state.player.maxMana}法力。`;
      const amount = this.skillValue(skill, "amount", level);
      const attack = this.skillValue(skill, "attack", level);
      const health = this.skillValue(skill, "health", level);
      const heal = this.skillValue(skill, "heal", level);
      const draw = this.skillValue(skill, "draw", level);
      const mana = this.skillValue(skill, "mana", level);
      const heroDamage = this.skillValue(skill, "heroDamage", level);
      const selfDamage = this.skillValue(skill, "selfDamage", level);
      const playerUnits = [];
      const enemyUnits = [];
      ["front", "back"].forEach(targetRow => {
        this.state.player.board[targetRow].forEach((unit, targetColumn) => { if (unit) playerUnits.push({ row: targetRow, column: targetColumn, unit }); });
        this.state.enemy.board[targetRow].forEach((unit, targetColumn) => { if (unit) enemyUnits.push({ row: targetRow, column: targetColumn, unit }); });
      });
      if (skill.effect === "front_strike") {
        const target = this.state.enemy.board[row][column];
        this.damageUnit("enemy", row, column, amount, skill.name, true, "player");
        const splash = this.skillValue(skill, "splash", level);
        if (splash && this.state.enemy.board.back[column]) this.damageUnit("enemy", "back", column, splash, skill.name, false, "player");
        if (heroDamage) this.state.enemy.hp -= heroDamage;
        if (heal) this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        this.sound(skill.icon === "🏹" ? "ranged" : "melee");
      } else if (skill.effect === "hero_damage") {
        this.state.enemy.hp -= amount;
        if (heal) this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        if (draw) this.draw("player", draw);
        if (selfDamage) this.state.player.hp -= selfDamage;
        this.sound("fire");
      } else if (skill.effect === "hero_heal") {
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + amount);
        if (draw) this.draw("player", draw);
        this.sound("heal");
      } else if (skill.effect === "summon") {
        const count = Math.max(1, this.skillValue(skill, "count", level));
        for (let index = 0; index < count; index += 1) this.summonPlayerSkillToken(skill.tokenName, attack, health, skill.id, skill);
        this.sound("summon");
      } else if (skill.effect === "weakest_damage") {
        enemyUnits.sort((left, right) => left.unit.health - right.unit.health);
        if (enemyUnits[0]) this.damageUnit("enemy", enemyUnits[0].row, enemyUnits[0].column, amount, skill.name, true, "player");
        else this.state.enemy.hp -= amount;
        if (heroDamage) this.state.enemy.hp -= heroDamage;
        if (heal) this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        if (draw) this.draw("player", draw);
        this.sound("ranged");
      } else if (skill.effect === "enemy_aoe") {
        enemyUnits.forEach(item => this.damageUnit("enemy", item.row, item.column, amount, skill.name, false, "player"));
        if (heroDamage) this.state.enemy.hp -= heroDamage;
        if (heal) this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        this.sound("darkSpell");
      } else if (skill.effect === "draw") {
        if (selfDamage) this.state.player.hp -= selfDamage;
        if (draw) this.draw("player", draw);
        if (mana) this.state.player.mana = Math.min(this.state.player.maxMana, this.state.player.mana + mana);
        this.sound("draw");
      } else if (skill.effect === "buff_unit") {
        const target = this.state.player.board[row][column];
        target.attack += attack;
        target.health += health; target.maxHealth += health;
        if (skill.keyword && !target.keywords.includes(skill.keyword)) target.keywords.push(skill.keyword);
        this.sound("buff");
      } else if (skill.effect === "army_buff") {
        playerUnits.forEach(({ unit }) => {
          if (skill.permanent) unit.attack += attack;
          else unit.tempAttack = (unit.tempAttack || 0) + attack;
          unit.health += health; unit.maxHealth += health;
        });
        if (draw) this.draw("player", draw);
        this.sound("buff");
      } else if (skill.effect === "front_aoe") {
        this.state.enemy.board.front.forEach((unit, targetColumn) => { if (unit) this.damageUnit("enemy", "front", targetColumn, amount, skill.name, false, "player"); });
        if (heroDamage) this.state.enemy.hp -= heroDamage;
        this.sound("volley");
      } else if (skill.effect === "heal_weakest") {
        playerUnits.sort((left, right) => (left.unit.health / left.unit.maxHealth) - (right.unit.health / right.unit.maxHealth));
        if (playerUnits[0]) playerUnits[0].unit.health = Math.min(playerUnits[0].unit.maxHealth, playerUnits[0].unit.health + heal);
        else this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        if (draw) this.draw("player", draw);
        this.sound("heal");
      } else if (skill.effect === "mana") {
        this.state.player.mana = Math.min(this.state.player.maxMana, this.state.player.mana + mana);
        if (draw) this.draw("player", draw);
        this.sound("draw");
      } else if (skill.effect === "weapon") {
        const weapon = this.state.player.weapon;
        if (weapon) {
          weapon.attack += attack;
          const durability = this.skillValue(skill, "durability", level);
          weapon.durability += durability; weapon.maxDurability += durability;
          this.sound("buff");
        } else this.draw("player", 1);
      } else if (skill.effect === "execute") {
        enemyUnits.sort((left, right) => left.unit.health - right.unit.health);
        if (enemyUnits[0]) {
          const threshold = this.skillValue(skill, "threshold", level);
          const bonus = enemyUnits[0].unit.health <= threshold ? this.skillValue(skill, "bonus", level) : 0;
          this.damageUnit("enemy", enemyUnits[0].row, enemyUnits[0].column, amount + bonus, skill.name, true, "player");
        } else this.state.enemy.hp -= amount;
        this.sound("melee");
      } else if (this.castSignatureSkill(skill, level, row, column, enemyUnits, playerUnits)) {
        // 选人英雄的独特技能，逻辑见 castSignatureSkill。
      } else if (skill.effect === "heal_all") {
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
        playerUnits.forEach(({ unit }) => {
          unit.health = Math.min(unit.maxHealth, unit.health + amount);
          unit.tempAttack = (unit.tempAttack || 0) + attack;
        });
        this.sound("heal");
      }
      this.cleanDead();
      this.addLog(`你使用英雄技能「${skill.name}」（${skill.cost}费）：${skill.playerDescription(level)} ${suffix}`, "player");
      this.checkOutcome();
      this.render();
    }

    castSignatureSkill(skill, level, row, column, enemyUnits, playerUnits) {
      const player = this.state.player;
      const enemy = this.state.enemy;
      const value = key => this.skillValue(skill, key, level);
      const healHero = amount => { const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + amount); return player.hp - before; };
      if (skill.effect === "piercing_arrow") {
        const target = enemy.board[row][column];
        this.damageUnit("enemy", row, column, value("amount"), skill.name, true, "player");
        if (target && !enemy.board[row][column]) {
          this.addLog(`${skill.name}击杀了${target.name}，你抽1张牌。`, "player");
          this.draw("player", 1);
        }
        this.sound("ranged");
        return true;
      }
      if (skill.effect === "arcane_missiles") {
        const missiles = Math.max(1, value("count"));
        const hits = {};
        for (let index = 0; index < missiles; index += 1) {
          const targets = [{ hero: true }];
          ["front", "back"].forEach(targetRow => enemy.board[targetRow].forEach((unit, targetColumn) => {
            if (unit && unit.health > 0) targets.push({ row: targetRow, column: targetColumn, unit });
          }));
          const target = targets[Math.floor(Math.random() * targets.length)];
          const name = target.hero ? this.enemyConfig.name : target.unit.name;
          if (target.hero) enemy.hp -= 1;
          else this.damageUnit("enemy", target.row, target.column, 1, skill.name, false, "player");
          hits[name] = (hits[name] || 0) + 1;
        }
        this.addLog(`${missiles}枚奥术飞弹命中：${Object.entries(hits).map(([name, count]) => `${name}×${count}`).join("、")}。`, "player");
        this.sound("darkSpell");
        return true;
      }
      if (skill.effect === "dawn_revival") {
        let restored = 0;
        playerUnits.forEach(({ unit }) => { restored += Math.max(0, unit.maxHealth - unit.health); unit.health = unit.maxHealth; });
        const healed = healHero(value("heal"));
        this.addLog(`晨曦照亮战线：随从共恢复${restored}点生命，英雄恢复${healed}点生命。`, "player");
        this.sound("heal");
        return true;
      }
      if (skill.effect === "blood_frenzy") {
        const target = player.board[row][column];
        player.hp -= value("selfDamage");
        target.tempAttack = (target.tempAttack || 0) + value("attack");
        if (target.role !== "healer") { target.ready = true; target.justSummoned = false; }
        this.addLog(`${target.name}陷入血怒，本回合攻击力提升至${this.currentAttack(target)}${target.role !== "healer" ? "，可以立即攻击" : ""}。`, "player");
        this.sound("buff");
        return true;
      }
      if (skill.effect === "crimson_chain") {
        const target = enemy.board[row][column];
        this.damageUnit("enemy", row, column, value("amount"), skill.name, true, "player");
        if (target && !enemy.board[row][column]) {
          player.mana = Math.min(player.maxMana, player.mana + skill.cost);
          player.skillCooldown = 0;
          this.addLog(`${skill.name}击杀了${target.name}：返还${skill.cost}点法力，本回合可以再次使用。`, "player");
        }
        this.sound("melee");
        return true;
      }
      if (skill.effect === "forest_ambush") {
        this.placeSignatureToken({ name: "林影弓手", icon: "🏹", attack: value("attack"), health: value("health"), combatStyle: "ranged", keywords: ["远程"], ready: true, preferBack: true, skillId: skill.id });
        this.sound("summon");
        return true;
      }
      if (skill.effect === "aegis_wall") {
        const frontUnits = player.board.front.filter(Boolean);
        if (frontUnits.length) {
          const bonus = value("health");
          frontUnits.forEach(unit => { unit.health += bonus; unit.maxHealth += bonus; });
          this.addLog(`圣盾壁垒加固前排：${frontUnits.length}个随从永久获得+${bonus}生命。`, "player");
        } else {
          this.placeSignatureToken({ name: "圣盾卫士", icon: "🛡️", attack: 0, health: value("guard"), keywords: ["守卫"], skillId: skill.id });
        }
        this.sound("buff");
        return true;
      }
      if (skill.effect === "sapling") {
        this.placeSignatureToken({ name: "古树幼苗", icon: "🌱", attack: value("attack"), health: value("health"), keywords: ["生长"], growth: 1, skillId: skill.id });
        this.sound("summon");
        return true;
      }
      return false;
    }

    placeSignatureToken(options) {
      const board = this.state.player.board;
      const rows = options.preferBack ? ["back", "front"] : ["front", "back"];
      for (const row of rows) {
        const column = board[row].findIndex(slot => !slot);
        if (column < 0) continue;
        board[row][column] = {
          uid: `hero-skill-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          cardId: `hero_skill_${options.skillId}`, name: options.name, icon: options.icon, image: "assets/cards/recruit.png",
          attack: options.attack, health: options.health, maxHealth: options.health, level: 1, keywords: [...(options.keywords || [])],
          combatStyle: options.combatStyle || "melee", role: "", growth: options.growth || 0,
          ready: Boolean(options.ready), justSummoned: true, tempAttack: 0, healUsed: false
        };
        this.addLog(`${options.name}（${options.attack}/${options.health}）加入第${column + 1}路${row === "front" ? "前排" : "后排"}。`, "player");
        return true;
      }
      return false;
    }


    summonPlayerSkillToken(name, attack, health, skillId, options = {}) {
      const board = this.state.player.board;
      let row = "front";
      let column = board.front.findIndex(slot => !slot);
      if (column < 0) { row = "back"; column = board.back.findIndex(slot => !slot); }
      if (column < 0) return false;
      board[row][column] = {
        uid: `hero-skill-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cardId: `hero_skill_${skillId}`, name, icon: options.icon || "🛡️", image: "assets/cards/recruit.png",
        attack, health, maxHealth: health, level: 1, keywords: options.keyword ? [options.keyword] : [], combatStyle: options.combatStyle || "melee", role: "",
        ready: Boolean(options.rush), justSummoned: !options.rush, tempAttack: 0, healUsed: false
      };
      return true;
    }

    playerAttack(targetRow, targetColumn) {
      const selected = this.state.selected;
      const attacker = selected?.type === "attacker" ? this.state.player.board[selected.row][selected.column] : null;
      const target = this.state.enemy.board[targetRow][targetColumn];
      if (!attacker || attacker.uid !== selected.unitId || !target) return;
      const legal = Rules.legalUnitTargets(attacker, this.state.enemy.board, selected.column).some(item => item.row === targetRow && item.column === targetColumn);
      if (!legal) {
        if (targetColumn !== selected.column) this.toast("随从只能攻击同一路线的敌人。", "bad");
        else if (targetRow === "back" && this.state.enemy.board.front[targetColumn]) this.toast("必须先击败该路线的前排单位。", "bad");
        return;
      }
      this.performUnitAttack("player", selected.row, selected.column, "enemy", targetRow, targetColumn);
      this.state.selected = null;
      this.render();
    }

    playerAttackHero() {
      const selected = this.state.selected;
      const attacker = selected?.type === "attacker" ? this.state.player.board[selected.row][selected.column] : null;
      if (!attacker || attacker.uid !== selected.unitId) return;
      if (this.state.rescueEpilogue) return this.toast(`${this.enemyConfig.name}已被带离战场。`, "bad");
      if (attacker.justSummoned) return this.toast("突袭随从登场回合不能攻击英雄。", "bad");
      const lanes = Rules.canAttackHero(this.state.enemy.board, selected.column) ? [selected.column] : [];
      const trialExecution = CF.Trials?.canPuzzleAttackHero(this, attacker);
      if (!lanes.length && !trialExecution) return this.toast("必须先清空本路线的前排和后排，才能攻击英雄。", "bad");
      const damage = this.currentAttack(attacker);
      this.state.enemy.hp -= damage;
      attacker.ready = false;
      this.sound(attacker.combatStyle === "ranged" || attacker.keywords.includes("远程") ? "ranged" : "melee");
      this.sound("heroHit");
      this.addLog(`${attacker.name}从第${selected.column + 1}路${selected.row === "front" ? "前排" : "后排"}发起攻击，${trialExecution && !lanes.length ? "借火焰瓶造成的混乱越阵斩首" : `通过第${lanes[0] + 1}路突破口`}命中${this.enemyConfig.name}，造成${damage}点伤害；敌方英雄剩余${Math.max(0, this.state.enemy.hp)}/${this.state.enemy.maxHp}生命。`, "player");
      this.state.selected = null;
      this.checkOutcome();
      this.render();
    }

    playerWeaponAttack(targetRow, targetColumn) {
      const selected = this.state.selected;
      const weapon = selected?.type === "weapon" ? this.state.player.weapon : null;
      const target = this.state.enemy.board[targetRow]?.[targetColumn];
      if (!weapon || weapon.cardId !== selected.cardId || !weapon.ready || !target) return;
      const legal = Rules.legalUnitTargets(weapon, this.state.enemy.board).some(item => item.row === targetRow && item.column === targetColumn);
      if (!legal) return this.toast("必须先击败该路线的前排单位。", "bad");
      this.performWeaponAttack("player", "enemy", targetRow, targetColumn);
      this.state.selected = null;
      this.render();
    }

    playerWeaponAttackHero() {
      const selected = this.state.selected;
      const weapon = selected?.type === "weapon" ? this.state.player.weapon : null;
      if (!weapon || weapon.cardId !== selected.cardId || !weapon.ready) return;
      if (this.state.rescueEpilogue) return this.toast(`${this.enemyConfig.name}已被带离战场。`, "bad");
      if (!Rules.canAttackHero(this.state.enemy.board)) return this.toast("必须先打通一整条路线。", "bad");
      this.performWeaponAttackHero("player", "enemy");
      this.state.selected = null;
      this.render();
    }

    performWeaponAttack(attackerSide, targetSide, targetRow, targetColumn) {
      const actor = this.state[attackerSide];
      const weapon = actor.weapon;
      const target = this.state[targetSide].board[targetRow]?.[targetColumn];
      if (!weapon || !weapon.ready || !target) return false;
      const bonus = weapon.effect === "front_breaker" && targetRow === "front" ? 2 : 0;
      const damage = this.mitigatedDamage(target, weapon.attack + bonus);
      const ranged = weapon.combatStyle === "ranged" || weapon.keywords.includes("远程");
      // 远程攻击不受反击；近战攻击远程目标时，远程目标也无法反击。
      const noCounter = ranged || this.isRanged(target);
      const counter = noCounter ? 0 : this.currentAttack(target) + (target.keywords.includes("荆棘") ? 2 : 0);
      target.health -= damage;
      if (!noCounter) actor.hp -= counter;
      this.spendWeaponStrike(weapon);
      if (!weapon.permanent) weapon.durability -= 1;
      const killed = target.health <= 0;
      this.sound(ranged ? "ranged" : "melee");
      const attackerName = attackerSide === "player" ? this.state.player.name : this.enemyConfig.name;
      const counterText = ranged ? "且不受反击" : noCounter ? "，远程目标无法反击" : `并受到${counter}点反击`;
      this.addLog(weapon.permanent
        ? `${attackerName}挥动${weapon.name}${ranged ? "远程射击" : "近战攻击"}第${targetColumn + 1}路${targetRow === "front" ? "前排" : "后排"}的${target.name}，造成${damage}点伤害${counterText}；英雄武器不消耗耐久。`
        : `${attackerName}挥动${weapon.name}${ranged ? "远程射击" : "近战攻击"}第${targetColumn + 1}路${targetRow === "front" ? "前排" : "后排"}的${target.name}，造成${damage}点伤害${counterText}；武器剩余${Math.max(0, weapon.durability)}/${weapon.maxDurability}耐久。`, attackerSide);
      this.applyWeaponAfterAttack(attackerSide, targetSide, killed, { row: targetRow, column: targetColumn, unit: target, damage });
      this.cleanDead();
      this.finishWeaponUse(attackerSide);
      this.checkOutcome();
      return true;
    }

    performWeaponAttackHero(attackerSide, targetSide) {
      const actor = this.state[attackerSide];
      const target = this.state[targetSide];
      const weapon = actor.weapon;
      if (!weapon || !weapon.ready || !Rules.canAttackHero(target.board)) return false;
      target.hp -= weapon.attack;
      this.spendWeaponStrike(weapon);
      if (!weapon.permanent) weapon.durability -= 1;
      this.sound(weapon.combatStyle === "ranged" ? "ranged" : "melee");
      this.sound("heroHit");
      const attackerName = attackerSide === "player" ? this.state.player.name : this.enemyConfig.name;
      const targetName = targetSide === "enemy" ? this.enemyConfig.name : "我方英雄";
      this.addLog(weapon.permanent
        ? `${attackerName}使用${weapon.name}突破战线，对${targetName}造成${weapon.attack}点伤害；英雄武器不消耗耐久。`
        : `${attackerName}使用${weapon.name}突破战线，对${targetName}造成${weapon.attack}点伤害；武器剩余${Math.max(0, weapon.durability)}/${weapon.maxDurability}耐久。`, attackerSide);
      this.applyWeaponAfterAttack(attackerSide, targetSide, false, { damage: weapon.attack });
      this.finishWeaponUse(attackerSide);
      this.checkOutcome();
      return true;
    }

    // 银月狼牙刃（twin_strike）每回合可以攻击两次，其余武器一次。
    spendWeaponStrike(weapon) {
      weapon.strikes = (weapon.strikes || 0) + 1;
      weapon.ready = weapon.effect === "twin_strike" && weapon.strikes < 2;
    }

    // hit：攻击随从时为 { row, column, unit, damage }（结算前目标仍在场上），攻击英雄时为 { damage }。
    applyWeaponAfterAttack(attackerSide, targetSide, killed, hit = null) {
      const actor = this.state[attackerSide];
      const weapon = actor.weapon;
      if (!weapon) return;
      if (weapon.effect === "venom" && hit?.unit && hit.unit.health > 0 && hit.unit.attack > 0) {
        hit.unit.attack -= 1;
        this.addLog(`${weapon.name}的毒针让${hit.unit.name}永久失去1点攻击。`, attackerSide);
      }
      if (weapon.effect === "quake" && hit?.unit) {
        const otherRow = hit.row === "front" ? "back" : "front";
        if (this.state[targetSide].board[otherRow][hit.column]) {
          this.addLog(`${weapon.name}震荡大地，波及同一路的另一排。`, attackerSide);
          this.damageUnit(targetSide, otherRow, hit.column, 2, weapon.name, false, attackerSide);
        }
      }
      if (weapon.effect === "lifesteal" && hit?.damage > 0) {
        const healed = Math.min(hit.damage, actor.maxHp - actor.hp);
        actor.hp += healed;
        if (healed) this.addLog(`${weapon.name}吸取露水，为英雄恢复${healed}点生命。`, attackerSide);
      }
      if (weapon.effect === "kill_draw" && killed) {
        this.draw(attackerSide, 1);
        this.addLog(`${weapon.name}触发：消灭随从，抽1张牌。`, attackerSide);
      }
      if (weapon.effect === "grow_on_kill" && killed) {
        weapon.attack += 1;
        this.addLog(`${weapon.name}饮下战意，攻击力提升至${weapon.attack}。`, attackerSide);
      }
      if (weapon.effect === "heal_after") {
        const healed = Math.min(1, actor.maxHp - actor.hp);
        actor.hp += healed;
        this.addLog(`${weapon.name}守誓之光为英雄恢复${healed}点生命。`, attackerSide);
      }
      if (weapon.effect === "hero_echo") {
        this.state[targetSide].hp -= 2;
        this.sound("heroHit");
        this.addLog(`${weapon.name}释放裂月余波，额外对${targetSide === "enemy" ? this.enemyConfig.name : "我方英雄"}造成2点伤害。`, attackerSide);
      }
    }

    finishWeaponUse(side) {
      const weapon = this.state[side].weapon;
      if (!weapon || weapon.permanent || weapon.durability > 0) return;
      this.addLog(`${side === "player" ? "你的" : `${this.enemyConfig.name}的`}${weapon.name}耐久耗尽并损毁。`, side);
      this.state[side].weapon = null;
      this.sound("death");
    }

    performUnitAttack(attackerSide, attackerRow, attackerColumn, targetSide, targetRow, targetColumn) {
      const attacker = this.state[attackerSide].board[attackerRow][attackerColumn];
      const target = this.state[targetSide].board[targetRow][targetColumn];
      if (!attacker || !target || attacker.role === "healer") return;
      const attackDamage = this.mitigatedDamage(target, this.currentAttack(attacker));
      const isRangedAttack = this.isRanged(attacker);
      // 远程攻击不受反击；近战随从主动攻击远程随从时，远程随从也无法反击。
      const targetCannotCounter = this.isRanged(target);
      const counterDamage = isRangedAttack || targetCannotCounter ? 0 : this.mitigatedDamage(attacker, this.currentAttack(target) + (target.keywords.includes("荆棘") ? 2 : 0));
      const targetHealthBefore = target.health;
      target.health -= attackDamage;
      attacker.health -= counterDamage;
      attacker.ready = false;
      this.sound(isRangedAttack ? "ranged" : "melee");
      const attackerPosition = `第${attackerColumn + 1}路${attackerRow === "front" ? "前排" : "后排"}`;
      const targetPosition = `第${targetColumn + 1}路${targetRow === "front" ? "前排" : "后排"}`;
      this.addLog(isRangedAttack
        ? `${attacker.name}从${attackerPosition}远程攻击${targetPosition}的${target.name}，造成${attackDamage}点伤害且不受反击；目标剩余${Math.max(0, target.health)}/${target.maxHealth}生命。`
        : targetCannotCounter
          ? `${attacker.name}从${attackerPosition}近战攻击${targetPosition}的远程随从${target.name}，造成${attackDamage}点伤害，远程目标无法反击；目标剩余${Math.max(0, target.health)}/${target.maxHealth}生命。`
          : `${attacker.name}从${attackerPosition}近战攻击${targetPosition}的${target.name}，造成${attackDamage}点伤害并受到${counterDamage}点反击；双方剩余生命为${Math.max(0, attacker.health)}/${attacker.maxHealth}与${Math.max(0, target.health)}/${target.maxHealth}。`, attackerSide);
      if (attacker.keywords.includes("穿透") && targetRow === "front" && attackDamage > targetHealthBefore) {
        const behind = this.state[targetSide].board.back[targetColumn];
        if (behind) {
          const overflow = this.mitigatedDamage(behind, attackDamage - targetHealthBefore);
          behind.health -= overflow;
          this.addLog(`穿透伤害继续命中第${targetColumn + 1}路后排的${behind.name}，造成${overflow}点伤害；目标剩余${Math.max(0, behind.health)}/${behind.maxHealth}生命。`, attackerSide);
        }
      }
      this.cleanDead();
      this.checkOutcome();
    }

    // 重甲：每次受到的伤害减少2，最低为1。
    mitigatedDamage(unit, amount) {
      if (!unit) return Math.max(0, amount);
      return unit.keywords?.includes("重甲") ? Math.max(1, amount - 2) : Math.max(0, amount);
    }

    damageUnit(side, row, column, amount, source, clean = true, kind = "system") {
      const unit = this.state[side].board[row][column];
      if (!unit) return;
      const dealt = this.mitigatedDamage(unit, amount);
      unit.health -= dealt;
      this.addLog(`${source}对第${column + 1}路${row === "front" ? "前排" : "后排"}的${unit.name}造成${dealt}点伤害${dealt < amount ? "（重甲减免）" : ""}；目标剩余${Math.max(0, unit.health)}/${unit.maxHealth}生命。`, kind);
      if (clean) { this.cleanDead(); this.checkOutcome(); }
    }

    cleanDead() {
      ["player", "enemy"].forEach(side => {
        ["front", "back"].forEach(row => {
          this.state[side].board[row].forEach((unit, column) => {
            if (unit && unit.health <= 0) {
              this.state[side].board[row][column] = null;
              this.sound("death");
              if (side === "enemy") this.state.enemyUnitsKilled += 1;
              const newlyInjured = side === "player" && CF.SaveSystem.injureCard(unit.cardId);
              this.addLog(`${unit.name}${side === "player" ? "重伤退场" : "阵亡"}，第${column + 1}路${row === "front" ? "前排" : "后排"}空出。`, side);
              if (newlyInjured) this.addLog(`${unit.name}已进入伤员名单，接受“救治伤员”前无法参加后续战斗。`, "system");
              if (side === "enemy" && row === "front" && this.enemyConfig.passive === "front_death_buff") this.eliteFrontDeathBuff();
              if (Rules.isLaneOpen(this.state[side].board, column)) this.addLog(`第${column + 1}路已完全清空，形成可攻击英雄的突破口。`, "system");
            }
          });
        });
      });
    }

    eliteFrontDeathBuff() {
      const allies = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(Boolean);
      if (!allies.length) return;
      const target = allies[Math.floor(Math.random() * allies.length)];
      target.attack += 1;
      this.sound("buff");
      this.addLog(`兽人队长触发「碎盾怒火」：${target.name}永久获得+1攻击，当前攻击力为${target.attack}。`, "boss");
    }

    allSlotsFull(board) { return [...board.front, ...board.back].every(Boolean); }
    canPlayerAct() { return this.state.phase === "player" && !this.state.busy && !this.state.ended; }

    async endTurn() {
      if (!this.canPlayerAct()) return;
      this.state.selected = null;
      this.state.player.board.front.concat(this.state.player.board.back).filter(Boolean).forEach(unit => { unit.tempAttack = 0; });
      this.sound("endTurn");
      this.state.phase = "enemy";
      this.state.busy = true;
      this.addLog(`你结束第${this.state.round}回合，保留${this.state.player.hand.length}张手牌；${this.enemyConfig.name}开始行动。`, "player");
      this.render();
      await wait(260);
      await this.enemyTurn();
    }

    async enemyTurn() {
      if (this.state.ended) return;
      if (this.state.rescueEpilogue) return this.rescueEpilogueTurn();
      const enemy = this.state.enemy;
      this.state.enemyTurns += 1;
      this.state.battleNotices = [];
      enemy.mana = enemy.maxMana;
      if (enemy.weapon) { enemy.weapon.ready = true; enemy.weapon.strikes = 0; }
      this.addLog(`${this.enemyConfig.name}第${this.state.enemyTurns}个行动回合开始：法力恢复为${enemy.mana}/${enemy.maxMana}，场上有${[...enemy.board.front, ...enemy.board.back].filter(Boolean).length}个随从。`, "enemy");
      this.bossTurnDialogue();
      [...enemy.board.front, ...enemy.board.back].filter(Boolean).forEach(unit => {
        unit.ready = unit.role !== "healer"; unit.justSummoned = false; unit.tempAttack = 0; unit.healUsed = false;
      });
      const regeneratingEnemies = [...enemy.board.front, ...enemy.board.back].filter(unit => unit?.keywords?.includes("再生") && unit.health < unit.maxHealth);
      let regeneratedEnemyHealth = 0;
      regeneratingEnemies.forEach(unit => { const before = unit.health; unit.health = Math.min(unit.maxHealth, unit.health + 2); regeneratedEnemyHealth += unit.health - before; });
      if (regeneratedEnemyHealth) this.addLog(`${regeneratingEnemies.length}个敌方再生随从在回合开始时共恢复${regeneratedEnemyHealth}点生命。`, "boss");
      if (!this.enemyConfig.noCards) {
        if (this.enemyConfig.handRefill) this.refillEnemyHand();
        else this.draw("enemy", 1);
      }
      this.render();
      await wait(BOSS_ACTION_DELAY);
      if (this.enemyConfig.passive === "wolf_king") {
        if (this.state.enemyTurns % 3 === 0) {
          this.summonFreeWolf("狼王号令");
          this.render();
          await wait(BOSS_ACTION_DELAY);
        }
        if (this.state.enemyTurns % 4 === 0) {
          this.wolfHowl();
          this.render();
          await wait(BOSS_ACTION_DELAY);
        }
      }
      if (this.enemyConfig.passive === "battle_horn") {
        this.battleHornReinforcements();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.passive === "goblin_queen") {
        this.goblinQueenReinforcements();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.passive === "bear_harvest" && this.state.enemyTurns % 2 === 0) {
        this.bearHarvestReinforcements();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.passive === "bear_matriarch") {
        this.bearMatriarchReinforcements();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.passive === "slime_regeneration") {
        this.slimeRegeneration();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.passive === "slime_sage") {
        this.slimeSageRegeneration();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (["wolf_raid", "wolf_matriarch"].includes(this.enemyConfig.passive)) {
        this.summonGreyRushWolf("灰狼增援");
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.arenaSkill) {
        this.useArenaEnemySkill();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (this.enemyConfig.trialId) {
        const trialStep = await CF.Trials.beforeEnemyActions(this);
        this.render();
        await wait(BOSS_ACTION_DELAY);
        if (trialStep?.exclusive || this.state.ended) return;
      }
      this.render();
      await wait(BOSS_ACTION_DELAY);

      let safety = 0;
      let playedCards = 0;
      while (!this.state.ended && !this.state.rescueEpilogue && safety < 12) {
        safety += 1;
        const index = this.findAiCard();
        if (index < 0) break;
        await this.aiPlayCard(index);
        playedCards += 1;
        await wait(BOSS_ACTION_DELAY);
      }
      if (!playedCards) this.addLog(`${this.enemyConfig.name}没有可用的卡牌，跳过出牌阶段（剩余${enemy.mana}/${enemy.maxMana}法力）。`, "enemy");
      if (!this.state.ended && !this.state.rescueEpilogue && this.useEnemyHeroSkill()) {
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }

      const positions = [];
      ["front", "back"].forEach(row => enemy.board[row].forEach((unit, column) => { if (unit?.ready) positions.push({ row, column, uid: unit.uid }); }));
      for (const pos of positions) {
        if (this.state.ended || this.state.rescueEpilogue) break;
        const unit = enemy.board[pos.row][pos.column];
        if (!unit || unit.uid !== pos.uid || !unit.ready) continue;
        this.aiAttack(pos.row, pos.column);
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      for (let strike = 0; strike < 2 && !this.state.ended && !this.state.rescueEpilogue && enemy.weapon?.ready; strike += 1) {
        this.aiWeaponAttack();
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      if (!this.state.ended && !this.state.rescueEpilogue) {
        this.addLog(`${this.enemyConfig.name}结束行动：打出${playedCards}张牌，剩余${enemy.mana}/${enemy.maxMana}法力，场上${[...enemy.board.front, ...enemy.board.back].filter(Boolean).length}个随从，手牌${enemy.hand.length}张。`, "enemy");
        this.startPlayerTurn();
      }
    }

    useArenaEnemySkill() {
      this.applyEnemySkill(CF.HERO_SKILLS?.[this.enemyConfig.arenaSkill], this.enemyConfig.arenaSkillLevel);
    }

    // 冒险首领的英雄技能：每个敌方行动回合免费发动一次，相当于被动（见 js/data/chapters.js 的 heroSkill）。
    enemyHeroSkill() {
      const config = this.enemyConfig.heroSkill;
      const base = config && CF.HERO_SKILLS?.[config.id];
      if (!base) return null;
      // 关卡数据表可以只为本关覆盖技能数值（overrides），描述文字随之重新生成。
      const skill = config.overrides && CF.makeHeroSkill ? CF.makeHeroSkill({ ...base, ...config.overrides }) : base;
      return { skill, level: Math.max(1, Math.min(3, Number(config.level) || 1)) };
    }

    // 技能此刻是否有意义：没有目标或用了也没有效果时不浪费法力。
    enemySkillUseful(skill) {
      const enemy = this.state.enemy;
      const player = this.state.player;
      const enemyUnits = [...enemy.board.front, ...enemy.board.back].filter(Boolean);
      if (skill.effect === "front_strike") return player.board.front.some(Boolean);
      if (skill.effect === "summon") return !this.allSlotsFull(enemy.board);
      if (skill.effect === "buff_unit" || skill.effect === "army_buff") return enemyUnits.length > 0;
      if (skill.effect === "heal_weakest") return enemyUnits.some(unit => unit.health < unit.maxHealth) || (!enemyUnits.length && enemy.hp < enemy.maxHp);
      if (skill.effect === "hero_heal") return enemy.hp < enemy.maxHp;
      if (skill.effect === "enemy_aoe" || skill.effect === "front_aoe") return [...player.board.front, ...player.board.back].some(Boolean);
      return true;
    }

    // 出牌之后、攻击之前免费发动；没有目标或用了也没效果时本回合跳过。
    // 数据表中配置了 fallbackSummon 的技能（例如史莱姆的潮汐愈合），在没有受伤的己方随从时改为召唤一个随从。
    useEnemyHeroSkill() {
      const heroSkill = this.enemyHeroSkill();
      if (!heroSkill || this.state.ended) return false;
      const fallback = this.enemyConfig.heroSkill.fallbackSummon;
      const hurtUnits = [...this.state.enemy.board.front, ...this.state.enemy.board.back].some(unit => unit && unit.health < unit.maxHealth);
      if (fallback && !hurtUnits) return this.summonHeroSkillFallback(heroSkill, fallback);
      if (!this.enemySkillUseful(heroSkill.skill)) return false;
      this.applyEnemySkill(heroSkill.skill, heroSkill.level);
      return true;
    }

    summonHeroSkillFallback(heroSkill, fallback) {
      if (this.allSlotsFull(this.state.enemy.board)) return false;
      const pick = values => Array.isArray(values) ? values[Math.min(heroSkill.level, values.length) - 1] : values;
      const attack = pick(fallback.attack);
      const health = pick(fallback.health);
      this.summonArenaToken(fallback.name, attack, health, fallback.image, `boss_skill_${heroSkill.skill.id}`, { icon: fallback.icon });
      this.addLog(`${this.state.enemy.name}发动Lv${heroSkill.level}「${heroSkill.skill.name}」：没有受伤的随从，召唤了一个${attack}攻/${health}血的${fallback.name}。`, "boss");
      return true;
    }

    applyEnemySkill(skill, skillLevel) {
      const enemy = this.state.enemy;
      const player = this.state.player;
      if (!skill) return;
      const level = Math.max(1, Math.min(3, Number(skillLevel) || 1));
      const amount = this.skillValue(skill, "amount", level);
      const attack = this.skillValue(skill, "attack", level);
      const health = this.skillValue(skill, "health", level);
      const heal = this.skillValue(skill, "heal", level);
      const draw = this.skillValue(skill, "draw", level);
      const mana = this.skillValue(skill, "mana", level);
      const heroDamage = this.skillValue(skill, "heroDamage", level);
      const selfDamage = this.skillValue(skill, "selfDamage", level);
      const enemyUnits = [];
      const playerUnits = [];
      ["front", "back"].forEach(row => {
        enemy.board[row].forEach((unit, column) => { if (unit) enemyUnits.push({ row, column, unit }); });
        player.board[row].forEach((unit, column) => { if (unit) playerUnits.push({ row, column, unit }); });
      });
      if (skill.effect === "front_strike") {
        const targets = playerUnits.filter(item => item.row === "front").sort((left, right) => left.unit.health - right.unit.health);
        if (targets[0]) {
          this.damageUnit("player", "front", targets[0].column, amount, skill.name, true, "boss");
          const splash = this.skillValue(skill, "splash", level);
          if (splash && player.board.back[targets[0].column]) this.damageUnit("player", "back", targets[0].column, splash, skill.name, false, "boss");
        }
        if (heroDamage) player.hp -= heroDamage;
        if (heal) enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      } else if (skill.effect === "hero_damage") {
        player.hp -= amount;
        if (heal) enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        if (draw) this.draw("enemy", draw);
        if (selfDamage) enemy.hp -= selfDamage;
      } else if (skill.effect === "hero_heal") {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + amount);
        if (draw) this.draw("enemy", draw);
      } else if (skill.effect === "summon") {
        const count = Math.max(1, this.skillValue(skill, "count", level));
        for (let index = 0; index < count; index += 1) this.summonArenaToken(skill.tokenName, attack, health, "assets/cards/recruit.png", `arena_skill_${skill.id}`, skill);
      } else if (skill.effect === "weakest_damage") {
        playerUnits.sort((left, right) => left.unit.health - right.unit.health);
        if (playerUnits[0]) this.damageUnit("player", playerUnits[0].row, playerUnits[0].column, amount, skill.name, true, "boss");
        else player.hp -= amount;
        if (heroDamage) player.hp -= heroDamage;
        if (heal) enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        if (draw) this.draw("enemy", draw);
      } else if (skill.effect === "enemy_aoe") {
        playerUnits.forEach(item => this.damageUnit("player", item.row, item.column, amount, skill.name, false, "boss"));
        if (heroDamage) player.hp -= heroDamage;
        if (heal) enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      } else if (skill.effect === "draw") {
        if (selfDamage) enemy.hp -= selfDamage;
        if (draw) this.draw("enemy", draw);
        if (mana) enemy.mana = Math.min(enemy.maxMana, enemy.mana + mana);
      } else if (skill.effect === "buff_unit") {
        enemyUnits.sort((left, right) => left.unit.attack - right.unit.attack);
        const target = enemyUnits[0]?.unit;
        if (target) {
          target.attack += attack; target.health += health; target.maxHealth += health;
          if (skill.keyword && !target.keywords.includes(skill.keyword)) target.keywords.push(skill.keyword);
        }
      } else if (skill.effect === "army_buff") {
        enemyUnits.forEach(({ unit }) => {
          if (skill.permanent) unit.attack += attack;
          else unit.tempAttack = (unit.tempAttack || 0) + attack;
          unit.health += health; unit.maxHealth += health;
        });
        if (draw) this.draw("enemy", draw);
      } else if (skill.effect === "front_aoe") {
        player.board.front.forEach((unit, column) => { if (unit) this.damageUnit("player", "front", column, amount, skill.name, false, "boss"); });
        if (heroDamage) player.hp -= heroDamage;
      } else if (skill.effect === "heal_weakest") {
        enemyUnits.sort((left, right) => (left.unit.health / left.unit.maxHealth) - (right.unit.health / right.unit.maxHealth));
        if (enemyUnits[0]) enemyUnits[0].unit.health = Math.min(enemyUnits[0].unit.maxHealth, enemyUnits[0].unit.health + heal);
        else enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        if (draw) this.draw("enemy", draw);
      } else if (skill.effect === "mana") {
        enemy.mana = Math.min(enemy.maxMana, enemy.mana + mana);
        if (draw) this.draw("enemy", draw);
      } else if (skill.effect === "weapon") {
        if (enemy.weapon) {
          enemy.weapon.attack += attack;
          const durability = this.skillValue(skill, "durability", level);
          enemy.weapon.durability += durability; enemy.weapon.maxDurability += durability;
        } else this.draw("enemy", 1);
      } else if (skill.effect === "execute") {
        playerUnits.sort((left, right) => left.unit.health - right.unit.health);
        if (playerUnits[0]) {
          const threshold = this.skillValue(skill, "threshold", level);
          const bonus = playerUnits[0].unit.health <= threshold ? this.skillValue(skill, "bonus", level) : 0;
          this.damageUnit("player", playerUnits[0].row, playerUnits[0].column, amount + bonus, skill.name, true, "boss");
        } else player.hp -= amount;
      } else if (skill.effect === "heal_all") {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        enemyUnits.forEach(({ unit }) => {
          unit.health = Math.min(unit.maxHealth, unit.health + amount);
          unit.tempAttack = (unit.tempAttack || 0) + attack;
        });
      }
      this.cleanDead();
      this.addLog(`${enemy.name}发动Lv${level}「${skill.name}」：${skill.playerDescription(level)}`, "boss");
      this.checkOutcome();
    }

    summonArenaToken(name, attack, health, image = "assets/cards/recruit.png", cardId = "arena_token", options = {}) {
      const board = this.state.enemy.board;
      const slot = this.aiChooseSlot({ health, keywords: options.keyword ? [options.keyword] : [], combatStyle: options.combatStyle || "melee" });
      const column = slot ? slot.column : -1;
      const row = slot?.row || "front";
      if (column < 0) return false;
      board[row][column] = {
        uid: `arena-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cardId, name, icon: options.icon || "🛡️", image,
        attack, health, maxHealth: health, level: 1, keywords: options.keyword ? [options.keyword] : [], combatStyle: options.combatStyle || "melee", role: "",
        ready: Boolean(options.rush), justSummoned: !options.rush, tempAttack: 0, healUsed: false
      };
      return true;
    }

    findAiCard() {
      const enemy = this.state.enemy;
      let best = -1;
      let bestCost = -1;
      enemy.hand.forEach((card, index) => {
        const cost = this.effectiveCost(card, "enemy");
        if (cost > enemy.mana || !this.aiCardPlayable(card)) return;
        if (cost > bestCost) { best = index; bestCost = cost; }
      });
      return best;
    }

    aiCardPlayable(card) {
      if (card.type === "unit") return !this.allSlotsFull(this.state.enemy.board);
      if (card.type === "weapon") return !this.state.enemy.weapon;
      if (["damage", "chain_damage", "execute_draw", "poison", "row_blast", "banish", "enemy_aoe", "bear_paw", "bee_swarm", "earth_tremor", "viscous_prison", "forest_engulfment"].includes(card.effect)) return [...this.state.player.board.front, ...this.state.player.board.back].some(Boolean);
      if (card.effect === "front_aoe") return this.state.player.board.front.some(Boolean);
      if (["summon_wolves", "summon_recruits", "goblin_tide", "queen_final", "bear_ambush", "bear_god", "slime_division", "verdant_flood", "all_returns_to_gel"].includes(card.effect)) return !this.allSlotsFull(this.state.enemy.board);
      if (card.effect === "rescue") return this.state.enemy.hand.length < 10 && [...this.state.enemy.board.front, ...this.state.enemy.board.back].some(unit => unit && CF.CARD_LIBRARY[unit.cardId]);
      if (["draw_cards", "treasury", "harvest_feast", "moonpool_surge"].includes(card.effect)) return true;
      if (["army_buff", "wheat_barrier", "autumn_rally", "spore_assimilation", "regeneration_domain"].includes(card.effect)) return [...this.state.enemy.board.front, ...this.state.enemy.board.back].some(Boolean);
      if (["heal", "buff", "swap_stats", "fortify", "group_heal", "honey_salve", "growth_blessing", "slime_mend", "gel_barrier"].includes(card.effect)) return this.state.enemy.hp < this.state.enemy.maxHp || [...this.state.enemy.board.front, ...this.state.enemy.board.back].some(Boolean);
      return false;
    }

    async aiPlayCard(index) {
      const card = this.state.enemy.hand[index];
      if (!card) return;
      const cost = this.effectiveCost(card, "enemy");
      if (card.type === "weapon") {
        this.equipWeapon("enemy", index);
        return;
      } else if (card.type === "unit") {
        const slot = this.aiChooseSlot(card);
        if (slot) { this.summon("enemy", index, slot.row, slot.column); return; }
      } else if (card.effect === "damage") {
        const targets = [];
        ["front", "back"].forEach(row => this.state.player.board[row].forEach((unit, column) => { if (unit) targets.push({ row, column, unit }); }));
        targets.sort((a, b) => a.unit.health - b.unit.health);
        const target = targets[0];
        this.state.enemy.mana -= cost;
        this.state.enemy.hand.splice(index, 1);
        this.recordCardPlayed("enemy", card);
        this.sound("darkSpell");
        this.addLog(`${this.enemyConfig.name}施放${card.name}（${cost}费，剩余${this.state.enemy.mana}/${this.state.enemy.maxMana}法力），目标为第${target.column + 1}路${target.row === "front" ? "前排" : "后排"}的${target.unit.name}。`, "enemy");
        this.damageUnit("player", target.row, target.column, card.value, card.name, true, "enemy");
      } else if (card.effect === "front_aoe") {
        this.state.enemy.mana -= cost;
        this.state.enemy.hand.splice(index, 1);
        this.recordCardPlayed("enemy", card);
        this.sound("volley");
        const targetCount = this.state.player.board.front.filter(Boolean).length;
        this.addLog(`${this.enemyConfig.name}施放${card.name}（${cost}费），命中我方前排${targetCount}个目标，每个造成${card.value}点伤害。`, "enemy");
        this.state.player.board.front.forEach((unit, column) => { if (unit) this.damageUnit("player", "front", column, card.value, card.name, false, "enemy"); });
        this.cleanDead(); this.checkOutcome();
      } else if (card.effect === "summon_wolves") {
        this.state.enemy.mana -= cost;
        this.state.enemy.hand.splice(index, 1);
        this.recordCardPlayed("enemy", card);
        this.sound("bossHowl");
        this.addLog(`${this.enemyConfig.name}施放${card.name}（${cost}费，剩余${this.state.enemy.mana}/${this.state.enemy.maxMana}法力），尝试召唤两只幼狼。`, "enemy");
        this.summonFreeWolf("狼群"); this.summonFreeWolf("狼群");
      } else if (card.type === "spell") {
        this.aiPlayArenaSpell(index, card);
      }
      this.render();
    }

    aiPlayArenaSpell(index, card) {
      const enemy = this.state.enemy;
      const enemyUnits = [...enemy.board.front, ...enemy.board.back].filter(Boolean);
      const enemyTargets = [];
      ["front", "back"].forEach(row => enemy.board[row].forEach((unit, column) => { if (unit) enemyTargets.push({ row, column, unit }); }));
      const playerTargets = [];
      ["front", "back"].forEach(row => this.state.player.board[row].forEach((unit, column) => { if (unit) playerTargets.push({ row, column, unit }); }));
      const spend = () => { enemy.mana -= this.effectiveCost(card, "enemy"); enemy.hand.splice(index, 1); this.recordCardPlayed("enemy", card); };
      if (["chain_damage", "execute_draw"].includes(card.effect) && playerTargets.length) {
        playerTargets.sort((a, b) => a.unit.health - b.unit.health);
        const target = playerTargets[0]; spend();
        this.damageUnit("player", target.row, target.column, card.value, card.name, true, "enemy");
        if (card.effect === "chain_damage") playerTargets.slice(1, 3).forEach(item => this.damageUnit("player", item.row, item.column, card.splash, card.name, false, "enemy"));
        if (card.effect === "execute_draw" && target.unit.health <= 0) this.draw("enemy", 1);
      } else if (card.effect === "heal") {
        spend();
        if (enemy.hp < enemy.maxHp) enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heroValue);
        else if (enemyUnits[0]) { enemyUnits[0].health = Math.min(enemyUnits[0].maxHealth, enemyUnits[0].health + card.value); }
      } else if (["buff", "fortify"].includes(card.effect) && enemyUnits[0]) {
        spend();
        if (card.effect === "buff") enemyUnits[0].attack += card.value;
        else { enemyUnits[0].health += card.health; enemyUnits[0].maxHealth += card.health; }
      } else if (card.effect === "swap_stats" && enemyUnits[0]) {
        spend(); const unit = enemyUnits[0]; [unit.attack, unit.health] = [unit.health, unit.attack]; unit.maxHealth = Math.max(unit.maxHealth, unit.health);
      } else if (card.effect === "group_heal") {
        spend(); enemyUnits.forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.value); });
      } else if (card.effect === "summon_recruits") {
        spend(); this.summonArenaToken("王庭新兵", card.tokenAttack, card.tokenHealth); this.summonArenaToken("王庭新兵", card.tokenAttack, card.tokenHealth);
      } else if (card.effect === "draw_cards") {
        spend(); this.draw("enemy", card.count);
      } else if (card.effect === "poison" && playerTargets.length) {
        playerTargets.sort((a, b) => a.unit.health - b.unit.health);
        const target = playerTargets[0]; spend();
        this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy");
        if (target.unit.health > 0) target.unit.attack = Math.max(0, target.unit.attack - card.weaken);
      } else if (card.effect === "rescue" && enemyTargets.length && enemy.hand.length < 10) {
        const target = enemyTargets.find(item => CF.CARD_LIBRARY[item.unit.cardId]);
        if (!target) return;
        spend(); enemy.board[target.row][target.column] = null;
        enemy.hand.push({ ...CF.getCard(target.unit.cardId, { level: target.unit.level }), instanceId: `${target.unit.cardId}-ai-rescued-${Date.now()}` });
        this.draw("enemy", 1);
      } else if (card.effect === "row_blast" && playerTargets.length) {
        const row = this.state.player.board.front.filter(Boolean).length >= this.state.player.board.back.filter(Boolean).length ? "front" : "back";
        spend(); this.state.player.board[row].forEach((unit, column) => { if (unit) this.damageUnit("player", row, column, card.value, card.name, false, "enemy"); });
      } else if (card.effect === "goblin_tide") {
        spend(); [0, 1, 2].forEach(() => this.summonArenaToken("绿潮斗士", card.tokenAttack, card.tokenHealth));
      } else if (card.effect === "army_buff" && enemyUnits.length) {
        spend(); enemyUnits.forEach(unit => { unit.attack += card.attack; unit.health += card.health; unit.maxHealth += card.health; });
      } else if (card.effect === "banish" && playerTargets.length) {
        playerTargets.sort((a, b) => b.unit.attack - a.unit.attack);
        const target = playerTargets[0]; spend();
        this.state.player.board[target.row][target.column] = null;
        if (this.state.player.hand.length < 10 && CF.CARD_LIBRARY[target.unit.cardId]) this.state.player.hand.push({ ...CF.getCard(target.unit.cardId, { level: target.unit.level }, target.unit.bond), instanceId: `${target.unit.cardId}-ai-banished-${Date.now()}` });
      } else if (card.effect === "enemy_aoe" && playerTargets.length) {
        spend(); playerTargets.forEach(target => this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy"));
      } else if (card.effect === "treasury") {
        spend(); enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal); this.draw("enemy", 2);
      } else if (card.effect === "queen_final") {
        spend(); playerTargets.forEach(target => this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy"));
        this.cleanDead(); this.summonArenaToken("王庭幻卫", card.tokenAttack, card.tokenHealth); this.summonArenaToken("王庭幻卫", card.tokenAttack, card.tokenHealth);
      } else if (card.effect === "honey_salve") {
        spend();
        if (enemyUnits[0]) { enemyUnits[0].health = Math.min(enemyUnits[0].maxHealth, enemyUnits[0].health + card.heal); enemyUnits[0].attack += card.attack; }
        else enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal);
      } else if (card.effect === "growth_blessing" && enemyUnits[0]) {
        spend(); enemyUnits[0].attack += card.attack; enemyUnits[0].health += card.health; enemyUnits[0].maxHealth += card.health;
      } else if (card.effect === "bear_paw" && playerTargets.length) {
        playerTargets.sort((a, b) => a.unit.health - b.unit.health);
        const target = playerTargets[0]; spend();
        this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy");
        this.state.player.board[target.row].forEach((unit, column) => { if (unit && column !== target.column) this.damageUnit("player", target.row, column, card.splash, card.name, false, "enemy"); });
      } else if (card.effect === "wheat_barrier" && enemyUnits.length) {
        spend(); enemyUnits.forEach(unit => { unit.health += card.health; unit.maxHealth += card.health; });
        enemy.board.front.filter(Boolean).forEach(unit => { if (!unit.keywords.includes("守卫")) unit.keywords.push("守卫"); });
      } else if (["bee_swarm", "earth_tremor"].includes(card.effect) && playerTargets.length) {
        spend(); playerTargets.forEach(target => this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy"));
        playerTargets.forEach(target => { if (target.unit.health > 0) target.unit.attack = Math.max(0, target.unit.attack - card.weaken); });
      } else if (card.effect === "harvest_feast") {
        spend(); enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal);
        enemyUnits.forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        this.draw("enemy", card.count);
      } else if (card.effect === "bear_ambush") {
        spend(); [0, 1, 2].forEach(() => this.summonArenaToken("谷仓熊战士", card.tokenAttack, card.tokenHealth, "assets/cards/chapter3/barn-charger.png", "barn_bear_token"));
      } else if (card.effect === "autumn_rally" && enemyUnits.length) {
        spend(); enemyUnits.forEach(unit => { unit.attack += card.attack; unit.health += card.health; unit.maxHealth += card.health; });
      } else if (card.effect === "bear_god") {
        spend(); enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal);
        [0, 1, 2, 3].forEach(() => this.summonArenaToken("熊神化身", card.tokenAttack, card.tokenHealth, "assets/cards/chapter3/golden-sheaf-king.png", "bear_god_avatar"));
      } else if (card.effect === "slime_mend") {
        spend();
        const wounded = enemyTargets.filter(target => target.unit.health < target.unit.maxHealth).sort((a, b) => (a.unit.health / a.unit.maxHealth) - (b.unit.health / b.unit.maxHealth));
        if (wounded[0]) wounded[0].unit.health = Math.min(wounded[0].unit.maxHealth, wounded[0].unit.health + card.heal);
        else enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heroValue);
      } else if (card.effect === "gel_barrier" && enemyUnits.length) {
        spend();
        enemyUnits.sort((a, b) => a.health - b.health);
        enemyUnits[0].health += card.health; enemyUnits[0].maxHealth += card.health;
        if (!enemyUnits[0].keywords.includes("再生")) enemyUnits[0].keywords.push("再生");
      } else if (card.effect === "slime_division") {
        spend();
        [0, 1].forEach(() => this.summonArenaToken("软泥分身", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/dewdrop-scout.png", "slime_splinter"));
      } else if (card.effect === "moonpool_surge") {
        spend(); enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal);
        enemyUnits.forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        if (card.count) this.draw("enemy", card.count);
      } else if (card.effect === "viscous_prison" && playerTargets.length) {
        playerTargets.sort((a, b) => b.unit.attack - a.unit.attack);
        const target = playerTargets[0]; spend();
        target.unit.attack = Math.max(0, target.unit.attack - card.weaken); target.unit.ready = false;
      } else if (card.effect === "spore_assimilation" && enemyUnits.length) {
        spend();
        enemyUnits.forEach(unit => { unit.maxHealth += card.health; unit.health = Math.min(unit.maxHealth, unit.health + card.health + card.heal); });
        this.draw("enemy", 1);
      } else if (card.effect === "forest_engulfment" && playerTargets.length) {
        spend();
        playerTargets.forEach(target => this.damageUnit("player", target.row, target.column, card.value, card.name, false, "enemy"));
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + playerTargets.length * card.heal);
      } else if (card.effect === "regeneration_domain" && enemyUnits.length) {
        spend();
        enemyUnits.forEach(unit => {
          unit.maxHealth += card.health; unit.health = Math.min(unit.maxHealth, unit.health + card.health + card.heal);
          if (!unit.keywords.includes("再生")) unit.keywords.push("再生");
        });
      } else if (card.effect === "verdant_flood") {
        spend();
        [0, 1, 2].forEach(() => this.summonArenaToken("洪流胶卫", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/moss-gel-guard.png", "verdant_flood_guard"));
      } else if (card.effect === "all_returns_to_gel") {
        spend(); enemy.hp = Math.min(enemy.maxHp, enemy.hp + card.heal);
        enemyUnits.forEach(unit => { unit.health = Math.min(unit.maxHealth, unit.health + card.heal); });
        [0, 1, 2, 3].forEach(() => this.summonArenaToken("森灵凝胶", card.tokenAttack, card.tokenHealth, "assets/cards/chapter4/azure-slime-king.png", "forest_gel_spirit"));
      } else return;
      this.addLog(`${this.enemyConfig.name}施放${card.name}，剩余${enemy.mana}/${enemy.maxMana}法力。`, "enemy");
      this.cleanDead(); this.checkOutcome();
    }

    // 敌方攻击目标：远程单位不会受到反击，优先点杀我方随从（能击杀时挑威胁最大的，其次是我方远程单位与残血单位），
    // 只有场上没有可攻击的随从、或这一击就能击杀英雄时才打脸。
    // 近战单位有突破口就突脸；否则先处理我方前排的近战随从，清掉之后优先攻击我方远程随从（远程随从无法反击）。
    aiPickUnitTarget(attacker, targets) {
      const ranged = this.isRanged(attacker);
      const damage = this.currentAttack(attacker);
      if (!ranged) {
        const frontMelee = targets.filter(entry => entry.row === "front" && !this.isRanged(entry.unit));
        const rangedTargets = targets.filter(entry => this.isRanged(entry.unit));
        const pool = frontMelee.length ? frontMelee : rangedTargets.length ? rangedTargets : targets;
        const kills = entry => this.mitigatedDamage(entry.unit, damage) >= entry.unit.health;
        return [...pool].sort((a, b) => Number(kills(b)) - Number(kills(a)) || (frontMelee.length ? a.unit.health - b.unit.health : this.currentAttack(b.unit) - this.currentAttack(a.unit) || a.unit.health - b.unit.health))[0];
      }
      const score = ({ unit }) => {
        const dealt = this.mitigatedDamage(unit, damage);
        const kills = dealt >= unit.health;
        const unitRanged = unit.combatStyle === "ranged" || unit.keywords?.includes("远程");
        return (kills ? 1000 + this.currentAttack(unit) * 10 : dealt * 10 - unit.health) + (unitRanged ? 50 : 0);
      };
      return [...targets].sort((a, b) => score(b) - score(a))[0];
    }

    aiAttack(row, column) {
      const attacker = this.state.enemy.board[row][column];
      if (!attacker || attacker.role === "healer") return;
      const targets = Rules.legalUnitTargets(attacker, this.state.player.board, column);
      const ranged = attacker.combatStyle === "ranged" || attacker.keywords.includes("远程");
      const heroOpen = !attacker.justSummoned && Rules.canAttackHero(this.state.player.board, column);
      const lethal = heroOpen && this.currentAttack(attacker) >= this.state.player.hp;
      const canHitHero = heroOpen && (!ranged || lethal || !targets.length);
      if (canHitHero) {
        const lanes = [column];
        const damage = this.currentAttack(attacker);
        this.state.player.hp -= damage;
        attacker.ready = false;
        this.sound(attacker.combatStyle === "ranged" || attacker.keywords.includes("远程") ? "ranged" : "melee");
        this.sound("heroHit");
        this.addLog(`${attacker.name}从第${column + 1}路${row === "front" ? "前排" : "后排"}发起攻击，通过第${lanes[0] + 1}路突破口命中我方英雄，造成${damage}点伤害；我方英雄剩余${Math.max(0, this.state.player.hp)}/${this.state.player.maxHp}生命。`, "enemy");
        this.checkOutcome();
        return;
      }
      if (!targets.length) {
        attacker.ready = false;
        this.addLog(`${attacker.name}在第${column + 1}路${row === "front" ? "前排" : "后排"}找不到合法目标，放弃本次攻击。`, "enemy");
        return;
      }
      const target = this.aiPickUnitTarget(attacker, targets);
      this.performUnitAttack("enemy", row, column, "player", target.row, target.column);
    }

    // 敌方武器与随从同样的规则：远程武器优先攻击我方随从，近战武器有突破口就打脸。
    aiWeaponAttack() {
      const weapon = this.state.enemy.weapon;
      if (!weapon?.ready) return;
      const targets = Rules.legalUnitTargets(weapon, this.state.player.board);
      const ranged = weapon.combatStyle === "ranged" || weapon.keywords.includes("远程");
      const heroOpen = Rules.canAttackHero(this.state.player.board);
      const lethal = heroOpen && weapon.attack >= this.state.player.hp;
      if (heroOpen && (!ranged || lethal || !targets.length)) {
        this.performWeaponAttackHero("enemy", "player");
        return;
      }
      const target = targets.length ? this.aiPickUnitTarget(weapon, targets) : null;
      if (target) this.performWeaponAttack("enemy", "player", target.row, target.column);
      else weapon.ready = false;
    }

    summonFreeWolf(source = "狼王号令") {
      const board = this.state.enemy.board;
      const slot = this.aiChooseSlot({ attack: 1, health: 2 });
      const column = slot ? slot.column : -1;
      const row = slot?.row || "front";
      if (column < 0) {
        this.addLog(`${source}尝试召唤幼狼，但敌方战场没有空位。`, "boss");
        return false;
      }
      const card = CF.getCard("wolf_cub", { level: 1 });
      board[row][column] = {
        uid: `wolf-${Date.now()}-${Math.random()}`, cardId: card.id, name: card.name, icon: card.icon,
        image: card.image, portrait: card.portrait,
        attack: card.attack, health: card.health, maxHealth: card.health, level: 1, keywords: [], combatStyle: "melee",
        ready: false, justSummoned: true, tempAttack: 0
      };
      this.sound("summon");
      this.addLog(`${this.enemyConfig.name}通过「${source}」免费召唤幼狼到第${column + 1}路${row === "front" ? "前排" : "后排"}（1攻/2血）。`, "boss");
      return true;
    }

    summonGreyRushWolf(source = "灰狼增援") {
      const board = this.state.enemy.board;
      const slot = this.aiChooseSlot({ attack: 4, health: 1, keywords: ["突袭"] });
      const column = slot ? slot.column : -1;
      const row = slot?.row || "front";
      if (column < 0) {
        this.addLog(`${this.enemyConfig.name}发动「${source}」，但敌方战场已经占满。`, "boss");
        return false;
      }
      board[row][column] = {
        uid: `grey-rush-wolf-${Date.now()}-${Math.random()}`, cardId: "chapter5_grey_rush_wolf", name: "突击灰狼", icon: "🐺",
        image: "assets/cards/chapter5/wolf-card-01.png", portrait: "assets/cards/chapter5/wolf-card-01.png",
        attack: 4, health: 1, maxHealth: 1, level: 1, keywords: ["突袭"], combatStyle: "melee", role: "",
        ready: true, justSummoned: true, tempAttack: 0, healUsed: false
      };
      this.sound("summon");
      this.addLog(`${this.enemyConfig.name}发动「${source}」：在第${column + 1}路${row === "front" ? "前排" : "后排"}召唤突击灰狼（4攻/1血），它可以立即攻击随从。`, "boss");
      this.toast("🐺 灰狼增援：召唤4/1突击灰狼", "bad");
      return true;
    }

    summonFreeGoblin(source = "无尽绿潮", overrideStats = null) {
      const board = this.state.enemy.board;
      const slot = this.aiChooseSlot({ attack: 2, health: overrideStats?.health ?? 1 });
      const column = slot ? slot.column : -1;
      const row = slot?.row || "front";
      if (column < 0) {
        this.addLog(`${source}试图召唤普通哥布林，但敌方战场已经占满。`, "boss");
        return false;
      }
      const card = CF.getCard("goblin", { level: this.enemyConfig.enemyCardLevel || 1 });
      const attack = overrideStats?.attack ?? card.attack;
      const health = overrideStats?.health ?? card.health;
      board[row][column] = {
        uid: `queen-goblin-${Date.now()}-${Math.random()}`, cardId: card.id, name: card.name, icon: card.icon,
        image: card.image, portrait: card.portrait,
        attack, health, maxHealth: health, level: overrideStats?.level ?? card.level,
        keywords: [...card.keywords], combatStyle: card.combatStyle, role: card.role || "",
        ready: false, justSummoned: true, tempAttack: 0, healUsed: false
      };
      this.sound("summon");
      this.addLog(`${this.enemyConfig.name}通过「${source}」免费召唤普通哥布林到第${column + 1}路${row === "front" ? "前排" : "后排"}（${attack}攻/${health}血）。`, "boss");
      return true;
    }

    battleHornReinforcements() {
      const summoned = this.summonFreeGoblin("战斗号角", { attack: 2, health: 2, level: 1 }) ? 1 : 0;
      this.sound("summon");
      this.addLog(`${this.enemyConfig.name}发动「战斗号角」：本回合召唤${summoned}个2攻/2血哥布林。`, "boss");
      this.toast(`📯 战斗号角：召唤${summoned}个2/2哥布林`, "bad");
    }

    goblinQueenReinforcements() {
      const summoned = [this.summonFreeGoblin(), this.summonFreeGoblin()].filter(Boolean).length;
      this.sound("bossHowl");
      this.addLog(`翠影女王发动「无尽绿潮」：本回合召唤${summoned}个普通哥布林。`, "boss");
      this.toast(`👺 无尽绿潮：召唤${summoned}个哥布林`, "bad");
    }

    summonFreeBear(name = "田园熊民", attack = 3, health = 4, image = "assets/cards/chapter3/wheat-cub.png") {
      const summoned = this.summonArenaToken(name, attack, health, image, "farm_bear_token");
      if (summoned) this.addLog(`${this.enemyConfig.name}召来${attack}/${health}的${name}。`, "boss");
      return summoned;
    }

    bearHarvestReinforcements() {
      const stage = Math.max(0, Number(this.enemyConfig.chapterStage) || 0);
      const attack = 3 + Math.floor(stage / 7);
      const health = 4 + Math.floor(stage / 5);
      const summoned = this.summonFreeBear("巡田熊民", attack, health) ? 1 : 0;
      this.sound("summon");
      this.addLog(`${this.enemyConfig.name}发动「农垦本能」：召唤${summoned}个${attack}/${health}巡田熊民。`, "boss");
      this.toast(`🌾 农垦本能：召唤${summoned}个熊族随从`, "bad");
    }

    bearMatriarchReinforcements() {
      const summoned = this.summonFreeBear("丰穗近卫", 5, 7, "assets/cards/chapter3/harvest-war-bear.png") ? 1 : 0;
      let strengthened = 0;
      if (this.state.enemyTurns % 3 === 0) {
        const bears = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(Boolean);
        bears.forEach(unit => { unit.attack += 1; unit.health += 2; unit.maxHealth += 2; });
        strengthened = bears.length;
      }
      this.sound("bossHowl");
      this.addLog(`丰穗战母发动「护田战令」：召唤${summoned}个5/7丰穗近卫${strengthened ? `，并使${strengthened}个熊族随从获得+1/+2` : ""}。`, "boss");
      this.toast(`🐻 护田战令：召唤${summoned}个丰穗近卫`, "bad");
    }

    slimeRegeneration() {
      const stage = Math.max(0, Number(this.enemyConfig.chapterStage) || 0);
      const heroHeal = 4 + Math.floor(stage / 5);
      const unitHeal = 2 + Math.floor(stage / 8);
      const before = this.state.enemy.hp;
      this.state.enemy.hp = Math.min(this.state.enemy.maxHp, this.state.enemy.hp + heroHeal);
      const slimes = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(Boolean);
      let restored = 0;
      slimes.forEach(unit => { const unitBefore = unit.health; unit.health = Math.min(unit.maxHealth, unit.health + unitHeal); restored += unit.health - unitBefore; });
      this.sound("heal");
      this.addLog(`${this.enemyConfig.name}发动「胶质再生」：首领恢复${this.state.enemy.hp - before}点生命，${slimes.length}个史莱姆随从共恢复${restored}点生命。`, "boss");
      this.toast(`💧 胶质再生：首领与随从恢复生命`, "bad");
    }

    slimeSageRegeneration() {
      const before = this.state.enemy.hp;
      this.state.enemy.hp = Math.min(this.state.enemy.maxHp, this.state.enemy.hp + 10);
      const slimes = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(Boolean);
      let restored = 0;
      slimes.forEach(unit => { const unitBefore = unit.health; unit.health = Math.min(unit.maxHealth, unit.health + 5); restored += unit.health - unitBefore; });
      let summoned = 0;
      if (this.state.enemyTurns % 3 === 0) {
        [0, 1].forEach(() => { if (this.summonArenaToken("碧露近卫", 4, 12, "assets/cards/chapter4/moonpool-sentinel.png", "sage_gel_guard")) summoned += 1; });
      }
      this.sound("heal");
      this.addLog(`碧露大贤者发动「不灭胶质」：自身恢复${this.state.enemy.hp - before}点生命，随从共恢复${restored}点生命${summoned ? `，并分裂出${summoned}个4/12碧露近卫` : ""}。`, "boss");
      this.toast(`🫧 不灭胶质：恢复${summoned ? `并召唤${summoned}名近卫` : "生命"}`, "bad");
    }

    wolfHowl() {
      const wolves = [...this.state.enemy.board.front, ...this.state.enemy.board.back].filter(unit => unit && ["wolf_cub", "wild_wolf", "dire_wolf"].includes(unit.cardId));
      wolves.forEach(unit => { unit.attack += 1; });
      this.sound("bossHowl");
      this.addLog(`森林狼王发动「裂月咆哮」：${wolves.length ? `${wolves.length}个狼类随从永久获得+1攻击（${wolves.map(unit => `${unit.name}现为${unit.attack}攻`).join("、")}）。` : "战场上没有狼类随从，技能未强化任何单位。"}`, "boss");
      this.toast("🐺 狼王咆哮发动！", "bad");
    }

    startRescueEpilogue() {
      const dialogue = this.enemyConfig.dialogue;
      const rescue = dialogue?.rescueEpilogue;
      if (!rescue || this.state.rescueEpilogue) return false;
      const guards = (rescue.officers || []).slice(1, 5);
      const mode = rescue.mode || "escape";
      const officerAttack = Number(rescue.officerAttack) || 10;
      const officerHealth = Number(rescue.officerHealth) || 200;
      this.state.rescueEpilogue = { turns: 0, config: rescue, mode };
      this.state.selected = null;
      this.state.enemy.hp = 0;
      this.state.enemy.mana = 0;
      this.state.enemy.hand = [];
      this.state.enemy.deck = [];
      this.state.enemy.weapon = null;
      this.state.enemy.board = emptyBoard();
      guards.forEach((officer, column) => {
        this.state.enemy.board.front[column] = {
          uid: `succubus-officer-${column}-${Date.now()}`,
          cardId: "succubus_officer",
          name: officer.name,
          icon: "😈",
          image: officer.portrait,
          attack: officerAttack,
          health: officerHealth,
          maxHealth: officerHealth,
          level: 5,
          keywords: ["魅魔军官"],
          combatStyle: "melee",
          role: "rescue_guard",
          ready: mode === "counterattack",
          justSummoned: false,
          tempAttack: 0,
          healUsed: false
        };
      });
      this.state.phase = "player";
      this.state.busy = true;
      this.sound("darkSpell");
      this.addLog(`五位魅魔军官撕开空间裂隙：一人带走${this.enemyConfig.name}，其余四人以${officerAttack}攻/${officerHealth}血的姿态${mode === "counterattack" ? "接管战场，准备主动反击" : "封锁全部前排"}。`, "system");
      if (dialogue.defeat) {
        this.state.bossDialogueShown.defeat = true;
        this.bossSpeak(dialogue.defeat);
      }
      const arrival = rescue.arrival || [];
      arrival.forEach((line, index) => {
        setTimeout(() => {
          if (this.state.ended || !this.state.rescueEpilogue) return;
          this.bossSpeak(line.text, line);
          if (index === arrival.length - 1) {
            this.addLog(mode === "counterattack"
              ? "四位魅魔军官拒绝撤离，以20点攻击力立即展开反击；小队将被杀退，但第五关仍会按通关结算。"
              : "四位魅魔军官没有进攻，只维持结界，为同伴撤离争取两回合。", "boss");
            this.render();
            if (mode === "counterattack") this.counterattackEpilogueTurn();
            else this.state.busy = false;
          }
        }, BOSS_DIALOGUE_SEQUENCE_GAP * (index + 1));
      });
      if (!arrival.length) {
        if (mode === "counterattack") this.counterattackEpilogueTurn();
        else this.state.busy = false;
      }
      this.render();
      return true;
    }

    async rescueEpilogueTurn() {
      const epilogue = this.state.rescueEpilogue;
      if (!epilogue || this.state.ended) return;
      if (epilogue.mode === "counterattack") return this.counterattackEpilogueTurn();
      epilogue.turns += 1;
      this.state.enemyTurns += 1;
      const line = epilogue.config.turns?.[epilogue.turns - 1];
      if (line) this.bossSpeak(line.text, line);
      this.addLog(`魅魔救援结界维持到第${epilogue.turns}/2回合；四名军官仍站在前排，没有发动攻击。`, "boss");
      this.render();
      await wait(BOSS_ACTION_DELAY);
      if (epilogue.turns >= 2) this.completeRescueEpilogue();
      else this.startPlayerTurn();
    }

    async counterattackEpilogueTurn() {
      const epilogue = this.state.rescueEpilogue;
      if (!epilogue || epilogue.mode !== "counterattack" || this.state.ended) return;
      epilogue.turns += 1;
      this.state.enemyTurns += 1;
      const turnLines = epilogue.config.turns || [];
      const line = turnLines[0];
      if (line) this.bossSpeak(line.text, line);
      const guards = this.state.enemy.board.front
        .map((unit, column) => ({ unit, column }))
        .filter(entry => entry.unit);
      guards.forEach(({ unit }) => { unit.ready = true; unit.justSummoned = false; });
      this.addLog("千枝城反击开始：四名魅魔军官依次以20点攻击杀向小队。", "boss");
      this.render();
      await wait(BOSS_ACTION_DELAY);
      for (const { unit, column } of guards) {
        if (this.state.ended || !this.state.rescueEpilogue) return;
        const current = this.state.enemy.board.front[column];
        if (!current || current.uid !== unit.uid || !current.ready) continue;
        this.aiAttack("front", column);
        this.render();
        await wait(BOSS_ACTION_DELAY);
      }
      this.addLog("四名军官的攻势击穿战线，魔族联军先遣队随即越过裂隙接管废墟；小队被迫撤出千枝城。", "boss");
      return this.completeRescueCounterattack();
    }

    completeRescueCounterattack() {
      const epilogue = this.state.rescueEpilogue;
      if (!epilogue || epilogue.mode !== "counterattack" || this.state.ended) return false;
      const line = epilogue.config.victory;
      this.state.player.hp = 0;
      this.state.storyDefeat = true;
      this.state.ended = true;
      this.state.busy = true;
      this.state.phase = "enemy";
      if (line) this.bossSpeak(line.text, line, false);
      this.addLog("四位魅魔军官击溃了小队，但银灰狼女猎手已经被击败：第五关剧情完成，全部战利品与通关奖励照常结算。", "system");
      this.sound("defeat");
      this.render();
      setTimeout(() => { if (!this.abandoned) this.callbacks.onVictory?.(this); }, BOSS_DEFEAT_DIALOGUE_DELAY);
      return true;
    }

    completeRescueEpilogue() {
      const epilogue = this.state.rescueEpilogue;
      if (!epilogue || this.state.ended) return false;
      const line = epilogue.config.escape;
      this.state.enemy.board = emptyBoard();
      this.state.ended = true;
      this.state.busy = true;
      this.state.phase = "enemy";
      if (line) this.bossSpeak(line.text, line, false);
      this.addLog(`两回合已过，四位魅魔军官一同跃入裂隙，带着${this.enemyConfig.name}撤离战场。`, "system");
      this.sound("victory");
      this.render();
      setTimeout(() => { if (!this.abandoned) this.callbacks.onVictory?.(this); }, BOSS_DEFEAT_DIALOGUE_DELAY);
      return true;
    }

    startPlayerTurn(initial = false) {
      if (this.state.ended) return;
      const player = this.state.player;
      this.state.phase = "player";
      this.state.busy = false;
      if (!initial) { this.state.round += 1; this.sound("turnStart"); }
      this.expireBattleNotices();
      player.mana = player.maxMana;
      if (player.weapon) { player.weapon.ready = true; player.weapon.strikes = 0; }
      player.skillCooldown = Math.max(0, player.skillCooldown - 1);
      [...player.board.front, ...player.board.back].filter(Boolean).forEach(unit => {
        unit.ready = unit.role !== "healer"; unit.justSummoned = false; unit.tempAttack = 0; unit.healUsed = false;
      });
      const regeneratingAllies = [...player.board.front, ...player.board.back].filter(unit => unit?.keywords?.includes("再生") && unit.health < unit.maxHealth);
      let regeneratedHealth = 0;
      regeneratingAllies.forEach(unit => { const before = unit.health; unit.health = Math.min(unit.maxHealth, unit.health + 2); regeneratedHealth += unit.health - before; });
      if (regeneratedHealth) this.addLog(`${regeneratingAllies.length}个再生随从在回合开始时共恢复${regeneratedHealth}点生命。`, "player");
      const growingAllies = [...player.board.front, ...player.board.back].filter(unit => unit?.growth > 0);
      growingAllies.forEach(unit => { unit.attack += unit.growth; unit.health += unit.growth; unit.maxHealth += unit.growth; });
      if (growingAllies.length) this.addLog(`${growingAllies.length}株古树幼苗在回合开始时生长，获得+1/+1。`, "player");
      if (!initial && this.state.trial?.id !== 3) this.draw("player", 1);
      CF.Trials?.onPlayerTurn(this);
      this.addLog(`我方第${this.state.round}回合开始：法力恢复为${player.mana}/${player.maxMana}，场上${[...player.board.front, ...player.board.back].filter(Boolean).length}个随从，手牌${player.hand.length}张。`, "player");
      this.render();
    }

    checkOutcome() {
      if (this.state.ended) return true;
      if (this.state.rescueEpilogue) return false;
      this.bossHealthDialogue();
      if (this.state.enemy.hp <= 0) {
        if (this.enemyConfig.trialId && !CF.Trials.canDefeatEnemy(this)) return false;
        if (this.enemyConfig.dialogue?.rescueEpilogue) {
          this.startRescueEpilogue();
          return false;
        }
        this.state.enemy.hp = 0; this.state.ended = true; this.state.busy = true;
        this.sound("victory");
        const defeatLine = this.enemyConfig.dialogue?.defeat;
        if (defeatLine && !this.state.bossDialogueShown.defeat) {
          this.state.bossDialogueShown.defeat = true;
          this.bossSpeak(defeatLine, {}, false);
        }
        this.addLog(`${this.enemyConfig.name}被击败！`);
        setTimeout(() => { if (!this.abandoned) this.callbacks.onVictory?.(this); }, defeatLine ? BOSS_DEFEAT_DIALOGUE_DELAY : 260);
        return true;
      }
      if (this.state.player.hp <= 0) {
        this.state.player.hp = 0; this.state.ended = true; this.state.busy = true;
        this.sound("defeat");
        this.addLog("你的英雄倒下了。冒险结束。");
        setTimeout(() => { if (!this.abandoned) this.callbacks.onDefeat?.(this); }, 260);
        return true;
      }
      return false;
    }

    forceWin() {
      if (this.state.rescueEpilogue?.mode === "counterattack") this.completeRescueCounterattack();
      else if (this.state.rescueEpilogue) this.completeRescueEpilogue();
      else { this.state.enemy.hp = 0; this.checkOutcome(); this.render(); }
    }
    debugDraw() { this.draw("player", 1); this.render(); }
    debugMana() { this.state.player.maxMana += 1; this.state.player.mana = this.state.player.maxMana; this.render(); }

    isTargetable(side, row, column) {
      const selected = this.state.selected;
      const unit = this.state[side].board[row][column];
      if (!selected || !unit) return false;
      if (selected.type === "healer") {
        const healer = this.state.player.board[selected.row]?.[selected.column];
        return side === "player" && !!healer && healer.uid === selected.unitId && healer.role === "healer" && !healer.healUsed;
      }
      if (selected.type === "attacker" && side === "enemy") {
        const attacker = this.state.player.board[selected.row][selected.column];
        return !!attacker && Rules.legalUnitTargets(attacker, this.state.enemy.board, selected.column).some(item => item.row === row && item.column === column);
      }
      if (selected.type === "weapon" && side === "enemy") {
        const weapon = this.state.player.weapon;
        return !!weapon && weapon.ready && Rules.legalUnitTargets(weapon, this.state.enemy.board).some(item => item.row === row && item.column === column);
      }
      if (selected.type === "skill") {
        const target = this.playerSkill().target;
        if (target === "friendly-unit") return side === "player";
        if (target === "enemy-any") return side === "enemy";
        return target === "enemy-front" && side === "enemy" && row === "front";
      }
      if (selected.type === "card") {
        const card = this.selectedCard();
        if (!card) return false;
        if (card.frontOnly) return side === "enemy" && row === "front";
        if (["damage", "chain_damage", "execute_draw", "poison", "row_blast", "banish", "bear_paw"].includes(card.effect)) return side === "enemy";
        if (card.effect === "front_aoe") return side === "enemy" && row === "front";
        if (["heal", "buff", "swap_stats", "fortify", "rescue", "honey_salve", "growth_blessing", "slime_mend", "gel_barrier"].includes(card.effect)) return side === "player";
      }
      return false;
    }

    slotHTML(side, row, column) {
      const board = this.state[side].board;
      const unit = board[row][column];
      const selected = this.state.selected;
      const deployable = !unit && side === "player" && selected?.type === "card" && this.selectedCard()?.type === "unit";
      const targetable = this.isTargetable(side, row, column);
      const attackerSelected = selected?.type === "attacker" && side === "player" && selected.row === row && selected.column === column;
      const invalid = !!unit && !!selected && !targetable && !(side === "player" && (!selected || selected.type === "attacker"));
      const classes = ["slot", deployable ? "deployable" : "", targetable ? "targetable" : "", invalid ? "invalid-target" : ""].join(" ");
      return `<div class="${classes}" data-action="slot" data-side="${side}" data-row="${row}" data-column="${column}" data-lane="${column + 1}">
        ${unit ? this.unitHTML(unit, side, attackerSelected) : ""}
        ${!unit && row === "front" && Rules.isLaneOpen(board, column) ? '<span class="lane-open" data-label="路线已突破"></span>' : ""}
      </div>`;
    }

    unitHTML(unit, side, selected) {
      const attack = this.currentAttack(unit);
      const combatLabel = unit.role === "healer" ? "治疗" : (unit.combatStyle === "ranged" ? "远程" : "近战");
      const combatClass = unit.role === "healer" ? "support" : (unit.combatStyle === "ranged" ? "ranged" : "melee");
      return `<div class="unit ${side === "enemy" ? "enemy-unit" : ""} ${unit.ready ? "ready" : ""} ${selected ? "selected" : ""}" title="${unit.name}｜${unit.keywords.join("、") || "无关键词"}">
        <span class="combat-tag ${combatClass}">${combatLabel}</span><div class="unit-name">${unit.name}</div><div class="unit-icon ${unit.image ? "has-image" : ""}">${unit.image ? `<img src="${unit.image}" alt="${unit.name}" loading="lazy">` : unit.icon}</div>
        <div class="unit-stats"><span class="attack-stat ${unit.tempAttack ? "buffed" : ""}">⚔ ${attack}</span><span class="health-stat">♥ ${unit.health}/${unit.maxHealth}</span></div>
      </div>`;
    }

    rowHTML(side, row, label) {
      return `<div class="row-label"><span>${label}</span><span>${row === "front" ? "保护后排" : "战术后排"}</span></div>
        <div class="battle-row">${[0,1,2,3].map(column => this.slotHTML(side, row, column)).join("")}</div>`;
    }

    cardHTML(card, index) {
      const selected = this.state.selected?.type === "card" && this.state.selected.cardId === card.instanceId;
      const cost = this.effectiveCost(card, "player");
      const discounted = cost < card.cost;
      const unplayable = cost > this.state.player.mana;
      const weaponStyle = card.type === "weapon" ? `<div class="card-style ${card.combatStyle}">${card.combatStyle === "ranged" ? "远程武器 · 无反击" : "近战武器 · 会反击"}</div>` : "";
      return `<div class="game-card ${card.type === "spell" ? "spell" : ""} ${card.type === "weapon" ? "weapon" : ""} ${selected ? "selected" : ""} ${unplayable ? "unplayable" : ""}" data-action="select-card" data-index="${index}" title="${card.description}">
        <span class="card-cost ${discounted ? "discounted" : ""}" title="${discounted ? `原始费用 ${card.cost}` : `${card.cost}费`}">${cost}</span><span class="card-level">Lv${card.level}</span>
        <div class="card-name">${card.name}</div><div class="card-art ${card.image ? "has-image" : ""}">${card.image ? `<img src="${card.image}" alt="${card.name}" loading="lazy">` : card.icon}</div>${card.type === "unit" ? `<div class="card-style ${card.role === "healer" ? "support" : card.combatStyle}">${card.role === "healer" ? "治疗 · 无法攻击" : (card.combatStyle === "ranged" ? "远程 · 无反击" : "近战 · 会反击")}</div>` : weaponStyle}<div class="card-copy">${card.description}</div>
        ${card.type === "unit" ? `<div class="card-stats"><span>⚔ ${card.attack}</span><span>♥ ${card.health}</span></div>` : card.type === "weapon" ? `<div class="card-stats"><span>⚔ ${card.attack}</span><span class="durability-stat">◆ ${card.durability}</span></div>` : ""}
      </div>`;
    }

    instruction() {
      const selected = this.state.selected;
      if (!selected) return "点击手牌出牌，或点击带绿色边框的友方随从发起攻击。";
      if (selected.type === "attacker") return "选择发光的敌方目标；若有突破路线，也可以点击敌方英雄。";
      if (selected.type === "weapon") return "武器已举起：选择敌方随从；若有突破路线，也可以攻击敌方英雄。";
      if (selected.type === "healer") return "选择一个我方随从或你的英雄进行治疗。";
      if (selected.type === "skill") {
        const skill = this.playerSkill();
        if (skill.target === "friendly-unit") return "选择一个我方随从强化。";
        if (skill.target === "enemy-any") return `选择任意一个敌方随从施放${skill.name}。`;
        return `选择一个敌方前排随从施放${skill.name}。`;
      }
      const card = this.selectedCard();
      if (card?.type === "unit") return "选择任意绿色空格部署随从。";
      if (card?.frontOnly) return "选择一个敌方前排随从。";
      if (["damage", "chain_damage", "execute_draw", "poison", "banish"].includes(card?.effect)) return "选择一个敌方随从。";
      if (card?.effect === "row_blast") return "选择敌方任意一排上的随从。";
      if (card?.effect === "heal") return "选择友方随从或你的英雄。";
      if (["buff", "swap_stats", "fortify", "rescue"].includes(card?.effect)) return "选择一个友方随从。";
      if (card?.effect === "front_aoe") return "点击任意敌方前排，箭雨会命中整个前排。";
      return "选择合法目标。";
    }

    portraitHTML(actor, side) {
      return `<div class="combat-portrait ${actor.portrait ? "has-image" : ""} ${side}-portrait ${actor.id ? `portrait-${actor.id}` : ""}">${actor.portrait ? `<img src="${actor.portrait}" alt="${actor.name}">` : actor.icon}</div>`;
    }

    weaponHTML(actor, side) {
      const weapon = actor.weapon;
      if (!weapon) return `<div class="equipped-weapon empty ${side}-weapon"><span>武器槽</span><small>未装备</small></div>`;
      const action = side === "player" ? ' data-action="weapon-attack"' : "";
      const selected = side === "player" && this.state.selected?.type === "weapon";
      return `<button class="equipped-weapon ${side}-weapon ${weapon.ready ? "ready" : "spent"} ${selected ? "selected" : ""}"${action} title="${weapon.name}｜${weapon.combatStyle === "ranged" ? "远程无反击" : "近战受反击"}">
        <img src="${weapon.image}" alt="${weapon.name}"><span>${weapon.name}</span><strong>⚔ ${weapon.attack}　◆ ${weapon.permanent ? "∞" : `${weapon.durability}/${weapon.maxDurability}`}</strong>
      </button>`;
    }

    manaCrystalsHTML(actor) {
      const maximum = Math.max(0, Number(actor.maxMana) || 0);
      const available = Math.max(0, Math.min(maximum, Number(actor.mana) || 0));
      const crystals = Array.from({ length: maximum }, (_, index) =>
        `<span class="mana-crystal ${index < available ? "charged" : "spent"}" aria-hidden="true"></span>`
      ).join("");
      return `<div class="mana-crystals" role="img" aria-label="法力 ${available}/${maximum}" title="法力 ${available}/${maximum}">${crystals}<strong class="mana-count">${available}/${maximum}</strong></div>`;
    }

    bossSkillsHTML() {
      const heroSkill = this.enemyHeroSkill();
      if (!this.enemyConfig.skills?.length && !heroSkill) return "";
      const passives = (this.enemyConfig.skills || []).map(skill => {
        const countdown = skill.every - (this.state.enemyTurns % skill.every);
        return `<div class="boss-skill" title="${skill.description}"><span class="boss-skill-icon">${skill.icon}</span><div><strong>${skill.name}</strong><small>${skill.description}</small></div><span class="boss-skill-timer">${countdown}回合</span></div>`;
      }).join("");
      const active = heroSkill ? (() => {
        const fallback = this.enemyConfig.heroSkill.fallbackSummon;
        const pick = values => Array.isArray(values) ? values[Math.min(heroSkill.level, values.length) - 1] : values;
        const description = fallback
          ? `为受伤最重的己方随从恢复生命；没有受伤的随从时，召唤一个${pick(fallback.attack)}攻/${pick(fallback.health)}血的${fallback.name}。`
          : heroSkill.skill.playerDescription(heroSkill.level);
        return `<div class="boss-skill boss-hero-skill" title="${description}"><span class="boss-skill-icon">${heroSkill.skill.icon}</span><div><strong>英雄技能 · ${heroSkill.skill.name} Lv${heroSkill.level}</strong><small>${description}</small></div><span class="boss-skill-timer">每回合</span></div>`;
      })() : "";
      return `<div class="boss-skills"><div class="boss-skills-title"><span>${this.enemyConfig.mode === "arena" ? "英雄技能" : "Boss技能"}</span><small>按敌方行动回合触发</small></div><div class="boss-skill-grid">${active}${passives}</div></div>`;
    }

    logEntryHTML(item) {
      const entry = typeof item === "string" ? { message: item, kind: "system", round: this.state.round } : item;
      const labels = { player: "我方", enemy: "敌方", boss: "BOSS", system: "战况" };
      return `<div class="log-entry log-${entry.kind}"><div class="log-meta"><span>${labels[entry.kind] || "战况"}</span><small>第${entry.round}回合</small></div><div class="log-message">${entry.message}</div></div>`;
    }

    deckRemainingHTML(cards) {
      const grouped = [];
      const byId = new Map();
      cards.forEach(card => {
        if (!byId.has(card.id)) {
          const entry = { card, count: 0 };
          byId.set(card.id, entry);
          grouped.push(entry);
        }
        byId.get(card.id).count += 1;
      });
      if (!grouped.length) return `<p class="deck-empty">牌库已空，接下来会受到疲劳伤害。</p>`;
      return `<div class="deck-remaining-list">${grouped.map(({ card, count }) => `<div class="deck-remaining-card" title="${card.description}"><span class="deck-remaining-art">${card.image ? `<img src="${card.image}" alt="" loading="lazy">` : card.icon}</span><span class="deck-remaining-name">${card.name}</span><span class="deck-remaining-cost">${card.cost}</span><span class="deck-remaining-count">×${count}</span></div>`).join("")}</div>`;
    }

    html() {
      const s = this.state;
      const playerSkill = this.playerSkill();
      const unitCanTargetHero = s.selected?.type === "attacker" && (() => {
        const unit = s.player.board[s.selected.row]?.[s.selected.column];
        return unit && !unit.justSummoned && (Rules.canAttackHero(s.enemy.board, s.selected.column) || CF.Trials?.canPuzzleAttackHero(this, unit));
      })();
      const weaponCanTargetHero = s.selected?.type === "weapon" && !!s.player.weapon?.ready && Rules.canAttackHero(s.enemy.board);
      const puzzleSpellCanTargetHero = s.selected?.type === "card" && CF.Trials?.isPuzzleFireFlask(this, this.selectedCard());
      const heroTargetable = !s.rescueEpilogue && (unitCanTargetHero || weaponCanTargetHero || puzzleSpellCanTargetHero);
      const playerHeroTargetable = (s.selected?.type === "card" && ["heal", "honey_salve", "slime_mend"].includes(this.selectedCard()?.effect)) || s.selected?.type === "healer";
      const rescueObjective = s.rescueEpilogue
        ? s.rescueEpilogue.mode === "counterattack"
          ? `<h3>千枝城反击</h3><p>${this.enemyConfig.name}已被第五名军官救走。四名20攻/200血军官拒绝撤离，正在直接杀退小队。</p><p>这是第五关结局剧情战：小队撤退仍视为完成剧情，全部奖励照常结算。</p>`
          : `<h3>魅魔军官撤离</h3><p>${this.enemyConfig.name}已被第五名军官带走。四名10攻/200血军官封锁前排，并将在${Math.max(0, 2 - s.rescueEpilogue.turns)}回合后撤离。</p><p>结束回合推进撤离剧情。</p>`
        : "";
      return `<section class="screen battle-screen">
        <div class="battle-layout">
          <main class="battle-board">
            <div class="combat-hero enemy enemy-hero-target ${heroTargetable ? "targetable" : ""}" data-action="hero" data-side="enemy">
              <div class="combat-identity"><h3>${s.enemy.name}</h3><small>${this.enemyConfig.title}</small></div>
              <div class="enemy-portrait-wrap">${this.portraitHTML(s.enemy, "enemy")}${this.bossDialogueHTML()}</div>
              <div class="hero-bars"><span class="health-pill">♥ ${s.enemy.hp}/${s.enemy.maxHp}</span>${this.enemyConfig.noCards ? "" : `<span class="hand-pill" title="敌方当前手牌数量">🂠 手牌 ${s.enemy.hand.length}</span>`}${this.manaCrystalsHTML(s.enemy)}</div>
              <div class="enemy-weapon-wrap">${this.weaponHTML(s.enemy, "enemy")}</div>
              ${this.bossSkillsHTML()}
            </div>
            <div class="battlefield ${s.enemy.battlefield === "goblin_stronghold" ? "goblin-stronghold" : s.enemy.battlefield === "harvest_farm" ? "harvest-farm" : s.enemy.battlefield === "dream_slime_forest" ? "dream-slime-forest" : s.enemy.battlefield === "ancient_city_ruins" ? "ancient-city-ruins" : s.enemy.battlefield === "arena" ? "arena-battlefield" : s.enemy.battlefield === "training_ground" ? "trial-training-battlefield" : s.enemy.battlefield === "queen_dream" ? "trial-dream-battlefield" : ""}" aria-label="${s.enemy.battlefield === "training_ground" ? "海港统领训练场" : s.enemy.battlefield === "queen_dream" ? "女王梦境" : s.enemy.battlefield === "goblin_stronghold" ? "哥布林王庭战场" : s.enemy.battlefield === "harvest_farm" ? "丰收农田战场" : s.enemy.battlefield === "dream_slime_forest" ? "梦幻森林史莱姆战场" : s.enemy.battlefield === "ancient_city_ruins" ? "千枝城古城废墟战场" : s.enemy.battlefield === "arena" ? "王都竞技场" : "森林溪谷战场"}">
              <div class="battle-announcements" aria-live="polite">${s.battleNotices.map(item => `<div class="battle-announcement notice-${item.kind}">${item.message}</div>`).join("")}</div>
              ${CF.Trials?.mentorHTML(this) || ""}
              <div class="rows enemy-lines">${this.rowHTML("enemy", "back", "敌方后排")}${this.rowHTML("enemy", "front", "敌方前排")}</div>
              <div class="divider">战线 · 击穿任一路线即可攻击英雄</div>
              <div class="rows player-lines">${this.rowHTML("player", "front", "我方前排")}${this.rowHTML("player", "back", "我方后排")}</div>
            </div>
            <div class="combat-hero player-hero ${playerHeroTargetable ? "targetable" : ""}" data-action="hero" data-side="player">
              <button class="hero-skill ${s.selected?.type === "skill" ? "selected" : ""}" data-action="skill" ${s.player.skillCooldown || s.player.mana < playerSkill.cost || s.busy ? "disabled" : ""}><strong>${playerSkill.icon} ${playerSkill.name} · ${playerSkill.cost}费</strong><small>Lv${playerSkill.level}｜${playerSkill.playerDescription(playerSkill.level)}</small></button>
              <div class="combat-identity"><h3>${s.player.name}</h3><small>Lv${CF.SaveSystem.data.hero.level} · 固定法力上限</small></div>
              <div class="player-portrait-target ${s.emoteMenuOpen ? "emote-open" : ""}" data-action="player-portrait" title="点击头像发送表情">${this.portraitHTML(s.player, "player")}${this.emoteHTML()}</div>
              <div class="hero-bars"><span class="health-pill">♥ ${s.player.hp}/${s.player.maxHp}</span>${this.manaCrystalsHTML(s.player)}</div>
              ${this.weaponHTML(s.player, "player")}
              <button class="end-turn" data-action="end-turn" ${s.busy || s.ended ? "disabled" : ""}>${s.phase === "player" ? "结束回合" : "敌方行动中"}</button>
            </div>
            <div class="hand-wrap"><div class="hand-title"><span>${this.instruction()}</span><span>牌库 ${s.player.deck.length} · 手牌 ${s.player.hand.length}/10</span></div>
              <div class="hand">${s.player.hand.map((card, index) => this.cardHTML(card, index)).join("") || "<p>手牌为空</p>"}</div>
            </div>
          </main>
          <aside class="battle-sidebar">
            <div class="turn-badge">${s.phase === "player" ? `你的回合 · 第${s.round}回合` : `${s.enemy.name}的回合`}</div>
            <div class="deck-remaining-panel"><div class="battle-log-heading"><h3>我方牌库</h3><small>剩余${s.player.deck.length}张</small></div>${this.deckRemainingHTML(s.player.deck)}</div>
            <div class="objective">${rescueObjective || CF.Trials?.objectiveHTML(this) || `<h3>战术目标</h3><button class="mini-btn rules-btn" data-action="show-rules">📖 规则说明</button><p>近战攻击近战目标会受到反击；远程攻击或攻击远程随从都不会。</p><p>武器每回合可攻击1次；英雄档案中装备的武器不消耗耐久。</p><p>随从只能攻击同一路线的敌人：先击败前排，再攻击后排，整路清空后才能攻击英雄；法术与技能不受此限制。</p><p>狙击随从可越过本路前排攻击本路后排；英雄武器可攻击任意路线。</p><p>法力每回合恢复至 ${s.player.maxMana}/${s.player.maxMana}，不会自动增长。</p>`}</div>
          </aside>
        </div>
      </section>`;
    }
  }

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { Rules, Battle, emptyBoard });
})();

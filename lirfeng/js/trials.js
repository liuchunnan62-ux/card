(function () {
  "use strict";

  const CF = window.CardForge;
  const TRAINING_FIELD = "training_ground";
  const DREAM_FIELD = "queen_dream";
  const FINAL_STORY_DIALOGUE_DELAY = 3000;
  const initialEliteUnits = [
    ...new Set(CF.STARTER_DECK.filter(cardId => CF.CARD_LIBRARY[cardId]?.type === "unit")),
    "eagle_eye", "iron_lancer", "royal_medic"
  ];
  const enemyUnits = ["goblin_guard", "orc_grunt", "bandit", "shadow_sniper", "orc_breaker", "wild_wolf", "dire_wolf"];
  const spellAndWeaponDeck = Object.values(CF.CARD_LIBRARY).filter(card => card.type === "spell" || card.type === "weapon").map(card => card.id);

  const TRIALS = [
    {
      id: 1, name: "哈罗德·布莱恩", title: "老剑手", portrait: "assets/trials/harold-brian.png", health: 30, mana: 4,
      objective: "保护后排：击败哈罗德时，我方后排必须至少有一名远程随从存活。",
      summary: "学会让剑锋挡在弓弦之前。最后一击时，必须守住一名后排远程随从。",
      deck: ["shield_guard", "vanguard", "kingdom_knight", "ranger", "battle_cry", "fire_flask", ...enemyUnits, ...enemyUnits],
      skills: [{ icon: "🏹", name: "保护后排", every: 1, description: "只有后排仍有远程随从存活时，击败教官才算通关。" }],
      dialogue: [
        "后辈，别只盯着眼前的剑。真正的统领，要知道谁值得被保护。",
        "把结实的甲胄留在前排，把弓弦和火力藏到后面。",
        "前排倒下并不可耻；让后排仍能射出最后一箭，才是你的职责。",
        "寒河谷那一夜，我们也是这样护着最后的弓手撤退。",
        "记住：胜利不是你还站着，而是你要保护的人还站着。"
      ]
    },
    {
      id: 2, name: "盖文·石盾", title: "坚壁骑士", portrait: "assets/trials/gavin-stoneshield.png", health: 35, mana: 0,
      objective: "坚守：每个敌方回合召唤4个1/9训练傀儡，教官自动失去5点生命；撑过7个敌方回合。",
      summary: "对手会不断填满阵地。无需冒险抢攻，守过七轮便是胜利。", noCards: true, passive: "trial_fortress",
      deck: [], skills: [{ icon: "🛡️", name: "七轮坚守", every: 1, description: "召唤4个1/9训练傀儡，并失去5点生命。第7轮结束后通关。" }],
      dialogue: [
        "坚壁不是不会受伤，而是明知冲击会来，仍把脚钉在地上。",
        "别急着清空所有敌人。判断哪一路最危险，哪一路可以暂时承受。",
        "盾墙的价值不在第一声撞击，而在第七声之后仍没有倒下。",
        "归乡之战里，活下来的人并不总是最强的人，而是最能忍耐的人。",
        "再守一轮。只要你还在呼吸，阵线就没有失守。"
      ]
    },
    {
      id: 3, name: "罗德里克·瓦伦", title: "铁锋教官", portrait: "assets/trials/roderick-valen.png", health: 3, mana: 0,
      objective: "斩杀线：你只有1点生命、一个可攻击的1/1随从、火焰瓶与战斗怒吼。破阵并一回合斩首。",
      summary: "固定残局：火焰瓶烧开阵势，战斗怒吼强化1/1；两张牌都用过后，3攻随从可越阵斩首。", noCards: true,
      deck: [], skills: [{ icon: "⚔️", name: "一线斩首", every: 1, description: "火焰瓶与战斗怒吼都使用后，3攻随从可以无视阵线攻击教官。" }],
      dialogue: [
        "战场不会每次都给你十种选择。有时，正确答案只有一条。",
        "火焰瓶不是为了伤人，是为了让铁壁出现迟疑。",
        "号角不是为了壮胆，是为了把一击推过斩杀线。",
        "看见那三点生命了吗？别和八面盾牌纠缠，斩首。"
      ]
    },
    {
      id: 4, name: "杰拉德·钢手", title: "钢腕教官", portrait: "assets/trials/gerard-steelhand.png", health: 30, mana: 7,
      objective: "队长的试炼：我方牌库只有法术与武器；敌方牌库只有随从。击败30生命的杰拉德。",
      summary: "没有随从替你站场。用武器打开突破口，用法术控制敌军。",
      deck: [...enemyUnits, ...enemyUnits, ...enemyUnits],
      skills: [{ icon: "🔨", name: "钢腕军阵", every: 1, description: "敌方牌库全部由随从组成；玩家试炼牌库不含随从。" }],
      dialogue: [
        "队长不能永远躲在士兵身后。今天，你亲自握住每一件武器。",
        "先想清楚耐久要花在哪里。浪费一次挥击，就可能少一条生路。",
        "法术负责制造机会，武器负责把机会变成突破口。",
        "没有随从可用时，你自己就是前排。",
        "钢腕不是蛮力，是在最累的时候仍能准确挥出最后一下。"
      ]
    },
    {
      id: 5, name: "雷纳德·王冠之剑", title: "王国第一骑士", portrait: "assets/trials/reynard-crownsword.png", health: 30, mana: 10,
      objective: "随从的质量：对手全部使用五星随从卡，起手10张；击败30生命的雷纳德。",
      summary: "以自己的卡组对抗满级初始精锐。对方只使用十四名初始随从与鹰眼猎手、铁矛卫、王庭医师，且手牌充足。",
      deck: [...initialEliteUnits, ...initialEliteUnits], enemyCardLevel: 5, openingHand: 10,
      skills: [{ icon: "👑", name: "王国精锐", every: 1, description: "所有敌方卡牌均为五星初始随从，并加入五星鹰眼猎手、铁矛卫与王庭医师；起手拥有10张牌。" }],
      dialogue: [
        "数量能填满战线，质量却能决定每一次交换的结果。",
        "不要用两名好士兵去换一名你本可绕开的精锐。",
        "五星并不意味着无敌，只意味着它很少犯错。你要比它更少犯错。",
        "真正的第一骑士，不是拥有最好的牌，而是让每张牌都出现在正确的位置。",
        "现在让我看看，你的军队是否愿意为你的判断而战。"
      ]
    },
    {
      id: 6, name: "亚瑟兰·雷恩", title: "天穹之剑", portrait: "assets/trials/aetherlan-raine.png", health: 1999, mana: 0,
      objective: "传奇的指点：亚瑟兰没有卡牌，每回合随机对我方随从或英雄造成10点伤害；撑过15个敌方回合。",
      summary: "传奇不会被击败。分散目标、治疗伤势，并在十五轮剑光下活下来。", noCards: true, passive: "trial_skyblade",
      deck: [], skills: [{ icon: "⚡", name: "天穹一闪", every: 1, description: "随机攻击一个我方单位（随从或英雄），造成10点伤害。" }],
      dialogue: [
        "我参加过归乡之战。那时每一道从天而降的光，都可能是最后一道。",
        "别猜我的剑会落在哪里。统领要做的，是让任何落点都无法结束战斗。",
        "召来随从不是让他们送死，而是把不可承受的风险拆成可以承受的代价。",
        "英雄受伤就治疗，随从倒下就重建。战场从来不等你哀悼。",
        "传说也只是活得足够久的人。你若能撑住十五轮，也会理解这一点。",
        "寒河谷的天空比今天更亮——那是无数兵刃和法术同时燃烧的颜色。"
      ]
    },
    {
      id: 7, name: "伊瑟兰妲·维尔摩斯", title: "魅魔女王的低语", portrait: "assets/trials/queen-iselanda.png", health: 9999, mana: 0,
      objective: "女王的低语：喝下含有女王血液的河水，结束回合聆听一段历史；听完整段往事即通关。",
      summary: "这不是战斗。女王不会攻击或用牌；每次结束回合，梦境都会讲述一段泽亚大陆的历史。", noCards: true, passive: "trial_queen_story",
      deck: [], battlefield: DREAM_FIELD, skills: [{ icon: "🌙", name: "河流不会倒流", every: 1, description: "每次结束回合讲述一段往事；故事结束后通关。" }],
      dialogue: [
        "泽亚大陆的命脉叫作起源之河。它从北境神脊雪山奔向无尽海，也曾把所有种族养在同一片土地上。",
        "后来人类的城墙、军团与神殿不断扩张。精灵、兽人和其他古老族群被赶向荒芜之地，并被统一称为‘魔族’。",
        "我，伊瑟兰妲·维尔摩斯，在黑银月旗下联合那些流亡者，建立第二魔族纪元。我们沿起源之河升起黑帆，只为回到故土。",
        "人类把那场战争写作‘黑帆叛乱’，我们称它‘归乡之战’。同一条河，在胜者与败者的史书里流向了不同方向。",
        "圣剑骑士莱昂率领七人突袭队来到寒河谷：祭司、猎魔人、法师、无面刺客、弓手，以及一个至今无人愿意写下姓名的魔族叛徒。",
        "圣剑穿过我的身体时，我也折断了它。断刃和我的血一同落进河里，顺流唤醒野兽、森林和沉睡的历史。",
        "你的过往可真平淡，身体也不强。不过既然你选择喝下我的血液，便会像那些野兽一样得到更强的体魄与灵智，也会承受更难填满的饥饿。我的血似乎更偏爱雌性，因此新生族群的首领多是她们。",
        "我不期待你加入魔族，只希望你明白：它们进入人类生活的地区，多半只是为了不再挨饿。它们极少杀人，甚至宁可驱赶。再见，人类，期待与你在泽亚大陆真正重逢。"
      ]
    }
  ];

  const byId = id => TRIALS.find(trial => trial.id === Number(id));
  const trialUnit = (name, attack, health, image, options = {}) => ({
    uid: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cardId: options.cardId || "trial_unit", name, icon: options.icon || "⚔️", image,
    attack, health, maxHealth: health, level: options.level || 1, keywords: options.keywords || [],
    combatStyle: options.combatStyle || "melee", role: "", ready: options.ready !== false,
    justSummoned: false, tempAttack: 0, healUsed: false
  });

  function enemy(id) {
    const trial = byId(id);
    if (!trial) return null;
    const levels = Object.fromEntries([...new Set(trial.deck)].map(cardId => [cardId, { level: trial.enemyCardLevel || 1 }]));
    return {
      id: `commander-trial-${trial.id}`, trialId: trial.id, name: trial.name, title: `${trial.title} · 统领试炼第${trial.id}关`,
      icon: trial.id === 7 ? "🌙" : "⚔️", portrait: trial.portrait, type: "trial", mode: "trial",
      health: trial.health, mana: trial.mana, deck: trial.deck, cardProgress: levels,
      enemyCardLevel: trial.enemyCardLevel || 1, passive: trial.passive || "", skills: trial.skills,
      battlefield: trial.battlefield || TRAINING_FIELD, noCards: trial.noCards, openingHand: trial.openingHand || 4
    };
  }

  function configureBattle(battle) {
    const trial = byId(battle.enemyConfig.trialId);
    if (!trial) return;
    battle.state.trial = { id: trial.id, storyIndex: 0, dialogueIndex: 0 };
    battle.state.mentorNotice = { name: trial.name, title: trial.title, portrait: trial.portrait, text: trial.id === 7 ? "河水在你唇边泛起银月般的微光。结束回合，听我讲述被史书遮住的往事。" : trial.dialogue[0] };
    battle.state.player.hp = battle.state.player.maxHp;
    if (trial.noCards) {
      battle.state.enemy.deck = [];
      battle.state.enemy.hand = [];
      battle.state.enemy.fatigue = 0;
    }
    if (trial.id === 7) {
      battle.state.player.deck = [];
      battle.state.player.hand = [];
      battle.state.player.fatigue = 0;
    }
    if (trial.id === 3) {
      battle.state.player.hp = 1;
      battle.state.player.maxHp = 1;
      battle.state.player.maxMana = 5;
      battle.state.player.mana = 5;
      battle.state.player.deck = [];
      battle.state.player.hand = [CF.getCard("fire_flask", { level: 1 }), CF.getCard("battle_cry", { level: 1 })];
      battle.state.player.hand[0].cost = 2;
      battle.state.player.hand[1].cost = 2;
      battle.state.player.hand[1].value = 2;
      battle.state.player.board.back[0] = trialUnit("最后的学兵", 1, 1, "assets/cards/recruit-archer.png", { combatStyle: "ranged", keywords: ["远程"] });
      for (let column = 0; column < 4; column += 1) {
        battle.state.enemy.board.front[column] = trialUnit("铁锋盾列", 1, 3, "assets/cards/enemies/goblin-guard.png", { ready: false });
        battle.state.enemy.board.back[column] = trialUnit("铁锋盾列", 1, 3, "assets/cards/enemies/goblin-guard.png", { ready: false });
      }
    }
    if (trial.id === 4) {
      battle.state.player.maxMana = Math.max(7, battle.state.player.maxMana);
      battle.state.player.mana = battle.state.player.maxMana;
      battle.state.player.deck = CF.makeDeck(spellAndWeaponDeck, CF.SaveSystem.data.cardProgress);
      battle.state.player.hand = [];
      battle.state.player.fatigue = 0;
      battle.draw("player", 10);
    }
  }

  function isUnlocked(id) {
    const trialId = Number(id);
    if (trialId === 1) return true;
    const completed = CF.SaveSystem.data.commanderTrials?.completed || [];
    if (!completed.includes(trialId - 1)) return false;
    if (trialId === 7 && !CF.SaveSystem.data.items?.queenBloodRiverWater) return false;
    return true;
  }

  function canDefeatEnemy(battle) {
    if (battle.state.trial?.id !== 1) return true;
    const protectedRanged = battle.state.player.board.back.some(unit => unit && (unit.combatStyle === "ranged" || unit.keywords.includes("远程")));
    if (protectedRanged) return true;
    battle.state.enemy.hp = 1;
    battle.toast("必须让至少一名远程随从活着站在我方后排！", "bad");
    battle.state.mentorNotice.text = "最后一击不算数。你的后排无人可守——重整阵线，再来。";
    battle.addLog("哈罗德挡下致命一击：我方后排没有存活的远程随从，试炼尚未完成。", "boss");
    battle.render();
    return false;
  }

  function canPuzzleAttackHero(battle, attacker) {
    return battle.state.trial?.id === 3 && battle.state.usedCards.includes("fire_flask") && battle.state.usedCards.includes("battle_cry") && battle.currentAttack(attacker) >= 3;
  }

  function isPuzzleFireFlask(battle, card) {
    return battle.state.trial?.id === 3 && card?.id === "fire_flask";
  }

  function onPlayerTurn(battle) {
    const trial = byId(battle.state.trial?.id);
    if (!trial || trial.id === 7) return;
    const index = Math.min(trial.dialogue.length - 1, Math.max(0, battle.state.round - 1));
    battle.state.trial.dialogueIndex = index;
    battle.state.mentorNotice = { name: trial.name, title: trial.title, portrait: trial.portrait, text: trial.dialogue[index] };
  }

  async function beforeEnemyActions(battle) {
    const trial = byId(battle.state.trial?.id);
    if (!trial) return { exclusive: false };
    if (trial.id === 2) {
      let summoned = 0;
      for (let i = 0; i < 4; i += 1) {
        if (battle.summonArenaToken("坚壁训练傀儡", 1, 9)) summoned += 1;
      }
      battle.state.enemy.hp = Math.max(0, battle.state.enemy.hp - 5);
      battle.sound("summon");
      battle.addLog(`盖文发动「坚守」：召唤${summoned}个1/9训练傀儡，并自动失去5点生命（已坚持${battle.state.enemyTurns}/7轮）。`, "boss");
      battle.render();
      if (battle.state.enemyTurns >= 7 || battle.state.enemy.hp <= 0) battle.checkOutcome();
      return { exclusive: false };
    }
    if (trial.id === 6) {
      const targets = [{ type: "hero", name: "护卫队长" }];
      ["front", "back"].forEach(row => battle.state.player.board[row].forEach((unit, column) => {
        if (unit) targets.push({ type: "unit", row, column, unit, name: unit.name });
      }));
      const target = targets[Math.floor(Math.random() * targets.length)];
      if (target.type === "hero") battle.state.player.hp -= 10;
      else battle.damageUnit("player", target.row, target.column, 10, "天穹一闪", true, "boss");
      battle.sound("melee");
      battle.addLog(`亚瑟兰发动「天穹一闪」，命中${target.name}，造成10点伤害（已坚持${battle.state.enemyTurns}/15轮）。`, "boss");
      battle.cleanDead();
      if (battle.state.player.hp <= 0) battle.checkOutcome();
      else if (battle.state.enemyTurns >= 15) { battle.state.enemy.hp = 0; battle.checkOutcome(); }
      if (!battle.state.ended) battle.startPlayerTurn();
      return { exclusive: true };
    }
    if (trial.id === 7) {
      const index = battle.state.trial.storyIndex;
      const text = trial.dialogue[index];
      battle.state.trial.storyIndex += 1;
      battle.state.mentorNotice = { name: trial.name, title: trial.title, portrait: trial.portrait, text };
      battle.addLog(`女王的低语（${index + 1}/${trial.dialogue.length}）：${text}`, "boss");
      battle.render();
      if (battle.state.trial.storyIndex >= trial.dialogue.length) {
        await new Promise(resolve => setTimeout(resolve, FINAL_STORY_DIALOGUE_DELAY));
        battle.state.enemy.hp = 0;
        battle.checkOutcome();
      }
      else battle.startPlayerTurn();
      return { exclusive: true };
    }
    return { exclusive: false };
  }

  function objectiveHTML(battle) {
    const trial = byId(battle.state.trial?.id);
    if (!trial) return "";
    const progress = trial.id === 2 ? `<p><strong>坚守进度：</strong>${battle.state.enemyTurns}/7回合</p>`
      : trial.id === 6 ? `<p><strong>生存进度：</strong>${battle.state.enemyTurns}/15回合</p>`
      : trial.id === 7 ? `<p><strong>故事进度：</strong>${battle.state.trial.storyIndex}/${trial.dialogue.length}段</p>` : "";
    return `<h3>第${trial.id}关 · ${trial.title}</h3><p>${trial.objective}</p>${progress}`;
  }

  function mentorHTML(battle) {
    const notice = battle.state.mentorNotice;
    if (!notice) return "";
    return `<aside class="trial-mentor-dialogue"><img src="${notice.portrait}" alt="${notice.name}"><div><small>${notice.title}</small><strong>${notice.name}</strong><p>${notice.text}</p></div></aside>`;
  }

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { Trials: { list: TRIALS, byId, enemy, configureBattle, isUnlocked, canDefeatEnemy, canPuzzleAttackHero, isPuzzleFireFlask, onPlayerTurn, beforeEnemyActions, objectiveHTML, mentorHTML, TRAINING_FIELD, DREAM_FIELD } });
})();

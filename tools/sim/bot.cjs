// 玩家机器人：只通过界面同款的点击接口（selectCard / clickSlot / clickUnit / clickHero / selectSkill / endTurn）操作战斗，
// 因此模拟结果遵守与真实玩家完全相同的规则。策略是贪心的“中等水平玩家”：
//   1. 出牌：自己有空路线时先出随从补位（空路多时先出便宜的），否则按费用从高到低；随从近战/守卫放前排、远程与治疗放后排；伤害法术优先打能击杀的高攻目标，增益给最强的己方随从；
//   2. 使用英雄技能；治疗随从为最残血的友方治疗；
//   3. 每个能攻击的随从：有突破口就打英雄，否则挑“能击杀且自己不死”的目标，再退而求其次；
//   4. 结束回合。
// 它不会预判对手、不会留牌，所以胜率可以看作“普通玩家不刻意计算时”的难度。

const FRIENDLY_TARGET_EFFECTS = new Set(["heal", "buff", "swap_stats", "fortify", "honey_salve", "growth_blessing", "slime_mend", "gel_barrier"]);
const HERO_HEAL_EFFECTS = new Set(["heal", "honey_salve", "slime_mend"]);
// 需要谨慎使用、机器人不主动打出的牌：撤回己方随从。
const SKIPPED_EFFECTS = new Set(["rescue"]);

const units = board => ["front", "back"].flatMap(row => board[row].map((unit, column) => unit ? { row, column, unit } : null).filter(Boolean));

class PlayerBot {
  constructor(battle, Rules) {
    this.battle = battle;
    this.Rules = Rules;
    this.maxActionsPerTurn = 40;
  }

  get state() { return this.battle.state; }
  get player() { return this.state.player; }
  get enemy() { return this.state.enemy; }

  fingerprint() {
    const p = this.player;
    return `${p.hand.length}|${p.mana}|${p.hp}|${this.enemy.hp}|${units(p.board).length}|${units(this.enemy.board).map(e => e.unit.health).join(",")}|${p.skillCooldown}|${p.weapon?.ready}`;
  }

  // 执行一个操作；若局面没有变化（操作不合法），清除选择并返回 false。
  attempt(action) {
    const before = this.fingerprint();
    action();
    const changed = this.fingerprint() !== before;
    if (!changed) this.state.selected = null;
    return changed;
  }

  async playTurn() {
    const battle = this.battle;
    const unplayable = new Set();
    let actions = 0;
    while (battle.canPlayerAct() && actions < this.maxActionsPerTurn) {
      actions += 1;
      if (this.playBestCard(unplayable)) continue;
      break;
    }
    if (battle.canPlayerAct()) this.useSkill();
    if (battle.canPlayerAct()) this.useHealers();
    if (battle.canPlayerAct()) this.attackWithUnits();
    if (battle.canPlayerAct()) this.attackWithWeapon();
    if (battle.canPlayerAct()) await battle.endTurn();
  }

  playBestCard(unplayable) {
    const hand = this.player.hand;
    const order = hand
      .map((card, index) => ({ card, index, cost: this.battle.effectiveCost(card, "player") }))
      .filter(entry => entry.cost <= this.player.mana && !unplayable.has(entry.card.instanceId) && !SKIPPED_EFFECTS.has(entry.card.effect))
      .filter(entry => entry.card.type !== "weapon" || !this.player.weapon);
    // 有空路线时先出随从补位：空路不止一条就先出便宜的，尽量多补几路；否则按费用从高到低。
    const openLanes = this.Rules.openLanes(this.player.board).length;
    const rank = entry => {
      if (!openLanes || entry.card.type !== "unit") return entry.cost;
      return 100 + (openLanes >= 2 ? -entry.cost : entry.cost);
    };
    order.sort((a, b) => rank(b) - rank(a));
    for (const entry of order) {
      if (this.tryCard(entry.index, entry.card)) return true;
      unplayable.add(entry.card.instanceId);
    }
    return false;
  }

  tryCard(index, card) {
    const battle = this.battle;
    const before = this.fingerprint();
    battle.selectCard(index);
    if (this.fingerprint() !== before) return true; // 武器或无需目标的法术已直接生效
    if (this.state.selected?.type !== "card") return false;
    if (card.type === "unit") return this.placeUnit(card);
    return this.targetSpell(card);
  }

  placeUnit(card) {
    const board = this.player.board;
    const ranged = card.keywords.includes("远程") || card.combatStyle === "ranged" || card.role === "healer";
    const rows = ranged ? ["back", "front"] : ["front", "back"];
    const enemyFront = this.enemy.board.front;
    const laneEmpty = column => !board.front[column] && !board.back[column];
    for (const row of rows) {
      const columns = [0, 1, 2, 3].filter(column => !board[row][column]);
      // 先补完全空着的路线（否则敌人能直接攻击英雄）；其次前排挡在敌方有随从的路线上、后排放在有前排保护的路线上。
      const priority = column => (laneEmpty(column) ? 4 : 0) + (row === "front" ? Number(Boolean(enemyFront[column])) : Number(Boolean(board.front[column])));
      columns.sort((a, b) => priority(b) - priority(a));
      for (const column of columns) {
        if (this.attempt(() => this.battle.clickSlot("player", row, column))) return true;
        // attempt 失败会清除选择，需要重新选中这张牌
        const index = this.player.hand.findIndex(entry => entry.instanceId === card.instanceId);
        if (index < 0) return true;
        this.battle.selectCard(index);
      }
    }
    this.state.selected = null;
    return false;
  }

  enemyTargetsFor(card) {
    const value = Number(card.value) || 0;
    return units(this.enemy.board).sort((a, b) => {
      const killA = value && this.battle.mitigatedDamage(a.unit, value, { ignoreArmor: true }) >= a.unit.health ? 1 : 0;
      const killB = value && this.battle.mitigatedDamage(b.unit, value, { ignoreArmor: true }) >= b.unit.health ? 1 : 0;
      return killB - killA || this.battle.currentAttack(b.unit) - this.battle.currentAttack(a.unit) || a.unit.health - b.unit.health;
    });
  }

  targetSpell(card) {
    const targets = [];
    if (FRIENDLY_TARGET_EFFECTS.has(card.effect)) {
      const hurtHero = this.player.maxHp - this.player.hp;
      const own = units(this.player.board);
      if (HERO_HEAL_EFFECTS.has(card.effect) && hurtHero >= 5) targets.push(() => this.battle.clickHero("player"));
      own.sort((a, b) => card.effect === "buff" || card.effect === "fortify" || card.effect === "growth_blessing"
        ? this.battle.currentAttack(b.unit) + b.unit.health - this.battle.currentAttack(a.unit) - a.unit.health
        : (b.unit.maxHealth - b.unit.health) - (a.unit.maxHealth - a.unit.health));
      own.forEach(entry => targets.push(() => this.battle.clickUnit("player", entry.row, entry.column)));
      if (HERO_HEAL_EFFECTS.has(card.effect) && hurtHero > 0) targets.push(() => this.battle.clickHero("player"));
    } else {
      this.enemyTargetsFor(card).forEach(entry => targets.push(() => this.battle.clickUnit("enemy", entry.row, entry.column)));
      targets.push(() => this.battle.clickHero("enemy"));
    }
    for (const target of targets) {
      const index = this.player.hand.findIndex(entry => entry.instanceId === card.instanceId);
      if (index < 0) return true;
      if (this.state.selected?.type !== "card") this.battle.selectCard(index);
      if (this.attempt(target)) return true;
    }
    this.state.selected = null;
    return false;
  }

  useSkill() {
    const battle = this.battle;
    const before = this.fingerprint();
    battle.selectSkill();
    if (this.fingerprint() !== before) return true;
    if (this.state.selected?.type !== "skill") return false;
    const skill = battle.playerSkill();
    const targets = skill.target === "friendly-unit"
      ? units(this.player.board).sort((a, b) => battle.currentAttack(b.unit) - battle.currentAttack(a.unit)).map(entry => () => battle.clickUnit("player", entry.row, entry.column))
      : this.enemyTargetsFor({ value: battle.skillValue(skill, "amount") }).map(entry => () => battle.clickUnit("enemy", entry.row, entry.column));
    for (const target of targets) {
      if (this.state.selected?.type !== "skill") battle.selectSkill();
      if (this.attempt(target)) return true;
    }
    this.state.selected = null;
    return false;
  }

  useHealers() {
    const battle = this.battle;
    units(this.player.board).filter(entry => entry.unit.role === "healer" && !entry.unit.healUsed).forEach(healer => {
      const hurt = units(this.player.board).filter(entry => entry.unit.health < entry.unit.maxHealth)
        .sort((a, b) => (b.unit.maxHealth - b.unit.health) - (a.unit.maxHealth - a.unit.health));
      const heroHurt = this.player.maxHp - this.player.hp;
      const bestUnit = hurt[0];
      const target = heroHurt >= (bestUnit ? bestUnit.unit.maxHealth - bestUnit.unit.health : 1)
        ? () => battle.clickHero("player")
        : bestUnit ? () => battle.clickUnit("player", bestUnit.row, bestUnit.column) : null;
      if (!target) return;
      battle.clickUnit("player", healer.row, healer.column);
      if (this.state.selected?.type === "healer") this.attempt(target);
      this.state.selected = null;
    });
  }

  // 为攻击者挑选目标：击杀且存活 > 击杀 > 存活时造成最多伤害。打不死目标又会被反击致死的攻击不做（返回 null）。
  chooseTarget(attacker, isRanged, column) {
    const battle = this.battle;
    const Rules = this.Rules;
    const legal = Rules.legalUnitTargets(attacker, this.enemy.board, column);
    let best = null;
    let bestScore = -Infinity;
    legal.forEach(entry => {
      const dealt = battle.mitigatedDamage(entry.unit, battle.currentAttack(attacker));
      const kills = dealt >= entry.unit.health;
      // 远程攻击不受反击；远程目标也无法反击近战攻击。
      const counter = isRanged || battle.isRanged(entry.unit) ? 0 : battle.mitigatedDamage(attacker, battle.currentAttack(entry.unit) + (entry.unit.keywords.includes("荆棘") ? 2 : 0));
      const survives = attacker.health > counter;
      if (!kills && !survives) return;
      const score = (kills ? 100 + battle.currentAttack(entry.unit) * 4 : dealt) + (survives ? 30 : -20) - entry.unit.health * 0.1;
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    return best;
  }

  attackWithUnits() {
    const battle = this.battle;
    const Rules = this.Rules;
    for (let guard = 0; guard < 16 && battle.canPlayerAct(); guard += 1) {
      const ready = units(this.player.board).filter(entry => entry.unit.ready && entry.unit.role !== "healer" && battle.currentAttack(entry.unit) > 0);
      if (!ready.length) return;
      // 斩杀：能打到英雄的总伤害足以击杀时全部打脸。
      // 随从只能攻击本路：只有所在路线已被清空的随从才能打到英雄。
      const faceDamage = ready.filter(entry => !entry.unit.justSummoned && Rules.canAttackHero(this.enemy.board, entry.column)).reduce((sum, entry) => sum + battle.currentAttack(entry.unit), 0);
      const lethal = faceDamage > 0 && faceDamage >= this.enemy.hp;
      // 自己没有空路线时对手打不到英雄，可以放心抢血；否则优先用划算的交换清理威胁。
      const safe = Rules.openLanes(this.player.board).length === 0;
      let acted = false;
      for (const entry of ready) {
        const attacker = entry.unit;
        const isRanged = attacker.combatStyle === "ranged" || attacker.keywords.includes("远程");
        const canFace = Rules.canAttackHero(this.enemy.board, entry.column) && !attacker.justSummoned;
        const trade = this.chooseTarget(attacker, isRanged, entry.column);
        const goodTrade = trade && this.battle.mitigatedDamage(trade.unit, battle.currentAttack(attacker)) >= trade.unit.health;
        const heroOpen = canFace && (lethal || safe || !goodTrade);
        const target = heroOpen ? null : trade;
        battle.clickUnit("player", entry.row, entry.column);
        if (this.state.selected?.type !== "attacker") continue;
        const done = heroOpen
          ? this.attempt(() => battle.clickHero("enemy"))
          : target ? this.attempt(() => battle.clickUnit("enemy", target.row, target.column)) : false;
        if (!done) { attacker.ready = false; this.state.selected = null; }
        acted = true;
        break; // 局面已变化，重新计算可攻击的随从
      }
      if (!acted) return;
    }
  }

  attackWithWeapon() {
    // 银月狼牙刃每回合可以攻击两次。
    for (let strike = 0; strike < 2 && this.player.weapon?.ready && this.battle.canPlayerAct(); strike += 1) this.attackWithWeaponOnce();
  }

  attackWithWeaponOnce() {
    const battle = this.battle;
    const weapon = this.player.weapon;
    if (!weapon?.ready) return;
    const Rules = this.Rules;
    battle.selectWeaponAttack();
    if (this.state.selected?.type !== "weapon") return;
    if (Rules.canAttackHero(this.enemy.board) && this.attempt(() => battle.clickHero("enemy"))) return;
    const targets = Rules.legalUnitTargets(weapon, this.enemy.board).sort((a, b) => a.unit.health - b.unit.health);
    for (const target of targets) {
      if (this.state.selected?.type !== "weapon") battle.selectWeaponAttack();
      if (this.attempt(() => battle.clickUnit("enemy", target.row, target.column))) return;
    }
    this.state.selected = null;
  }
}

module.exports = { PlayerBot };

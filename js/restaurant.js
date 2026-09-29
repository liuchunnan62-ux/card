(function () {
  "use strict";

  // 金杯餐馆与在押首领的好感度。
  // 第二关起，每个普通/精英首领的首杀奖励卡都属于营地监狱里对应的那名在押首领：
  // 必须带着餐馆的食物去探监，把好感度提升到 BOND_THRESHOLD（结缘，Lv1）才能把这张卡编入卡组出战。
  // 之后每多 BOND_STEP 点好感升一级，最高 MAX_BOND_LEVEL 级；每高出结缘一级，卡牌获得一级加成（见 cards.js getCard）。
  // 各关最终首领被同族救走、不在监狱中：它的卡牌要等本关全部在押首领都结缘才能使用，好感等级取其中最低的一位。
  const CF = window.CardForge;
  const BOND_THRESHOLD = 100;
  const BOND_STEP = 100;
  const MAX_BOND_LEVEL = 5;
  const MAX_AFFINITY = BOND_THRESHOLD + BOND_STEP * (MAX_BOND_LEVEL - 1);
  const BOND_LEVEL_NAMES = ["", "结缘", "亲近", "挚友", "羁绊", "誓约"];
  // 族群口味：投喂本族最爱的食物时好感度翻倍。
  const RACES = {
    2: { name: "哥布林", favorite: "charred_skewer" },
    3: { name: "熊族", favorite: "honey_pancake" },
    4: { name: "史莱姆", favorite: "moondew_jelly" },
    5: { name: "狼族", favorite: "bone_roast" }
  };
  const FOODS = [
    { id: "wheat_bread", name: "麦香面包", icon: "🍞", price: 12, affinity: 6, detail: "刚出炉的粗麦面包，谁都不会拒绝。" },
    { id: "charred_skewer", name: "炭烤肉串", icon: "🍢", price: 30, affinity: 15, detail: "撒满辣椒粉的炭烤肉串，哥布林最爱抢着吃。" },
    { id: "honey_pancake", name: "金蜜松饼", icon: "🥞", price: 30, affinity: 15, detail: "淋上整勺蜂蜜的厚松饼，熊族闻到就走不动路。" },
    { id: "moondew_jelly", name: "月露果冻", icon: "🍮", price: 30, affinity: 15, detail: "用月潭露水凝成的清凉果冻，史莱姆会把它整个吞进身体里。" },
    { id: "bone_roast", name: "炙烤带骨肉", icon: "🍖", price: 30, affinity: 15, detail: "外焦里嫩的大块带骨肉，狼族会一边啃一边摇尾巴。" },
    { id: "hunter_stew", name: "猎人炖锅", icon: "🍲", price: 60, affinity: 30, detail: "炖了一整夜的浓汤，暖胃也暖心。" },
    { id: "harvest_feast", name: "丰收宴席", icon: "🍱", price: 120, affinity: 60, detail: "一整桌丰盛的宴席，再倔强的俘虏也会动摇。" }
  ];
  // 队伍粮食（类似魔兽争霸的人口食物）：每场战斗按“出战随从数 + 在押犯人数”消耗，用面粉补充。
  // 面粉只用来填饱肚子，不能提升好感；上面的菜肴只用来投喂犯人，不计入粮食。
  const FLOUR = { id: "flour", name: "面粉", icon: "🌾", price: 2, rations: 5, detail: "最便宜的基础口粮，一袋够5个人吃一顿。" };
  const STARTING_RATIONS = 60;
  const FOOD_BY_ID = Object.fromEntries(FOODS.map(food => [food.id, food]));
  const AFFINITY_TIERS = [
    [60, "信任"],
    [30, "松动"],
    [1, "戒备"],
    [0, "敌视"]
  ];
  const FEED_LINES = {
    favorite: ["（眼睛一下子亮了）……这、这是我最爱吃的！", "……哼，算你识相。再来一份也不是不行。", "（狼吞虎咽）你们人类，偶尔也会做点像样的事。"],
    normal: ["……放那儿吧，我饿了才会吃。", "（小口吃着）味道……还行。", "别以为一顿饭就能收买我。"],
    bonded: ["我记住你的味道了。需要我上战场的时候，喊一声就好。", "……好吧，这次我站在你这边。", "吃了你这么多东西，总得还点人情。"],
    levelUp: ["和你待在一起，好像没那么讨厌了。", "下次上战场，我会拼尽全力。", "这份情谊，我会用战功来还。"]
  };

  const save = () => CF.SaveSystem.data;
  const foodStock = () => save().foods || (save().foods = {});
  const fedDayMap = () => save().fedDay || (save().fedDay = {});
  const affinityMap = () => save().affinity || (save().affinity = {});
  const pick = list => list[Math.floor(Math.random() * list.length)];

  const Restaurant = {
    FLOUR,
    STARTING_RATIONS,
    rations() { return Math.max(0, Math.floor(Number(save().rations) || 0)); },
    // 每场战斗的粮食消耗：能出战的随从牌（每张1份）+ 营地监狱的在押犯人（每人1份）。
    upkeep() {
      const units = CF.SaveSystem.availableDeck().filter(id => CF.CARD_LIBRARY[id]?.type === "unit").length;
      const prisoners = CF.Adventure.prisonRoster().filter(prisoner => prisoner.captured).length;
      return { units, prisoners, total: units + prisoners };
    },
    // 补足 need 份粮食需要的面粉袋数与金币。
    flourFor(need) {
      const bags = Math.max(0, Math.ceil(need / FLOUR.rations));
      return { bags, cost: bags * FLOUR.price };
    },
    buyFlour(bags = 1) {
      const count = Math.max(1, Math.floor(Number(bags) || 1));
      const cost = count * FLOUR.price;
      if (save().coins < cost) return { ok: false, reason: `金币不足，需要${cost}金币。` };
      save().coins -= cost;
      save().rations = this.rations() + count * FLOUR.rations;
      CF.SaveSystem.save();
      return { ok: true, bags: count, cost, rations: count * FLOUR.rations };
    },
    // 开战时扣除粮食。粮食不够时 hungry 为 true：剩余粮食全部吃光，本场随从饿着肚子上阵。
    consumeForBattle() {
      const { total } = this.upkeep();
      const have = this.rations();
      const hungry = have < total;
      save().rations = hungry ? 0 : have - total;
      CF.SaveSystem.save();
      return { cost: total, eaten: Math.min(have, total), hungry };
    },
    BOND_THRESHOLD,
    BOND_STEP,
    MAX_BOND_LEVEL,
    MAX_AFFINITY,
    FOODS,
    RACES,
    food(id) { return FOOD_BY_ID[id] || null; },
    foodCount(id) { return Math.max(0, Number(foodStock()[id]) || 0); },
    totalFood() { return FOODS.reduce((sum, food) => sum + this.foodCount(food.id), 0); },
    buyFood(id, amount = 1) {
      const food = FOOD_BY_ID[id];
      const count = Math.max(1, Math.floor(Number(amount) || 1));
      if (!food) return { ok: false, reason: "没有这道菜。" };
      const cost = food.price * count;
      if (save().coins < cost) return { ok: false, reason: `金币不足，需要${cost}金币。` };
      save().coins -= cost;
      foodStock()[id] = this.foodCount(id) + count;
      CF.SaveSystem.save();
      return { ok: true, food, count, cost };
    },
    // 每名在押首领每天只能投喂一次（游戏时间，见 clock.js）。
    fedToday(key) { return Number(fedDayMap()[key]) === CF.GameClock.day(); },
    affinity(key) { return Math.max(0, Math.min(MAX_AFFINITY, Number(affinityMap()[key]) || 0)); },
    // 好感等级：0 = 尚未结缘；1 = 结缘；之后每 BOND_STEP 点升一级。
    levelFor(value) { return value < BOND_THRESHOLD ? 0 : Math.min(MAX_BOND_LEVEL, 1 + Math.floor((value - BOND_THRESHOLD) / BOND_STEP)); },
    bondLevel(key) { return this.levelFor(this.affinity(key)); },
    levelName(level) { return BOND_LEVEL_NAMES[level] || ""; },
    // 达到下一级所需的好感度；满级时返回 null。
    nextThreshold(value) {
      const level = this.levelFor(value);
      return level >= MAX_BOND_LEVEL ? null : BOND_THRESHOLD + BOND_STEP * level;
    },
    tier(value) {
      const level = this.levelFor(value);
      return level ? `${BOND_LEVEL_NAMES[level]} Lv${level}` : AFFINITY_TIERS.find(([min]) => value >= min)[1];
    },
    isBonded(key) { return this.bondLevel(key) >= 1; },
    // 投喂本族最爱的食物好感度翻倍；好感度封顶于满级。
    affinityGain(chapter, foodId) {
      const food = FOOD_BY_ID[foodId];
      if (!food) return 0;
      return food.affinity * (RACES[chapter]?.favorite === foodId ? 2 : 1);
    },
    feed(key, foodId) {
      const prisoner = CF.Adventure.prisonRoster().find(entry => entry.key === key);
      const food = FOOD_BY_ID[foodId];
      if (!prisoner?.captured || !prisoner.cardId) return { ok: false, reason: "这名觉醒者不在押，或没有需要结缘的卡牌。" };
      if (!food) return { ok: false, reason: "没有这道菜。" };
      if (this.affinity(key) >= MAX_AFFINITY) return { ok: false, reason: `${prisoner.name}的好感度已经达到最高的${BOND_LEVEL_NAMES[MAX_BOND_LEVEL]}。` };
      if (CF.Labor?.isAway(key)) return { ok: false, reason: `${prisoner.name}正在外面干活，回营后再来投喂吧。` };
      if (this.fedToday(key)) return { ok: false, reason: `${prisoner.name}今天已经吃饱了，明天再来吧（${CF.GameClock.untilNextDayLabel()}后是新的一天）。` };
      if (this.foodCount(foodId) < 1) return { ok: false, reason: `背包里没有${food.name}，先去城镇的金杯餐馆买一些吧。` };
      const from = this.affinity(key);
      const favorite = RACES[prisoner.chapter]?.favorite === foodId;
      const bossOwner = Object.values(CF.Adventure.bondCardOwners()).find(owner => owner.boss && owner.chapter === prisoner.chapter);
      const bossLevelBefore = bossOwner ? this.ownerLevel(bossOwner) : 0;
      const to = Math.min(MAX_AFFINITY, from + this.affinityGain(prisoner.chapter, foodId));
      foodStock()[foodId] = this.foodCount(foodId) - 1;
      fedDayMap()[key] = CF.GameClock.day();
      affinityMap()[key] = to;
      CF.SaveSystem.save();
      const levelFrom = this.levelFor(from);
      const levelTo = this.levelFor(to);
      const bonded = levelFrom === 0 && levelTo >= 1;
      const leveledUp = levelTo > levelFrom;
      const bossLevelAfter = bossOwner ? this.ownerLevel(bossOwner) : 0;
      const bossCard = bossLevelAfter > bossLevelBefore ? { cardId: bossOwner.cardId, name: bossOwner.name, from: bossLevelBefore, to: bossLevelAfter } : null;
      const line = pick(bonded ? FEED_LINES.bonded : leveledUp ? FEED_LINES.levelUp : favorite ? FEED_LINES.favorite : FEED_LINES.normal);
      return { ok: true, prisoner, food, from, to, gained: to - from, favorite, bonded, leveledUp, levelFrom, levelTo, bossCard, line };
    },
    // 奖励卡 → 对应在押首领；最终首领的卡牌对应本关全部在押首领（members）。
    bondOwner(cardId) { return CF.Adventure.bondCardOwners()[cardId] || null; },
    ownerLevel(owner) {
      if (!owner) return 0;
      if (!owner.boss) return this.bondLevel(owner.key);
      return Math.min(...owner.members.map(key => this.bondLevel(key)));
    },
    // 最终首领卡：本关已结缘的在押首领数。
    bondedMembers(owner) { return owner?.boss ? owner.members.filter(key => this.isBonded(key)).length : 0; },
    // 不需要结缘的卡牌返回 null；否则返回好感等级（0 = 未结缘，无法出战）。
    cardBondLevel(cardId) {
      const owner = this.bondOwner(cardId);
      return owner ? this.ownerLevel(owner) : null;
    },
    isCardBondLocked(cardId) { return this.cardBondLevel(cardId) === 0; },
    // 卡牌的好感加成等级：结缘只是解锁，之后每高一级加成一级。
    cardBondBonus(cardId) { return Math.max(0, (this.cardBondLevel(cardId) || 0) - 1); },
    // 卡牌描述：写明每级加成的具体数值。
    bonusText(cardId, bonus = this.cardBondBonus(cardId)) {
      const card = CF.CARD_LIBRARY[cardId];
      if (!card || !bonus) return "";
      return card.type === "unit" ? `+${bonus * CF.BOND_UNIT_ATTACK}攻击 / +${bonus * CF.BOND_UNIT_HEALTH}生命` : `法术效果提升${bonus * CF.BOND_SPELL_LEVELS}级`;
    }
  };

  CF.Restaurant = Restaurant;
})();

(function () {
  "use strict";

  // 金杯餐馆与在押首领的好感度。
  // 第二关起，每个普通/精英首领的首杀奖励卡都属于营地监狱里对应的那名在押首领：
  // 必须带着餐馆的食物去探监，把好感度提升到 BOND_THRESHOLD 才能把这张卡编入卡组出战。
  // 各关最终首领被同族救走、不在监狱中，因此它们的奖励卡不受好感度限制。
  const CF = window.CardForge;
  const BOND_THRESHOLD = 100;
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
  const FOOD_BY_ID = Object.fromEntries(FOODS.map(food => [food.id, food]));
  const AFFINITY_TIERS = [
    [BOND_THRESHOLD, "结缘"],
    [60, "信任"],
    [30, "松动"],
    [1, "戒备"],
    [0, "敌视"]
  ];
  const FEED_LINES = {
    favorite: ["（眼睛一下子亮了）……这、这是我最爱吃的！", "……哼，算你识相。再来一份也不是不行。", "（狼吞虎咽）你们人类，偶尔也会做点像样的事。"],
    normal: ["……放那儿吧，我饿了才会吃。", "（小口吃着）味道……还行。", "别以为一顿饭就能收买我。"],
    bonded: ["我记住你的味道了。需要我上战场的时候，喊一声就好。", "……好吧，这次我站在你这边。", "吃了你这么多东西，总得还点人情。"]
  };

  const save = () => CF.SaveSystem.data;
  const foodStock = () => save().foods || (save().foods = {});
  const affinityMap = () => save().affinity || (save().affinity = {});
  const pick = list => list[Math.floor(Math.random() * list.length)];

  const Restaurant = {
    BOND_THRESHOLD,
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
    affinity(key) { return Math.max(0, Math.min(BOND_THRESHOLD, Number(affinityMap()[key]) || 0)); },
    tier(value) { return AFFINITY_TIERS.find(([min]) => value >= min)[1]; },
    isBonded(key) { return this.affinity(key) >= BOND_THRESHOLD; },
    // 投喂本族最爱的食物好感度翻倍；好感度封顶于结缘值。
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
      if (this.isBonded(key)) return { ok: false, reason: `${prisoner.name}已经与你结缘了。` };
      if (this.foodCount(foodId) < 1) return { ok: false, reason: `背包里没有${food.name}，先去城镇的金杯餐馆买一些吧。` };
      const from = this.affinity(key);
      const favorite = RACES[prisoner.chapter]?.favorite === foodId;
      const to = Math.min(BOND_THRESHOLD, from + this.affinityGain(prisoner.chapter, foodId));
      foodStock()[foodId] = this.foodCount(foodId) - 1;
      affinityMap()[key] = to;
      CF.SaveSystem.save();
      const bonded = to >= BOND_THRESHOLD;
      return { ok: true, prisoner, food, from, to, gained: to - from, favorite, bonded, line: pick(bonded ? FEED_LINES.bonded : favorite ? FEED_LINES.favorite : FEED_LINES.normal) };
    },
    // 奖励卡 → 对应在押首领；最终首领的奖励卡不在表中，因而不受限制。
    bondOwner(cardId) { return CF.Adventure.bondCardOwners()[cardId] || null; },
    isCardBondLocked(cardId) {
      const owner = this.bondOwner(cardId);
      return Boolean(owner) && !this.isBonded(owner.key);
    }
  };

  CF.Restaurant = Restaurant;
})();

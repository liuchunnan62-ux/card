(function () {
  "use strict";

  // 经济数值表：粮食、餐馆食物、好感等级、游戏时间与犯人派遣的全部数值。
  // restaurant.js、clock.js、labor.js、save.js 与平衡模拟（tools/simulate.cjs）都从这里读取；调数值只改本文件。
  const CF = window.CardForge = window.CardForge || {};

  const ECONOMY = {
    // 队伍粮食（类似魔兽争霸的人口食物）：每场战斗按“出战随从数 + 在押犯人数”消耗，用面粉补充。
    rations: {
      starting: 60,                     // 新存档自带的粮食
      flour: { id: "flour", name: "面粉", icon: "🌾", price: 2, rations: 5, detail: "最便宜的基础口粮，一袋够5个人吃一顿。" }
    },
    // 游戏时间：现实 dayMinutes 分钟为游戏里的一天；每天额外吃掉 dailyBattles 场战斗的口粮。
    clock: { dayMinutes: 24, dailyBattles: 3, innPrice: 30 },
    // 好感：affinity 到 threshold 结缘（Lv1），之后每 step 点升一级，最高 maxLevel 级。
    bond: { threshold: 100, step: 100, maxLevel: 5, levelNames: ["", "结缘", "亲近", "挚友", "羁绊", "誓约"] },
    // 族群口味：投喂本族最爱的食物时好感度翻倍。键是章节编号。
    races: {
      2: { name: "哥布林", favorite: "charred_skewer" },
      3: { name: "熊族", favorite: "honey_pancake" },
      4: { name: "史莱姆", favorite: "moondew_jelly" },
      5: { name: "狼族", favorite: "bone_roast" }
    },
    // 金杯餐馆的菜肴：price 金币，affinity 每次投喂增加的好感（最爱食物翻倍）。
    foods: [
      { id: "wheat_bread", name: "麦香面包", icon: "🍞", price: 12, affinity: 6, detail: "刚出炉的粗麦面包，谁都不会拒绝。" },
      { id: "charred_skewer", name: "炭烤肉串", icon: "🍢", price: 30, affinity: 15, detail: "撒满辣椒粉的炭烤肉串，哥布林最爱抢着吃。" },
      { id: "honey_pancake", name: "金蜜松饼", icon: "🥞", price: 30, affinity: 15, detail: "淋上整勺蜂蜜的厚松饼，熊族闻到就走不动路。" },
      { id: "moondew_jelly", name: "月露果冻", icon: "🍮", price: 30, affinity: 15, detail: "用月潭露水凝成的清凉果冻，史莱姆会把它整个吞进身体里。" },
      { id: "bone_roast", name: "炙烤带骨肉", icon: "🍖", price: 30, affinity: 15, detail: "外焦里嫩的大块带骨肉，狼族会一边啃一边摇尾巴。" },
      { id: "hunter_stew", name: "猎人炖锅", icon: "🍲", price: 60, affinity: 30, detail: "炖了一整夜的浓汤，暖胃也暖心。" },
      { id: "harvest_feast", name: "丰收宴席", icon: "🍱", price: 120, affinity: 60, detail: "一整桌丰盛的宴席，再倔强的俘虏也会动摇。" }
    ],
    // 犯人派遣劳动：结缘后的在押首领每天可派出一次，jobHours 游戏小时后回营。键是章节编号。
    // yields 按好感等级 Lv1~Lv5 逐级列出收获：coins 金币、rations 粮食、cardXp 卡牌经验、foods 食物。
    labor: {
      jobHours: 6,
      jobs: {
        2: { id: "mine", race: "哥布林", name: "下矿", icon: "⛏️", detail: "钻进褐石矿坑挖金子，按好感等级带回金币。",
          yields: { coins: [10, 15, 20, 25, 30] } },
        3: { id: "farm", race: "熊族", name: "种田", icon: "🌾", detail: "去营地外的麦田耕种，收获的麦子直接磨成面粉，补充队伍粮食。",
          yields: { rations: [8, 12, 16, 20, 24] } },
        4: { id: "brew", race: "史莱姆", name: "熬药", icon: "⚗️", detail: "用身体慢慢熬出药水，给卡组里随机一张未满级的卡牌增加经验。",
          yields: { cardXp: [1, 2, 3, 4, 5] } },
        5: { id: "hunt", race: "狼族", name: "打猎", icon: "🏹", detail: "去林子里打猎，带回炙烤带骨肉（狼族最爱）和一些粮食。",
          yields: { rations: [2, 4, 6, 8, 10], foods: { bone_roast: [1, 1, 2, 2, 2] } } }
      }
    }
  };

  CF.ECONOMY = ECONOMY;
})();

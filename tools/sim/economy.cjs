// 经济模拟：用真实的餐馆、粮食、游戏时间与派遣代码（restaurant.js / clock.js / labor.js），
// 按天推演一个“标准玩家”从第一关打到第五关的金币与粮食曲线。
//
// 玩家行为假设（可用参数调整）：
//   · 按节点顺序推进，每场战斗（含失败重打）花 minutesPerBattle 分钟现实时间，游戏时间同步流逝（现实24分钟 = 1天）；
//   · 每场胜负按战斗模拟得到的该节点胜率掷骰；胜利获得数据表中的基础金币，首领被收押；
//   · 开战前粮食不够就买面粉补足；金币也不够就饿着肚子出战；
//   · 每天为尚未达到 bondTarget 级好感的在押首领各买一份本族最爱的食物投喂（保留 reserve 金币不花）；
//   · 每天把能派遣的首领全部派去干活，回营时收获计入。
// 不计入：英雄经验与升级、战利品与装备、商店与事件节点、训练与救治伤员、夜晚事件。
const { createGameContext } = require("../../tests/helpers/game-context.cjs");
const { mulberry32 } = require("./runner.cjs");

const DEFAULTS = { minutesPerBattle: 4, bondTarget: 1, reserve: 0, seed: 1, maxDays: 400 };

function simulateEconomy(winRates, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const math = Object.create(Math);
  math.random = mulberry32(opts.seed);
  const rng = mulberry32(opts.seed + 101);
  const { CF } = createGameContext({ math });
  CF.SaveSystem.load();
  const data = CF.freshSave("captain");
  CF.SaveSystem.data = data;
  const R = CF.Restaurant;
  const clockMs = opts.minutesPerBattle * 60 * 1000;
  const totals = { battleGold: 0, laborGold: 0, laborRations: 0, foodSpent: 0, flourSpent: 0, battles: 0, losses: 0, hungryBattles: 0, hungryDays: 0 };
  const days = [];
  const chapters = [];
  let lastDay = 0;

  const snapshot = chapterId => {
    const roster = CF.Adventure.prisonRoster().filter(prisoner => prisoner.captured);
    days.push({
      day: CF.GameClock.day(),
      chapter: chapterId,
      coins: data.coins,
      rations: R.rations(),
      prisoners: roster.length,
      bonded: roster.filter(prisoner => prisoner.cardId && R.isBonded(prisoner.key)).length,
      upkeep: R.upkeep().total,
      ...totals
    });
  };

  // 每天一次：投喂与派遣。
  const dailyRoutine = () => {
    const roster = CF.Adventure.prisonRoster().filter(prisoner => prisoner.captured && prisoner.cardId);
    roster.forEach(prisoner => {
      if (R.bondLevel(prisoner.key) >= opts.bondTarget || R.fedToday(prisoner.key) || CF.Labor.isAway(prisoner.key)) return;
      const favorite = CF.ECONOMY.races[prisoner.chapter]?.favorite;
      if (!favorite) return;
      if (R.foodCount(favorite) < 1) {
        if (data.coins - R.food(favorite).price < opts.reserve) return;
        const bought = R.buyFood(favorite, 1);
        if (!bought.ok) return;
        totals.foodSpent += bought.cost;
      }
      R.feed(prisoner.key, favorite);
    });
    CF.Labor.dispatchAll();
  };

  const collectLabor = () => {
    CF.Labor.collectReturned().forEach(result => {
      totals.laborGold += result.reward.coins || 0;
      totals.laborRations += result.reward.rations || 0;
    });
  };

  const passTime = ms => {
    const reports = CF.GameClock.advance(ms);
    reports.forEach(report => { if (report.hungry) totals.hungryDays += 1; });
    collectLabor();
    if (CF.GameClock.day() !== lastDay) {
      lastDay = CF.GameClock.day();
      dailyRoutine();
      snapshot(data.activeChapter);
    }
  };

  passTime(0);
  for (const chapter of CF.CHAPTERS) {
    const startDay = CF.GameClock.day();
    const startCoins = data.coins;
    data.completedRuns = chapter.id - 1;
    data.activeChapter = chapter.id;
    data.chapterRuns[chapter.id] = CF.freshRun(data, chapter.id);
    const run = data.chapterRuns[chapter.id];
    data.run = run;
    let battles = 0;
    for (let index = 0; index < chapter.nodes.length; index += 1) {
      const node = chapter.nodes[index];
      if (!["normal", "elite", "boss"].includes(node.type)) continue;
      const winRate = Math.max(0.02, winRates[`${chapter.id}-${index}`] ?? 1);
      let won = false;
      while (!won) {
        if (CF.GameClock.day() > opts.maxDays) break;
        const need = R.upkeep().total - R.rations();
        if (need > 0) {
          const { bags, cost } = R.flourFor(need);
          if (data.coins >= cost && bags > 0) { R.buyFlour(bags); totals.flourSpent += cost; }
        }
        const meal = R.consumeForBattle();
        if (meal.hungry) totals.hungryBattles += 1;
        battles += 1;
        totals.battles += 1;
        won = rng() < winRate;
        if (!won) totals.losses += 1;
        passTime(clockMs);
      }
      if (!won) break;
      const gold = chapter.victoryRewards[node.type].gold;
      data.coins += gold;
      totals.battleGold += gold;
      run.completed.push({ stage: index, type: node.type });
    }
    chapters.push({
      chapter: chapter.id,
      region: chapter.region,
      days: CF.GameClock.day() - startDay,
      endDay: CF.GameClock.day(),
      battles,
      coinsStart: startCoins,
      coinsEnd: data.coins,
      rationsEnd: R.rations(),
      prisoners: CF.Adventure.prisonRoster().filter(prisoner => prisoner.captured).length,
      upkeep: R.upkeep().total,
      dailyRations: CF.GameClock.dailyRations()
    });
    if (CF.GameClock.day() > opts.maxDays) break;
  }
  snapshot(data.activeChapter);
  return { options: opts, totals: { ...totals }, chapters, days };
}

module.exports = { simulateEconomy, ECONOMY_DEFAULTS: DEFAULTS };

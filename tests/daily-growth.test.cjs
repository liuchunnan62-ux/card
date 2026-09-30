// 每日成长：通关统领试炼第七关且最大法力达到10后，每天英雄最大生命值+1。
const test = require("node:test");
const assert = require("node:assert/strict");
const { createGameContext } = require("./helpers/game-context.cjs");

test("通关试炼第七关、最大法力10后，每到新的一天最大生命值+1", () => {
  const { CF } = createGameContext();
  CF.SaveSystem.newGame(1, "captain");
  const data = CF.SaveSystem.data;
  const G = CF.GameClock;
  const rule = CF.ECONOMY.dailyGrowth;
  data.rations = 100000;
  data.clock = { day: 1, elapsed: 0 };

  const start = data.hero.maxHealth;
  assert.equal(G.advance(G.DAY_MS)[0].maxHealthGain, 0, "未通关试炼时没有每日成长");
  assert.equal(data.hero.maxHealth, start);

  data.commanderTrials.completed = [1, 2, 3, 4, 5, 6, 7];
  data.hero.maxMana = rule.requiresMaxMana - 1;
  G.advance(G.DAY_MS);
  assert.equal(data.hero.maxHealth, start, "最大法力未达标时没有每日成长");

  data.hero.maxMana = rule.requiresMaxMana;
  const reports = G.advance(G.DAY_MS * 3);
  assert.equal(reports.length, 3);
  assert.ok(reports.every(report => report.maxHealthGain === rule.maxHealth), "每天都应记录成长");
  assert.equal(data.hero.maxHealth, start + 3 * rule.maxHealth, "三天后最大生命值+3");

  data.coins = 1000;
  assert.equal(G.sleepAtInn().report.maxHealthGain, rule.maxHealth, "客栈过夜同样算作新的一天");
  assert.equal(data.hero.maxHealth, start + 4 * rule.maxHealth);
});

// 平衡模拟工具的冒烟测试：保证机器人、战斗模拟与经济模拟在游戏代码改动后仍然能跑通且结果可复现。
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSimulator } = require("../tools/sim/runner.cjs");
const { simulateEconomy } = require("../tools/sim/economy.cjs");

const sim = createSimulator();

test("机器人能打完一场战斗，同一个种子结果相同", async () => {
  const first = await sim.simulateNode(1, 1, { runs: 3, seed: 42 });
  const second = await sim.simulateNode(1, 1, { runs: 3, seed: 42 });
  assert.equal(first.runs, 3);
  assert.ok(first.winRate >= 0 && first.winRate <= 1);
  assert.equal(first.timeouts, 0, "第一关普通战斗不应拖到回合上限");
  assert.deepEqual({ ...second, profile: null }, { ...first, profile: null });
});

test("机器人在第一关第一场普通战斗中能够获胜", async () => {
  const result = await sim.simulateNode(1, 1, { runs: 4, seed: 7 });
  assert.ok(result.winRate > 0, "机器人应能赢下最简单的战斗；若为0，多半是机器人或战斗接口出了问题");
});

test("章节模拟覆盖全部战斗节点，并使用数据表中的敌人", async () => {
  const rows = await sim.simulateChapter(1, { runs: 1 });
  const battleNodes = sim.CF.chapterById(1).nodes.filter(node => ["normal", "elite", "boss"].includes(node.type)).length;
  assert.equal(rows.length, battleNodes);
  assert.equal(rows[rows.length - 1].label, "森林狼王");
  assert.ok(rows.every(row => row.enemyHealth > 0));
});

test("经济模拟能从第一关推演到最后一关", () => {
  const result = simulateEconomy({}, { minutesPerBattle: 4 });
  assert.equal(result.chapters.length, sim.CF.CHAPTERS.length);
  assert.ok(result.days.length > 1);
  assert.ok(result.totals.battleGold > 0 && result.totals.flourSpent >= 0);
  assert.equal(result.totals.losses, 0, "胜率全部为100%时不应有失败");
  assert.ok(result.chapters.every(row => row.coinsEnd >= 0));
});

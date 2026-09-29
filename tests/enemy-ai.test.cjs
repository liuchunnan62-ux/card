// 敌方攻击目标：远程单位优先点杀我方随从，近战单位有突破口就突脸。
const test = require("node:test");
const assert = require("node:assert/strict");
const { createGameContext } = require("./helpers/game-context.cjs");

const { CF } = createGameContext();
CF.SaveSystem.load();

let uid = 0;
const unit = (name, attack, health, { ranged = false, justSummoned = false } = {}) => ({
  uid: `test-${uid += 1}`, cardId: "test", name, attack, health, maxHealth: health, level: 1,
  keywords: ranged ? ["远程"] : [], combatStyle: ranged ? "ranged" : "melee", role: "",
  ready: true, justSummoned, tempAttack: 0, healUsed: false
});

// 第1路有我方随从，第2~4路空着：敌方随从可以直接打到英雄。
function setup({ playerHp = 30 } = {}) {
  const battle = new CF.Battle(CF.enemies.goblin_warband, {});
  const state = battle.state;
  state.player.hp = playerHp;
  state.player.board = CF.emptyBoard();
  state.enemy.board = CF.emptyBoard();
  const archer = unit("我方弓手", 3, 3, { ranged: true });
  const knight = unit("我方骑士", 5, 8);
  state.player.board.front[0] = knight;
  state.player.board.back[1] = null;
  state.player.board.front[2] = null;
  return { battle, state, knight, archer };
}

test("远程单位有随从可打时攻击随从，不打脸", () => {
  const { battle, state, knight } = setup();
  const shooter = unit("敌方射手", 4, 3, { ranged: true });
  state.enemy.board.back[1] = shooter;
  battle.aiAttack("back", 1);
  assert.equal(state.player.hp, 30, "远程单位不应绕过随从打脸");
  assert.equal(knight.health, 4, "远程单位应攻击我方随从");
  assert.equal(shooter.health, 3, "远程攻击不受反击");
});

test("远程单位优先击杀能打死的高威胁目标，其次是我方远程单位", () => {
  const { battle, state, knight, archer } = setup();
  state.player.board.back[1] = archer; // 第2路没有前排保护，可以被攻击
  const shooter = unit("敌方射手", 4, 3, { ranged: true });
  state.enemy.board.back[1] = shooter;
  battle.aiAttack("back", 1);
  battle.cleanDead();
  assert.equal(state.player.board.back[1], null, "4攻打3血的弓手能击杀，应优先击杀");
  assert.equal(knight.health, 8);
});

test("远程单位一击就能击杀英雄时打脸", () => {
  const { battle, state, knight } = setup({ playerHp: 4 });
  state.enemy.board.back[1] = unit("敌方射手", 4, 3, { ranged: true });
  battle.aiAttack("back", 1);
  assert.equal(state.player.hp, 0);
  assert.equal(knight.health, 8);
});

test("我方没有随从时远程单位打脸", () => {
  const { battle, state } = setup();
  state.player.board = CF.emptyBoard();
  state.enemy.board.back[1] = unit("敌方射手", 4, 3, { ranged: true });
  battle.aiAttack("back", 1);
  assert.equal(state.player.hp, 26);
});

test("近战单位有突破口时突脸", () => {
  const { battle, state, knight } = setup();
  state.enemy.board.front[1] = unit("敌方斗士", 4, 3);
  battle.aiAttack("front", 1);
  assert.equal(state.player.hp, 26, "近战单位应通过空路线攻击英雄");
  assert.equal(knight.health, 8);
});

test("近战单位没有突破口时攻击随从", () => {
  const { battle, state, knight } = setup();
  [1, 2, 3].forEach(column => { state.player.board.front[column] = unit(`挡路${column}`, 1, 10); });
  state.enemy.board.front[0] = unit("敌方斗士", 4, 3);
  battle.aiAttack("front", 0);
  assert.equal(state.player.hp, 30);
  assert.ok(knight.health < 8 || [1, 2, 3].some(column => state.player.board.front[column].health < 10));
});

test("战场播报只显示敌方的出牌与技能，不显示伤害结算", () => {
  const { battle, state } = setup();
  state.battleNotices = [];
  state.enemy.mana = 10;
  const index = state.enemy.hand.findIndex(card => card.type === "unit");
  const card = state.enemy.hand[index];
  battle.summon("enemy", index, "front", 3);
  battle.addLog("哥布林从第1路前排发起攻击，造成3点伤害；我方英雄剩余27/30生命。", "enemy");
  battle.addLog("哥布林战团发动「战斗号角」：本回合召唤1个2攻/2血哥布林。", "boss");
  battle.addLog("哥布林战团通过「战斗号角」免费召唤普通哥布林到第2路前排（2攻/2血）。", "boss");
  battle.addLog("3个敌方再生随从在回合开始时共恢复6点生命。", "boss");
  const messages = Array.from(state.battleNotices, notice => notice.message);
  assert.deepEqual(messages, [`哥布林战团 打出随从「${card.name}」`, "哥布林战团 发动「战斗号角」"]);
  assert.ok(messages.every(text => !/伤害|生命/.test(text)));
});

test("敌方头像下显示手牌数量", () => {
  const { battle, state } = setup();
  assert.match(battle.html(), new RegExp(`🂠 手牌 ${state.enemy.hand.length}<`));
});

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
  state.enemy.board.back[0] = shooter; // 与我方骑士同在第1路
  battle.aiAttack("back", 0);
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

test("首领每回合免费发动英雄技能，不消耗法力", async () => {
  const data = CF.SaveSystem.data;
  data.completedRuns = 4;
  data.chapterRuns[5] = CF.freshRun(data, 5);
  data.activeChapter = 5;
  const run = CF.Adventure.current(5);
  run.activeNode = 0;
  data.run = run;
  const enemy = { ...CF.Adventure.encounterFor("normal"), deck: [] };
  assert.equal(enemy.heroSkill.id, "white_wolf");
  const battle = new CF.Battle(enemy, {});
  battle.state.enemy.hand = [];
  battle.state.enemy.deck = [];
  const before = [...battle.state.enemy.board.front, ...battle.state.enemy.board.back].filter(Boolean).length;
  assert.equal(battle.useEnemyHeroSkill(), true);
  assert.equal(battle.state.enemy.mana, battle.state.enemy.maxMana, "英雄技能免费发动，不消耗法力");
  const after = [...battle.state.enemy.board.front, ...battle.state.enemy.board.back].filter(Boolean);
  assert.equal(after.length, before + 1, "应召唤出白狼先锋");
  assert.ok(battle.state.battleNotices.some(notice => notice.message.includes("发动「白狼急袭」")));
  assert.match(battle.html(), /英雄技能 · 白狼急袭 Lv1/);
  battle.state.enemy.mana = 0;
  assert.equal(battle.useEnemyHeroSkill(), true, "法力为0时也能免费发动");
});

test("没有目标时首领跳过英雄技能", () => {
  const { battle, state } = setup();
  battle.enemyConfig = { ...battle.enemyConfig, heroSkill: { id: "frost_fang", level: 3 } };
  state.player.board = CF.emptyBoard();
  state.enemy.mana = 5;
  assert.equal(battle.useEnemyHeroSkill(), false, "寒牙撕咬需要我方前排目标");
});

test("近战随从攻击远程随从时不受反击，攻击近战随从时照常受反击", () => {
  const { battle, state } = setup();
  const enemyArcher = unit("敌方弓手", 6, 3, { ranged: true });
  const enemyBrute = unit("敌方蛮兵", 4, 10);
  state.enemy.board.back[1] = enemyArcher;
  state.enemy.board.front[2] = enemyBrute;
  const fighter = unit("我方剑士", 3, 8);
  state.player.board.front[1] = fighter;
  battle.performUnitAttack("player", "front", 1, "enemy", "back", 1);
  assert.equal(fighter.health, 8, "远程目标无法反击");
  const fighter2 = unit("我方剑士二", 3, 8);
  state.player.board.front[3] = fighter2;
  battle.performUnitAttack("player", "front", 3, "enemy", "front", 2);
  assert.equal(fighter2.health, 4, "近战目标照常反击");
});

test("随从只攻击本路：先前排，再后排，本路清空才打脸，不碰其他路线", () => {
  const { battle, state } = setup();
  state.player.board = CF.emptyBoard();
  const guard = unit("我方前排", 1, 3);
  const archer = unit("我方弓手", 3, 3, { ranged: true });
  const bystander = unit("其他路线的弓手", 1, 1, { ranged: true });
  state.player.board.front[1] = guard;
  state.player.board.back[1] = archer;
  state.player.board.back[2] = bystander;        // 第3路无前排保护，但不在本路
  const brute = unit("敌方蛮兵", 4, 20);
  state.enemy.board.front[1] = brute;
  battle.aiAttack("front", 1);
  battle.cleanDead();
  assert.equal(state.player.board.front[1], null, "先击败本路前排");
  assert.equal(bystander.health, 1, "不攻击其他路线的随从");
  brute.ready = true;
  battle.aiAttack("front", 1);
  battle.cleanDead();
  assert.equal(state.player.board.back[1], null, "前排清掉后攻击本路后排");
  assert.equal(state.player.hp, 30, "本路未清空前不会打脸");
  brute.ready = true;
  battle.aiAttack("front", 1);
  assert.equal(state.player.hp, 26, "本路清空后攻击英雄");
  assert.equal(bystander.health, 1, "其他路线的随从依旧不受攻击");
});

test("史莱姆首领的潮汐愈合：没有受伤随从时召唤小史莱姆，有伤员时治疗", () => {
  const { battle, state } = setup();
  battle.enemyConfig = { ...battle.enemyConfig, heroSkill: { id: "tide_mending", level: 2, fallbackSummon: { name: "小史莱姆", icon: "💧", image: "assets/cards/chapter4/dewdrop-scout.png", attack: [2, 3, 4], health: [4, 5, 6] } } };
  state.enemy.board = CF.emptyBoard();
  assert.equal(battle.useEnemyHeroSkill(), true);
  const slime = [...state.enemy.board.front, ...state.enemy.board.back].find(Boolean);
  assert.equal(slime.name, "小史莱姆");
  assert.equal(slime.attack, 3);
  assert.equal(slime.health, 5);
  assert.match(battle.html(), /召唤一个3攻\/5血的小史莱姆/);
  slime.health = 1;
  assert.equal(battle.useEnemyHeroSkill(), true);
  assert.equal(slime.health, 5, "有受伤随从时照常治疗");
  assert.equal([...state.enemy.board.front, ...state.enemy.board.back].filter(Boolean).length, 1);
});

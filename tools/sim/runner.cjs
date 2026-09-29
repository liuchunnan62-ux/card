// 平衡模拟的核心：在 Node 沙箱里加载真实的游戏脚本，按“玩家成长假设”搭好存档，
// 再让机器人（bot.cjs）与关卡数据表中的每个首领反复对战，统计胜率。
const { createGameContext } = require("../../tests/helpers/game-context.cjs");
const { PlayerBot } = require("./bot.cjs");
const DEFAULT_PROFILES = require("./profiles.cjs");

// 可复现的伪随机数（mulberry32）：同一个种子总是得到同样的洗牌与战斗过程。
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 取某个节点的成长假设：[进关, 出关] 按节点进度线性插值并取整；overrides 中的字段（命令行参数）优先。
function resolveProfile(base, progress, overrides = {}) {
  const profile = {};
  Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
    profile[key] = Array.isArray(value) ? Math.round(value[0] + (value[1] - value[0]) * progress) : value;
  });
  return profile;
}

// 战斗动画的等待（setTimeout）改为立即执行，一场战斗只需几毫秒。
const instantTimers = {
  setTimeout: (fn, ms, ...args) => { setImmediate(() => fn(...args)); return 0; },
  clearTimeout: () => {}
};

function createSimulator() {
  const math = Object.create(Math);
  math.random = mulberry32(1);
  const { CF } = createGameContext({ math, timers: instantTimers });
  CF.SaveSystem.load();
  const BATTLE_TYPES = ["normal", "elite", "boss"];

  // 按成长假设搭建存档：英雄、法力、卡组（起始卡 + 之前章节的首杀奖励卡）、英雄武器（第一关武器）、卡牌等级、装备与好感。
  function applyProfile(chapterId, profile) {
    const data = CF.freshSave(profile.heroId || "captain");
    CF.SaveSystem.data = data;
    data.completedRuns = chapterId - 1;
    const hero = data.hero;
    hero.level = profile.heroLevel;
    hero.maxHealth = CF.HERO_LEVELS[Math.min(25, Math.max(1, profile.heroLevel))].maxHealth;
    hero.maxMana = profile.maxMana;
    Object.values(hero.skillProgress).forEach(progress => { progress.level = profile.skillLevel; });

    const earlier = CF.CHAPTERS.filter(chapter => chapter.id < chapterId);
    const weapons = earlier.flatMap(chapter => [...chapter.nodes.map(node => node.weaponId), chapter.chapterWeapon].filter(Boolean));
    const rewards = earlier.flatMap(chapter => chapter.rewardCardIds || []);
    const cost = id => CF.CARD_LIBRARY[id].cost;
    const affordable = id => cost(id) <= profile.maxMana;
    const limit = CF.SaveSystem.deckLimit();
    const pool = [
      ...rewards.filter(affordable).sort((a, b) => cost(b) - cost(a)),
      ...CF.STARTER_DECK
    ];
    data.deck = [...new Set(pool)].slice(0, limit);
    data.collection = Object.fromEntries([...data.deck, ...weapons].map(id => [id, 1]));
    // 武器是英雄装备：带上之前章节拿到的最高费武器（冒险中不消耗耐久，每回合可攻击）。
    hero.equippedWeapon = weapons.sort((a, b) => cost(b) - cost(a))[0] || null;
    weapons.forEach(id => { data.cardProgress[id] = { level: profile.cardLevel, xp: 0 }; });
    data.deck.forEach(id => {
      data.cardProgress[id] = { level: profile.cardLevel, xp: 0 };
      if (CF.CARD_LIBRARY[id].type === "unit" && profile.equipment) data.cardEquipment[id] = { weapon: profile.equipment };
    });

    const bond = CF.ECONOMY.bond;
    const affinity = bond.threshold + bond.step * (Math.max(1, profile.bondLevel) - 1);
    CF.Adventure.prisonRoster().filter(prisoner => prisoner.chapter < chapterId).forEach(prisoner => {
      data.prisoners[prisoner.key] = true;
      data.affinity[prisoner.key] = affinity;
    });
    data.rations = 9999;
    data.activeChapter = chapterId;
    data.chapterRuns[chapterId] = CF.freshRun(data, chapterId);
    return data;
  }

  function encounterAt(chapterId, nodeIndex) {
    const data = CF.SaveSystem.data;
    const run = CF.Adventure.current(chapterId);
    run.activeNode = nodeIndex;
    run.hp = data.hero.maxHealth;
    run.maxHp = data.hero.maxHealth;
    data.run = run;
    const node = CF.chapterById(chapterId).nodes[nodeIndex];
    return CF.Adventure.encounterFor(node.type);
  }

  async function runBattle(enemy, seed, maxRounds) {
    math.random = mulberry32(seed);
    const battle = new CF.Battle(enemy, {});
    battle.startPlayerTurn(true);
    const bot = new PlayerBot(battle, CF.Rules);
    const state = battle.state;
    while (!state.ended && !state.rescueEpilogue && state.round <= maxRounds) {
      const round = state.round;
      await bot.playTurn();
      if (!state.ended && !state.rescueEpilogue && state.round === round) break; // 机器人无法结束回合（不应发生）
    }
    const win = Boolean(state.rescueEpilogue) || (state.ended && state.enemy.hp <= 0);
    const loss = !win && state.player.hp <= 0;
    return {
      result: win ? "win" : loss ? "loss" : "timeout",
      rounds: state.round,
      playerHp: Math.max(0, state.player.hp),
      playerMaxHp: state.player.maxHp,
      enemyHp: Math.max(0, state.enemy.hp),
      enemyMaxHp: state.enemy.maxHp
    };
  }

  // 模拟某关某个节点 runs 次，返回胜率等统计。
  async function simulateNode(chapterId, nodeIndex, { runs = 20, seed = 1, maxRounds = 40, profiles = DEFAULT_PROFILES, overrides = {} } = {}) {
    const count = CF.chapterById(chapterId).nodes.length;
    const profile = resolveProfile(profiles[chapterId], count > 1 ? nodeIndex / (count - 1) : 0, overrides);
    applyProfile(chapterId, profile);
    const enemy = encounterAt(chapterId, nodeIndex);
    const results = [];
    for (let i = 0; i < runs; i += 1) results.push(await runBattle(enemy, seed + i * 7919, maxRounds));
    const wins = results.filter(r => r.result === "win");
    const avg = (list, pick) => list.length ? list.reduce((sum, item) => sum + pick(item), 0) / list.length : null;
    const node = CF.chapterById(chapterId).nodes[nodeIndex];
    return {
      chapter: chapterId,
      node: nodeIndex,
      profile,
      label: node.label,
      type: node.type,
      enemyHealth: enemy.health,
      enemyMana: enemy.mana,
      runs,
      winRate: wins.length / runs,
      timeouts: results.filter(r => r.result === "timeout").length,
      avgRounds: avg(results, r => r.rounds),
      avgHpLeft: avg(wins, r => r.playerHp / r.playerMaxHp)
    };
  }

  async function simulateChapter(chapterId, options = {}) {
    const chapter = CF.chapterById(chapterId);
    const rows = [];
    for (let index = 0; index < chapter.nodes.length; index += 1) {
      if (!BATTLE_TYPES.includes(chapter.nodes[index].type)) continue;
      rows.push(await simulateNode(chapterId, index, options));
    }
    return rows;
  }

  return { CF, applyProfile, simulateNode, simulateChapter, DEFAULT_PROFILES };
}

module.exports = { createSimulator, resolveProfile, mulberry32, DEFAULT_PROFILES };

#!/usr/bin/env node
// 平衡模拟：让机器人玩家与关卡数据表（js/data/chapters.js）中的每个首领反复对战，输出胜率曲线。
//
//   node tools/simulate.cjs                     全部章节，每个节点 20 场
//   node tools/simulate.cjs --chapter 3         只模拟第三关
//   node tools/simulate.cjs --runs 50           每个节点 50 场（更准，更慢）
//   node tools/simulate.cjs --mana 7 --level 12 覆盖成长假设（见 tools/sim/profiles.cjs）
//   node tools/simulate.cjs --sweep mana        按最大法力 3~10 分别模拟，输出各关平均胜率矩阵
//   node tools/simulate.cjs --economy           经济模拟：按天推演金币、粮食与结缘进度（见 tools/sim/economy.cjs）
//       --minutes 4                             每场战斗花费的现实分钟数（现实24分钟 = 游戏1天）
//       --bond-target 1                         每个在押首领投喂到几级好感为止（1 结缘 ~ 5 誓约）
//       --reserve 0                             买食物时至少保留的金币
//   node tools/simulate.cjs --json report.json  另存完整结果（JSON）
//
// 同样的参数与种子（--seed）总是得到同样的结果，可以对比改动前后的数值。
const fs = require("node:fs");
const { createSimulator } = require("./sim/runner.cjs");
const { simulateEconomy } = require("./sim/economy.cjs");

const OVERRIDE_FLAGS = { mana: "maxMana", level: "heroLevel", "card-level": "cardLevel", equipment: "equipment", bond: "bondLevel", "skill-level": "skillLevel", hero: "heroId" };

function parseArgs(argv) {
  const args = { runs: 20, seed: 1, overrides: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i].replace(/^--/, "");
    const value = argv[i + 1];
    if (flag === "help" || flag === "h") { args.help = true; continue; }
    i += 1;
    if (flag === "chapter") args.chapter = Number(value);
    else if (flag === "runs") args.runs = Number(value);
    else if (flag === "seed") args.seed = Number(value);
    else if (flag === "json") args.json = value;
    else if (flag === "sweep") args.sweep = value;
    else if (flag === "economy") { args.economy = true; i -= 1; }
    else if (flag === "minutes") args.minutesPerBattle = Number(value);
    else if (flag === "bond-target") args.bondTarget = Number(value);
    else if (flag === "reserve") args.reserve = Number(value);
    else if (OVERRIDE_FLAGS[flag]) args.overrides[OVERRIDE_FLAGS[flag]] = flag === "hero" ? value : Number(value);
    else throw new Error(`未知参数 --${flag}（用 --help 查看用法）`);
  }
  return args;
}

const TYPE_LABEL = { normal: "普通", elite: "精英", boss: "首领" };
const pct = value => value === null || value === undefined ? "  -  " : `${Math.round(value * 100)}%`.padStart(5);
const pad = (text, width) => {
  const str = String(text);
  const visual = [...str].reduce((sum, char) => sum + (/[⺀-￿]/.test(char) ? 2 : 1), 0);
  return str + " ".repeat(Math.max(0, width - visual));
};

function printChapter(chapter, rows) {
  console.log(`\n第${chapter.id}关 · ${chapter.region}`);
  console.log(`${pad("节点", 5)}${pad("首领", 20)}${pad("类型", 6)}${pad("敌方生命", 9)}${pad("假设(等级/法力/卡级)", 21)}胜率   回合  胜时剩余生命`);
  rows.forEach(row => {
    const flag = row.winRate < 0.3 ? " ⚠ 偏难" : row.winRate > 0.95 && row.type !== "normal" ? " · 偏易" : "";
    const profile = `Lv${row.profile.heroLevel}/${row.profile.maxMana}法力/卡Lv${row.profile.cardLevel}`;
    console.log(`${pad(row.node, 5)}${pad(row.label, 20)}${pad(TYPE_LABEL[row.type], 6)}${pad(row.enemyHealth, 9)}${pad(profile, 21)}${pct(row.winRate)}  ${row.avgRounds.toFixed(1).padStart(4)}  ${pct(row.avgHpLeft)}${row.timeouts ? `  超时${row.timeouts}` : ""}${flag}`);
  });
  const avg = rows.reduce((sum, row) => sum + row.winRate, 0) / rows.length;
  const hardest = [...rows].sort((a, b) => a.winRate - b.winRate).slice(0, 3).map(row => `${row.label}(${pct(row.winRate).trim()})`).join("、");
  console.log(`平均胜率 ${pct(avg).trim()}；最难：${hardest}`);
  return avg;
}

function printEconomy(result) {
  const { options, totals, chapters, days } = result;
  console.log(`经济模拟：每场战斗 ${options.minutesPerBattle} 分钟，首领投喂到 ${options.bondTarget} 级好感，保留 ${options.reserve} 金币；胜负按各节点的战斗模拟胜率掷骰。`);
  console.log(`\n${pad("关卡", 18)}${pad("用时(天)", 10)}${pad("战斗(含重打)", 14)}${pad("金币 进→出", 14)}${pad("在押", 6)}${pad("每战口粮", 10)}每日口粮`);
  chapters.forEach(row => {
    console.log(`${pad(`第${row.chapter}关 ${row.region}`, 18)}${pad(row.days, 10)}${pad(row.battles, 14)}${pad(`${row.coinsStart}→${row.coinsEnd}`, 14)}${pad(row.prisoners, 6)}${pad(row.upkeep, 10)}${row.dailyRations}`);
  });
  console.log(`\n收入：战斗 ${totals.battleGold} 金币，派遣 ${totals.laborGold} 金币与 ${totals.laborRations} 份粮食。`);
  console.log(`支出：面粉 ${totals.flourSpent} 金币，食物 ${totals.foodSpent} 金币。`);
  console.log(`共 ${totals.battles} 场战斗（失败 ${totals.losses} 场），其中 ${totals.hungryBattles} 场饿着肚子出战；${totals.hungryDays} 天的日常口粮没吃饱。`);
  const step = Math.max(1, Math.ceil(days.length / 20));
  console.log(`\n${pad("第N天", 8)}${pad("关卡", 6)}${pad("金币", 8)}${pad("粮食", 8)}${pad("在押", 6)}结缘`);
  days.filter((_, index) => index % step === 0 || index === days.length - 1).forEach((day, index, list) => {
    console.log(`${pad(index === list.length - 1 ? `${day.day}结束` : day.day, 8)}${pad(day.chapter, 6)}${pad(day.coins, 8)}${pad(day.rations, 8)}${pad(day.prisoners, 6)}${day.bonded}`);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").filter(line => line.startsWith("//")).map(line => line.replace(/^\/\/ ?/, "")).join("\n"));
    return;
  }
  const sim = createSimulator();
  const chapters = sim.CF.CHAPTERS.filter(chapter => !args.chapter || chapter.id === args.chapter);
  if (!chapters.length) throw new Error(`没有第${args.chapter}关`);
  const started = Date.now();
  const report = { generatedAt: new Date().toISOString(), runs: args.runs, seed: args.seed, overrides: args.overrides, chapters: [] };

  if (args.economy) {
    const winRates = {};
    for (const chapter of sim.CF.CHAPTERS) {
      (await sim.simulateChapter(chapter.id, { runs: args.runs, seed: args.seed, overrides: args.overrides })).forEach(row => { winRates[`${row.chapter}-${row.node}`] = row.winRate; });
    }
    const options = Object.fromEntries(Object.entries({ minutesPerBattle: args.minutesPerBattle, bondTarget: args.bondTarget, reserve: args.reserve, seed: args.seed }).filter(([, value]) => value !== undefined));
    const result = simulateEconomy(winRates, options);
    printEconomy(result);
    report.economy = result;
  } else if (args.sweep) {
    if (args.sweep !== "mana") throw new Error("--sweep 目前只支持 mana");
    const values = [3, 4, 5, 6, 7, 8, 9, 10];
    console.log(`按最大法力扫描：每个节点 ${args.runs} 场，其余成长假设不变。表中为该关全部战斗节点的平均胜率。`);
    console.log(`${pad("关卡", 16)}${values.map(v => `${v}法力`.padStart(6)).join(" ")}`);
    for (const chapter of chapters) {
      const cells = [];
      for (const mana of values) {
        const rows = await sim.simulateChapter(chapter.id, { runs: args.runs, seed: args.seed, overrides: { ...args.overrides, maxMana: mana } });
        cells.push(rows.reduce((sum, row) => sum + row.winRate, 0) / rows.length);
        report.chapters.push({ chapter: chapter.id, maxMana: mana, rows });
      }
      console.log(`${pad(`第${chapter.id}关 ${chapter.region}`, 16)}${cells.map(value => pct(value).padStart(6)).join(" ")}`);
    }
  } else {
    console.log(`每个节点模拟 ${args.runs} 场（种子 ${args.seed}）。成长假设见 tools/sim/profiles.cjs${Object.keys(args.overrides).length ? `，覆盖：${JSON.stringify(args.overrides)}` : ""}。`);
    for (const chapter of chapters) {
      const rows = await sim.simulateChapter(chapter.id, { runs: args.runs, seed: args.seed, overrides: args.overrides });
      const average = printChapter(chapter, rows);
      report.chapters.push({ chapter: chapter.id, region: chapter.region, averageWinRate: average, rows });
    }
  }
  console.log(`\n用时 ${((Date.now() - started) / 1000).toFixed(1)} 秒。`);
  if (args.json) {
    fs.writeFileSync(args.json, JSON.stringify(report, null, 2));
    console.log(`完整结果已写入 ${args.json}`);
  }
}

main().catch(error => { console.error(error.message || error); process.exit(1); });

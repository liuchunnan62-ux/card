// 关卡数据表校验：js/data/chapters.js 填错时，这里会指出是哪一关、哪个节点、哪个字段。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { root, createGameContext } = require("./helpers/game-context.cjs");

const { CF } = createGameContext();
CF.SaveSystem.load();
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const gameSource = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const NODE_TYPES = ["normal", "elite", "boss", "event", "shop", "camp"];
const BATTLE_TYPES = ["normal", "elite", "boss"];
const assetExists = file => fs.existsSync(path.join(root, file));
const where = (chapter, index) => `第${chapter.id}关节点${index}「${chapter.nodes[index]?.label}」`;
const isMapPoint = pos => Array.isArray(pos) && pos.length === 2 && pos.every(value => Number.isFinite(value) && value >= 0 && value <= 100);

test("章节编号从1开始连续，且都有菜单、地图文案、通关总结与胜利奖励", () => {
  assert.ok(CF.CHAPTERS.length >= 1);
  CF.CHAPTERS.forEach((chapter, index) => {
    const label = `第${chapter.id}关`;
    assert.equal(chapter.id, index + 1, `${label}：章节编号应连续`);
    assert.ok(chapter.name && chapter.region, `${label}：缺少 name 或 region`);
    ["background", "boss"].forEach(key => assert.ok(assetExists(chapter.menu?.[key] || ""), `${label}：menu.${key} 图片不存在`));
    assert.ok(chapter.menu.bossName, `${label}：缺少 menu.bossName`);
    ["title", "label", "note"].forEach(key => assert.ok(chapter.map?.[key], `${label}：缺少 map.${key}`));
    if (chapter.map.className) assert.ok(css.includes(`.${chapter.map.className}`), `${label}：css/style.css 中没有地图样式类 .${chapter.map.className}`);
    assert.ok(chapter.clearSummary?.title && chapter.clearSummary?.text, `${label}：缺少 clearSummary`);
    BATTLE_TYPES.forEach(type => {
      const reward = chapter.victoryRewards?.[type];
      assert.ok(Number.isInteger(reward?.gold) && reward.gold >= 0 && Number.isInteger(reward?.xp) && reward.xp >= 0, `${label}：victoryRewards.${type} 应包含非负整数 gold 与 xp`);
    });
  });
});

test("每个节点的类型、名称、坐标、敌人、头像与武器都有效", () => {
  CF.CHAPTERS.forEach(chapter => {
    const bosses = chapter.nodes.filter(node => node.type === "boss");
    assert.equal(bosses.length, 1, `第${chapter.id}关应恰好有一个最终首领节点`);
    assert.equal(chapter.nodes[chapter.nodes.length - 1].type, "boss", `第${chapter.id}关的最终首领应是最后一个节点`);
    const positions = new Set();
    chapter.nodes.forEach((node, index) => {
      const at = where(chapter, index);
      assert.ok(NODE_TYPES.includes(node.type), `${at}：未知的节点类型 ${node.type}`);
      assert.ok(node.label, `${at}：缺少 label`);
      assert.ok(isMapPoint(node.pos), `${at}：pos 应是 0~100 之间的 [x, y]`);
      assert.ok(!positions.has(String(node.pos)), `${at}：与其他节点坐标重叠`);
      positions.add(String(node.pos));
      if (node.enemyId) assert.ok(CF.enemies[node.enemyId], `${at}：enemies.js 中没有敌人 ${node.enemyId}`);
      if (node.portrait) assert.ok(assetExists(node.portrait), `${at}：头像 ${node.portrait} 不存在`);
      if (node.weaponId) assert.equal(CF.CARD_LIBRARY[node.weaponId]?.type, "weapon", `${at}：weaponId ${node.weaponId} 不是武器牌`);
      if (BATTLE_TYPES.includes(node.type) && chapter.encounter) {
        assert.ok(node.portrait, `${at}：首领节点需要 portrait`);
        if (node.type === "boss") assert.ok(node.enemyId, `${at}：最终首领需要 enemyId`);
        else assert.ok(node.enemyId || chapter.encounter.enemyIdPrefix, `${at}：需要 enemyId，或在 encounter 中设置 enemyIdPrefix`);
      }
    });
  });
});

test("路线引用有效节点、没有重复，并且从起点可以走到所有节点", () => {
  CF.CHAPTERS.forEach(chapter => {
    const count = chapter.nodes.length;
    const seen = new Set();
    chapter.edges.forEach(([from, to]) => {
      assert.ok(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= 0 && from < count && to < count && from !== to, `第${chapter.id}关路线 [${from}, ${to}] 无效`);
      const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
      assert.ok(!seen.has(key), `第${chapter.id}关路线 [${from}, ${to}] 重复`);
      seen.add(key);
    });
    const reached = new Set([0]);
    for (let grew = true; grew;) {
      grew = false;
      chapter.edges.forEach(([from, to]) => {
        if (reached.has(from) !== reached.has(to)) { reached.add(from); reached.add(to); grew = true; }
      });
    }
    const unreachable = chapter.nodes.map((_, index) => index).filter(index => !reached.has(index));
    assert.deepEqual(Array.from(unreachable), [], `第${chapter.id}关以下节点无法从起点到达`);
    Object.keys(chapter.routeControls || {}).forEach(key => {
      assert.ok(seen.has(key), `第${chapter.id}关 routeControls 中的 ${key} 不对应任何路线`);
      assert.ok(isMapPoint(chapter.routeControls[key]), `第${chapter.id}关 routeControls.${key} 坐标无效`);
    });
    if (chapter.npc) {
      assert.ok(chapter.npc.adjacentNode >= 0 && chapter.npc.adjacentNode < count, `第${chapter.id}关 NPC 的 adjacentNode 无效`);
      assert.ok(isMapPoint(chapter.npc.pos) && isMapPoint(chapter.npc.routeControl), `第${chapter.id}关 NPC 坐标无效`);
      assert.ok(assetExists(chapter.npc.portrait), `第${chapter.id}关 NPC 头像不存在`);
    }
  });
});

test("首杀奖励卡与首领强度公式有效", () => {
  CF.CHAPTERS.filter(chapter => chapter.encounter).forEach(chapter => {
    const label = `第${chapter.id}关`;
    const config = chapter.encounter;
    assert.equal(chapter.rewardCardIds?.length, chapter.nodes.length, `${label}：rewardCardIds 数量应等于节点数`);
    chapter.rewardCardIds.forEach((id, index) => assert.ok(CF.CARD_LIBRARY[id], `${where(chapter, index)}：奖励卡 ${id} 不在卡牌库中`));
    assert.equal(new Set(chapter.rewardCardIds).size, chapter.rewardCardIds.length, `${label}：奖励卡不应重复`);
    assert.ok(config.title, `${label}：encounter.title 缺失`);
    assert.ok(config.health.base > 0 && config.health.perStage >= 0 && config.health.eliteBonus >= 0, `${label}：encounter.health 无效`);
    ["normal", "elite"].forEach(type => {
      assert.ok(config.mana[type] > 0, `${label}：encounter.mana.${type} 无效`);
      assert.ok(config.cardLevel[type] >= 1 && config.cardLevel[type] <= 5, `${label}：encounter.cardLevel.${type} 应在 1~5 之间`);
    });
    assert.ok(gameSource.includes(`"${config.passive}"`), `${label}：game.js 没有处理被动 ${config.passive}`);
    if (config.deck.from !== "enemy") {
      [...config.deck.units, ...config.deck.spells].forEach(id => assert.ok(CF.CARD_LIBRARY[id], `${label}：牌组卡 ${id} 不在卡牌库中`));
      assert.ok(config.deck.copies >= 1, `${label}：deck.copies 至少为1`);
    }
  });
});

test("每个战斗节点都能生成可用的敌人配置", () => {
  const data = CF.SaveSystem.data;
  data.completedRuns = CF.CHAPTERS.length - 1;
  CF.CHAPTERS.forEach(chapter => {
    data.chapterRuns[chapter.id] = CF.freshRun(data, chapter.id);
    data.activeChapter = chapter.id;
    chapter.nodes.forEach((node, index) => {
      if (!BATTLE_TYPES.includes(node.type)) return;
      const run = CF.Adventure.current(chapter.id);
      run.activeNode = index;
      data.run = run;
      const enemy = CF.Adventure.encounterFor(node.type);
      const at = where(chapter, index);
      assert.ok(enemy && enemy.health > 0 && enemy.mana > 0, `${at}：敌人生命或法力无效`);
      assert.ok(enemy.noCards || enemy.deck.length > 0, `${at}：敌人牌组为空`);
      enemy.deck.forEach(id => assert.ok(CF.CARD_LIBRARY[id], `${at}：敌人牌组中的 ${id} 不在卡牌库中`));
      assert.ok(CF.bossDialogueFor(chapter.id, index), `${at}：boss-dialogues.js 中缺少首领台词`);
    });
  });
});

test("在押首领都有个人往事", () => {
  const missing = CF.Adventure.prisonRoster().filter(prisoner => prisoner.cardId && !CF.BondStories.personal(prisoner.name)).map(prisoner => `${prisoner.key} ${prisoner.name}`);
  assert.deepEqual(Array.from(missing), [], "bond-stories.js 中缺少以下首领的个人往事");
});

test("经济数值表有效：食物、族群口味、好感与派遣收益", () => {
  const E = CF.ECONOMY;
  assert.ok(E.rations.starting >= 0 && E.rations.flour.price > 0 && E.rations.flour.rations > 0, "rations 数值无效");
  assert.ok(E.clock.dayMinutes > 0 && E.clock.dailyBattles >= 0 && E.clock.innPrice >= 0, "clock 数值无效");
  assert.ok(E.bond.threshold > 0 && E.bond.step > 0 && E.bond.levelNames.length === E.bond.maxLevel + 1, "bond：levelNames 应有 maxLevel + 1 项（第0项留空）");
  const foodIds = new Set();
  E.foods.forEach(food => {
    assert.ok(food.id && !foodIds.has(food.id), `食物 ${food.id} 编号缺失或重复`);
    foodIds.add(food.id);
    assert.ok(food.name && food.icon && food.price > 0 && food.affinity > 0, `食物 ${food.id} 缺少名称/图标，或价格、好感不是正数`);
  });
  Object.entries(E.races).forEach(([chapter, race]) => {
    assert.ok(CF.chapterById(chapter), `races 中的章节 ${chapter} 不存在`);
    assert.ok(foodIds.has(race.favorite), `${race.name} 最爱的食物 ${race.favorite} 不在 foods 中`);
  });
  Object.entries(E.labor.jobs).forEach(([chapter, job]) => {
    assert.ok(E.races[chapter], `派遣工作 ${job.id} 对应的章节 ${chapter} 没有族群`);
    Object.entries(job.yields).forEach(([key, values]) => {
      const series = key === "foods" ? Object.entries(values) : [[key, values]];
      series.forEach(([id, list]) => {
        if (key === "foods") assert.ok(foodIds.has(id), `派遣工作 ${job.id} 产出的食物 ${id} 不在 foods 中`);
        assert.ok(["coins", "rations", "cardXp", "foods"].includes(key), `派遣工作 ${job.id} 的收获类型 ${key} 未实现`);
        assert.equal(list.length, E.bond.maxLevel, `派遣工作 ${job.id} 的 ${id} 应按 Lv1~Lv${E.bond.maxLevel} 列出 ${E.bond.maxLevel} 个数值`);
        assert.ok(list.every(value => Number.isInteger(value) && value >= 0), `派遣工作 ${job.id} 的 ${id} 应是非负整数`);
      });
    });
  });
});

test("剧情残页与路上事件格式有效", () => {
  assert.ok(CF.LORE_PAGES.length > 0);
  CF.LORE_PAGES.forEach((page, index) => {
    assert.ok(page.title && page.paragraphs.length && page.paragraphs.every(Boolean), `残页 ${index + 1} 缺少标题或段落`);
  });
  const effects = ["heal", "card", "gamble", "train_paid", "crystal_study", "spell_xp", "leave"];
  const ids = new Set();
  CF.ROAD_EVENTS.forEach(event => {
    assert.ok(event.id && !ids.has(event.id), `路上事件 ${event.id} 编号缺失或重复`);
    ids.add(event.id);
    assert.ok(event.name && event.text && event.choices.length, `路上事件 ${event.id} 缺少名称、描述或选项`);
    event.choices.forEach(choice => {
      assert.ok(effects.includes(choice.effect), `路上事件 ${event.id} 的效果 ${choice.effect} 未在 main.js 中实现`);
      if (choice.effect === "card") assert.ok(CF.CARD_LIBRARY[choice.cardId], `路上事件 ${event.id} 给予的卡 ${choice.cardId} 不存在`);
    });
  });
});

test("每关首领都配置了有效的英雄技能", () => {
  CF.CHAPTERS.forEach(chapter => {
    const config = chapter.heroSkill;
    assert.ok(config, `第${chapter.id}关缺少 heroSkill`);
    [config.id, config.boss].filter(Boolean).forEach(id => assert.ok(CF.HERO_SKILLS[id], `第${chapter.id}关的英雄技能 ${id} 不存在`));
    ["normal", "elite", "boss"].forEach(type => assert.ok(config.levels[type] >= 1 && config.levels[type] <= 3, `第${chapter.id}关 heroSkill.levels.${type} 应在 1~3 之间`));
  });
  const data = CF.SaveSystem.data;
  CF.CHAPTERS.forEach(chapter => {
    data.chapterRuns[chapter.id] = CF.freshRun(data, chapter.id);
    data.activeChapter = chapter.id;
    chapter.nodes.forEach((node, index) => {
      if (!BATTLE_TYPES.includes(node.type)) return;
      const run = CF.Adventure.current(chapter.id);
      run.activeNode = index;
      data.run = run;
      const enemy = CF.Adventure.encounterFor(node.type);
      assert.ok(enemy.heroSkill && CF.HERO_SKILLS[enemy.heroSkill.id], `${where(chapter, index)}：首领没有英雄技能`);
    });
  });
});

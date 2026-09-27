(function () {
  "use strict";

  const CF = window.CardForge;
  const COIN_ICON = '<img class="coin-icon" src="assets/ui/gold-coin.png" alt="金币">';
  const MAP_STAGES = [
    [{ type: "normal", label: "林道遭遇", icon: "⚔️" }],
    [{ type: "normal", label: "断桥之战", icon: "⚔️", weaponBoss: true, weaponId: "mist_dagger", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png" }, { type: "event", label: "迷雾岔路", icon: "❓" }],
    [{ type: "normal", label: "兽径伏击", icon: "⚔️", weaponBoss: true, weaponId: "bridge_oathblade", enemyId: "wolf_swarm", portrait: "assets/enemies/wolf-swarm.png" }, { type: "shop", label: "行脚商队", icon: "🛒" }],
    [{ type: "elite", label: "精英据点", icon: "☠️", weaponBoss: true, weaponId: "silverfeather_bow", enemyId: "orc_patrol", portrait: "assets/enemies/orc-patrol.png" }],
    [{ type: "camp", label: "守夜营火", icon: "⛺" }],
    [{ type: "normal", label: "古林深处", icon: "⚔️", weaponBoss: true, weaponId: "redscar_axe", enemyId: "forest_bandits", portrait: "assets/enemies/forest-bandits.png" }, { type: "event", label: "古老遗迹", icon: "❓" }],
    [{ type: "elite", label: "暗影关隘", icon: "☠️", weaponBoss: true, weaponId: "moonwood_crossbow", enemyId: "shadow_hunter", portrait: "assets/enemies/shadow-hunter.png" }, { type: "shop", label: "密林商人", icon: "🛒" }],
    [{ type: "normal", label: "王座前庭", icon: "⚔️", weaponBoss: true, weaponId: "royal_breaker", enemyId: "orc_patrol", portrait: "assets/enemies/orc-patrol.png" }],
    [{ type: "boss", label: "森林狼王", icon: "👑", portrait: "assets/enemies/forest-wolf-king.png", weaponBoss: true, weaponId: "riftmoon_blade", enemyId: "wolf_king" }]
  ];

  const CHAPTER_ONE_STAGES = MAP_STAGES.flat().map(node => [node]);
  const CHAPTER_ONE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6],
    [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 11], [11, 12]
  ];

  const CHAPTER_TWO_ENCOUNTERS = [
    ["泥牙斥候长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["树梢神射手", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["碎瓶投手", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["绿皮伏击队", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["赃物守门人", "forest_bandits", "assets/enemies/forest-bandits.png"],
    ["毒箭督军", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["尖牙驯兽师", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["沼泽劫掠者", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["黑帽哨兵", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["蛮石破门者", "orc_patrol", "assets/enemies/orc-patrol.png"],
    ["火药工头", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["双弩猎手", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["暗巷收税官", "forest_bandits", "assets/enemies/forest-bandits.png"],
    ["铁锅军需官", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["王庭弓术师", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["赤旗百夫长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["夜眼追猎者", "shadow_hunter", "assets/enemies/shadow-hunter.png"],
    ["王庭近卫长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["金库守望者", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["翠影女王", "goblin_queen", "assets/enemies/goblin-queen.png"]
  ];
  const CHAPTER_TWO_STAGES = CHAPTER_TWO_ENCOUNTERS.map(([label, enemyId, portrait], index) => [{
    type: index === CHAPTER_TWO_ENCOUNTERS.length - 1 ? "boss" : (index % 5 === 4 ? "elite" : "normal"),
    label,
    enemyId,
    portrait,
    icon: "",
    rewardCardId: CF.CHAPTER_TWO_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_TWO_ROUTE_EDGES = [
    [16, 15], [15, 14], [14, 13], [13, 0], [0, 1], [1, 2], [2, 3], [3, 4],
    [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 19], [14, 12], [12, 3],
    [12, 11], [11, 10], [10, 17], [10, 18], [18, 19]
  ];

  const CHAPTER_THREE_ENCOUNTERS = [
    ["田埂熊斥候", "assets/cards/chapter3/wheat-cub.png"],
    ["麦仓蜂蜜投手", "assets/cards/chapter3/honey-slinger.png"],
    ["犁沟守卫长", "assets/cards/chapter3/furrow-guard.png"],
    ["稻草熊术师", "assets/cards/chapter3/straw-mage.png"],
    ["谷仓突击队长", "assets/cards/chapter3/barn-charger.png"],
    ["水渠巡田熊", "assets/cards/chapter3/wheat-cub.png"],
    ["蜂巢大祭司", "assets/cards/chapter3/hive-priest.png"],
    ["麦田巨熊", "assets/cards/chapter3/wheatfield-giant.png"],
    ["丰收战熊", "assets/cards/chapter3/harvest-war-bear.png"],
    ["石磨堡垒", "assets/cards/chapter3/millstone-fortress.png"],
    ["谷仓破门者", "assets/cards/chapter3/barn-charger.png"],
    ["河湾渔熊", "assets/cards/chapter3/honey-slinger.png"],
    ["金巢蜂后", "assets/cards/chapter3/bee-swarm.png"],
    ["秋风熊战士", "assets/cards/chapter3/harvest-war-bear.png"],
    ["大地守卫", "assets/cards/chapter3/earth-tremor.png"],
    ["农具锻造师", "assets/cards/chapter3/furrow-guard.png"],
    ["赤穗熊骑", "assets/cards/chapter3/wheatfield-giant.png"],
    ["麦田稻草魔像", "assets/cards/chapter3/wheat-barrier.png"],
    ["金穗熊王", "assets/cards/chapter3/golden-sheaf-king.png"],
    ["丰穗战母·布蕾娅", "assets/enemies/chapter3/bear-matriarch-portrait.png"]
  ];
  const CHAPTER_THREE_PORTRAITS = Array.from(
    { length: 20 },
    (_, index) => `assets/enemies/chapter3/bosses/bear-boss-${String(index + 1).padStart(2, "0")}.png`
  );
  const CHAPTER_THREE_STAGES = CHAPTER_THREE_ENCOUNTERS.map(([label], index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"),
    label,
    enemyId: index === 19 ? "bear_matriarch" : `farm-boss-${index + 1}`,
    portrait: CHAPTER_THREE_PORTRAITS[index],
    icon: "",
    rewardCardId: CF.CHAPTER_THREE_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_THREE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [3, 5], [5, 8], [8, 7], [7, 9], [9, 11],
    [11, 13], [13, 15], [2, 4], [2, 6], [4, 10], [6, 10], [6, 8], [10, 12],
    [10, 14], [12, 16], [14, 18], [16, 15], [16, 17], [17, 18], [18, 19]
  ];
  const CHAPTER_THREE_NPC = {
    id: "farm_couple", name: "留守的农民夫妇", portrait: "assets/npcs/farm-couple.png", adjacentNode: 7,
    dialogue: [
      "别紧张，年轻人。那些熊没有杀害这里的人。它们来到农场后，只把原来的村民赶去了王城方向。",
      "我们留下，是因为没有从它们身上感到敌意。最初它们连犁怎么扶都不知道，只会用蛮力把田翻得乱七八糟。",
      "后来我们教熊男修水渠、播麦种，也教熊娘照料蜂箱和收割。它们学得很慢，但从不糟蹋粮食。",
      "它们会在谷仓里给幼熊留出最暖的位置，也会把第一袋新麦送到我们门口。至少在我们眼里，它们没有传闻中那么可恶。",
      "若你一定要继续往前，就亲眼看看再作判断吧。这里发生的事，也许并不是简单的怪物占领村庄。"
    ]
  };

  const CHAPTER_FOUR_ENCOUNTERS = [
    "露珠幼母", "苔光守望者", "蓝泡采集者", "荧蕈胶卫", "月潭医师",
    "藤蔓黏兽", "紫晶分裂者", "溪语祭司", "沼光巨胶", "菌伞吞食者",
    "幻露巡游者", "碧涡守门者", "星斑软泥姬", "古树融胶", "翠晶凝视者",
    "深潭回复师", "月虹胶龙", "千滴合生体", "森心史莱姆领主", "碧露大贤者·涅芙莉"
  ];
  const CHAPTER_FOUR_PORTRAITS = Array.from(
    { length: 20 },
    (_, index) => `assets/enemies/chapter4/bosses/slime-boss-${String(index + 1).padStart(2, "0")}.png`
  );
  const CHAPTER_FOUR_STAGES = CHAPTER_FOUR_ENCOUNTERS.map((label, index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"),
    label,
    enemyId: index === 19 ? "slime_sage" : `dream-slime-${index + 1}`,
    portrait: CHAPTER_FOUR_PORTRAITS[index],
    icon: "",
    rewardCardId: CF.CHAPTER_FOUR_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_FOUR_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 6],
    [5, 7], [6, 8], [7, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 12],
    [11, 13], [12, 14], [13, 15], [14, 15], [14, 16], [15, 17], [16, 18],
    [17, 18], [18, 19]
  ];
  const CHAPTER_FIVE_ENCOUNTERS = [
    "断墙灰狼", "青苔猎犬", "石阶迅兽", "旧门伏击者", "银枝追猎者", "残塔狼群", "瀑布獠牙", "碑林疾影", "古井守卫", "灰雾猎团",
    "断桥掠夺者", "钟楼狼哨", "城墙奔袭兽", "废墟斥候队", "旧王庭猎手", "千枝守墓狼", "月门突袭者", "灰牙先锋", "遗城狼王子", "银灰狼女猎手"
  ];
  const CHAPTER_FIVE_PORTRAITS = Array.from({ length: 19 }, (_, index) => `assets/enemies/chapter5/bosses/wolf-boss-${String(index + 1).padStart(2, "0")}.png`).concat("assets/enemies/chapter5/bosses/wolf-matriarch.png");
  const CHAPTER_FIVE_STAGES = CHAPTER_FIVE_ENCOUNTERS.map((label, index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"), label,
    enemyId: index === 19 ? "wolf_matriarch" : `ancient-wolf-${index + 1}`, portrait: CHAPTER_FIVE_PORTRAITS[index], icon: "",
    rewardCardId: CF.CHAPTER_FIVE_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_FIVE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15], [14, 16], [15, 17], [16, 18], [17, 18], [18, 19]
  ];

  const EVENTS = [
    {
      id: "spring", name: "神秘泉水", icon: "💧", text: "银色泉水从刻有月纹的岩石间涌出。",
      choices: [
        { label: "喝下泉水", detail: "恢复10点生命", effect: "heal", value: 10 },
        { label: "装满水壶", detail: "收藏中获得1张治疗药剂", effect: "card", cardId: "healing_potion" }
      ]
    },
    {
      id: "abandoned", name: "废弃营地", icon: "🏚️", text: "余烬尚温，帐篷里似乎遗留着补给。",
      choices: [
        { label: "仔细搜索", detail: "50%获得30金币，否则受到5点伤害", effect: "gamble" },
        { label: "立刻离开", detail: "什么都不发生", effect: "leave" }
      ]
    },
    {
      id: "sellsword", name: "流浪剑士", icon: "⚔️", text: "一位满身伤痕的剑士愿意传授战场经验。",
      choices: [
        { label: "支付30金币", detail: "随机随从牌获得2经验", effect: "train_paid", cost: 30 },
        { label: "谢绝好意", detail: "继续前进", effect: "leave" }
      ]
    },
    {
      id: "crystal", name: "破碎魔晶", icon: "💠", text: "魔晶已经失去稳定的法力回路，只余适合研习的微弱辉光。",
      choices: [
        { label: "研究辉光", detail: "失去5生命，随机一张法术牌获得2点经验", effect: "crystal_study", value: 2 },
        { label: "保持警惕", detail: "继续前进", effect: "leave" }
      ]
    },
    {
      id: "altar", name: "古老祭坛", icon: "🗿", text: "褪色符文回应了你牌组中的法术。",
      choices: [
        { label: "献上祈愿", detail: "随机法术牌获得1经验", effect: "spell_xp", value: 1 },
        { label: "不作打扰", detail: "继续前进", effect: "leave" }
      ]
    }
  ];

  function freshRun(save, chapterOverride = null) {
    return {
      chapter: chapterOverride || (save.completedRuns >= 4 ? 5 : save.completedRuns >= 3 ? 4 : save.completedRuns >= 2 ? 3 : save.completedRuns >= 1 ? 2 : 1),
      stage: 0,
      hp: save.hero.maxHealth,
      maxHp: save.hero.maxHealth,
      completed: [],
      chosen: {},
      earnedCoins: 0,
      earnedXp: 0,
      cardsLeveled: 0,
      activeNode: null,
      attempts: {},
      failures: {},
      cleared: false,
      shopPurchased: {},
      startedAt: Date.now(),
      lastPlayedAt: Date.now()
    };
  }

  function chapterId(value, save = CF.SaveSystem.data) {
    const requested = Number(value);
    if ([1, 2, 3, 4].includes(requested)) return requested;
    return save.completedRuns >= 4 ? 5 : save.completedRuns >= 3 ? 4 : save.completedRuns >= 2 ? 3 : save.completedRuns >= 1 ? 2 : 1;
  }

  function ensureChapterRuns(save) {
    if (!save.chapterRuns || typeof save.chapterRuns !== "object") save.chapterRuns = { 1: null, 2: null, 3: null, 4: null, 5: null };
    [1, 2, 3, 4, 5].forEach(chapter => { if (!(chapter in save.chapterRuns)) save.chapterRuns[chapter] = null; });
    return save.chapterRuns;
  }

  const Adventure = {
    prepareChapterFiveFinale() {
      const save = CF.SaveSystem.data;
      const runs = ensureChapterRuns(save);
      const previous = runs[5] || {};
      const run = freshRun(save, 5);
      run.completed = CHAPTER_FIVE_STAGES.slice(0, 19).map((nodes, stage) => ({ stage, type: nodes[0].type }));
      run.chosen = Object.fromEntries(run.completed.map(entry => [entry.stage, 0]));
      run.attempts = Object.fromEntries(run.completed.map(entry => [String(entry.stage), Math.max(1, Number(previous.attempts?.[entry.stage]) || 0)]));
      run.failures = { ...(previous.failures || {}) };
      run.stage = 19;
      run.hp = save.hero.maxHealth;
      run.maxHp = save.hero.maxHealth;
      run.activeNode = null;
      run.cleared = false;
      runs[5] = run;
      save.completedRuns = 4;
      save.activeChapter = 5;
      save.run = run;
      save.qianzhiGarrisonUnlocked = false;
      save.chapterFiveFinalePreset = CF.CHAPTER_FIVE_FINALE_PRESET_VERSION;
      save.chapterFiveBossRewards ||= {};
      delete save.chapterFiveBossRewards[19];
      CF.SaveSystem.save();
      return run;
    },
    start(chapterOverride = null) {
      return this.activate(chapterOverride, false);
    },
    restart(chapterOverride = null) {
      return this.activate(chapterOverride, true);
    },
    activate(chapterOverride = null, reset = false) {
      const save = CF.SaveSystem.data;
      const chapter = chapterId(chapterOverride, save);
      const runs = ensureChapterRuns(save);
      if (reset || !runs[chapter]) runs[chapter] = freshRun(save, chapter);
      const run = runs[chapter];
      if (save.hero.maxHealth > run.maxHp) {
        const delta = save.hero.maxHealth - run.maxHp;
        run.maxHp += delta;
        run.hp = Math.min(run.maxHp, run.hp + delta);
      }
      run.activeNode = null;
      run.lastPlayedAt = Date.now();
      save.activeChapter = chapter;
      save.run = run;
      CF.SaveSystem.save();
      return run;
    },
    abandon(chapterOverride = null) {
      const save = CF.SaveSystem.data;
      const chapter = chapterId(chapterOverride ?? save.activeChapter, save);
      ensureChapterRuns(save)[chapter] = null;
      if (Number(save.activeChapter) === chapter) save.run = null;
      CF.SaveSystem.save();
    },
    pause() {
      const run = this.current();
      if (!run) return;
      run.activeNode = null;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
    },
    current(chapterOverride = null) {
      const save = CF.SaveSystem.data;
      const runs = ensureChapterRuns(save);
      if (chapterOverride !== null && chapterOverride !== undefined) return runs[chapterId(chapterOverride, save)] || null;
      const active = chapterId(save.activeChapter, save);
      const run = runs[active] || (Number(save.run?.chapter) === active ? save.run : null);
      if (run && !runs[active]) runs[active] = run;
      save.activeChapter = active;
      save.run = run || null;
      return save.run;
    },
    chapterProgress(chapterOverride) {
      const chapter = chapterId(chapterOverride);
      const run = this.current(chapter);
      const total = chapter === 1 ? CHAPTER_ONE_STAGES.length : chapter === 2 ? CHAPTER_TWO_STAGES.length : chapter === 3 ? CHAPTER_THREE_STAGES.length : chapter === 4 ? CHAPTER_FOUR_STAGES.length : CHAPTER_FIVE_STAGES.length;
      return {
        chapter,
        completed: run?.completed?.length || 0,
        total,
        cleared: Boolean(run?.cleared || (run?.completed?.length || 0) >= total),
        attempts: Object.values(run?.attempts || {}).reduce((sum, count) => sum + Number(count || 0), 0),
        failures: Object.values(run?.failures || {}).reduce((sum, count) => sum + Number(count || 0), 0),
        exists: Boolean(run)
      };
    },
    mapStages(chapterOverride = null) {
      const chapter = chapterOverride === null ? this.current()?.chapter : chapterId(chapterOverride);
      return chapter === 5 ? CHAPTER_FIVE_STAGES : chapter === 4 ? CHAPTER_FOUR_STAGES : chapter === 3 ? CHAPTER_THREE_STAGES : chapter === 2 ? CHAPTER_TWO_STAGES : CHAPTER_ONE_STAGES;
    },
    routeEdges(chapterOverride = null) {
      const chapter = chapterOverride === null ? this.current()?.chapter : chapterId(chapterOverride);
      return chapter === 5 ? CHAPTER_FIVE_ROUTE_EDGES : chapter === 4 ? CHAPTER_FOUR_ROUTE_EDGES : chapter === 3 ? CHAPTER_THREE_ROUTE_EDGES : chapter === 2 ? CHAPTER_TWO_ROUTE_EDGES : CHAPTER_ONE_ROUTE_EDGES;
    },
    choices() {
      const run = this.current();
      return run ? (this.mapStages()[run.stage] || []) : [];
    },
    isNodeAvailable(nodeIndex) {
      const run = this.current();
      if (!run) return false;
      const index = Number(nodeIndex);
      const completed = new Set((run.completed || []).map(entry => Number(entry.stage)));
      if (completed.has(index)) return false;
      if (completed.size === 0) return index === 0;
      return this.routeEdges().some(([from, to]) =>
        (from === index && completed.has(to)) || (to === index && completed.has(from))
      );
    },
    chooseNode(choiceIndex) {
      const run = this.current();
      const nodeIndex = Number(choiceIndex);
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!run || !node || !this.isNodeAvailable(nodeIndex)) return null;
      run.activeNode = nodeIndex;
      run.chosen[nodeIndex] = 0;
      run.attempts ||= {};
      run.attempts[nodeIndex] = (Number(run.attempts[nodeIndex]) || 0) + 1;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
      return node;
    },
    finishNode(type) {
      const run = this.current();
      if (!run) return;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      if (!run.completed.some(entry => entry.stage === nodeIndex)) run.completed.push({ stage: nodeIndex, type });
      run.activeNode = null;
      run.stage = run.completed.length;
      run.cleared = run.completed.length >= this.mapStages().length;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
    },
    recordDefeat(nodeIndexOverride = null) {
      const run = this.current();
      if (!run) return null;
      const hasExplicitNode = nodeIndexOverride !== null && nodeIndexOverride !== undefined && Number.isInteger(Number(nodeIndexOverride));
      const nodeIndex = hasExplicitNode ? Number(nodeIndexOverride)
        : Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      run.failures ||= {};
      run.failures[nodeIndex] = (Number(run.failures[nodeIndex]) || 0) + 1;
      run.lastFailedNode = nodeIndex;
      run.activeNode = null;
      run.hp = run.maxHp;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
      return run;
    },
    syncHeroGrowth() {
      const run = this.current();
      if (!run) return;
      if (CF.SaveSystem.data.hero.maxHealth > run.maxHp) {
        const delta = CF.SaveSystem.data.hero.maxHealth - run.maxHp;
        run.maxHp += delta;
        run.hp += delta;
      }
      CF.SaveSystem.save();
    },
    encounterFor(type) {
      const run = this.current();
      const encounterNodeIndex = Number.isInteger(run?.activeNode) ? run.activeNode : run?.stage;
      const node = this.mapStages()[encounterNodeIndex]?.[0];
      if (run?.chapter === 1) {
        const pool = type === "elite" ? CF.eliteEnemyIds : CF.normalEnemyIds;
        const fallbackIndex = ((encounterNodeIndex || 0) + (run?.completed?.length || 0)) % pool.length;
        const base = type === "boss"
          ? CF.enemies.wolf_king
          : (node?.enemyId && CF.enemies[node.enemyId] ? CF.enemies[node.enemyId] : CF.enemies[pool[fallbackIndex]]);
        return {
          ...base,
          chapter: 1,
          chapterStage: encounterNodeIndex,
          type: node?.type || base.type,
          title: `${node?.label || "迷雾森林"} · ${base.title}`,
          dialogue: CF.bossDialogueFor?.(1, encounterNodeIndex) || base.dialogue || null
        };
      }
      if (run?.chapter === 2 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "goblin_queen") return {
          ...CF.enemies.goblin_queen,
          chapter: 2,
          chapterStage: stage,
          dialogue: CF.bossDialogueFor?.(2, stage) || CF.enemies.goblin_queen.dialogue
        };
        const base = CF.enemies[node.enemyId] || CF.enemies.goblin_warband;
        return {
          ...base,
          id: `chapter2-${stage + 1}-${base.id}`,
          chapter: 2,
          chapterStage: stage,
          name: node.label,
          title: `哥布林王庭 · 第${stage + 1}关`,
          type: node.type,
          health: 42 + stage * 5 + (node.type === "elite" ? 18 : 0),
          mana: 6,
          enemyCardLevel: node.type === "elite" ? 3 : 2,
          passive: "battle_horn",
          dialogue: CF.bossDialogueFor?.(2, stage),
          skills: [{ icon: "📯", name: "战斗号角", every: 1, description: "每个敌方行动回合，召唤1个2攻/2血的普通哥布林。" }],
          battlefield: "goblin_stronghold",
          deck: [...base.deck, ...base.deck.slice(0, 8 + Math.floor(stage / 4))]
        };
      }
      if (run?.chapter === 3 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "bear_matriarch") return {
          ...CF.enemies.bear_matriarch,
          chapter: 3,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(3, stage) || CF.enemies.bear_matriarch.dialogue
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(9, 2 + Math.floor(stage / 3));
        const core = [...CF.CHAPTER_THREE_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_THREE_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter3-${stage + 1}`,
          chapter: 3,
          chapterStage: stage,
          name: node.label,
          title: `金麦农场 · 第${stage + 1}关`,
          icon: "🐻",
          portrait: node.portrait,
          type: node.type,
          health: 68 + stage * 7 + (node.type === "elite" ? 28 : 0),
          mana: node.type === "elite" ? 9 : 8,
          enemyCardLevel: node.type === "elite" ? 4 : 3,
          description: "守卫金麦农场的新住民，擅长以高生命熊族随从稳固战线。",
          passive: "bear_harvest",
          dialogue: CF.bossDialogueFor?.(3, stage),
          skills: [{ icon: "🌾", name: "农垦本能", every: 2, description: "每2个敌方行动回合召唤1个会随进度成长的巡田熊民。" }],
          battlefield: "harvest_farm",
          deck: Array(3).fill(core).flat()
        };
      }
      if (run?.chapter === 4 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "slime_sage") return {
          ...CF.enemies.slime_sage,
          chapter: 4,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(4, stage) || CF.enemies.slime_sage.dialogue
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(10, 2 + Math.floor(stage / 2));
        const core = [...CF.CHAPTER_FOUR_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_FOUR_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter4-${stage + 1}`,
          chapter: 4,
          chapterStage: stage,
          name: node.label,
          title: `梦幻森林 · 第${stage + 1}关`,
          icon: "💧",
          portrait: node.portrait,
          type: node.type,
          health: 100 + stage * 9 + (node.type === "elite" ? 35 : 0),
          mana: node.type === "elite" ? 10 : 9,
          enemyCardLevel: node.type === "elite" ? 5 : 4,
          description: "女王之血唤醒的史莱姆，以厚重生命、分裂与持续再生缓慢推进战线。",
          passive: "slime_regeneration",
          dialogue: CF.bossDialogueFor?.(4, stage),
          skills: [{ icon: "💧", name: "胶质再生", every: 1, description: "每个敌方行动回合，为首领和全部史莱姆随从恢复生命。" }],
          battlefield: "dream_slime_forest",
          deck: Array(3).fill(core).flat()
        };
      }
      if (run?.chapter === 5 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "wolf_matriarch") return {
          ...CF.enemies.wolf_matriarch,
          chapter: 5,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(5, stage),
          battlefield: "ancient_city_ruins"
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(10, 2 + Math.floor(stage / 2));
        const core = [...CF.CHAPTER_FIVE_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_FIVE_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter5-${stage + 1}`, chapter: 5, chapterStage: stage, name: node.label, title: `古城废墟 · 第${stage + 1}关`, icon: "🐺", portrait: node.portrait, type: node.type,
          health: 300 + Math.round(stage * 100 / 19), mana: node.type === "elite" ? 10 : 9, enemyCardLevel: node.type === "elite" ? 5 : 4,
          description: "喝下女王之血后开智的灰狼与野兽，攻击迅猛但防御薄弱，许多单位登场便会扑击。", passive: "wolf_raid", dialogue: CF.bossDialogueFor?.(5, stage), battlefield: "ancient_city_ruins",
          skills: [{ icon: "🐺", name: "灰狼增援", every: 1, description: "每个敌方行动回合，召唤1只4攻/1血、可立即攻击随从的突击灰狼。" }],
          deck: Array(3).fill(core).flat()
        };
      }
      if (type === "boss") return CF.enemies.wolf_king;
      const index = ((run?.stage || 0) + (run?.completed?.length || 0)) % (type === "elite" ? CF.eliteEnemyIds.length : CF.normalEnemyIds.length);
      const pool = type === "elite" ? CF.eliteEnemyIds : CF.normalEnemyIds;
      return CF.enemies[pool[index]];
    },
    activeWeaponReward() {
      const run = this.current();
      if (!run || run.chapter !== 1) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.weaponBoss || !node.weaponId || CF.SaveSystem.data.weaponBossRewards?.[node.weaponId]) return null;
      return { nodeIndex, cardId: node.weaponId, nodeLabel: node.label };
    },
    claimActiveWeaponReward() {
      const reward = this.activeWeaponReward();
      if (!reward) return null;
      CF.SaveSystem.data.weaponBossRewards ||= {};
      CF.SaveSystem.data.weaponBossRewards[reward.cardId] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterTwoCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 2) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterTwoBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterTwoCardReward() {
      const reward = this.activeChapterTwoCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterTwoBossRewards ||= {};
      CF.SaveSystem.data.chapterTwoBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterThreeCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 3) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterThreeBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterThreeCardReward() {
      const reward = this.activeChapterThreeCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterThreeBossRewards ||= {};
      CF.SaveSystem.data.chapterThreeBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterFourCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 4) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterFourBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterFourCardReward() {
      const reward = this.activeChapterFourCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterFourBossRewards ||= {};
      CF.SaveSystem.data.chapterFourBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterFiveCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 5) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterFiveBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterFiveCardReward() {
      const reward = this.activeChapterFiveCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterFiveBossRewards ||= {};
      CF.SaveSystem.data.chapterFiveBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    farmNpcUnlocked() {
      const run = this.current();
      return !!run && run.chapter === 3 && run.completed.some(entry => Number(entry.stage) === CHAPTER_THREE_NPC.adjacentNode);
    },
    activeQueenBloodWaterReward() {
      const run = this.current();
      if (!run || run.chapter !== 1) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      if (nodeIndex !== 0 || CF.SaveSystem.data.questItemRewards?.queenBloodRiverWater) return null;
      return { nodeIndex, itemId: "queenBloodRiverWater", name: "含有女王血液的河水", image: "assets/trials/queen-blood-water.png" };
    },
    claimActiveQueenBloodWaterReward() {
      const reward = this.activeQueenBloodWaterReward();
      if (!reward) return null;
      CF.SaveSystem.data.questItemRewards ||= {};
      CF.SaveSystem.data.items ||= {};
      CF.SaveSystem.data.questItemRewards.queenBloodRiverWater = true;
      CF.SaveSystem.data.items.queenBloodRiverWater = true;
      CF.SaveSystem.save();
      return reward;
    },
    randomEvent() {
      const run = this.current();
      return EVENTS[(run?.stage + run?.completed?.length || 0) % EVENTS.length];
    },
    rewards(type) {
      return [
        { type: "maxHealth", icon: "🩸", title: "女王之血", detail: "英雄最大生命值永久增加1点", value: 1 },
        { type: "gold", icon: COIN_ICON, title: "讨伐赏金", detail: "获得20金币", value: 20 },
        { type: "cardXp", icon: "📚", title: "战斗领悟", detail: "随机一张未满级卡牌获得2点经验", value: 2 }
      ];
    },
    shopStock() {
      if (this.current()?.chapter === 1) {
        return ["eagle_eye", "iron_lancer", "royal_medic"].map(cardId => ({
          type: "card", cardId, icon: "🃏", title: CF.CARD_LIBRARY[cardId].name, detail: "永久加入卡牌收藏", cost: 20
        }));
      }
      const rewardId = CF.REWARD_CARD_IDS[(this.current()?.stage || 0) % CF.REWARD_CARD_IDS.length];
      return [
        { type: "card", cardId: rewardId, icon: "🃏", title: CF.CARD_LIBRARY[rewardId].name, detail: "加入卡牌收藏", cost: 35 },
        { type: "heal", icon: "❤️", title: "温热炖汤", detail: "恢复12点生命", value: 12, cost: 20 },
        { type: "xp", icon: "📚", title: "战术笔记", detail: "随机卡牌获得2经验", value: 2, cost: 25 },
        { type: "xp", icon: "📜", title: "高阶战术手册", detail: "随机卡牌获得4经验", value: 4, cost: 45 }
      ];
    }
  };

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { MAP_STAGES, CHAPTER_TWO_STAGES, CHAPTER_TWO_ROUTE_EDGES, CHAPTER_THREE_STAGES, CHAPTER_THREE_ROUTE_EDGES, CHAPTER_THREE_NPC, CHAPTER_FOUR_STAGES, CHAPTER_FOUR_ROUTE_EDGES, CHAPTER_FIVE_STAGES, CHAPTER_FIVE_ROUTE_EDGES, EVENTS, Adventure, freshRun });
})();

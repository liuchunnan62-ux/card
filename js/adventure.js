(function () {
  "use strict";

  const CF = window.CardForge;
  const COIN_ICON = '<img class="coin-icon" src="assets/ui/gold-coin.png" alt="金币">';
  // 剧情残页与路上事件的内容在 js/data/lore.js、js/data/road-events.js。
  const { LORE_BOOK_TITLE, LORE_PAGES, ROAD_EVENTS: EVENTS } = CF;
  // 营地监狱：收押被击败的觉醒者。成员按“章节 → 节点序号”列出，"all"表示该章全部普通/精英战斗节点。
  // 各关最终首领不收押：森林狼王战死于密林，其余首领都在最后关头被同族救走。因此每关19名，第一关7名。
  const PRISON_MEMBERS = [[1, [0, 1, 3, 5, 7, 9, 11]], [2, "all"], [3, "all"], [4, "all"], [5, "all"]];
  const PRISONER_NODE_TYPES = ["normal", "elite"];
  // 第一关起点“林道遭遇”没有固定敌人，作为第一场战斗时总会遇到哥布林战团。
  const CHAPTER_ONE_PRISONER_FALLBACK = { 0: "goblin_warband" };
  let bondOwnerCache = null;
  // 各章节点、路线与首领强度都来自关卡数据表 js/data/chapters.js。
  // 每个节点包装成 [node]：旧版地图一层可以有多个选项，存档和界面仍沿用这个格式。
  function buildStages(chapter) {
    const prefix = chapter.encounter?.enemyIdPrefix;
    return chapter.nodes.map((row, index) => {
      const node = { type: row.type, label: row.label, icon: row.icon || "" };
      const enemyId = row.enemyId || (prefix && PRISONER_NODE_TYPES.includes(row.type) ? `${prefix}${index + 1}` : null);
      if (enemyId) node.enemyId = enemyId;
      if (row.portrait) node.portrait = row.portrait;
      if (row.weaponId) { node.weaponBoss = true; node.weaponId = row.weaponId; }
      if (chapter.rewardCardIds) node.rewardCardId = chapter.rewardCardIds[index];
      node.pos = row.pos;
      return [node];
    });
  }
  const STAGES_BY_CHAPTER = Object.fromEntries(CF.CHAPTERS.map(chapter => [chapter.id, buildStages(chapter)]));
  const EDGES_BY_CHAPTER = Object.fromEntries(CF.CHAPTERS.map(chapter => [chapter.id, chapter.edges]));
  const stagesOf = chapter => STAGES_BY_CHAPTER[chapter] || STAGES_BY_CHAPTER[1];
  const CHAPTER_TWO_STAGES = STAGES_BY_CHAPTER[2];
  const CHAPTER_THREE_STAGES = STAGES_BY_CHAPTER[3];
  const CHAPTER_FOUR_STAGES = STAGES_BY_CHAPTER[4];
  const CHAPTER_FIVE_STAGES = STAGES_BY_CHAPTER[5];
  const CHAPTER_THREE_NPC = CF.chapterById(3).npc;

  // 数据表中的数量公式：min(max, base + floor(stage / per))。
  const scaledCount = (rule, stage) => Math.min(rule.max ?? Infinity, rule.base + Math.floor(stage / rule.per));

  // 数据表中本关首领的英雄技能：普通/精英/最终首领按 levels 取等级，最终首领可换成 boss 指定的技能。
  function heroSkillFor(chapter, type) {
    const config = chapter?.heroSkill;
    if (!config) return null;
    return { id: type === "boss" && config.boss ? config.boss : config.id, level: config.levels?.[type] || 1, fallbackSummon: config.fallbackSummon || null };
  }

  // 第2~5关普通/精英首领：按数据表 encounter 中的公式生成；最终首领直接使用 enemies.js 中的专属配置。
  function chapterEncounter(chapter, node, stage) {
    const config = chapter.encounter;
    const dialogue = CF.bossDialogueFor?.(chapter.id, stage);
    if (node.type === "boss" && CF.enemies[node.enemyId]) {
      const boss = CF.enemies[node.enemyId];
      return { ...boss, chapter: chapter.id, chapterStage: stage, portrait: node.portrait || boss.portrait, battlefield: config.battlefield, dialogue: dialogue || boss.dialogue || null, heroSkill: heroSkillFor(chapter, "boss") };
    }
    const elite = node.type === "elite";
    const fromEnemy = config.deck.from === "enemy";
    const base = fromEnemy ? (CF.enemies[node.enemyId] || CF.enemies.goblin_warband) : null;
    const deck = fromEnemy
      ? [...base.deck, ...base.deck.slice(0, scaledCount(config.deck.extra, stage))]
      : Array(config.deck.copies).fill([
        ...config.deck.units.slice(0, scaledCount(config.deck.unitCount, stage)),
        ...config.deck.spells.slice(0, scaledCount(config.deck.spellCount, stage))
      ]).flat();
    return {
      ...(base || { icon: config.icon, portrait: node.portrait, description: config.description }),
      id: base ? `chapter${chapter.id}-${stage + 1}-${base.id}` : `chapter${chapter.id}-${stage + 1}`,
      chapter: chapter.id,
      chapterStage: stage,
      name: node.label,
      title: `${config.title} · 第${stage + 1}关`,
      type: node.type,
      health: Math.round(config.health.base + stage * config.health.perStage) + (elite ? config.health.eliteBonus : 0),
      mana: config.mana[elite ? "elite" : "normal"],
      enemyCardLevel: config.cardLevel[elite ? "elite" : "normal"],
      passive: config.passive,
      dialogue,
      skills: config.skills.map(skill => ({ ...skill })),
      battlefield: config.battlefield,
      heroSkill: heroSkillFor(chapter, node.type),
      deck
    };
  }

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
      run.completed = CHAPTER_FIVE_STAGES.slice(0, -1).map((nodes, stage) => ({ stage, type: nodes[0].type }));
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
      const total = stagesOf(chapter).length;
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
      return stagesOf(chapter);
    },
    routeEdges(chapterOverride = null) {
      const chapter = chapterOverride === null ? this.current()?.chapter : chapterId(chapterOverride);
      return EDGES_BY_CHAPTER[chapter] || EDGES_BY_CHAPTER[1];
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
      if (PRISONER_NODE_TYPES.includes(type)) this.recordPrisoner(run.chapter, nodeIndex);
      run.activeNode = null;
      run.stage = run.completed.length;
      run.cleared = run.completed.length >= this.mapStages().length;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
    },
    // 击败的觉醒者会被押回营地监狱；记录独立于章节进度，重开章节也不会释放它们。
    recordPrisoner(chapter, stage) {
      const save = CF.SaveSystem.data;
      save.prisoners ||= {};
      save.prisoners[`${chapter}-${stage}`] = true;
    },
    prisonRoster() {
      const save = CF.SaveSystem.data;
      save.prisoners ||= {};
      const runs = save.chapterRuns || {};
      const captured = (chapter, stage) => Boolean(save.prisoners[`${chapter}-${stage}`]
        || (runs[chapter]?.completed || []).some(entry => Number(entry.stage) === stage));
      return PRISON_MEMBERS.flatMap(([chapter, stages]) => {
        // 直接按章节取节点：mapStages() 会把尚未解锁的章节回退为当前可玩的章节。
        const chapterStages = STAGES_BY_CHAPTER[chapter];
        const nodes = chapterStages.map(options => options[0]);
        const indexes = stages === "all" ? nodes.map((node, index) => index) : stages;
        return indexes.filter(index => PRISONER_NODE_TYPES.includes(nodes[index]?.type)).map(stage => {
          const node = nodes[stage];
          const enemy = CF.enemies?.[node.enemyId || (chapter === 1 ? CHAPTER_ONE_PRISONER_FALLBACK[stage] : "")];
          const isCaptured = captured(chapter, stage);
          if (isCaptured) save.prisoners[`${chapter}-${stage}`] = true;
          return { key: `${chapter}-${stage}`, chapter, stage, name: chapter === 1 ? (enemy?.name || node.label) : node.label, portrait: node.portrait || enemy?.portrait || "", type: node.type, captured: isCaptured, cardId: chapter >= 2 ? node.rewardCardId || null : null };
        });
      });
    },
    // 第二关起，普通/精英首领的首杀奖励卡需要与监狱中的对应首领结缘后才能出战（见 restaurant.js）。
    // 最终首领不在监狱中：它的卡牌要等本关全部在押首领都结缘才能使用，等级取其中最低的好感等级（members）。
    bondCardOwners() {
      if (bondOwnerCache) return bondOwnerCache;
      bondOwnerCache = {};
      CF.CHAPTERS.filter(chapter => chapter.rewardCardIds).map(chapter => [chapter.id, STAGES_BY_CHAPTER[chapter.id]]).forEach(([chapter, stages]) => {
        const members = [];
        let bossNode = null;
        stages.forEach((options, stage) => {
          const node = options[0];
          if (node.type === "boss") bossNode = node;
          if (!PRISONER_NODE_TYPES.includes(node.type) || !node.rewardCardId) return;
          members.push(`${chapter}-${stage}`);
          bondOwnerCache[node.rewardCardId] = { cardId: node.rewardCardId, key: `${chapter}-${stage}`, chapter, stage, name: node.label, portrait: node.portrait };
        });
        if (bossNode?.rewardCardId) bondOwnerCache[bossNode.rewardCardId] = { cardId: bossNode.rewardCardId, key: `${chapter}-boss`, chapter, boss: true, name: bossNode.label, portrait: bossNode.portrait, members };
      });
      return bondOwnerCache;
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
    // 冒险中的首领：随身武器（每回合都能攻击）与每回合补满10张手牌，见 chapters.js 的 bossWeapon。
    encounterFor(type) {
      const base = this.baseEncounterFor(type);
      if (!base) return base;
      const run = this.current();
      const nodeIndex = Number.isInteger(run?.activeNode) ? run.activeNode : run?.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      const weapons = CF.chapterById(run?.chapter)?.bossWeapon || {};
      const spec = weapons[base.type] || weapons[type];
      const weaponId = node?.weaponId || spec?.id;
      return { ...base, handRefill: true, weapon: weaponId ? { id: weaponId, level: spec?.level || 1 } : null };
    },
    baseEncounterFor(type) {
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
          dialogue: CF.bossDialogueFor?.(1, encounterNodeIndex) || base.dialogue || null,
          heroSkill: heroSkillFor(CF.chapterById(1), node?.type || base.type)
        };
      }
      const chapter = CF.chapterById(run?.chapter);
      if (chapter?.encounter && node?.enemyId) return chapterEncounter(chapter, node, encounterNodeIndex || 0);
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
      // 武器是英雄装备而不是牌组卡牌：空手时直接为英雄装备新获得的武器。
      if (!CF.SaveSystem.equippedWeapon()) CF.SaveSystem.data.hero.equippedWeapon = reward.cardId;
      CF.SaveSystem.save();
      return { ...reward, weapon: true, autoEquipped: CF.SaveSystem.equippedWeapon() === reward.cardId };
    },
    // 第二关起的关卡武器：击败本关第一个首领（第一个战斗节点）后获得一次，见 chapters.js 的 chapterWeapon。
    activeChapterWeaponReward() {
      const run = this.current();
      const chapter = CF.chapterById(run?.chapter);
      const cardId = chapter?.chapterWeapon;
      if (!run || !cardId || CF.SaveSystem.data.weaponBossRewards?.[cardId]) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const firstBattle = chapter.nodes.findIndex(node => ["normal", "elite", "boss"].includes(node.type));
      if (nodeIndex !== firstBattle) return null;
      return { nodeIndex, cardId, nodeLabel: chapter.nodes[nodeIndex].label };
    },
    claimActiveChapterWeaponReward() {
      const reward = this.activeChapterWeaponReward();
      if (!reward) return null;
      CF.SaveSystem.data.weaponBossRewards ||= {};
      CF.SaveSystem.data.weaponBossRewards[reward.cardId] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      if (!CF.SaveSystem.equippedWeapon()) CF.SaveSystem.data.hero.equippedWeapon = reward.cardId;
      CF.SaveSystem.save();
      return { ...reward, weapon: true, autoEquipped: CF.SaveSystem.equippedWeapon() === reward.cardId };
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
    // 战斗胜利翻牌战利品：每场战斗（普通/精英/Boss）胜利后都会翻开三张固定战利品牌——
    // 女王精血、粗糙装备、笔记残页。第二张的粗糙武器数量等于本场击杀的敌方随从数；
    // 第三张按顺序解锁《源血纪元》的下一页，集满后不再有奖励。
    generateVictoryLoot(unitsKilled = 0) {
      const gearCount = Math.max(0, Math.floor(Number(unitsKilled) || 0));
      return { gearCount };
    },
    claimVictoryLoot(unitsKilled = 0) {
      const { gearCount } = this.generateVictoryLoot(unitsKilled);
      CF.SaveSystem.addInventoryItem("queenEssenceBlood", 1);
      if (gearCount > 0) {
        CF.SaveSystem.addInventoryItem("weaponT1", gearCount);
      }
      let note = null;
      if (CF.SaveSystem.data.notesUnlocked < LORE_PAGES.length) {
        note = { ...LORE_PAGES[CF.SaveSystem.data.notesUnlocked], index: CF.SaveSystem.data.notesUnlocked + 1 };
        CF.SaveSystem.data.notesUnlocked += 1;
      }
      CF.SaveSystem.save();
      return { gearCount, note };
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
  Object.assign(window.CardForge, { CHAPTER_TWO_STAGES, CHAPTER_TWO_ROUTE_EDGES: EDGES_BY_CHAPTER[2], CHAPTER_THREE_STAGES, CHAPTER_THREE_ROUTE_EDGES: EDGES_BY_CHAPTER[3], CHAPTER_THREE_NPC, CHAPTER_FOUR_STAGES, CHAPTER_FOUR_ROUTE_EDGES: EDGES_BY_CHAPTER[4], CHAPTER_FIVE_STAGES, CHAPTER_FIVE_ROUTE_EDGES: EDGES_BY_CHAPTER[5], EVENTS, LORE_BOOK_TITLE, LORE_PAGES, Adventure, freshRun });
})();

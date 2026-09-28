(function () {
  "use strict";

  const KEY = "rift-expedition-save-v1";
  const SLOT_COUNT = 15;
  const SLOT_PREFIX = "rift-expedition-slot-";
  const ACTIVE_SLOT_KEY = "rift-expedition-active-slot";
  const CF = window.CardForge;
  const CHAPTER_IDS = [1, 2, 3, 4, 5];
  const CHAPTER_NODE_COUNTS = { 1: 13, 2: 20, 3: 20, 4: 20, 5: 20 };
  const CHAPTER_FIVE_FINALE_PRESET_VERSION = "qianzhi-direct-finale-v1";
  const HERO_LEVELS = {
    1: { xp: 0, maxHealth: 30 },
    2: { xp: 20, maxHealth: 31 },
    3: { xp: 50, maxHealth: 32 },
    4: { xp: 90, maxHealth: 33 },
    5: { xp: 140, maxHealth: 34 },
    6: { xp: 205, maxHealth: 35 },
    7: { xp: 285, maxHealth: 36 },
    8: { xp: 380, maxHealth: 37 },
    9: { xp: 490, maxHealth: 38 },
    10: { xp: 620, maxHealth: 39 },
    11: { xp: 770, maxHealth: 40 },
    12: { xp: 940, maxHealth: 41 },
    13: { xp: 1130, maxHealth: 42 },
    14: { xp: 1340, maxHealth: 43 },
    15: { xp: 1570, maxHealth: 44 },
    16: { xp: 1820, maxHealth: 45 },
    17: { xp: 2090, maxHealth: 46 },
    18: { xp: 2380, maxHealth: 47 },
    19: { xp: 2690, maxHealth: 48 },
    20: { xp: 3020, maxHealth: 49 },
    21: { xp: 3370, maxHealth: 50 },
    22: { xp: 3740, maxHealth: 51 },
    23: { xp: 4130, maxHealth: 52 },
    24: { xp: 4540, maxHealth: 53 },
    25: { xp: 4970, maxHealth: 54 }
  };

  function starterCollection() {
    return CF.STARTER_IDS.reduce((acc, id) => {
      acc[id] = CF.STARTER_DECK.filter(cardId => cardId === id).length;
      return acc;
    }, {});
  }

  function initialProgress() {
    return Object.keys(CF.CARD_LIBRARY).reduce((acc, id) => {
      acc[id] = { level: 1, xp: 0 };
      return acc;
    }, {});
  }

  // 人类阵营起步装备：英雄初始牌组里的随从统一预装绿色（T2）武器与盔甲。
  function starterCardEquipment() {
    return CF.STARTER_IDS.reduce((acc, id) => {
      if (CF.CARD_LIBRARY[id]?.type === "unit") acc[id] = { weapon: 2, armor: 2 };
      return acc;
    }, {});
  }

  function signatureSkillOf(heroId) {
    const hero = typeof CF.heroById === "function" ? CF.heroById(heroId) : null;
    return hero?.skill || "slash";
  }

  function freshSave(heroId = "captain") {
    const hero = typeof CF.heroById === "function" ? CF.heroById(heroId) : null;
    const signature = hero?.skill || "slash";
    const skillProgress = { slash: { level: 1, xp: 0, unlocked: true } };
    skillProgress[signature] = { level: 1, xp: 0, unlocked: true };
    return {
      version: 2,
      hero: {
        heroId: hero?.id || "captain",
        level: 1, xp: 0, maxHealth: 30, maxMana: 3,
        equippedSkill: signature,
        skillProgress
      },
      coins: 50,
      collection: starterCollection(),
      cardProgress: initialProgress(),
      deck: [...CF.STARTER_DECK],
      injuredCards: [],
      tutorialSeen: false,
      totalVictories: 0,
      completedRuns: 0,
      qianzhiGarrisonUnlocked: false,
      chapterFiveFinalePreset: CHAPTER_FIVE_FINALE_PRESET_VERSION,
      weaponBossRewards: {},
      chapterTwoBossRewards: {},
      chapterThreeBossRewards: {},
      chapterFourBossRewards: {},
      chapterFiveBossRewards: {},
      questItemRewards: {},
      items: { queenBloodRiverWater: false },
      inventory: { queenEssenceBlood: 0, weaponT1: 0, weaponT2: 0, weaponT3: 0, weaponT4: 0, armorT1: 0, armorT2: 0, armorT3: 0, armorT4: 0 },
      cardEquipment: starterCardEquipment(),
      notesUnlocked: 0,
      prisoners: {},
      foods: {},
      affinity: {},
      commanderTrials: { completed: [] },
      levelMapLayout: {},
      activeChapter: 1,
      chapterRuns: { 1: null, 2: null, 3: null, 4: null, 5: null },
      run: null,
      arena: null
    };
  }

  function normalizeRun(source, chapter, heroMaxHealth) {
    if (!source || typeof source !== "object") return null;
    const chapterId = CHAPTER_IDS.includes(Number(chapter)) ? Number(chapter) : 1;
    const nodeCount = CHAPTER_NODE_COUNTS[chapterId];
    const seen = new Set();
    const completed = (Array.isArray(source.completed) ? source.completed : []).reduce((entries, entry) => {
      const stage = Number(entry?.stage);
      if (!Number.isInteger(stage) || stage < 0 || stage >= nodeCount || seen.has(stage)) return entries;
      seen.add(stage);
      entries.push({ stage, type: entry?.type || "normal" });
      return entries;
    }, []);
    const maxHp = Math.max(Number(heroMaxHealth) || 30, Number(source.maxHp) || 0);
    const savedHp = Number(source.hp);
    const hp = Number.isFinite(savedHp) && savedHp > 0 ? Math.min(maxHp, savedHp) : maxHp;
    const cleanCounter = value => Object.fromEntries(Object.entries(value && typeof value === "object" ? value : {})
      .map(([key, count]) => [String(Number(key)), Math.max(0, Number(count) || 0)])
      .filter(([key]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < nodeCount));
    return {
      ...source,
      chapter: chapterId,
      stage: Math.max(0, Math.min(nodeCount, Number(source.stage) || completed.length)),
      hp,
      maxHp,
      completed,
      chosen: source.chosen && typeof source.chosen === "object" ? { ...source.chosen } : {},
      earnedCoins: Math.max(0, Number(source.earnedCoins) || 0),
      earnedXp: Math.max(0, Number(source.earnedXp) || 0),
      cardsLeveled: Math.max(0, Number(source.cardsLeveled) || 0),
      activeNode: null,
      attempts: cleanCounter(source.attempts),
      failures: cleanCounter(source.failures),
      cleared: source.cleared === true || completed.length >= nodeCount,
      startedAt: Number(source.startedAt) || Date.now(),
      lastPlayedAt: Number(source.lastPlayedAt) || Number(source.startedAt) || Date.now(),
      shopPurchased: source.shopPurchased && typeof source.shopPurchased === "object" ? { ...source.shopPurchased } : {}
    };
  }

  function cleanCounts(value) {
    return Object.fromEntries(Object.entries(value && typeof value === "object" ? value : {})
      .map(([key, count]) => [key, Math.max(0, Math.floor(Number(count) || 0))])
      .filter(([, count]) => count > 0));
  }

  function normalize(raw) {
    const base = freshSave(raw?.hero?.heroId);
    if (!raw || typeof raw !== "object") return base;
    const cleanDeck = Array.isArray(raw.deck) ? raw.deck.filter(id => CF.CARD_LIBRARY[id]).filter((id, index, list) => list.indexOf(id) === index) : [...base.deck];
    if (cleanDeck.length < 24) {
      base.deck.forEach(id => { if (cleanDeck.length < 24 && !cleanDeck.includes(id)) cleanDeck.push(id); });
    }
    const legacySkillLevel = Math.max(1, Math.min(3, raw.hero?.skillLevel || 1));
    const rawSkillProgress = raw.hero?.skillProgress || {};
    const result = {
      ...base, ...raw,
      chapterFiveFinalePreset: typeof raw.chapterFiveFinalePreset === "string" ? raw.chapterFiveFinalePreset : null,
      hero: {
        ...base.hero, ...(raw.hero || {}),
        equippedSkill: raw.hero?.equippedSkill || "slash",
        skillProgress: {
          ...base.hero.skillProgress,
          ...rawSkillProgress,
          slash: { level: legacySkillLevel, xp: 0, unlocked: true, ...(rawSkillProgress.slash || {}) }
        }
      },
      collection: { ...base.collection, ...(raw.collection || {}) },
      weaponBossRewards: { ...base.weaponBossRewards, ...(raw.weaponBossRewards || {}) },
      chapterTwoBossRewards: { ...base.chapterTwoBossRewards, ...(raw.chapterTwoBossRewards || {}) },
      chapterThreeBossRewards: { ...base.chapterThreeBossRewards, ...(raw.chapterThreeBossRewards || {}) },
      chapterFourBossRewards: { ...base.chapterFourBossRewards, ...(raw.chapterFourBossRewards || {}) },
      chapterFiveBossRewards: { ...base.chapterFiveBossRewards, ...(raw.chapterFiveBossRewards || {}) },
      questItemRewards: { ...base.questItemRewards, ...(raw.questItemRewards || {}) },
      items: { ...base.items, ...(raw.items || {}) },
      inventory: { ...base.inventory, ...(raw.inventory || {}) },
      cardEquipment: { ...base.cardEquipment, ...(raw.cardEquipment || {}) },
      notesUnlocked: Number.isInteger(raw.notesUnlocked) ? raw.notesUnlocked : base.notesUnlocked,
      prisoners: raw.prisoners && typeof raw.prisoners === "object" ? { ...raw.prisoners } : {},
      foods: cleanCounts(raw.foods),
      affinity: cleanCounts(raw.affinity),
      levelMapLayout: raw.levelMapLayout && typeof raw.levelMapLayout === "object" ? { ...raw.levelMapLayout } : {},
      commanderTrials: {
        ...base.commanderTrials,
        ...(raw.commanderTrials || {}),
        completed: [...new Set((raw.commanderTrials?.completed || []).map(Number).filter(id => id >= 1 && id <= 7))]
      },
      cardProgress: { ...base.cardProgress, ...(raw.cardProgress || {}) },
      deck: cleanDeck,
      injuredCards: [...new Set((Array.isArray(raw.injuredCards) ? raw.injuredCards : []).filter(id => CF.CARD_LIBRARY[id]?.type === "unit"))]
    };
    Object.keys(CF.CARD_LIBRARY).forEach(id => {
      result.cardProgress[id] = { level: 1, xp: 0, ...(result.cardProgress[id] || {}) };
    });
    Object.keys(result.collection).forEach(id => {
      result.collection[id] = result.collection[id] > 0 ? 1 : 0;
    });
    Object.keys(result.hero.skillProgress).forEach(id => {
      const progress = result.hero.skillProgress[id] || {};
      progress.level = Math.max(1, Math.min(3, Number(progress.level) || 1));
      progress.xp = Math.max(0, Number(progress.xp) || 0);
      while (progress.level < 3 && progress.xp >= progress.level * 3) {
        progress.xp -= progress.level * 3;
        progress.level += 1;
      }
      if (progress.level >= 3) progress.xp = 0;
      progress.unlocked = progress.unlocked !== false;
      result.hero.skillProgress[id] = progress;
    });
    result.hero.heroId = base.hero.heroId;
    const signature = signatureSkillOf(result.hero.heroId);
    if (!result.hero.skillProgress[signature]?.unlocked) result.hero.skillProgress[signature] = { level: 1, xp: 0, unlocked: true };
    if (!result.hero.skillProgress[result.hero.equippedSkill]?.unlocked) result.hero.equippedSkill = signature;
    if (Number(result.completedRuns) >= 1) {
      result.items.queenBloodRiverWater = true;
      result.questItemRewards.queenBloodRiverWater = true;
    }
    const legacyRun = raw.run && typeof raw.run === "object" ? raw.run : null;
    const storedRuns = raw.chapterRuns && typeof raw.chapterRuns === "object" ? raw.chapterRuns : {};
    result.chapterRuns = { 1: null, 2: null, 3: null, 4: null, 5: null };
    CHAPTER_IDS.forEach(chapter => {
      const source = storedRuns[chapter] || (Number(legacyRun?.chapter) === chapter ? legacyRun : null);
      result.chapterRuns[chapter] = normalizeRun(source, chapter, result.hero.maxHealth);
    });
    result.qianzhiGarrisonUnlocked = raw.qianzhiGarrisonUnlocked === true || result.chapterRuns[5]?.cleared === true || Number(result.completedRuns) >= 5;
    const fallbackChapter = Number(legacyRun?.chapter) || (Number(result.completedRuns) >= 4 ? 5 : Number(result.completedRuns) >= 3 ? 4 : Number(result.completedRuns) >= 2 ? 3 : Number(result.completedRuns) >= 1 ? 2 : 1);
    result.activeChapter = CHAPTER_IDS.includes(Number(raw.activeChapter)) ? Number(raw.activeChapter) : fallbackChapter;
    result.run = result.chapterRuns[result.activeChapter] || null;
    result.version = 2;
    delete result.hero.skillLevel;
    delete result.hero.manaShards;
    return result;
  }

  const slotKey = slot => `${SLOT_PREFIX}${slot}`;
  const validSlot = slot => Number.isInteger(Number(slot)) && Number(slot) >= 1 && Number(slot) <= SLOT_COUNT;
  function readJSON(key) {
    try { const text = localStorage.getItem(key); return text ? JSON.parse(text) : null; }
    catch (error) { return null; }
  }
  function writeRaw(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (error) { console.warn("存档写入失败", error); return false; }
  }

  const SaveSystem = {
    data: null,
    activeSlot: null,
    slotCount: SLOT_COUNT,
    levelCap() { return this.data?.completedRuns >= 4 ? 25 : this.data?.completedRuns >= 3 ? 20 : this.data?.completedRuns >= 2 ? 15 : this.data?.completedRuns >= 1 ? 10 : 5; },
    deckLimit() { return 24 + Math.max(0, (this.data?.hero?.level || 1) - 5); },
    load() {
      const raw = readJSON(KEY);
      try { this.data = normalize(raw); }
      catch (error) { this.data = freshSave(); }
      const storedSlot = Number(readJSON(ACTIVE_SLOT_KEY));
      this.activeSlot = validSlot(storedSlot) && readJSON(slotKey(storedSlot)) ? storedSlot : null;
      // 旧版只有一个自动存档：首次升级时把已有进度迁移到1号栏位，避免新游戏覆盖老玩家的进度。
      if (!this.activeSlot && raw && typeof raw === "object" && this.listSlots().every(slot => slot.empty)) this.activeSlot = 1;
      this.save(false);
      return this.data;
    },
    save(notify = true) {
      const text = JSON.stringify(this.data);
      writeRaw(KEY, text);
      if (this.activeSlot) {
        writeRaw(slotKey(this.activeSlot), JSON.stringify({ ...this.data, savedAt: Date.now() }));
        writeRaw(ACTIVE_SLOT_KEY, String(this.activeSlot));
      } else {
        try { localStorage.removeItem(ACTIVE_SLOT_KEY); } catch (error) { /* 可选 */ }
      }
      if (notify) window.dispatchEvent(new CustomEvent("savechange", { detail: this.data }));
    },
    reset() {
      this.data = freshSave(this.data?.hero?.heroId);
      this.save();
      return this.data;
    },
    slotSummary(slot) {
      const raw = validSlot(slot) ? readJSON(slotKey(slot)) : null;
      if (!raw || typeof raw !== "object") return { slot: Number(slot), empty: true, active: this.activeSlot === Number(slot) };
      const hero = typeof CF.heroById === "function" ? CF.heroById(raw.hero?.heroId) : null;
      const chapter = CHAPTER_IDS.includes(Number(raw.activeChapter)) ? Number(raw.activeChapter) : 1;
      const run = raw.chapterRuns?.[chapter] || null;
      return {
        slot: Number(slot),
        empty: false,
        active: this.activeSlot === Number(slot),
        heroId: hero?.id || "captain",
        heroName: hero?.name || "罗兰·维克",
        heroTitle: hero?.title || "",
        portrait: hero?.portrait || "assets/hero/novice-swordsman.png",
        level: Math.max(1, Number(raw.hero?.level) || 1),
        coins: Math.max(0, Number(raw.coins) || 0),
        completedRuns: Math.max(0, Number(raw.completedRuns) || 0),
        chapter,
        chapterCompleted: Array.isArray(run?.completed) ? run.completed.length : 0,
        chapterTotal: CHAPTER_NODE_COUNTS[chapter],
        savedAt: Number(raw.savedAt) || 0
      };
    },
    listSlots() {
      return Array.from({ length: SLOT_COUNT }, (_, index) => this.slotSummary(index + 1));
    },
    hasSlot(slot) { return !this.slotSummary(slot).empty; },
    // 新游戏：在指定栏位以所选英雄建立全新存档，并成为当前自动保存的栏位。
    newGame(slot, heroId) {
      if (!validSlot(slot)) return null;
      this.data = freshSave(heroId);
      this.activeSlot = Number(slot);
      this.save();
      return this.data;
    },
    loadSlot(slot) {
      const raw = validSlot(slot) ? readJSON(slotKey(slot)) : null;
      if (!raw) return null;
      delete raw.savedAt;
      this.data = normalize(raw);
      this.activeSlot = Number(slot);
      this.save();
      return this.data;
    },
    // 另存为：把当前进度写入指定栏位，之后的自动保存也会写入该栏位。
    saveToSlot(slot) {
      if (!validSlot(slot)) return false;
      this.activeSlot = Number(slot);
      this.save();
      return true;
    },
    deleteSlot(slot) {
      if (!validSlot(slot)) return false;
      try { localStorage.removeItem(slotKey(slot)); } catch (error) { return false; }
      if (this.activeSlot === Number(slot)) {
        this.activeSlot = null;
        this.save(false);
      }
      return true;
    },
    addHeroXp(amount) {
      const hero = this.data.hero;
      const before = hero.level;
      hero.xp += Math.max(0, amount);
      for (let level = this.levelCap(); level >= 1; level -= 1) {
        if (hero.xp >= HERO_LEVELS[level].xp) { hero.level = level; break; }
      }
      const spec = HERO_LEVELS[hero.level];
      hero.maxHealth += Math.max(0, hero.level - before);
      this.save();
      return hero.level > before ? { from: before, to: hero.level, spec } : null;
    },
    addCardXp(id, amount) {
      const progress = this.data.cardProgress[id] || (this.data.cardProgress[id] = { level: 1, xp: 0 });
      const from = progress.level;
      progress.xp += Math.max(0, amount);
      while (progress.level < 5) {
        const needed = progress.level * 3;
        if (progress.xp < needed) break;
        progress.xp -= needed;
        progress.level += 1;
      }
      this.save();
      return progress.level > from ? { id, from, to: progress.level } : null;
    },
    completeCommanderTrial(id) {
      const trialId = Number(id);
      if (trialId < 1 || trialId > 7) return null;
      const progress = this.data.commanderTrials || (this.data.commanderTrials = { completed: [] });
      if (progress.completed.includes(trialId)) return { id: trialId, firstClear: false, maxMana: this.data.hero.maxMana };
      progress.completed.push(trialId);
      progress.completed.sort((a, b) => a - b);
      this.data.hero.maxMana += 1;
      this.save();
      return { id: trialId, firstClear: true, maxMana: this.data.hero.maxMana };
    },
    addCardToCollection(id, amount = 1) {
      if (!CF.CARD_LIBRARY[id]) return;
      this.data.collection[id] = 1;
      this.save();
    },
    isCardInjured(id) {
      return this.data.injuredCards?.includes(id) || false;
    },
    availableDeck() {
      const injured = new Set(this.data.injuredCards || []);
      // 负伤的随从与尚未和在押首领结缘的卡牌都不能出战。
      return this.data.deck.filter(id => !injured.has(id) && !CF.Restaurant?.isCardBondLocked(id));
    },
    injureCard(id) {
      if (CF.CARD_LIBRARY[id]?.type !== "unit" || !this.data.collection[id]) return false;
      const injured = this.data.injuredCards || (this.data.injuredCards = []);
      if (injured.includes(id)) return false;
      injured.push(id);
      this.save();
      return true;
    },
    rescueInjuredCards() {
      const rescued = [...(this.data.injuredCards || [])];
      this.data.injuredCards = [];
      this.save();
      return rescued;
    },
    heroSkillProgress(id = this.data.hero.equippedSkill || "slash") {
      const skills = this.data.hero.skillProgress || (this.data.hero.skillProgress = {});
      return skills[id] || null;
    },
    addHeroSkillXp(amount, id = this.data.hero.equippedSkill || "slash") {
      const progress = this.heroSkillProgress(id);
      if (!progress?.unlocked) return null;
      const from = progress.level;
      const gained = progress.level >= 3 ? 0 : Math.max(0, amount);
      progress.xp += gained;
      while (progress.level < 3) {
        const needed = progress.level * 3;
        if (progress.xp < needed) break;
        progress.xp -= needed;
        progress.level += 1;
      }
      if (progress.level >= 3) progress.xp = 0;
      this.save();
      return { id, amount: gained, from, to: progress.level, xp: progress.xp };
    },
    unlockHeroSkill(id) {
      if (!id) return null;
      const skills = this.data.hero.skillProgress || (this.data.hero.skillProgress = {});
      const alreadyUnlocked = Boolean(skills[id]?.unlocked);
      skills[id] = { level: 1, xp: 0, ...(skills[id] || {}), unlocked: true };
      this.save();
      return { id, alreadyUnlocked };
    },
    equipHeroSkill(id) {
      if (!this.heroSkillProgress(id)?.unlocked) return false;
      this.data.hero.equippedSkill = id;
      this.save();
      return true;
    },
    addInventoryItem(key, amount = 1) {
      const inventory = this.data.inventory || (this.data.inventory = {});
      inventory[key] = (inventory[key] || 0) + amount;
      this.save();
      return inventory[key];
    },
    // 女王精血需先通关统领试炼第七关“魅魔女王的低语”（此时最大法力达到10），得到女王认可后才能吸收。
    queenBloodAwakened() {
      return (this.data.commanderTrials?.completed || []).includes(7);
    },
    useQueenEssenceBlood() {
      const inventory = this.data.inventory || (this.data.inventory = {});
      if (!this.queenBloodAwakened()) return false;
      if (!(inventory.queenEssenceBlood > 0)) return false;
      inventory.queenEssenceBlood -= 1;
      this.data.hero.maxHealth += 1;
      this.save();
      return true;
    },
    // slot: "weapon"|"armor"；tier: 1-4。装备时把该卡该槽原有品级退回背包，再扣1件新品级。
    equipCardItem(cardId, slot, tier) {
      if (!CF.CARD_LIBRARY[cardId] || (slot !== "weapon" && slot !== "armor") || !(tier >= 1 && tier <= 4)) return false;
      const key = `${slot}T${tier}`;
      const inventory = this.data.inventory || (this.data.inventory = {});
      if (!(inventory[key] > 0)) return false;
      const equipment = this.data.cardEquipment || (this.data.cardEquipment = {});
      const entry = equipment[cardId] || (equipment[cardId] = { weapon: 0, armor: 0 });
      const previousTier = entry[slot] || 0;
      if (previousTier) inventory[`${slot}T${previousTier}`] = (inventory[`${slot}T${previousTier}`] || 0) + 1;
      inventory[key] -= 1;
      entry[slot] = tier;
      this.save();
      return true;
    },
    // 重锻：消耗2件同品级材料与对应金币，合成1件高一品级的装备（品级上限4）。
    forgeItem(kind, tier) {
      if ((kind !== "weapon" && kind !== "armor") || !(tier >= 1 && tier <= 3)) return false;
      const key = `${kind}T${tier}`;
      const cost = tier * 30;
      const inventory = this.data.inventory || (this.data.inventory = {});
      if (!(inventory[key] >= 2) || !(this.data.coins >= cost)) return false;
      inventory[key] -= 2;
      this.data.coins -= cost;
      const nextKey = `${kind}T${tier + 1}`;
      inventory[nextKey] = (inventory[nextKey] || 0) + 1;
      this.save();
      return true;
    }
  };

  // 装备品级图标：武器=匕首（攻击力右侧），盔甲=盾牌（生命/防御左侧）。白/绿/蓝/紫依次对应T1~T4，未装备时为暗淡色。
  const EQUIPMENT_TIER_COLORS = ["rgba(228,183,93,.25)", "#e7e2d8", "#7fd97f", "#79b8ff", "#d29bff"];
  const EQUIPMENT_TIER_LABELS = {
    weapon: ["未装备武器", "粗糙武器 +1攻击", "精良武器 +2攻击", "锋利武器 +3攻击", "传奇武器 +4攻击"],
    armor: ["未装备盔甲", "粗糙盔甲 +1防御", "精良盔甲 +2防御", "坚固盔甲 +3防御", "传奇盔甲 +4防御"]
  };
  function equipDotHTML(slot, tier) {
    const level = tier || 0;
    return `<i class="equip-icon equip-icon-${slot}" style="background:${EQUIPMENT_TIER_COLORS[level]}" title="${EQUIPMENT_TIER_LABELS[slot][level]}" aria-hidden="true"></i>`;
  }

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { SaveSystem, HERO_LEVELS, freshSave, CHAPTER_FIVE_FINALE_PRESET_VERSION, SAVE_SLOT_COUNT: SLOT_COUNT, equipDotHTML });
})();

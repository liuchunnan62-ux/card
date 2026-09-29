(function () {
  "use strict";

  const CF = window.CardForge;
  const HERO_PORTRAIT = "assets/hero/novice-swordsman.png";
  const heroProfile = () => CF.currentHero?.() || { id: "captain", name: "罗兰·维克", title: "前王都护卫队长", portrait: HERO_PORTRAIT, skill: "slash", bio: "曾任王都护卫队长。野兽接连觉醒后，他认为只守住一座王都远远不够，于是离开王都、集结自己的小队，奔赴各地平定乱局。" };
  const pad2 = value => String(value).padStart(2, "0");
  const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const formatSavedAt = time => {
    if (!time) return "";
    const date = new Date(time);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  };
  const COIN_ICON = '<img class="coin-icon" src="assets/ui/gold-coin.png" alt="金币">';
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRoot = document.getElementById("toast-root");
  const debugRoot = document.getElementById("debug-root");
  const attackArrowLayer = document.getElementById("attack-arrow-layer");
  const attackArrow = document.getElementById("attack-arrow");
  const attackArrowShadow = document.getElementById("attack-arrow-shadow");
  const save = CF.SaveSystem.load();
  const shouldPrepareChapterFiveFinale = save.chapterFiveFinalePreset !== CF.CHAPTER_FIVE_FINALE_PRESET_VERSION
    && (Number(save.completedRuns) >= 4 || Boolean(save.chapterRuns?.[5]));
  if (shouldPrepareChapterFiveFinale) CF.Adventure.prepareChapterFiveFinale();
  // 主菜单：每章的背景战场图与首领徽记（来自关卡数据表 js/data/chapters.js）。
  const MENU_CHAPTERS = CF.CHAPTERS.map(chapter => ({ chapter: chapter.id, name: chapter.name, ...chapter.menu }));
  // 队伍营地：场景图中四位教官的位置（百分比）与头像裁切（原图像素：中心x、中心y、边长）。
  const TRAINING_GROUNDS_ART = "assets/ui/training-grounds.webp";
  const TRAINING_ART_SIZE = [1699, 926];
  const TRAINING_NPCS = [
    { id: "weapon", action: "open-card-training", cardType: "weapon", name: "剑术教官·希尔达", line: "剑刃要比念头更快。来，再挥一次！", title: "🗡️ 武器训练 · 30金币", detail: "选择任意一张未满级武器牌，增加2点经验", hotspot: [14, 52, 10, 36], crop: [322, 540, 160] },
    { id: "spell", action: "open-card-training", cardType: "spell", name: "奥术导师·奥雷利安", line: "法阵已经点亮，让你的咒语更加纯熟吧。", title: "✨ 法术训练 · 30金币", detail: "选择任意一张未满级法术牌，增加2点经验", hotspot: [51.5, 41, 8, 19], crop: [935, 440, 110] },
    { id: "unit", action: "open-card-training", cardType: "unit", name: "战阵教官·伯恩", line: "木人桩不会喊疼，但你的新兵会学会坚持。", title: "⚔️ 随从训练 · 30金币", detail: "选择任意一张未满级随从牌，增加2点经验", hotspot: [72.5, 52, 10.5, 35], crop: [1305, 560, 160] },
    { id: "rescue", action: "rescue-injured", name: "草药师·莉娜", line: "把伤员交给我，药剂已经熬好了。", title: "🩹 救治伤员 · 30金币", hotspot: [89, 50, 9, 30], crop: [1585, 540, 130] }
  ];
  // 营地监狱：典狱长站在队伍营地训练馆门口（场景百分比：左、上、宽、高），点她进入监狱。
  // 头像裁切基于抠图后的立绘（原图像素：中心x、中心y、边长）。
  const PRISON_WARDEN = { name: "典狱长·艾德琳", line: "钥匙在我腰上，猫在我头上。放心，这里没有一只跑得出去——也没有一只想跑。", image: "assets/ui/prison-warden.webp", size: [336, 900], spot: [83.1, 32.9, 4.2, 20.5], crop: [150, 100, 150] };
  const PRISON_ART = "assets/ui/prison-hall.webp";
  // 城镇商店：场景图中四家店铺的位置（百分比）与头像裁切（原图像素：中心x、中心y、边长）。已开放装备店与餐馆。
  const TOWN_ART = "assets/ui/town-square.webp";
  const TOWN_ART_SIZE = [1698, 926];
  const TOWN_SHOPS = [
    { id: "forge", action: "open-equipment-shop", name: "铁匠·葛罗姆", title: "🔨 装备店", detail: "熔炼战场缴获的粗粝武器与盔甲，重锻为更高品质的装备。", enabled: true, hotspot: [32, 42, 11.5, 27], crop: [600, 600, 150] },
    { id: "tavern", action: "open-restaurant", name: "金杯餐馆", title: "🍽️ 餐馆 · 新开业", detail: "出售各式菜肴。带去营地监狱投喂在押首领，提升好感度，结缘后才能使用它们的卡牌。", enabled: true, hotspot: [5, 27, 19, 17], crop: [165, 300, 150] },
    { id: "inn", action: "open-inn", name: "赤龙客栈", title: "🏨 客栈 · 新开业", detail: "花30金币睡一晚，直接进入第二天早上；口粮照常按一天消耗，在押首领又可以投喂了。", enabled: true, hotspot: [68, 16, 9, 19], crop: [1235, 250, 150] },
    { id: "grocer", name: "饥饿的半身人", title: "🛒 杂货铺", detail: "敬请期待。", enabled: false, hotspot: [88, 36, 11.3, 14], crop: [1590, 400, 180] }
  ];
  const EQUIPMENT_TIER_NAMES = {
    weapon: ["", "粗糙武器", "精良武器", "锋利武器", "传奇武器"],
    armor: ["", "粗糙盔甲", "精良盔甲", "坚固盔甲", "传奇盔甲"]
  };
  const EQUIPMENT_TIER_QUALITY = ["", "quality-1", "quality-2", "quality-3", "quality-4"];
  const LEVEL_MAP_DEFAULT_LAYOUT = {
    "chapter-1": [31, 59], "chapter-2": [69, 39], "chapter-3": [48, 69], "chapter-4": [84, 48], "chapter-5": [82, 70],
    arena: [50, 51], trials: [73, 79]
  };

  const UI = {
    screen: "cover",
    battle: null,
    activeNode: null,
    activeEvent: null,
    debugOpen: false,
    levelLayoutEdit: false,
    levelLayoutDraft: null,
    levelDrag: null,
    levelDragSuppressClick: false,
    settingsReturnScreen: "menu",

    levelLayout() {
      const saved = CF.SaveSystem.data.levelMapLayout || {};
      const source = this.levelLayoutDraft || saved;
      return Object.fromEntries(Object.entries(LEVEL_MAP_DEFAULT_LAYOUT).map(([key, fallback]) => {
        const candidate = source[key];
        const x = Number(candidate?.[0]); const y = Number(candidate?.[1]);
        return [key, [Number.isFinite(x) ? Math.max(5, Math.min(95, x)) : fallback[0], Number.isFinite(y) ? Math.max(5, Math.min(95, y)) : fallback[1]]];
      }));
    },
    beginLevelLayoutEdit() {
      this.levelLayoutDraft = this.levelLayout();
      this.levelLayoutEdit = true;
      this.renderLevelSelect();
    },
    saveLevelLayout() {
      CF.SaveSystem.data.levelMapLayout = this.levelLayout();
      CF.SaveSystem.save();
      this.levelLayoutDraft = null;
      this.levelLayoutEdit = false;
      this.levelDrag = null;
      this.toast("关卡地图布局已保存。", "good");
      this.renderLevelSelect();
    },
    resetLevelLayoutDraft() {
      this.levelLayoutDraft = { ...LEVEL_MAP_DEFAULT_LAYOUT };
      this.renderLevelSelect();
    },
    cancelLevelLayoutEdit() {
      this.levelLayoutDraft = null;
      this.levelLayoutEdit = false;
      this.levelDrag = null;
      this.renderLevelSelect();
    },

    topbar(showHome = true) {
      const data = CF.SaveSystem.data;
      return `<header class="topbar">
        <div class="brand"><div class="brand-mark"><span>⚔</span></div><div><h1>裂隙征途</h1><small>RIFT EXPEDITION</small></div></div>
        <div class="top-resources">
          <span class="resource-chip hero-resource"><img class="resource-avatar" src="${heroProfile().portrait}" alt="${heroProfile().name}"><strong>Lv${data.hero.level}</strong></span>
          <span class="resource-chip">${COIN_ICON}<strong data-resource-coins>${data.coins}</strong></span>
          <span class="resource-chip">✦ <strong>${data.hero.maxMana}</strong> 最大法力</span>
          ${this.clockChip()}
          ${this.rationChip()}
        </div>
        ${showHome ? '<button class="icon-btn" data-action="home" title="返回主菜单">⌂ 主菜单</button>' : ""}
      </header>`;
    },
    // 顶栏粮食：现有粮食 / 每场战斗消耗（出战随从 + 在押犯人），不够时标红。
    rationChip() {
      const R = CF.Restaurant;
      const have = R.rations();
      const { units, prisoners, total } = R.upkeep();
      const daily = total * CF.GameClock.DAILY_BATTLES;
      return `<span class="resource-chip ration-chip${have < total ? " short" : ""}" title="每场战斗消耗：随从${units} + 犯人${prisoners} = ${total}份粮食；每天日常消耗${CF.GameClock.DAILY_BATTLES}场的量，共${daily}份">🌾 <strong data-resource-rations>${have}</strong> 粮食 <small>每战-${total} · 每天-${daily}</small></span>`;
    },
    // 顶栏时钟：现实24分钟为一天，每秒由计时器刷新文字与进度条，不重绘整个界面。
    clockChip() {
      const clock = CF.GameClock;
      const night = CF.NightEvents?.isNight();
      return `<span class="resource-chip clock-chip${night ? " night" : ""}" title="现实${clock.DAY_MS / 60000}分钟为游戏里的一天；新的一天可以再投喂每名在押首领一次，队伍会吃掉${clock.DAILY_BATTLES}场战斗的粮食。"><span data-clock-icon>${night ? "🌙" : "☀️"}</span> <strong data-clock-day>第${clock.day()}天</strong> <small data-clock-time>${clock.timeLabel()}</small><span class="clock-progress" aria-hidden="true"><span data-clock-bar style="width:${clock.progress() * 100}%"></span></span></span>`;
    },
    updateClockChip() {
      const clock = CF.GameClock;
      app.querySelectorAll("[data-clock-day]").forEach(el => { el.textContent = `第${clock.day()}天`; });
      app.querySelectorAll("[data-clock-time]").forEach(el => { el.textContent = clock.timeLabel(); });
      app.querySelectorAll("[data-clock-bar]").forEach(el => { el.style.width = `${clock.progress() * 100}%`; });
      const night = CF.NightEvents.isNight();
      app.querySelectorAll("[data-clock-icon]").forEach(el => { el.textContent = night ? "🌙" : "☀️"; el.closest(".clock-chip")?.classList.toggle("night", night); });
    },
    // 夜晚事件：典狱长来报告，玩家选择如何处理。
    showNightEvent() {
      const event = CF.NightEvents.pending();
      const view = CF.NightEvents.view(event);
      if (!view) { CF.SaveSystem.data.nightEvent = null; return; }
      this.sfx("click");
      this.modal(`<span class="eyebrow">🌙 第${event.day}天夜里 · 营地监狱</span><h2>${view.title}</h2>
        <div class="night-event"><div class="prison-warden-intro">${this.wardenAvatar()}<div><strong>${PRISON_WARDEN.name}</strong><p>${view.text}</p></div></div></div>
        <div class="choice-grid night-choices">${view.choices.map((choice, index) => `<button class="choice-btn" data-modal-action="night-choice" data-index="${index}" ${choice.disabled ? "disabled" : ""}><strong>${choice.label}</strong><small>${choice.detail}</small></button>`).join("")}</div>`, "training-modal");
    },
    resolveNightEvent(index) {
      const result = CF.NightEvents.resolve(index);
      if (!result.ok) return this.toast(result.reason, "bad");
      this.modal(`<span class="eyebrow">🌙 夜晚事件</span><h2>${result.title}</h2><p class="night-result">${result.text}</p><div class="menu-actions"><button class="primary-btn" data-modal-action="night-done">好的</button></div>`, "training-modal");
    },

    // 新的一天：提示口粮消耗，刷新顶栏；监狱界面同步刷新“今日已喂”状态。
    handleNewDays(reports) {
      reports.forEach(report => {
        this.toast(report.hungry
          ? `第${report.day}天：粮食不够日常所需（${report.need}份），库存已经吃光了。快去金杯餐馆买面粉！`
          : `第${report.day}天开始：队伍吃掉了${report.need}份日常口粮，在押首领又可以投喂了。`, report.hungry ? "bad" : "good");
      });
      if (this.screen === "prison" && !modalRoot.innerHTML) this.renderPrison();
      else this.refreshTopbar();
    },
    // 开战前检查粮食：够就直接扣除出发；不够时让玩家选择买面粉补足或饿着肚子出战。
    withRations(start) {
      const R = CF.Restaurant;
      const have = R.rations();
      const { units, prisoners, total } = R.upkeep();
      const go = () => {
        const result = R.consumeForBattle();
        start(result.hungry);
        if (result.hungry) this.toast(`粮食不足，队伍饿着肚子出战：本场我方随从攻击-1。`, "bad");
      };
      if (have >= total) return go();
      const { bags, cost } = R.flourFor(total - have);
      const canBuy = CF.SaveSystem.data.coins >= cost;
      this.pendingRationStart = { go, bags };
      this.modal(`<span class="eyebrow">队伍补给</span><h2>🌾 粮食不足</h2><p>本场战斗需要 <strong>${total}</strong> 份粮食（出战随从 ${units} + 在押犯人 ${prisoners}），现有 <strong>${have}</strong> 份。</p><p>${R.FLOUR.icon}${R.FLOUR.name}每袋${R.FLOUR.price}金币、可供${R.FLOUR.rations}人吃一顿。补足需要${bags}袋，共${cost}金币。</p>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="ration-buy-go" ${canBuy ? "" : "disabled"}>${canBuy ? `花${cost}金币买面粉并出战` : `金币不足（需要${cost}）`}</button><button class="danger-btn" data-modal-action="ration-hungry-go">饿着肚子出战（本场随从攻击-1）</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
    },
    frame(content, showHome = true) { this.hideAttackArrow(); app.innerHTML = this.topbar(showHome) + content; if (this.screen === "deck") this.decorateDeckRows(); this.syncMusic(); },
    musicTrack() {
      if (this.screen !== "battle" || !this.battle) return "menu";
      if (this.battle.state.ended) return null;
      const mode = this.battle.enemyConfig?.mode;
      return mode === "arena" ? "arena" : mode === "trial" ? "trial" : "adventure";
    },
    syncMusic() { CF.Music?.setTrack(this.musicTrack()); },
    decorateDeckRows() {
      const data = CF.SaveSystem.data;
      app.querySelectorAll(".deck-row").forEach(row => {
        const cardId = row.querySelector("[data-card]")?.dataset.card;
        if (!cardId) return;
        const progress = data.cardProgress[cardId] || { level: 1, xp: 0 };
        const level = Math.max(1, Math.min(5, progress.level || 1));
        const stars = "★".repeat(level) + "☆".repeat(5 - level);
        const nextXp = level >= 5 ? 1 : level * 3;
        const currentXp = level >= 5 ? nextXp : Math.max(0, progress.xp || 0);
        const pct = level >= 5 ? 100 : Math.min(100, Math.round(currentXp / nextXp * 100));
        const info = row.querySelector(".deck-card-info small");
        const isDeckRow = Boolean(info && info.textContent.trim().startsWith("Lv"));
        if (info && isDeckRow) info.innerHTML = `<span class="card-level-stars" title="等级 ${level}">${stars}</span> · ${info.textContent.split("·").slice(1).join("·").trim()}`;
        const details = row.querySelector(".deck-card-details");
        if (details) {
          const progressHTML = `<span class="card-xp-label">经验 ${level >= 5 ? "已满" : `${currentXp}/${nextXp}`}</span><span class="card-xp-progress"><span style="width:${pct}%"></span></span>`;
          if (isDeckRow) {
            // 重新根据数据生成基础属性（含装备品级小圆点），避免用 textContent 时把 <i class="equip-dot"> 也一并抹掉。
            const card = CF.getCard(cardId, progress, CF.Restaurant.cardBondBonus(cardId));
            const cardEquip = data.cardEquipment?.[cardId] || {};
            const baseStats = card.type === "unit"
              ? `${card.attack}${CF.equipDotHTML("weapon", cardEquip.weapon)}/${CF.equipDotHTML("armor", cardEquip.armor)}${card.health}`
              : card.type === "weapon" ? `${card.attack}攻/${card.durability}耐久 · ${card.description}` : card.description;
            details.innerHTML = `${baseStats}<span class="card-xp-inline">${progressHTML}</span>`;
          } else {
            details.innerHTML = progressHTML;
          }
        }
      });
    },
    hideAttackArrow() { attackArrowLayer.classList.remove("visible", "spell", "skill", "weapon"); },
    updateAttackArrow(clientX, clientY) {
      const selected = this.battle?.state.selected;
      const selectedCard = selected?.type === "card" ? this.battle?.selectedCard() : null;
      const isAttacker = selected?.type === "attacker";
      const isWeapon = selected?.type === "weapon";
      const isSkill = selected?.type === "skill";
      const isSpell = selectedCard?.type === "spell" && ["damage", "heal", "buff", "front_aoe", "chain_damage", "swap_stats", "fortify", "execute_draw", "honey_salve", "growth_blessing", "bear_paw", "slime_mend", "gel_barrier", "viscous_prison"].includes(selectedCard.effect);
      if (!isAttacker && !isWeapon && !isSkill && !isSpell) return this.hideAttackArrow();
      const source = isWeapon ? app.querySelector(".equipped-weapon.player-weapon.selected") : isAttacker
        ? app.querySelector(`.slot[data-side="player"][data-row="${selected.row}"][data-column="${selected.column}"] .unit`)
        : isSkill ? app.querySelector(".hero-skill.selected") : app.querySelector(".game-card.spell.selected");
      if (!source) return this.hideAttackArrow();
      const rect = source.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = isSpell ? rect.top + 9 : rect.top + rect.height / 2;
      let endX = clientX;
      let endY = clientY;
      if (!Number.isFinite(endX) || Math.hypot(endX - startX, endY - startY) < 42) {
        const skillTargetsFriendly = isSkill && this.battle?.playerSkill().target === "friendly-unit";
        const suggested = app.querySelector(isSpell
          ? ".slot.targetable .unit, .player-hero.targetable"
          : skillTargetsFriendly ? '.slot[data-side="player"].targetable .unit'
          : ".slot.targetable .enemy-unit, .enemy-hero-target.targetable");
        if (suggested) {
          const targetRect = suggested.getBoundingClientRect();
          endX = targetRect.left + targetRect.width / 2;
          endY = targetRect.top + targetRect.height / 2;
        } else {
          endX = startX;
          endY = startY - 90;
        }
      }
      endX = Math.max(18, Math.min(window.innerWidth - 18, endX));
      endY = Math.max(18, Math.min(window.innerHeight - 18, endY));
      const distance = Math.hypot(endX - startX, endY - startY);
      const bend = Math.min(80, Math.max(24, distance * .16));
      const controlX = (startX + endX) / 2;
      const controlY = (startY + endY) / 2 - bend;
      const path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      attackArrow.setAttribute("d", path);
      attackArrowShadow.setAttribute("d", path);
      attackArrowLayer.classList.toggle("spell", isSpell);
      attackArrowLayer.classList.toggle("skill", isSkill);
      attackArrowLayer.classList.toggle("weapon", isWeapon);
      attackArrowLayer.classList.add("visible");
    },
    syncAttackArrow() { this.updateAttackArrow(Number.NaN, Number.NaN); },
    sfx(name, delay = 0) {
      if (delay) setTimeout(() => CF.SoundFX?.play(name), delay);
      else CF.SoundFX?.play(name);
    },
    toast(message, kind = "", { quiet = false } = {}) {
      if (kind === "bad" && !quiet) this.sfx("error");
      const toast = document.createElement("div");
      toast.className = `toast ${kind}`;
      toast.textContent = message;
      toastRoot.appendChild(toast);
      setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(20px)"; }, 2600);
      setTimeout(() => toast.remove(), 3000);
    },
    modal(html, variant = "") {
      const variantClass = variant ? ` ${variant}` : "";
      modalRoot.innerHTML = `<div class="modal-backdrop${variantClass}"><div class="modal${variantClass}">${html}</div></div>`;
    },
    closeModal() { modalRoot.innerHTML = ""; },

    confirmLeaveBattle() {
      if (!this.battle || this.battle.state.ended) return this.leaveCurrentRun();
      this.modal(`<h2>返回主菜单？</h2><p>当前这场战斗会被放弃，需要重新挑战；已击败的节点、收藏和其他进度都会保留。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-leave-battle">放弃战斗并返回</button><button class="secondary-btn" data-modal-action="close">继续战斗</button></div>`);
    },
    leaveCurrentRun() {
      this.battle?.abandon();
      if (this.screen === "battle" && CF.Adventure.current()) CF.Adventure.pause();
      this.battle = null;
      this.activeNode = null;
      this.renderMenu();
    },

    renderCover() {
      this.screen = "cover"; this.battle = null; this.activeNode = null;
      this.hideAttackArrow();
      const activeSlot = CF.SaveSystem.activeSlot ? CF.SaveSystem.slotSummary(CF.SaveSystem.activeSlot) : null;
      const canContinue = Boolean(activeSlot && !activeSlot.empty);
      const hasSaves = CF.SaveSystem.listSlots().some(slot => !slot.empty);
      this.syncMusic();
      app.innerHTML = `<section class="cover-screen" aria-label="裂隙征途游戏封面">
        <div class="cover-shade"></div>
        ${CF.I18n.selectorHTML("cover-language")}
        <div class="cover-menu">
          <span class="cover-kicker">RIFT EXPEDITION</span>
          <h1>裂隙征途</h1>
          <p>前王都护卫队长罗兰与他的小队已经整装待发。</p>
          <div class="cover-actions">
            <button class="cover-button cover-new" data-action="hero-select"><span>新游戏</span><small>选择英雄，踏上新的远征</small></button>
            <button class="cover-button" data-action="cover-continue" ${canContinue ? "" : "disabled"}><span>继续游戏</span><small>${canContinue ? `栏位${activeSlot.slot} · ${activeSlot.heroName} Lv${activeSlot.level}` : "暂无进行中的存档"}</small></button>
            <button class="cover-button" data-action="load-slots"><span>读取存档</span><small>${hasSaves ? `共${CF.SAVE_SLOT_COUNT}个存档栏位` : "暂无存档 · 可导入存档文件"}</small></button>
            <button class="cover-button" data-action="settings-page"><span>游戏设置</span><small>音效与本地存档</small></button>
          </div>
        </div>
      </section>`;
    },

    bare(content) { this.hideAttackArrow(); app.innerHTML = content; },

    renderHeroSelect() {
      this.screen = "hero-select"; this.battle = null; this.activeNode = null;
      const selectable = CF.selectableHeroes?.() || [];
      if (!selectable.some(hero => hero.id === this.heroSelectId)) this.heroSelectId = "captain";
      const chosen = CF.heroById(this.heroSelectId);
      const skill = CF.HERO_SKILLS[chosen.skill] || CF.HERO_SKILLS.slash;
      const cards = CF.HEROES.map(hero => hero.locked
        ? `<button class="hero-pick locked" disabled aria-label="成就英雄，尚未开放"><span class="hero-pick-art"><img src="${hero.portrait}" alt=""></span><strong>？？？</strong><small>🔒 达成特殊成就后解锁</small></button>`
        : `<button class="hero-pick ${hero.id === chosen.id ? "selected" : ""}" data-action="hero-pick" data-hero="${hero.id}" aria-pressed="${hero.id === chosen.id}"><span class="hero-pick-art"><img src="${hero.portrait}" alt="${hero.name}"></span><strong>${hero.name}</strong><small>${hero.title}</small></button>`).join("");
      const levels = [1, 2, 3].map(level => `<li><b>Lv${level}</b> ${skill.playerDescription(level)}</li>`).join("");
      this.bare(`<section class="screen hero-select-screen">
        <div class="page-heading"><div><span class="eyebrow">新游戏</span><h2>选择英雄</h2></div><p>除罗兰外还有8名英雄可选，每人拥有独特的英雄技能。</p><button class="secondary-btn back" data-action="cover">返回封面</button></div>
        <div class="hero-select-layout">
          <div class="hero-select-grid">${cards}</div>
          <aside class="panel hero-select-detail">
            <div class="hero-select-portrait"><img src="${chosen.portrait}" alt="${chosen.name}"></div>
            <span class="eyebrow">${chosen.title}</span><h3>${chosen.name}</h3><p>${chosen.bio}</p>
            <div class="hero-select-skill"><strong>${skill.icon} 英雄技能：${skill.name} · ${skill.cost}费</strong><ul>${levels}</ul><small>每回合可使用一次。技能最高3级，可在竞技场中培养。</small></div>
            <button class="primary-btn" data-action="hero-select-confirm">选择存档栏位</button>
          </aside>
        </div>
      </section>`);
    },

    renderSaveSlots(mode = "manage") {
      this.screen = "save-slots"; this.battle = null; this.activeNode = null;
      this.slotMode = mode;
      const slots = CF.SaveSystem.listSlots();
      const chosen = mode === "new" ? CF.heroById(this.heroSelectId) : null;
      const cards = slots.map(slot => {
        const label = `栏位 ${pad2(slot.slot)}`;
        const body = slot.empty
          ? `<div class="save-slot-empty">空栏位</div>`
          : `<img src="${slot.portrait}" alt="${slot.heroName}"><div class="save-slot-info"><strong>${slot.heroName} · Lv${slot.level}</strong><small>第${slot.chapter}关 · 节点${slot.chapterCompleted}/${slot.chapterTotal} · 通关${slot.completedRuns}次</small><small>${COIN_ICON} ${slot.coins}${slot.savedAt ? ` · ${formatSavedAt(slot.savedAt)}` : ""}</small>${slot.fromBackup ? `<small class="save-slot-warning">存档损坏，已改用自动备份</small>` : ""}${slot.future ? `<small class="save-slot-warning">来自更新版本的游戏，请升级后读取</small>` : ""}</div>`;
        let actions = "";
        if (mode === "new") actions = `<button class="mini-btn" data-action="slot-new" data-slot="${slot.slot}">${slot.empty ? "在此开始" : "覆盖并开始"}</button>`;
        if (mode === "load") actions = `<button class="mini-btn" data-action="slot-load" data-slot="${slot.slot}" ${slot.empty || slot.future ? "disabled" : ""}>读取</button>`;
        if (mode === "manage") actions = `<button class="mini-btn" data-action="slot-load" data-slot="${slot.slot}" ${slot.empty || slot.active || slot.future ? "disabled" : ""}>读取</button><button class="mini-btn" data-action="slot-save" data-slot="${slot.slot}">保存到此</button><button class="mini-btn" data-action="slot-export" data-slot="${slot.slot}" ${slot.empty ? "disabled" : ""}>导出</button><button class="mini-btn" data-action="slot-import" data-slot="${slot.slot}">导入</button><button class="mini-btn danger" data-action="slot-delete" data-slot="${slot.slot}" ${slot.empty ? "disabled" : ""}>删除</button>`;
        return `<article class="save-slot ${slot.empty ? "empty" : ""} ${slot.active ? "active" : ""}"><header><span>${label}</span>${slot.active ? "<em>当前存档</em>" : ""}</header><div class="save-slot-body">${body}</div><div class="save-slot-actions">${actions}</div></article>`;
      }).join("");
      const heading = mode === "new" ? "选择存档栏位" : mode === "load" ? "读取存档" : "存档管理";
      const note = mode === "new"
        ? `新英雄「${chosen.name}」将从头开始远征。之后的进度会自动保存到所选栏位。`
        : mode === "load" ? "读取后，之后的进度会自动保存到该栏位。"
        : `当前进度会自动保存到当前栏位；“保存到此”会把当前进度另存到所选栏位，并以它作为之后的自动保存栏位。`;
      const back = mode === "new" ? "hero-select" : mode === "load" ? "cover" : "home";
      const html = `<section class="screen save-slots-screen">
        <div class="page-heading"><div><span class="eyebrow">${CF.SAVE_SLOT_COUNT}个存档栏位</span><h2>${heading}</h2></div><p>${note}</p>${mode === "manage" ? "" : `<button class="secondary-btn back" data-action="${back}">返回</button>`}</div>
        ${mode === "new" ? "" : `<div class="save-slot-toolbar">${mode === "manage" ? `<button class="secondary-btn" data-action="export-all-saves" ${slots.some(slot => !slot.empty) ? "" : "disabled"}>导出全部存档</button>` : ""}<button class="secondary-btn" data-action="import-saves">导入存档文件</button><small>换设备、换浏览器或清理浏览器数据前，请先导出存档。</small></div>`}
        <div class="save-slot-grid">${cards}</div>
      </section>`;
      if (mode === "manage") this.frame(html);
      else this.bare(html);
    },

    slotNew(slot) {
      const summary = CF.SaveSystem.slotSummary(slot);
      if (!summary.empty) {
        this.modal(`<h2>覆盖栏位${slot}？</h2><p>栏位${slot}中${summary.heroName} Lv${summary.level}的存档将被永久删除，并以新英雄重新开始。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-slot-new" data-slot="${slot}">覆盖并开始</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
        return;
      }
      this.startNewGame(slot);
    },
    startNewGame(slot) {
      const hero = CF.heroById(this.heroSelectId);
      CF.SaveSystem.newGame(slot, hero.id);
      this.closeModal();
      this.toast(`${hero.name}已加入远征，进度将保存到栏位${slot}。`, "good");
      this.sfx("newGame");
      this.startNewRun();
    },
    slotLoad(slot) {
      if (CF.SaveSystem.slotSummary(slot).empty) return;
      if (!CF.SaveSystem.activeSlot && this.screen === "save-slots" && this.slotMode === "manage") {
        this.modal(`<h2>读取栏位${slot}？</h2><p>当前进度还没有保存到任何栏位，读取后将会丢失。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-slot-load" data-slot="${slot}">读取</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
        return;
      }
      this.finishSlotLoad(slot);
    },
    finishSlotLoad(slot) {
      if (!CF.SaveSystem.loadSlot(slot)) return this.toast("存档读取失败。", "bad");
      this.closeModal();
      this.toast(`已读取栏位${slot}。`, "good");
      this.sfx("save");
      this.renderMenu();
    },
    slotSave(slot) {
      const summary = CF.SaveSystem.slotSummary(slot);
      if (!summary.empty && !summary.active) {
        this.modal(`<h2>覆盖栏位${slot}？</h2><p>栏位${slot}中${summary.heroName} Lv${summary.level}的存档将被当前进度覆盖。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-slot-save" data-slot="${slot}">覆盖保存</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
        return;
      }
      this.finishSlotSave(slot);
    },
    finishSlotSave(slot) {
      CF.SaveSystem.saveToSlot(slot);
      this.closeModal();
      this.toast(`已保存到栏位${slot}。`, "good");
      this.sfx("save");
      this.renderSaveSlots("manage");
    },
    slotDelete(slot) {
      const summary = CF.SaveSystem.slotSummary(slot);
      if (summary.empty) return;
      this.modal(`<h2>删除栏位${slot}？</h2><p>${summary.heroName} Lv${summary.level}的存档将被永久删除。${summary.active ? "这是当前存档：删除后当前进度不会再自动保存到任何栏位。" : ""}</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-slot-delete" data-slot="${slot}">永久删除</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
    },

    // ——— 存档导出/导入 ———
    // 导出弹窗同时提供“下载文件”和可复制的文本：安卓版 WebView 不支持下载与选择文件，只能复制粘贴。
    exportSaves(slot = null) {
      const text = slot ? CF.SaveSystem.exportSlot(slot) : CF.SaveSystem.exportAll();
      if (!text) return this.toast("没有可以导出的存档。", "bad");
      const date = new Date();
      const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
      this.pendingExport = { text, filename: `rift-expedition-${slot ? `slot${pad2(slot)}` : "all"}-${stamp}.json` };
      this.modal(`<span class="eyebrow">存档导出</span><h2>${slot ? `导出栏位${slot}` : "导出全部存档"}</h2>
        <p>下载存档文件，或复制下面的文本另行保存。在其他设备或浏览器上用“导入存档文件”即可恢复。</p>
        <textarea class="save-transfer-text" readonly data-no-i18n data-save-export-text>${escapeHTML(text)}</textarea>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="save-export-download">下载文件</button><button class="secondary-btn" data-modal-action="save-export-copy">复制文本</button><button class="secondary-btn" data-modal-action="close">关闭</button></div>`, "training-modal");
    },
    downloadExport() {
      const pending = this.pendingExport;
      if (!pending) return;
      try {
        const url = URL.createObjectURL(new Blob([pending.text], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = pending.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toast("存档文件已开始下载。", "good");
      } catch (error) {
        this.toast("当前环境无法下载文件，请改用“复制文本”。", "bad");
      }
    },
    async copyExport() {
      const area = modalRoot.querySelector("[data-save-export-text]");
      if (!area || !this.pendingExport) return;
      let copied = false;
      try { await navigator.clipboard.writeText(this.pendingExport.text); copied = true; }
      catch (error) {
        area.focus();
        area.select();
        try { copied = document.execCommand("copy"); } catch (fallbackError) { copied = false; }
      }
      this.toast(copied ? "存档文本已复制。" : "无法自动复制，请手动全选文本后复制。", copied ? "good" : "bad");
    },
    // targetSlot 为空时按文件里记录的栏位导入（整体恢复）；否则把单个存档导入到指定栏位。
    openImport(targetSlot = null) {
      this.importTarget = targetSlot;
      this.modal(`<span class="eyebrow">存档导入</span><h2>${targetSlot ? `导入到栏位${targetSlot}` : "导入存档文件"}</h2>
        <p>${targetSlot ? "选择单个栏位导出的存档文件，或粘贴存档文本。" : "选择导出的存档文件（单个栏位或全部存档），或粘贴存档文本；存档会恢复到它原来的栏位。"}</p>
        <label class="save-transfer-file"><span>存档文件</span><input type="file" accept=".json,application/json,text/plain" data-save-import-file></label>
        <textarea class="save-transfer-text" placeholder="或在这里粘贴存档文本" data-save-import-text></textarea>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="save-import-read">下一步</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`, "training-modal");
    },
    async readImport() {
      const file = modalRoot.querySelector("[data-save-import-file]")?.files?.[0];
      let text = modalRoot.querySelector("[data-save-import-text]")?.value || "";
      if (file) {
        try { text = await file.text(); }
        catch (error) { return this.toast("无法读取所选文件。", "bad"); }
      }
      const parsed = CF.SaveSystem.parseImport(text);
      if (!parsed.ok) {
        const reasons = {
          empty: "请先选择存档文件或粘贴存档文本。",
          format: "这不是《裂隙征途》的存档，或者文本不完整。",
          future: "这个存档来自更新版本的游戏，请先升级游戏再导入。",
          damaged: "存档数据已损坏，无法导入。"
        };
        return this.toast(reasons[parsed.error] || reasons.format, "bad");
      }
      let plan;
      if (this.importTarget) {
        if (parsed.saves.length !== 1) return this.toast("这是包含多个栏位的全部存档，请用存档页上方的“导入存档文件”整体恢复。", "bad");
        plan = [{ ...parsed.saves[0], slot: this.importTarget }];
      } else {
        const used = new Set(parsed.saves.map(save => save.slot).filter(Boolean));
        const free = CF.SaveSystem.listSlots().filter(slot => slot.empty && !used.has(slot.slot)).map(slot => slot.slot);
        plan = parsed.saves.map(save => ({ ...save, slot: save.slot || free.shift() || null }));
        if (plan.some(save => !save.slot)) return this.toast("没有空栏位可以放入这个存档，请在存档管理中选择栏位导入。", "bad");
      }
      this.pendingImport = plan;
      const rows = plan.map(save => {
        const existing = CF.SaveSystem.slotSummary(save.slot);
        const incoming = `${save.summary.heroName} Lv${save.summary.level}`;
        return `<li><strong>栏位${save.slot}</strong>：${existing.empty ? `写入 ${incoming}` : `${existing.heroName} Lv${existing.level} → ${incoming}`}${existing.active ? "（当前存档）" : ""}</li>`;
      }).join("");
      const overwrites = plan.some(save => !CF.SaveSystem.slotSummary(save.slot).empty);
      this.modal(`<span class="eyebrow">存档导入</span><h2>确认导入？</h2><ul class="save-import-plan">${rows}</ul>
        ${overwrites ? "<p>被覆盖的栏位会先自动备份一次。</p>" : ""}
        <div class="menu-actions"><button class="${overwrites ? "danger-btn" : "primary-btn"}" data-modal-action="save-import-confirm">${overwrites ? "覆盖并导入" : "导入"}</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`, "training-modal");
    },
    finishImport() {
      const plan = this.pendingImport || [];
      this.pendingImport = null;
      const failed = plan.filter(save => !CF.SaveSystem.importToSlot(save.slot, save.data));
      this.closeModal();
      if (failed.length) this.toast(`栏位${failed.map(save => save.slot).join("、")}导入失败，浏览器存储空间可能已满。`, "bad");
      else { this.toast(`已导入${plan.length}个存档。`, "good"); this.sfx("save"); }
      this.renderSaveSlots(this.slotMode || "manage");
    },

    renderMenu() {
      this.screen = "menu"; this.battle = null; this.activeNode = null;
      const data = CF.SaveSystem.data;
      const activeRun = CF.Adventure.current();
      const injuredCount = data.injuredCards?.length || 0;
      const trainingReady = this.trainingServices().some(service => service.ready);
      const chapter = activeRun ? (activeRun.chapter || 1) : (data.completedRuns >= 4 ? 5 : data.completedRuns >= 3 ? 4 : data.completedRuns >= 2 ? 3 : data.completedRuns >= 1 ? 2 : 1);
      const stageCount = chapter === 1 ? 13 : 20;
      const continueLabel = activeRun ? `${activeRun.cleared ? "查看" : "继续"}第${chapter}关 · 已完成${Math.min(stageCount, activeRun.completed.length)}节点` : (chapter === 5 ? "进入千枝城废墟" : chapter === 4 ? "深入梦幻森林" : chapter === 3 ? "前往金麦农场" : chapter === 2 ? "进军哥布林王庭" : "踏入密林");
      const chapterHeading = chapter === 5 ? "踏入千枝城废墟<br>追寻银灰狼女猎手" : chapter === 4 ? "深入梦幻森林<br>追寻碧露大贤者" : chapter === 3 ? "踏入金麦农场<br>会见丰穗战母" : chapter === 2 ? "进军王庭<br>挑战翠影女王" : "击穿战线<br>直面狼王";
      const chapterDescription = chapter === 5 ? "第五关位于翡翠城南方的古城废墟。灰狼与其他野兽凭借速度和突袭扩张领地，最终迎战银灰狼女猎手。" : chapter === 4 ? "第四关拥有二十个史莱姆首领节点。她们生命厚重、攻击较低并会不断再生；沿发光溪流深入森林，最终面对碧露大贤者·涅芙莉。" : chapter === 3 ? "第三关拥有二十个熊族首领节点与一处农舍。沿农田支路调查被占领的村庄，最终面对丰穗战母·布蕾娅。" : chapter === 2 ? "第二关拥有二十个首领节点。沿着哥布林军团的防线一路推进，最终迎战拥有200生命的翠影女王。" : "在四条前后排战线上部署军队，撕开一路缺口，穿越十三个迷雾森林节点。每一次胜利，都会化为下一次远征的力量。";
      const menuChapter = MENU_CHAPTERS[chapter - 1];
      const progress = CF.Adventure.chapterProgress(chapter);
      const progressPercent = Math.round(Math.min(progress.total, progress.completed) / progress.total * 100);
      const collected = Object.values(data.collection).reduce((a, b) => a + b, 0);
      const emblems = MENU_CHAPTERS.map(entry => {
        const unlocked = entry.chapter === 1 || data.completedRuns >= entry.chapter - 1;
        const entryProgress = CF.Adventure.chapterProgress(entry.chapter);
        const cleared = entryProgress.cleared || data.completedRuns >= entry.chapter;
        const state = entry.chapter === chapter ? "current" : cleared ? "cleared" : unlocked ? "open" : "locked";
        const badge = !unlocked ? `完成${MENU_CHAPTERS[entry.chapter - 2].name}后解锁` : cleared ? "✓ 已通关" : entryProgress.exists ? `存档 ${entryProgress.completed}/${entryProgress.total}` : "尚未开始";
        return `<li class="chapter-emblem ${state}"><span class="chapter-emblem-art"><img src="${entry.boss}" alt="${unlocked ? entry.bossName : ""}">${unlocked ? "" : '<i aria-hidden="true">🔒</i>'}</span><strong>${entry.name}</strong><small>${badge}</small></li>`;
      }).join("");
      const stat = (icon, label, value, extra = "") => `<div class="menu-stat${extra}"><span class="menu-stat-icon" aria-hidden="true">${icon}</span><strong>${value}</strong><small>${label}</small></div>`;
      this.frame(`<section class="screen menu-screen">
        <div class="hero-banner menu-banner">
          <div class="menu-banner-art" style="background-image: url('${menuChapter.background}')" aria-hidden="true"></div>
          <button class="hero-portrait" data-action="hero-page" data-label="${heroProfile().name}"><div class="crest hero-image"><img src="${heroProfile().portrait}" alt="${heroProfile().name}"></div></button>
          <div class="hero-copy"><span class="eyebrow">单机卡牌闯关冒险</span><h2>${chapterHeading}</h2>
            <p>${chapterDescription}</p>
            <div class="menu-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${Math.min(progress.total, progress.completed)}">
              <div class="menu-progress-label"><span>${menuChapter.name}</span><strong>${Math.min(progress.total, progress.completed)} / ${progress.total}</strong></div>
              <div class="menu-progress-track"><span style="width:${progressPercent}%"></span></div>
            </div>
            <div class="menu-main-actions">
              <button class="primary-btn menu-continue" data-action="${activeRun ? "continue-run" : "new-run"}">${continueLabel}</button>
              ${activeRun ? '<button class="secondary-btn" data-action="new-run">重新开始本关</button>' : ""}
            </div>
          </div>
          <div class="menu-utility">
            <button class="icon-btn" data-action="backpack-page"><span aria-hidden="true">🎒</span> <span>背包</span></button>
            <button class="icon-btn" data-action="book-page"><span aria-hidden="true">📖</span> <span>笔记</span></button>
            <button class="icon-btn" data-action="save-slots"><span aria-hidden="true">💾</span> <span>存档</span></button>
            <button class="icon-btn" data-action="settings-page"><span aria-hidden="true">⚙</span> <span>设置</span></button>
          </div>
        </div>
        <div class="menu-tiles">
          <button class="menu-tile" data-action="level-select"><span class="menu-tile-art" style="background-image: url('assets/maps/world-map.png')" aria-hidden="true"></span><strong>关卡选择</strong><small>远征世界</small></button>
          <button class="menu-tile" data-action="town-shop-page"><span class="menu-tile-art" style="background-image: url('${TOWN_ART}')" aria-hidden="true"></span><strong>城镇商店</strong><small>装备店 · 餐馆 · 客栈已开放</small></button>
          <button class="menu-tile" data-action="deck-page"><span class="menu-tile-art" style="background-image: url('assets/cards/kingdom-knight.png')" aria-hidden="true"></span><strong>卡组编辑</strong><small>收藏 ${collected} 张</small></button>
          <button class="menu-tile" data-action="training-page"><span class="menu-tile-art" style="background-image: url('${TRAINING_GROUNDS_ART}')" aria-hidden="true"></span>${trainingReady ? '<span class="menu-tile-dot" aria-hidden="true"></span>' : ""}<strong>队伍营地</strong><small>${injuredCount ? `伤员 ${injuredCount} 名` : "营地"}</small></button>
        </div>
        <div class="menu-overview">
          <div class="dashboard-card"><h3>远征进度</h3><ol class="chapter-emblems">${emblems}</ol></div>
          <div class="dashboard-card"><h3>永久远征成长</h3><div class="menu-stats">
            ${stat("⚔", "胜场", data.totalVictories)}
            ${stat("🏆", "通关", data.completedRuns)}
            ${stat("🃏", "收藏", collected)}
            ${stat("🩹", "伤员", injuredCount, injuredCount ? " alert" : "")}
          </div></div>
        </div>
      </section>`, false);
    },

    // 队伍营地四项服务的当前状态：角标数量、是否可用、提示文字。
    trainingServices() {
      const data = CF.SaveSystem.data;
      const run = CF.Adventure.current();
      const injuredCount = data.injuredCards?.length || 0;
      const heroNeedsHealing = Boolean(run && run.hp < run.maxHp);
      return TRAINING_NPCS.map(npc => {
        const rescue = npc.action === "rescue-injured";
        const count = rescue ? injuredCount : this.trainingCandidates(npc.cardType).length;
        const available = rescue ? injuredCount > 0 || heroNeedsHealing : count > 0;
        const ready = available && data.coins >= 30;
        const hint = ready ? (rescue ? "可以救治" : "可以训练") : !available ? (rescue ? "当前没有伤员" : "暂无可训练卡牌") : "金币不足";
        const detail = rescue ? `${injuredCount ? `救治全部${injuredCount}名伤员` : "当前没有伤员"}${run ? ` · 英雄生命 ${run.hp}/${run.maxHp}，同时恢复满生命` : ""}` : npc.detail;
        return { ...npc, count, countLabel: rescue ? "伤员人数" : "可训练卡牌数", ready, hint, detail };
      });
    },

    renderTraining() {
      this.screen = "training"; this.battle = null; this.activeNode = null;
      const [artWidth, artHeight] = TRAINING_ART_SIZE;
      const services = this.trainingServices();
      const actionAttrs = service => `data-action="${service.action}"${service.cardType ? ` data-card-type="${service.cardType}"` : ""} ${service.ready ? "" : "disabled"}`;
      const badge = service => service.count ? `<span class="camp-service-badge" title="${service.countLabel}">${service.count}</span>` : "";
      const avatar = service => {
        const [cx, cy, size] = service.crop;
        const scale = 72 / size;
        return `<span class="training-npc-avatar" style="background-image: url('${TRAINING_GROUNDS_ART}'); background-size: ${artWidth * scale}px ${artHeight * scale}px; background-position: ${-(cx - size / 2) * scale}px ${-(cy - size / 2) * scale}px" aria-hidden="true"></span>`;
      };
      const hotspots = services.map(service => {
        const [left, top, width, height] = service.hotspot;
        return `<button class="training-hotspot training-hotspot-${service.id}${service.ready ? " ready" : ""}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%" ${actionAttrs(service)} aria-label="${service.name}"><span class="training-hotspot-plate"><strong>${service.name}</strong>${badge(service)}</span></button>`;
      }).join("");
      const cards = services.map(service => `<button class="choice-btn camp-service training-npc-card${service.ready ? " ready" : ""}" ${actionAttrs(service)}>${avatar(service)}<span class="training-npc-copy"><span class="training-npc-name">${service.name}</span><q>${service.line}</q><strong>${service.title}</strong><small>${service.detail}</small><em class="camp-service-hint">${service.hint}</em></span>${badge(service)}</button>`).join("");
      const [wardenLeft, wardenTop, wardenWidth, wardenHeight] = PRISON_WARDEN.spot;
      const warden = `<button class="training-hotspot camp-warden ready" style="left:${wardenLeft}%;top:${wardenTop}%;width:${wardenWidth}%;height:${wardenHeight}%" data-action="prison-page" aria-label="${PRISON_WARDEN.name}：进入营地监狱"><img src="${PRISON_WARDEN.image}" alt="" draggable="false"><span class="training-hotspot-plate"><strong>${PRISON_WARDEN.name}</strong><small>营地监狱</small></span></button>`;
      this.frame(`<section class="screen training-screen">
        <div class="page-heading"><div><span class="eyebrow">营地</span><h2>队伍营地</h2></div><p>每项卡牌训练或救治服务均需30金币。阵亡的真实随从会进入伤员名单，救治后才能重新出战。</p></div>
        <div class="training-scene" style="background-image: url('${TRAINING_GROUNDS_ART}'); aspect-ratio: ${artWidth} / ${artHeight}">
          ${hotspots}${warden}
        </div>
        <div class="training-npc-grid">${cards}</div>
        <div class="menu-actions"><button class="secondary-btn" data-action="prison-page">🔒 进入营地监狱</button><button class="secondary-btn" data-action="home">返回主界面</button></div>
      </section>`);
    },

    wardenAvatar() {
      const [artWidth, artHeight] = PRISON_WARDEN.size;
      const [cx, cy, size] = PRISON_WARDEN.crop;
      const scale = 72 / size;
      return `<span class="training-npc-avatar prison-warden-avatar" style="background-image: url('${PRISON_WARDEN.image}'); background-size: ${artWidth * scale}px ${artHeight * scale}px; background-position: ${-(cx - size / 2) * scale}px ${-(cy - size / 2) * scale}px" aria-hidden="true"></span>`;
    },

    // 营地监狱：监狱场景图铺满整个界面作为背景，上面直接列出已押回的觉醒者头像。
    renderPrison() {
      this.screen = "prison"; this.battle = null; this.activeNode = null;
      const roster = CF.Adventure.prisonRoster();
      CF.SaveSystem.save();
      const inmates = roster.filter(prisoner => prisoner.captured);
      const R = CF.Restaurant;
      const tiles = inmates.map(prisoner => {
        const label = `<img src="${prisoner.portrait}" alt="${prisoner.name}" loading="lazy"><strong>${prisoner.name}</strong><small>第${prisoner.chapter}关${prisoner.type === "elite" ? " · 精英" : ""}</small>`;
        if (!prisoner.cardId) return `<div class="prison-inmate${prisoner.type === "elite" ? " elite" : ""}">${label}</div>`;
        const value = R.affinity(prisoner.key);
        const level = R.levelFor(value);
        return `<button class="prison-inmate visitable${prisoner.type === "elite" ? " elite" : ""}${level ? " bonded" : ""}" data-action="prison-visit" data-key="${prisoner.key}" aria-label="探望${prisoner.name}">${label}<span class="affinity-bar" aria-hidden="true"><span style="width:${value / R.MAX_AFFINITY * 100}%"></span></span><em>${level ? "💞 " : ""}${R.tier(value)} · ${value}</em>${R.fedToday(prisoner.key) ? '<em class="fed-today">🍽️ 今日已喂</em>' : ""}${this.laborBadge(prisoner)}</button>`;
      }).join("");
      // 各关最终首领卡：本关全部在押首领结缘后才能使用，等级取其中最低的一位。
      const bossRows = Object.values(CF.Adventure.bondCardOwners()).filter(owner => owner.boss && CF.SaveSystem.data.collection[owner.cardId]).map(owner => {
        const level = R.ownerLevel(owner);
        const card = CF.CARD_LIBRARY[owner.cardId];
        return `<li><strong>${owner.name} ·「${card.name}」</strong><span>${level ? `${R.levelName(level)} Lv${level}${R.bonusText(owner.cardId) ? ` · ${R.bonusText(owner.cardId)}` : ""}` : `未解锁 · 第${owner.chapter}关已结缘 ${R.bondedMembers(owner)}/${owner.members.length}`}</span></li>`;
      }).join("");
      this.frame(`<section class="screen prison-screen" style="background-image: url('${PRISON_ART}')">
        <div class="page-heading"><div><span class="eyebrow">营地</span><h2>营地监狱</h2></div><p>已关押 ${inmates.length}/${roster.length} 名觉醒者。各关的最终首领不在此列：森林狼王战死于密林，其余首领都在最后关头被同族救走。</p></div>
        <div class="prison-warden-intro">${this.wardenAvatar()}<div><strong>${PRISON_WARDEN.name}</strong><q>${PRISON_WARDEN.line}</q></div></div>
        <p class="prison-bond-hint">第二关起击败的首领，其首杀奖励卡要与牢里的本人结缘（好感度${R.BOND_THRESHOLD}）后才能出战；继续投喂，每${R.BOND_STEP}点好感升一级（最高${R.levelName(R.MAX_BOND_LEVEL)} Lv${R.MAX_BOND_LEVEL}），结缘后每高一级：随从+${CF.BOND_UNIT_ATTACK}攻击、+${CF.BOND_UNIT_HEALTH}生命，法术效果提升${CF.BOND_SPELL_LEVELS}级。最终首领的卡牌要等本关全部在押首领结缘才能使用，等级取其中最低的一位。每名首领每天（现实${CF.GameClock.DAY_MS / 60000}分钟）只能投喂一次，距离新的一天还有${CF.GameClock.untilNextDayLabel()}。背包里共有 ${R.totalFood()} 份食物。</p>
        ${this.laborPanel()}
        ${bossRows ? `<div class="prison-boss-cards"><h3>最终首领卡牌</h3><ul>${bossRows}</ul></div>` : ""}
        ${tiles ? `<div class="prison-roster">${tiles}</div>` : '<p class="prison-empty">牢房还空着。击败冒险中的首领，它们就会被押回这里。</p>'}
        <div class="menu-actions"><button class="primary-btn" data-action="race-stories">📖 族群往事</button><button class="secondary-btn" data-action="town-shop-page">前往城镇商店</button><button class="secondary-btn" data-action="training-page">返回队伍营地</button><button class="secondary-btn" data-action="home">返回主界面</button></div>
      </section>`);
    },

    // 派遣劳动：头像上的状态标记（在外干活 / 今日已干活）。
    laborBadge(prisoner) {
      const L = CF.Labor;
      const job = L.jobFor(prisoner.chapter);
      if (!job) return "";
      if (L.isAway(prisoner.key)) return `<em class="labor-away">${job.icon} ${job.name}中 · <span data-labor-timer="${prisoner.key}">${L.returnLabel(prisoner.key)}</span>后回营</em>`;
      if (L.workedToday(prisoner.key)) return '<em class="labor-done">✅ 今日已干活</em>';
      return "";
    },
    // 派遣劳动面板：各族工种与一键派遣。
    laborPanel() {
      const L = CF.Labor;
      const idle = L.idleCount();
      const away = L.awayCount();
      const jobs = Object.entries(L.JOBS).map(([chapter, job]) => `<li><strong>${job.icon} ${job.race}·${job.name}</strong><span>${job.detail} 结缘Lv1：${L.yieldText(L.yieldFor(Number(chapter), 1))}；誓约Lv5：${L.yieldText(L.yieldFor(Number(chapter), 5))}</span></li>`).join("");
      return `<div class="prison-labor"><div class="prison-labor-head"><div><h3>派遣劳动</h3><small>结缘后的首领每天可以派出去干一次活，${L.JOB_HOURS}小时（现实${L.JOB_HOURS}分钟）后带着收获回营；干活期间不能投喂。可派 ${idle} 名 · 在外 ${away} 名</small></div><button class="primary-btn" data-action="labor-dispatch-all" ${idle ? "" : "disabled"}>一键派遣（${idle}）</button></div><ul>${jobs}</ul></div>`;
    },
    // 首领回营：汇总收获提示，刷新顶栏与监狱。
    handleLaborReturns(results) {
      if (!results.length) return;
      const lines = results.map(result => `${result.name}${result.job.name}归来：${CF.Labor.yieldText(result.reward)}${result.reward.cardId ? `（${CF.CARD_LIBRARY[result.reward.cardId].name}${result.cardLevel ? ` 升至Lv${result.cardLevel.to}` : ""}）` : ""}`);
      this.toast(lines.length > 3 ? `${lines.length}名首领干活归来：${lines.slice(0, 2).join("；")}……` : lines.join("；"), "good");
      this.sfx("coins");
      if (this.screen === "prison" && !modalRoot.innerHTML) this.renderPrison();
      else this.refreshTopbar();
    },
    dispatchLabor(key, fromModal = false) {
      const result = CF.Labor.dispatch(key);
      if (!result.ok) return this.toast(result.reason, "bad");
      this.toast(`${result.prisoner.name}出发去${result.job.name}了，${CF.Labor.JOB_HOURS}小时后回营。`, "good");
      if (fromModal) this.openPrisonerVisit(key); else this.renderPrison();
    },
    dispatchAllLabor() {
      const sent = CF.Labor.dispatchAll();
      if (!sent.length) return this.toast("没有可以派遣的首领：需要已结缘、今天还没干过活且在牢里。", "bad");
      this.toast(`派出了${sent.length}名首领去干活，${CF.Labor.JOB_HOURS}小时后回营。`, "good");
      this.renderPrison();
    },

    // 卡牌的好感状态说明：未结缘时写明解锁条件，结缘后写明等级与加成。null 表示该卡不需要结缘。
    bondStatusText(cardId) {
      const R = CF.Restaurant;
      const owner = R.bondOwner(cardId);
      if (!owner) return null;
      const level = R.ownerLevel(owner);
      if (!level) return owner.boss
        ? `未结缘 · 需第${owner.chapter}关全部在押首领结缘（${R.bondedMembers(owner)}/${owner.members.length}）`
        : `未结缘 · 需在营地监狱与${owner.name}结缘（好感度 ${R.affinity(owner.key)}/${R.BOND_THRESHOLD}）`;
      const bonus = R.bonusText(cardId);
      return `${R.levelName(level)} Lv${level}${bonus ? ` · ${bonus}` : ""}`;
    },

    // 探望在押首领：查看对应卡牌与好感度，投喂食物。
    openPrisonerVisit(key) {
      const R = CF.Restaurant;
      const prisoner = CF.Adventure.prisonRoster().find(entry => entry.key === key);
      if (!prisoner?.captured || !prisoner.cardId) return;
      const value = R.affinity(key);
      const level = R.levelFor(value);
      const next = R.nextThreshold(value);
      const maxed = next === null;
      const fedToday = R.fedToday(key);
      const race = R.RACES[prisoner.chapter];
      const favorite = R.food(race?.favorite);
      const foods = R.FOODS.map(food => {
        const owned = R.foodCount(food.id);
        const isFavorite = race?.favorite === food.id;
        return `<button class="choice-btn feed-choice${isFavorite ? " favorite" : ""}" data-modal-action="feed-prisoner" data-key="${key}" data-food="${food.id}" ${owned && !maxed && !fedToday ? "" : "disabled"}><span class="restaurant-food-icon" aria-hidden="true">${food.icon}</span><strong>${food.name} ×${owned}</strong><small>好感 +${R.affinityGain(prisoner.chapter, food.id)}${isFavorite ? " · 最爱" : ""}</small></button>`;
      }).join("");
      const card = CF.CARD_LIBRARY[prisoner.cardId];
      const bonus = R.bonusText(prisoner.cardId);
      const nextBonus = maxed ? "" : R.bonusText(prisoner.cardId, level);
      const bossOwner = Object.values(CF.Adventure.bondCardOwners()).find(owner => owner.boss && owner.chapter === prisoner.chapter);
      const bossText = bossOwner ? this.bondStatusText(bossOwner.cardId) : "";
      const status = !level
        ? `结缘后才能使用卡牌「${card.name}」。`
        : `卡牌「${card.name}」已可出战${bonus ? `，当前加成 ${bonus}` : ""}。${maxed ? "好感度已达最高等级。" : `好感度达到${next}升为${R.levelName(level + 1)}，加成变为 ${nextBonus}。`}`;
      this.modal(`<span class="eyebrow">营地监狱 · 第${prisoner.chapter}关${prisoner.type === "elite" ? " · 精英" : ""}</span><h2>${prisoner.name}</h2>
        <div class="prisoner-visit"><img class="prisoner-visit-portrait" src="${prisoner.portrait}" alt="${prisoner.name}"><div class="prisoner-visit-info">
          <p>好感度：<strong>${R.tier(value)} · ${value}/${maxed ? R.MAX_AFFINITY : level ? next : R.BOND_THRESHOLD}</strong></p>
          <span class="affinity-bar large" aria-hidden="true"><span style="width:${value / R.MAX_AFFINITY * 100}%"></span></span>
          <p>${status}${race && !maxed ? `${race.name}最爱吃${favorite?.name || "美食"}，投喂时好感翻倍。` : ""}</p>
          ${this.visitStoryHTML(prisoner, level)}
          ${this.visitLaborHTML(prisoner)}
          ${bossText ? `<p class="prisoner-boss-hint">本关最终首领卡「${CF.CARD_LIBRARY[bossOwner.cardId].name}」：${bossText}</p>` : ""}
          ${this.cardPreview(prisoner.cardId, true)}
        </div></div>
        ${maxed ? "" : `<h3>投喂食物</h3>${fedToday ? `<p class="fed-today-hint">🍽️ ${prisoner.name}今天已经吃饱了，${CF.GameClock.untilNextDayLabel()}后的新一天才能再投喂。</p>` : '<p class="fed-today-hint">每名首领每天只能投喂一次，挑一道好菜吧。</p>'}<div class="choice-grid feed-grid">${foods}</div>${R.totalFood() ? "" : '<p class="empty-hint">背包里没有食物。去城镇商店的金杯餐馆买一些吧。</p>'}`}
        <div class="menu-actions">${maxed ? "" : '<button class="secondary-btn" data-modal-action="prison-to-restaurant">去金杯餐馆买食物</button>'}<button class="secondary-btn" data-modal-action="close-prison-visit">离开牢房</button></div>`, "training-modal");
    },

    // 好感剧情：当前等级的心声 + 挚友后解锁的个人往事。
    visitStoryHTML(prisoner, level) {
      const S = CF.BondStories;
      const voice = S.voice(prisoner.chapter, level);
      const story = S.personal(prisoner.name);
      const unlocked = S.personalUnlocked(prisoner.key);
      return `${voice ? `<p class="prisoner-voice">“${voice}”</p>` : ""}${story ? `<details class="prisoner-story"${unlocked ? " open" : ""}><summary>📜 ${prisoner.name}的往事${unlocked ? "" : `（好感达到${CF.Restaurant.levelName(S.PERSONAL_LEVEL)} Lv${S.PERSONAL_LEVEL}解锁）`}</summary>${unlocked ? `<p>${story}</p>` : '<p class="story-locked">它还不愿意对你说起过去。</p>'}</details>` : ""}`;
    },
    // 族群往事：每族5章，按本关全部在押首领的好感等级总和逐章解锁。
    openRaceStories() {
      const S = CF.BondStories;
      const sections = Object.entries(S.RACE_CHAPTERS).map(([chapter, book]) => {
        const total = S.chapterBondTotal(Number(chapter));
        const unlocked = S.unlockedChapters(Number(chapter));
        const items = book.chapters.map((entry, index) => index < unlocked
          ? `<article class="race-story"><h4>${entry.title}</h4><p>${entry.text}</p></article>`
          : `<article class="race-story locked"><h4>${entry.title}</h4><p class="story-locked">🔒 第${chapter}关在押首领的好感等级总和达到${S.CHAPTER_THRESHOLDS[index]}后解锁（当前${total}）。</p></article>`).join("");
        return `<section class="race-story-book"><h3>${book.race} ·《${book.title}》<small>${unlocked}/${book.chapters.length}</small></h3>${items}</section>`;
      }).join("");
      this.modal(`<span class="eyebrow">营地监狱 · 好感剧情</span><h2>📖 族群往事</h2><p>与同一关的在押首领结下的好感越深（全部首领的好感等级加在一起），它们就越愿意讲出本族的往事。每名首领到${CF.Restaurant.levelName(S.PERSONAL_LEVEL)} Lv${S.PERSONAL_LEVEL}时，还会讲出自己的故事。</p>${sections}<div class="menu-actions"><button class="secondary-btn" data-modal-action="close">合上</button></div>`, "training-modal");
    },

    visitLaborHTML(prisoner) {
      const L = CF.Labor;
      const job = L.jobFor(prisoner.chapter);
      if (!job) return "";
      const level = CF.Restaurant.bondLevel(prisoner.key);
      const status = L.isAway(prisoner.key) ? `正在外面${job.name}，${L.returnLabel(prisoner.key)}后带着收获回营。`
        : L.workedToday(prisoner.key) ? "今天已经干过活了，明天再派吧。"
        : !level ? "结缘后才肯替你干活。"
        : `派去${job.name}：${L.JOB_HOURS}小时后带回 ${L.yieldText(L.yieldFor(prisoner.chapter, level))}。`;
      const canGo = L.canDispatch(prisoner.key).ok;
      return `<p class="prisoner-labor">${job.icon} <strong>派遣劳动</strong> · ${status}${canGo ? ` <button class="mini-btn" data-modal-action="dispatch-prisoner" data-key="${prisoner.key}">派去${job.name}</button>` : ""}</p>`;
    },

    feedPrisonerAction(key, foodId) {
      const R = CF.Restaurant;
      const storiesBefore = CF.BondStories.unlockedCount();
      const result = R.feed(key, foodId);
      if (!result.ok) return this.toast(result.reason, "bad");
      this.sfx(result.leveledUp ? "cardLevelUp" : "purchase");
      const name = result.prisoner.name;
      const cardName = CF.CARD_LIBRARY[result.prisoner.cardId].name;
      this.toast(result.bonded
        ? `${name}：“${result.line}” 已结缘！卡牌「${cardName}」现在可以出战了。`
        : result.leveledUp
          ? `${name}：“${result.line}” 好感升至${R.levelName(result.levelTo)} Lv${result.levelTo}，「${cardName}」加成 ${R.bonusText(result.prisoner.cardId)}。`
          : `${name}：“${result.line}” 好感度 +${result.gained}${result.favorite ? "（最爱）" : ""}`, "good");
      if (result.bossCard) this.toast(result.bossCard.from
        ? `本关全部在押首领都已达到${R.levelName(result.bossCard.to)}，最终首领卡「${CF.CARD_LIBRARY[result.bossCard.cardId].name}」升至 Lv${result.bossCard.to}！`
        : `本关全部在押首领都已结缘，最终首领卡「${CF.CARD_LIBRARY[result.bossCard.cardId].name}」现在可以出战了！`, "good");
      if (CF.BondStories.unlockedCount() > storiesBefore) this.toast("📜 解锁了新的往事！可在探望界面或“族群往事”中阅读。", "good");
      this.openPrisonerVisit(key);
    },

    trainingCandidates(type) {
      const save = CF.SaveSystem.data;
      return Object.entries(save.collection)
        .filter(([id, owned]) => owned > 0 && CF.CARD_LIBRARY[id]?.type === type && (save.cardProgress[id]?.level || 1) < 5)
        .map(([id]) => id)
        .sort((left, right) => CF.CARD_LIBRARY[left].cost - CF.CARD_LIBRARY[right].cost || CF.CARD_LIBRARY[left].name.localeCompare(CF.CARD_LIBRARY[right].name, "zh-CN"));
    },

    openCardTraining(type) {
      const labels = { unit: "随从训练", spell: "法术训练", weapon: "武器训练" };
      if (!labels[type]) return;
      if (CF.SaveSystem.data.coins < 30) return this.toast("需要30金币。", "bad");
      const ids = this.trainingCandidates(type);
      if (!ids.length) return this.toast(`没有可训练的未满级${type === "unit" ? "随从" : type === "spell" ? "法术" : "武器"}牌。`, "bad");
      const choices = ids.map(id => {
        const card = CF.CARD_LIBRARY[id];
        const progress = CF.SaveSystem.data.cardProgress[id] || { level: 1, xp: 0 };
        const needed = progress.level * 3;
        const pct = Math.min(100, Math.round(progress.xp / needed * 100));
        return `<button class="choice-btn training-card-choice" data-modal-action="train-card" data-training-card="${id}" data-card="${id}" data-card-type="${type}">${this.cardPreview(id, true)}<strong data-training-stars>${"★".repeat(progress.level)}${"☆".repeat(5 - progress.level)}</strong><small data-training-xp>当前经验 ${progress.xp}/${needed}</small><span class="card-xp-progress training-xp-progress"><span data-training-xp-bar style="width:${pct}%"></span></span><em data-training-status>点击训练 · +2经验</em></button>`;
      }).join("");
      this.modal(`<div class="training-modal-heading" data-training-panel="${type}"><div><span class="eyebrow">队伍营地 · 每次30金币</span><h2>${labels[type]}</h2></div><span class="training-coin">${COIN_ICON}<strong data-training-coins>${CF.SaveSystem.data.coins}</strong></span></div><p>点击同一张卡即可连续训练。面板不会关闭，每次增加2点经验并立即更新等级和进度。</p><div class="choice-grid training-card-grid">${choices}</div><div class="menu-actions"><button class="secondary-btn" data-modal-action="close">完成训练</button></div>`, "training-modal");
    },

    refreshCardTraining(type, id) {
      const save = CF.SaveSystem.data;
      const progress = save.cardProgress[id] || { level: 1, xp: 0 };
      const maxed = progress.level >= 5;
      const needed = maxed ? 1 : progress.level * 3;
      const shownXp = maxed ? 1 : progress.xp;
      const pct = maxed ? 100 : Math.min(100, Math.round(shownXp / needed * 100));
      const choice = modalRoot.querySelector(`[data-training-card="${id}"]`);
      if (choice) {
        const stars = choice.querySelector("[data-training-stars]");
        const xp = choice.querySelector("[data-training-xp]");
        const bar = choice.querySelector("[data-training-xp-bar]");
        if (stars) stars.textContent = "★".repeat(progress.level) + "☆".repeat(5 - progress.level);
        if (xp) xp.textContent = maxed ? "经验已满" : `当前经验 ${shownXp}/${needed}`;
        if (bar) bar.style.width = `${pct}%`;
        choice.classList.toggle("maxed", maxed);
      }
      modalRoot.querySelector("[data-training-coins]")?.replaceChildren(document.createTextNode(String(save.coins)));
      app.querySelector("[data-resource-coins]")?.replaceChildren(document.createTextNode(String(save.coins)));
      modalRoot.querySelectorAll("[data-training-card]").forEach(button => {
        const cardId = button.dataset.card;
        const cardProgress = save.cardProgress[cardId] || { level: 1, xp: 0 };
        const cardMaxed = cardProgress.level >= 5;
        const status = button.querySelector("[data-training-status]");
        button.disabled = cardMaxed || save.coins < 30;
        if (status) status.textContent = cardMaxed ? "已满级" : save.coins < 30 ? "金币不足" : "点击训练 · +2经验";
      });
    },

    buyCardTraining(type, id) {
      const save = CF.SaveSystem.data;
      const card = CF.CARD_LIBRARY[id];
      if (!card || card.type !== type || !save.collection[id]) return this.toast("这张卡无法参加该项训练。", "bad");
      if ((save.cardProgress[id]?.level || 1) >= 5) return this.toast("这张卡已经满级。", "bad");
      if (save.coins < 30) return this.toast("需要30金币。", "bad");
      save.coins -= 30;
      const upgraded = CF.SaveSystem.addCardXp(id, 2);
      this.refreshCardTraining(type, id);
      this.toast(`${card.name}获得2点卡牌经验${upgraded ? `，升至Lv${upgraded.to}` : ""}。`, "good");
      this.sfx("coins");
      this.sfx(upgraded ? "cardLevelUp" : "train", 260);
    },

    rescueInjured() {
      const save = CF.SaveSystem.data;
      const run = CF.Adventure.current();
      const injuredCount = save.injuredCards?.length || 0;
      const heroNeedsHealing = Boolean(run && run.hp < run.maxHp);
      if (!injuredCount && !heroNeedsHealing) return this.toast("当前没有需要救治的伤员，英雄也已是满血。", "bad");
      if (save.coins < 30) return this.toast("需要30金币。", "bad");
      save.coins -= 30;
      const rescued = CF.SaveSystem.rescueInjuredCards();
      if (run) run.hp = run.maxHp;
      CF.SaveSystem.save();
      this.sfx("rescue");
      this.toast(`${rescued.length ? `已救治${rescued.length}名伤员` : "伤员名单为空"}${run ? "，英雄也已恢复满生命。" : "。"}`, "good");
      if (this.screen === "training") this.renderTraining(); else this.renderMenu();
    },

    renderTownShop() {
      this.screen = "town-shop"; this.battle = null; this.activeNode = null;
      const [artWidth, artHeight] = TOWN_ART_SIZE;
      const avatar = shop => {
        const [cx, cy, size] = shop.crop;
        const scale = 72 / size;
        return `<span class="training-npc-avatar" style="background-image: url('${TOWN_ART}'); background-size: ${artWidth * scale}px ${artHeight * scale}px; background-position: ${-(cx - size / 2) * scale}px ${-(cy - size / 2) * scale}px" aria-hidden="true"></span>`;
      };
      const actionAttrs = shop => shop.enabled ? `data-action="${shop.action}"` : "disabled";
      const hotspots = TOWN_SHOPS.map(shop => {
        const [left, top, width, height] = shop.hotspot;
        return `<button class="training-hotspot${shop.enabled ? " ready" : " locked"}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%" ${actionAttrs(shop)} aria-label="${shop.name}"><span class="training-hotspot-plate"><strong>${shop.name}</strong>${shop.enabled ? "" : "<small>敬请期待</small>"}</span></button>`;
      }).join("");
      const cards = TOWN_SHOPS.map(shop => `<button class="choice-btn camp-service training-npc-card${shop.enabled ? " ready" : " locked"}" ${actionAttrs(shop)}>${avatar(shop)}<span class="training-npc-copy"><span class="training-npc-name">${shop.name}</span><strong>${shop.title}</strong><small>${shop.detail}</small>${shop.enabled ? "" : '<em class="camp-service-hint">敬请期待</em>'}</span></button>`).join("");
      this.frame(`<section class="screen training-screen">
        <div class="page-heading"><div><span class="eyebrow">城镇</span><h2>城镇商店</h2></div><p>四家店铺各有分工：装备店可将战场缴获的粗糙武器、盔甲重锻为更高品质；金杯餐馆出售面粉与各式菜肴；赤龙客栈可以住一晚，直接进入第二天。</p></div>
        <div class="training-scene" style="background-image: url('${TOWN_ART}'); aspect-ratio: ${artWidth} / ${artHeight}">
          ${hotspots}
        </div>
        <div class="training-npc-grid">${cards}</div>
        <div class="menu-actions"><button class="secondary-btn" data-action="home">返回主界面</button></div>
      </section>`);
    },

    // 金杯餐馆：用金币购买食物，存进背包，再到营地监狱投喂在押首领。
    openRestaurant() {
      const R = CF.Restaurant;
      const rations = R.rations();
      const upkeep = R.upkeep();
      const favoriteOf = food => Object.values(R.RACES).filter(race => race.favorite === food.id).map(race => race.name);
      const rows = R.FOODS.map(food => {
        const fans = favoriteOf(food);
        const owned = R.foodCount(food.id);
        const canBuy = CF.SaveSystem.data.coins >= food.price;
        return `<div class="restaurant-food"><span class="restaurant-food-icon" aria-hidden="true">${food.icon}</span><div class="restaurant-food-copy"><strong>${food.name}</strong><small>${food.detail}</small><small class="restaurant-food-stats">好感 +${food.affinity}${fans.length ? ` · ${fans.join("、")}最爱（好感翻倍）` : ""} · 已有 ${owned} 份</small></div><button class="secondary-btn" data-modal-action="buy-food" data-food="${food.id}" ${canBuy ? "" : "disabled"}>${COIN_ICON}${food.price}</button></div>`;
      }).join("");
      this.modal(`<div class="page-heading"><div><span class="eyebrow">城镇商店 · 新开业</span><h2>金杯餐馆</h2></div><p>当前金币：<strong>${CF.SaveSystem.data.coins}</strong>。第二关起获得的首领卡牌，需要去营地监狱探望对应的在押首领，用美食把好感度提升到${R.BOND_THRESHOLD}、与其结缘后才能出战；继续投喂还能升级好感，让卡牌变得更强。</p></div>
        <div class="restaurant-flour"><span class="restaurant-food-icon" aria-hidden="true">${R.FLOUR.icon}</span><div class="restaurant-food-copy"><strong>${R.FLOUR.name} · 队伍口粮</strong><small>${R.FLOUR.detail}每袋${R.FLOUR.price}金币 = ${R.FLOUR.rations}份粮食。</small><small class="restaurant-food-stats">现有粮食 ${rations} 份 · 每场战斗消耗 ${upkeep.total} 份（出战随从 ${upkeep.units} + 在押犯人 ${upkeep.prisoners}）· 约够 ${upkeep.total ? Math.floor(rations / upkeep.total) : "∞"} 场</small></div><div class="restaurant-flour-buttons">${[1, 10, 50].map(bags => `<button class="secondary-btn" data-modal-action="buy-flour" data-bags="${bags}" ${CF.SaveSystem.data.coins >= bags * R.FLOUR.price ? "" : "disabled"}>×${bags} · ${COIN_ICON}${bags * R.FLOUR.price}</button>`).join("")}</div></div>
        <h3>投喂菜肴</h3>
        <div class="restaurant-menu">${rows}</div>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="restaurant-to-prison">带上食物去营地监狱</button><button class="secondary-btn" data-modal-action="close">离开</button></div>`, "training-modal");
    },

    // 赤龙客栈：花钱睡一晚，直接跳到第二天早上。
    openInn() {
      const clock = CF.GameClock;
      const daily = clock.dailyRations();
      const have = CF.Restaurant.rations();
      const canPay = CF.SaveSystem.data.coins >= clock.INN_PRICE;
      this.modal(`<div class="page-heading"><div><span class="eyebrow">城镇商店 · 新开业</span><h2>赤龙客栈</h2></div><p>现在是第${clock.day()}天 ${clock.timeLabel()}，自然等到第二天早上还要现实时间${clock.untilNextDayLabel()}。当前金币：<strong>${CF.SaveSystem.data.coins}</strong>。</p></div>
        <div class="inn-offer"><span class="restaurant-food-icon" aria-hidden="true">🛏️</span><div class="restaurant-food-copy"><strong>住一晚 · ${clock.INN_PRICE}金币</strong><small>一觉睡到第${clock.day() + 1}天早上6:00。可以避开今晚监狱里的夜间事件（已经发生、还没处理的除外）。和自然过一天一样：队伍吃掉${clock.DAILY_BATTLES}场战斗的口粮（${daily}份，现有${have}份${have < daily ? "，不够吃" : ""}），每名在押首领又可以投喂一次。</small></div></div>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="inn-sleep" ${canPay ? "" : "disabled"}>${canPay ? `付${clock.INN_PRICE}金币，睡到天亮` : `金币不足（需要${clock.INN_PRICE}）`}</button><button class="secondary-btn" data-modal-action="close">离开</button></div>`, "training-modal");
    },

    sleepAtInn() {
      const result = CF.GameClock.sleepAtInn();
      if (!result.ok) return this.toast(result.reason, "bad");
      this.closeModal();
      this.sfx("rescue");
      this.toast(`在赤龙客栈美美睡了一晚（-${result.cost}金币）。`, "good");
      this.handleNewDays([result.report]);
      this.handleLaborReturns(CF.Labor.collectReturned());
      this.renderTownShop();
    },

    buyFlourAction(bags) {
      const result = CF.Restaurant.buyFlour(bags);
      if (!result.ok) return this.toast(result.reason, "bad");
      this.sfx("purchase");
      this.toast(`购买了${result.bags}袋面粉，粮食+${result.rations}。`, "good");
      this.refreshTopbar();
      this.openRestaurant();
    },

    // 弹窗里花钱后同步刷新顶栏的金币与粮食。
    refreshTopbar() {
      const header = app.querySelector(".topbar");
      if (header) header.outerHTML = this.topbar(Boolean(header.querySelector('[data-action="home"]')));
    },

    buyFoodAction(foodId) {
      const result = CF.Restaurant.buyFood(foodId);
      if (!result.ok) return this.toast(result.reason, "bad");
      this.sfx("purchase");
      this.toast(`购买了1份${result.food.name}，已放进背包。`, "good");
      this.refreshTopbar();
      this.openRestaurant();
    },

    openEquipmentShop() {
      const inv = CF.SaveSystem.data.inventory;
      const rows = ["weapon", "armor"].map(kind => {
        const label = kind === "weapon" ? "武器" : "盔甲";
        const tiers = [1, 2, 3].map(tier => {
          const count = inv[`${kind}T${tier}`] || 0;
          const cost = tier * 30;
          const name = EQUIPMENT_TIER_NAMES[kind][tier];
          const nextName = EQUIPMENT_TIER_NAMES[kind][tier + 1];
          const disabled = count < 2 || CF.SaveSystem.data.coins < cost;
          return `<button class="choice-btn forge-choice" data-modal-action="forge-item" data-kind="${kind}" data-tier="${tier}" ${disabled ? "disabled" : ""}><strong class="${EQUIPMENT_TIER_QUALITY[tier]}">${name} ×${count}</strong><small>消耗2件 + ${cost}金币 → 1件<span class="${EQUIPMENT_TIER_QUALITY[tier + 1]}"> ${nextName}</span></small></button>`;
        }).join("");
        return `<div class="forge-section"><h3>${label}重锻</h3><div class="choice-grid">${tiers}</div></div>`;
      }).join("");
      this.modal(`<div class="page-heading"><div><span class="eyebrow">城镇商店</span><h2>铁匠·葛罗姆的装备店</h2></div><p>当前金币：${CF.SaveSystem.data.coins}。战场缴获的装备可在此合成为更高品质，消耗2件同品级材料与对应金币。</p></div>
        ${rows}
        <div class="menu-actions"><button class="secondary-btn" data-modal-action="close">离开</button></div>`, "training-modal");
    },

    forgeItemAction(kind, tier) {
      const ok = CF.SaveSystem.forgeItem(kind, tier);
      if (!ok) return this.toast("材料或金币不足。", "bad");
      this.toast(`重锻成功，获得1件${EQUIPMENT_TIER_NAMES[kind][tier + 1]}。`, "good");
      this.sfx("cardLevelUp");
      this.openEquipmentShop();
    },

    renderBackpack() {
      this.screen = "backpack"; this.battle = null; this.activeNode = null;
      const inv = CF.SaveSystem.data.inventory;
      const waterCount = inv.queenEssenceBlood || 0;
      const bloodAwakened = CF.SaveSystem.queenBloodAwakened();
      const gearRows = kind => [1, 2, 3, 4].map(tier => {
        const count = inv[`${kind}T${tier}`] || 0;
        if (!count) return "";
        const name = EQUIPMENT_TIER_NAMES[kind][tier];
        return `<div class="backpack-item"><strong class="${EQUIPMENT_TIER_QUALITY[tier]}">${name}</strong><small>拥有 ${count} 件 · +${tier}${kind === "weapon" ? "攻击" : "防御"}</small><button class="secondary-btn" data-action="equip-item" data-kind="${kind}" data-tier="${tier}">装备</button></div>`;
      }).join("");
      const heroWeapons = this.heroWeaponCardsHTML();
      const weaponItems = gearRows("weapon");
      const armorItems = gearRows("armor");
      const foodItems = CF.Restaurant.FOODS.filter(food => CF.Restaurant.foodCount(food.id)).map(food => `<div class="backpack-item"><strong>${food.icon} ${food.name}</strong><small>拥有 ${CF.Restaurant.foodCount(food.id)} 份 · 投喂在押首领好感 +${food.affinity}</small><button class="secondary-btn" data-action="prison-page">去探监</button></div>`).join("");
      this.frame(`<section class="screen">
        <div class="page-heading"><div><span class="eyebrow">随身</span><h2>背包</h2></div><p>战斗中缴获的道具与装备材料都会收进这里。</p></div>
        <div class="backpack-section"><h3>珍藏物品</h3><div class="backpack-item"><strong>女王精血</strong><small>拥有 ${waterCount} 瓶 · ${bloodAwakened ? "使用后永久+1最大生命" : "通关统领试炼第七关“魅魔女王的低语”、得到女王认可后，才能吸收精血的力量（永久+1最大生命）"}</small><button class="secondary-btn" data-action="use-queen-blood" ${waterCount && bloodAwakened ? "" : "disabled"}>${bloodAwakened ? "使用" : "尚未得到认可"}</button></div></div>
        <div class="backpack-section"><h3>餐馆食物</h3>${foodItems || '<p class="empty-hint">暂无食物。可在城镇商店的金杯餐馆购买，带去营地监狱投喂在押首领。</p>'}</div>
        <div class="backpack-section"><h3>英雄武器</h3>${heroWeapons ? `<p class="empty-hint">冒险与竞技场开战时自动装备所选武器：不占手牌、不耗法力、不消耗耐久，每回合都能攻击一次。</p><div class="hero-skill-collection hero-weapon-collection">${heroWeapons}</div>` : '<p class="empty-hint">尚未获得武器。击败第一关地图上的七位武器首领即可获得。</p>'}</div>
        <div class="backpack-section"><h3>武器材料</h3>${weaponItems || '<p class="empty-hint">暂无武器材料。</p>'}</div>
        <div class="backpack-section"><h3>盔甲材料</h3>${armorItems || '<p class="empty-hint">暂无盔甲材料。</p>'}</div>
        <div class="menu-actions"><button class="secondary-btn" data-action="home">返回主界面</button></div>
      </section>`);
    },

    useQueenBlood() {
      if (!CF.SaveSystem.queenBloodAwakened()) return this.toast("精血拒绝与你相融。先通关统领试炼第七关，得到女王的认可。", "bad");
      const ok = CF.SaveSystem.useQueenEssenceBlood();
      if (!ok) return this.toast("没有可用的女王精血。", "bad");
      CF.Adventure.syncHeroGrowth();
      this.toast("英雄最大生命值永久增加1点。", "good");
      this.sfx("heal");
      this.renderBackpack();
    },

    openEquipTargetPicker(slot, tier) {
      const save = CF.SaveSystem.data;
      const cardIds = Object.entries(save.collection).filter(([id, owned]) => owned > 0 && CF.CARD_LIBRARY[id]?.type === "unit").map(([id]) => id)
        .sort((left, right) => CF.CARD_LIBRARY[left].name.localeCompare(CF.CARD_LIBRARY[right].name, "zh-CN"));
      const cardRows = cardIds.map(id => {
        const cardTier = save.cardEquipment?.[id]?.[slot] || 0;
        return `<button class="choice-btn equip-target-choice" data-modal-action="equip-target" data-target="${id}" data-slot="${slot}" data-tier="${tier}">${this.cardPreview(id, true)}<small>当前：${cardTier ? EQUIPMENT_TIER_NAMES[slot][cardTier] : "未装备"}</small></button>`;
      }).join("");
      this.modal(`<div class="page-heading"><div><span class="eyebrow">装备${EQUIPMENT_TIER_NAMES[slot][tier]}</span><h2>选择装备的随从</h2></div><p>装备后原有的同槽位装备会退回背包。</p></div>
        <div class="choice-grid">${cardRows || '<p class="empty-hint">暂无已收集的随从卡牌。</p>'}</div>
        <div class="menu-actions"><button class="secondary-btn" data-modal-action="close">取消</button></div>`, "training-modal");
    },

    equipTarget(target, slot, tier) {
      const ok = CF.SaveSystem.equipCardItem(target, slot, tier);
      if (!ok) return this.toast("装备失败，材料不足。", "bad");
      this.toast("装备成功。", "good");
      this.sfx("cardAdd");
      this.closeModal();
      this.renderBackpack();
    },

    renderBook() {
      this.screen = "book"; this.battle = null; this.activeNode = null;
      const unlocked = CF.SaveSystem.data.notesUnlocked;
      const pages = CF.LORE_PAGES.map((page, index) => index >= unlocked
        ? `<div class="note-entry locked"><strong>???</strong><small>尚未发现</small></div>`
        : `<div class="note-entry"><strong>${page.title}</strong>${page.paragraphs.map(text => `<p>${text}</p>`).join("")}</div>`).join("");
      this.frame(`<section class="screen">
        <div class="page-heading"><div><span class="eyebrow">收藏</span><h2>笔记残页 · ${CF.LORE_BOOK_TITLE}</h2></div><p>已收集 ${unlocked}/${CF.LORE_PAGES.length} 页，每场战斗胜利后翻开第三张战利品牌，即可按顺序拾获下一页。</p></div>
        <div class="note-grid">${pages}</div>
        <div class="menu-actions"><button class="secondary-btn" data-action="home">返回主界面</button></div>
      </section>`);
    },

    renderHero() {
      this.screen = "hero";
      const hero = CF.SaveSystem.data.hero;
      const profile = heroProfile();
      const obtainableSkills = Object.values(CF.HERO_SKILLS).filter(skill => !CF.isSignatureSkill?.(skill.id) || skill.id === profile.skill);
      const unlockedSkills = obtainableSkills.filter(skill => hero.skillProgress?.[skill.id]?.unlocked);
      const equippedSkill = CF.HERO_SKILLS[hero.equippedSkill] || CF.HERO_SKILLS.slash;
      const skillCards = unlockedSkills.map(skill => {
        const progress = hero.skillProgress[skill.id];
        const maxed = progress.level >= 3;
        const needed = maxed ? 1 : progress.level * 3;
        const shownXp = maxed ? 1 : progress.xp;
        const skillPct = maxed ? 100 : Math.min(100, Math.round(shownXp / needed * 100));
        const equipped = skill.id === equippedSkill.id;
        return `<article class="hero-skill-card ${equipped ? "equipped" : ""}">
          <div class="hero-skill-card-title"><span>${skill.icon}</span><div><strong>${skill.name}</strong><small>Lv${progress.level} / 3</small></div></div>
          <p>${skill.playerDescription(progress.level)} 每回合可使用一次，消耗${skill.cost}点法力。</p>
          <div class="hero-skill-xp"><span>技能经验 ${maxed ? "已满" : `${progress.xp}/${needed}`}</span><div class="progress"><span style="width:${skillPct}%"></span></div></div>
          <button class="mini-btn" data-action="hero-skill-equip" data-skill="${skill.id}" ${equipped ? "disabled" : ""}>${equipped ? "当前装备" : "装备技能"}</button>
        </article>`;
      }).join("");
      const equippedWeaponId = CF.SaveSystem.equippedWeapon();
      const equippedWeapon = equippedWeaponId ? CF.CARD_LIBRARY[equippedWeaponId] : null;
      const weaponCards = this.heroWeaponCardsHTML();
      const levelCap = CF.SaveSystem.levelCap();
      const next = CF.HERO_LEVELS[Math.min(levelCap, hero.level + 1)];
      const currentFloor = CF.HERO_LEVELS[hero.level].xp;
      const pct = hero.level >= levelCap ? 100 : Math.max(0, Math.min(100, ((hero.xp - currentFloor) / (next.xp - currentFloor)) * 100));
      this.frame(`<section class="screen">
        <div class="page-heading"><div><span class="eyebrow">永久成长</span><h2>英雄档案</h2></div><p>战斗经验、法力和技能成长会跨冒险保存。</p></div>
        <div class="panel hero-sheet"><div class="big-crest hero-image"><img src="${profile.portrait}" alt="${profile.name}"></div><div>
          <h2>${profile.name} <small>${profile.title} · Lv${hero.level}</small></h2><p>${profile.bio}</p>
          <div class="stat-grid">
            <div class="stat-box"><small>生命上限</small><strong>♥ ${hero.maxHealth}</strong></div>
            <div class="stat-box"><small>最大法力</small><strong>✦ ${hero.maxMana}</strong></div>
            <div class="stat-box"><small>统领试炼</small><strong>⚔ ${CF.SaveSystem.data.commanderTrials.completed.length}/7</strong></div>
            <div class="stat-box"><small>英雄经验</small><strong>${hero.xp}</strong></div>
            <div class="stat-box"><small>牌组上限</small><strong>${CF.SaveSystem.deckLimit()}张</strong></div>
            <div class="stat-box"><small>已获技能</small><strong>${unlockedSkills.length}/${obtainableSkills.length}</strong></div>
            <div class="stat-box"><small>冒险通关</small><strong>${CF.SaveSystem.data.completedRuns}</strong></div>
            <div class="stat-box"><small>英雄武器</small><strong>🗡️ <span>${equippedWeapon ? equippedWeapon.name : "空手"}</span></strong></div>
          </div>
          <p>${hero.level >= levelCap ? `当前已达到第${levelCap >= 25 ? "五" : levelCap >= 20 ? "四" : levelCap >= 15 ? "三" : levelCap >= 10 ? "二" : "一"}关等级上限 Lv${levelCap}。` : `距离 Lv${hero.level + 1} 还需 ${next.xp - hero.xp} 经验`}</p><div class="progress"><span style="width:${pct}%"></span></div>
          <div class="skill-panel"><strong>${equippedSkill.icon} 当前英雄技能：${equippedSkill.name}</strong><p>技能最高3级。每赢得一场竞技场比赛，当前装备技能获得2点经验；夺冠还会获得决赛对手的英雄技能。</p></div>
        </div></div>
        <div class="hero-skills-heading"><div><span class="eyebrow">竞技场传承</span><h2>英雄技能</h2></div><p>出战竞技场前先装备想要培养的技能。</p></div>
        <div class="hero-skill-collection">${skillCards}</div>
        <div class="hero-skills-heading"><div><span class="eyebrow">随身装备</span><h2>英雄武器</h2></div><p>冒险与竞技场开战时自动装备所选武器：不占手牌、不耗法力、不消耗耐久，每回合都能攻击一次。</p></div>
        <div class="hero-skill-collection hero-weapon-collection">${weaponCards || '<p class="empty-hint">尚未获得武器。击败第一关地图上的七位武器首领即可获得。</p>'}</div>
      </section>`);
    },

    // 英雄档案与背包共用的武器卡片：已获得的首杀武器，可装备或卸下。
    heroWeaponCardsHTML() {
      const data = CF.SaveSystem.data;
      const equippedId = CF.SaveSystem.equippedWeapon();
      return CF.SaveSystem.ownedWeapons().map(id => {
        const card = CF.getCard(id, data.cardProgress[id]);
        const equipped = id === equippedId;
        return `<article class="hero-skill-card hero-weapon-card ${equipped ? "equipped" : ""}">
          <div class="hero-skill-card-title"><span>${card.image ? `<img src="${card.image}" alt="${card.name}">` : card.icon}</span><div><strong>${card.name}</strong><small>Lv${card.level} / 5</small></div></div>
          <p>${card.description}</p>
          <div class="hero-weapon-stats"><b>⚔ ${card.attack}</b><small>${card.combatStyle === "ranged" ? "远程武器 · 无反击" : "近战武器 · 会反击"}</small></div>
          ${equipped
            ? `<button class="mini-btn" data-action="hero-weapon-equip" data-weapon="">卸下武器</button>`
            : `<button class="mini-btn" data-action="hero-weapon-equip" data-weapon="${id}">装备武器</button>`}
        </article>`;
      }).join("");
    },

    groupedDeck() {
      const counts = {};
      CF.SaveSystem.data.deck.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      return counts;
    },
    renderDeck() {
      this.screen = "deck";
      const data = CF.SaveSystem.data;
      const deckLimit = CF.SaveSystem.deckLimit();
      const deckCounts = this.groupedDeck();
      const deckRows = Object.entries(deckCounts).map(([id, count]) => {
        const card = CF.getCard(id, data.cardProgress[id], CF.Restaurant.cardBondBonus(id));
        const injured = card.type === "unit" && data.injuredCards?.includes(id);
        const bondStatus = this.bondStatusText(id);
        const bondBadge = bondStatus ? `<b class="injured-badge bond-badge${CF.Restaurant.isCardBondLocked(id) ? "" : " bonded"}">${CF.Restaurant.isCardBondLocked(id) ? "未结缘" : `💞${CF.Restaurant.levelName(CF.Restaurant.cardBondLevel(id))}`}</b>` : "";
        const bondLocked = CF.Restaurant.isCardBondLocked(id);
        const style = card.type === "unit" ? (card.role === "healer" ? "治疗" : (card.combatStyle === "ranged" ? "远程" : "近战")) : card.type === "weapon" ? `${card.combatStyle === "ranged" ? "远程" : "近战"}武器` : "法术";
        const thumb = card.image ? `<img class="deck-thumb" src="${card.image}" alt="" loading="lazy">` : `<span class="deck-icon">${card.icon}</span>`;
        const cardEquip = data.cardEquipment?.[id] || {};
        const unitStats = `${card.attack}${CF.equipDotHTML("weapon", cardEquip.weapon)}/${CF.equipDotHTML("armor", cardEquip.armor)}${card.health}`;
        return `<div class="deck-row ${injured || bondLocked ? "injured-card" : ""}" data-action="inspect-card" data-card="${id}" role="button" tabindex="0" aria-label="查看${card.name}完整卡牌"><span class="cost">${card.cost}</span><div class="deck-card-info"><strong>${thumb}<span>${card.name} ×${count}${injured ? '<b class="injured-badge">负伤</b>' : ""}${bondBadge}</span></strong><small>Lv${card.level} · ${style} · ${card.keywords.join("、") || "无关键词"}${injured || bondLocked ? " · 无法出战" : ""}${bondStatus ? ` · ${bondStatus}` : ""}</small></div><small class="deck-card-details">${card.type === "unit" ? unitStats : card.type === "weapon" ? `${card.attack}攻/${card.durability}耐久 · ${card.description}` : card.description}</small><button class="mini-btn" data-action="deck-remove" data-card="${id}">移除</button></div>`;
      }).join("");
      const availableCollection = Object.entries(data.collection).filter(([id, owned]) => owned > 0 && !deckCounts[id])
        .filter(([id]) => CF.CARD_LIBRARY[id]?.type !== "weapon"); // 武器是英雄装备，在英雄档案中选择，不进牌组
      const collectionRows = availableCollection.map(([id, owned]) => {
        const card = CF.getCard(id, data.cardProgress[id], CF.Restaurant.cardBondBonus(id));
        const injured = card.type === "unit" && data.injuredCards?.includes(id);
        const bondStatus = this.bondStatusText(id);
        const bondBadge = bondStatus ? `<b class="injured-badge bond-badge${CF.Restaurant.isCardBondLocked(id) ? "" : " bonded"}">${CF.Restaurant.isCardBondLocked(id) ? "未结缘" : `💞${CF.Restaurant.levelName(CF.Restaurant.cardBondLevel(id))}`}</b>` : "";
        const bondOwner = CF.Restaurant.isCardBondLocked(id) ? CF.Restaurant.bondOwner(id) : null;
        const inDeck = deckCounts[id] || 0;
        const canAdd = data.deck.length < deckLimit && inDeck < 1 && !bondOwner;
        const style = card.type === "unit" ? (card.role === "healer" ? "治疗" : (card.combatStyle === "ranged" ? "远程" : "近战")) : card.type === "weapon" ? `${card.combatStyle === "ranged" ? "远程" : "近战"}武器` : "法术";
        const thumb = card.image ? `<img class="deck-thumb" src="${card.image}" alt="" loading="lazy">` : `<span class="deck-icon">${card.icon}</span>`;
        return `<div class="deck-row ${injured || bondOwner ? "injured-card" : ""}" data-action="inspect-card" data-card="${id}" role="button" tabindex="0" aria-label="查看${card.name}完整卡牌"><span class="cost">${card.cost}</span><div class="deck-card-info"><strong>${thumb}<span>${card.name}${injured ? '<b class="injured-badge">负伤</b>' : ""}${bondBadge}</span></strong><small>拥有 ${owned} · 卡组 ${inDeck}/1 · ${card.rarity}${bondStatus ? ` · ${bondStatus}` : ""}</small></div><small class="deck-card-details">Lv${card.level} · ${style} · ${data.cardProgress[id].xp}经验${injured ? " · 无法出战" : ""}</small><button class="mini-btn" data-action="deck-add" data-card="${id}" ${canAdd ? "" : "disabled"}>添加</button></div>`;
      }).join("");
      const duplicateCount = data.deck.length - new Set(data.deck).size;
      const valid = data.deck.length >= 24 && data.deck.length <= deckLimit && duplicateCount === 0;
      const validation = duplicateCount > 0 ? `卡组中有${duplicateCount}张重复卡牌，请保持每张卡只有1张。` : data.deck.length < 24 ? `至少还需加入 ${24 - data.deck.length} 张卡牌。` : data.deck.length > deckLimit ? `需要移除 ${data.deck.length - deckLimit} 张卡牌。` : `✓ 卡组数量正确，可携带24–${deckLimit}张牌。`;
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">整备</span><h2>卡组编辑</h2></div><p>基础牌组为24张；英雄5级后每升一级，牌组上限增加1张。第二关起获得的首领卡牌需在营地监狱与对应首领结缘后才能出战，好感等级越高卡牌越强。</p></div>
        <div class="deck-layout"><div class="panel deck-column"><h3><span>当前卡组</span><span>${data.deck.length}/${deckLimit}</span></h3><div class="deck-list">${deckRows || "卡组为空"}</div><p class="validation ${valid ? "ok" : ""}">${validation}</p></div>
        <div class="panel deck-column"><h3><span>卡牌收藏</span><span>${availableCollection.length}张可加入</span></h3><div class="deck-list">${collectionRows || "所有收藏卡牌都已加入当前卡组"}</div></div></div>
      </section>`);
    },

    openCardDetail(cardId) {
      const baseCard = CF.CARD_LIBRARY[cardId];
      if (!baseCard || !CF.SaveSystem.data.collection[cardId]) return;
      const progress = CF.SaveSystem.data.cardProgress[cardId] || { level: 1, xp: 0 };
      const card = CF.getCard(cardId, progress, CF.Restaurant.cardBondBonus(cardId));
      const injured = card.type === "unit" && CF.SaveSystem.data.injuredCards?.includes(cardId);
      const bondStatus = this.bondStatusText(cardId);
      const typeClass = card.type === "spell" ? "spell" : card.type === "weapon" ? "weapon" : "unit";
      const typeLabel = card.type === "spell" ? "法术" : card.type === "weapon" ? "武器" : "随从";
      const combatLabel = card.type === "unit"
        ? (card.role === "healer" ? "治疗 · 无法攻击" : card.combatStyle === "ranged" ? "远程 · 无反击" : "近战 · 会反击")
        : card.type === "weapon" ? (card.combatStyle === "ranged" ? "远程武器 · 无反击" : "近战武器 · 会反击") : "法术牌";
      const stars = "★".repeat(card.level) + "☆".repeat(5 - card.level);
      const keywords = card.keywords.length ? card.keywords.join(" · ") : (card.type === "spell" ? "即时生效" : "无额外关键词");
      const cardEquip = CF.SaveSystem.data.cardEquipment?.[cardId] || {};
      const stats = card.type === "unit"
        ? `<span class="inspect-attack" aria-label="攻击力${card.attack}">⚔<b>${card.attack}</b>${CF.equipDotHTML("weapon", cardEquip.weapon)}</span><span class="inspect-health" aria-label="生命值${card.health}">${CF.equipDotHTML("armor", cardEquip.armor)}♥<b>${card.health}</b></span>`
        : card.type === "weapon"
          ? `<span class="inspect-attack" aria-label="攻击力${card.attack}">⚔<b>${card.attack}</b></span><span class="inspect-durability" aria-label="耐久${card.durability}">◆<b>${card.durability}</b></span>`
          : `<span class="inspect-spell-seal" aria-hidden="true">✦</span>`;
      this.modal(`<button class="card-inspect-close" data-modal-action="close" aria-label="关闭卡牌预览" title="关闭">×</button>
        <article class="card-inspect-card ${typeClass} ${injured ? "injured" : ""}" aria-label="${card.name}完整卡牌">
          <div class="card-inspect-art ${card.image ? "has-image" : ""}">${card.image ? `<img src="${card.image}" alt="${card.name}">` : `<span>${card.icon}</span>`}</div>
          <div class="card-inspect-cost" aria-label="${card.cost}点费用">${card.cost}</div>
          <div class="card-inspect-rarity">${card.rarity}</div>
          <header class="card-inspect-title"><h2>${card.name}</h2><div class="card-inspect-stars" aria-label="等级${card.level}">${stars}</div></header>
          ${injured ? '<div class="card-inspect-injured">负伤 · 无法出战</div>' : ""}
          ${bondStatus ? `<div class="card-inspect-injured${CF.Restaurant.isCardBondLocked(cardId) ? "" : " card-inspect-bond"}">${bondStatus}</div>` : ""}
          <div class="card-inspect-copy"><span>${typeLabel} · ${combatLabel}</span><p>${card.description}</p><small>${keywords}</small></div>
          <footer class="card-inspect-stats">${stats}</footer>
        </article>
        <p class="card-inspect-hint">点击右上角 ×、空白处或按 Esc 返回卡组编辑</p>`, "card-inspect-modal");
      modalRoot.querySelector(".card-inspect-close")?.focus();
    },

    renderSettings(returnScreen = "menu") {
      this.settingsReturnScreen = returnScreen;
      this.screen = "settings";
      const sound = CF.SoundFX;
      const soundVolume = Math.round((sound?.volume ?? 0.58) * 100);
      const music = CF.Music;
      const musicVolume = Math.round((music?.volume ?? 0.5) * 100);
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">系统</span><h2>设置</h2></div></div>
        <div class="settings-stack">
          <div class="panel language-settings"><div><h3>语言</h3><p>切换游戏界面显示的语言。</p></div>${CF.I18n.selectorHTML()}</div>
          <div class="panel sound-settings"><div><h3>背景音乐</h3><p>主界面、冒险战斗、竞技场与统领试炼各有一首原创程序化配乐。</p></div>
            <div class="sound-actions"><button class="secondary-btn" data-action="music-toggle">${music?.muted ? "开启音乐" : "关闭音乐"}</button></div>
            <label class="sound-volume"><span>音量 <output data-music-output>${musicVolume}%</output></span><input type="range" min="0" max="100" value="${musicVolume}" data-music-volume ${music?.muted ? "disabled" : ""}></label>
          </div>
          <div class="panel sound-settings"><div><h3>战斗音效</h3><p>近战、远程、法术、死亡和Boss技能均使用不同的原创程序化音效。</p></div>
            <div class="sound-actions"><button class="secondary-btn" data-action="sound-toggle">${sound?.muted ? "开启音效" : "关闭音效"}</button><button class="mini-btn" data-action="sound-preview" ${sound?.muted ? "disabled" : ""}>试听</button></div>
            <label class="sound-volume"><span>音量 <output data-sound-output>${soundVolume}%</output></span><input type="range" min="0" max="100" value="${soundVolume}" data-sound-volume ${sound?.muted ? "disabled" : ""}></label>
          </div>
          <div class="panel"><h3>本地存档</h3><p>英雄等级、经验、法力、金币、收藏、卡组和当前冒险均保存在此浏览器的 localStorage 中。</p><p>清理浏览器数据会删除存档，请在“存档”页面定期导出备份。</p>
          <p>调试面板默认隐藏，按 <strong>F2</strong> 可切换。</p><div class="menu-actions"><button class="secondary-btn" data-action="prepare-chapter5-finale">第五关：直达最终首领</button><button class="danger-btn" data-action="reset-save">删除存档</button></div></div>
        </div></section>`);
    },

    validateDeck() {
      const count = CF.SaveSystem.data.deck.length;
      const limit = CF.SaveSystem.deckLimit();
      if (count < 24 || count > limit) { this.toast(`卡组必须包含24至${limit}张牌。`, "bad"); return false; }
      if (new Set(CF.SaveSystem.data.deck).size !== count) { this.toast("卡组不能包含重复卡牌。", "bad"); return false; }
      return true;
    },
    requestNewRun() {
      if (!this.validateDeck()) return;
      const run = CF.Adventure.current();
      if (run) {
        this.modal(`<h2>重新开始第${run.chapter}关？</h2><p>只会清空第${run.chapter}关的节点记录与本关生命状态，其他关卡的独立存档不会受影响。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-new-run">重开本关</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
      } else this.startNewRun();
    },
    startNewRun() { CF.Adventure.restart(CF.SaveSystem.data.activeChapter); this.closeModal(); this.renderMap(); },
    renderLevelSelect() {
      this.screen = "levels"; this.battle = null;
      const unlockedChapterTwo = CF.SaveSystem.data.completedRuns >= 1;
      const unlockedChapterThree = CF.SaveSystem.data.completedRuns >= 2;
      const unlockedChapterFour = CF.SaveSystem.data.completedRuns >= 3;
      const unlockedChapterFive = CF.SaveSystem.data.completedRuns >= 4;
      const chapterOneProgress = CF.Adventure.chapterProgress(1);
      const chapterTwoProgress = CF.Adventure.chapterProgress(2);
      const chapterThreeProgress = CF.Adventure.chapterProgress(3);
      const chapterFourProgress = CF.Adventure.chapterProgress(4);
      const chapterFiveProgress = CF.Adventure.chapterProgress(5);
      const progressBadge = progress => `<span class="chapter-save-badge">${progress.cleared ? "✓ 已通关" : progress.exists ? `存档 ${progress.completed}/${progress.total}` : "尚未开始"}</span>`;
      const layout = this.levelLayout();
      const pos = key => `--level-x:${layout[key][0]}%;--level-y:${layout[key][1]}%`;
      const lockAttr = unlocked => (unlocked || this.levelLayoutEdit ? "" : "disabled");
      const editingClass = this.levelLayoutEdit ? " layout-editing" : "";
      this.frame(`<section class="screen level-select-screen"><div class="page-heading"><div><span class="eyebrow">远征世界</span><h2>选择关卡</h2></div><p>选择最终 Boss 的头像进入对应关卡。依次通关会开放新的地区与英雄等级上限。</p></div>
        <div class="level-layout-tools">${this.levelLayoutEdit
          ? `<span class="level-layout-help">拖动头像调整位置，锁定关卡也可以先排布。</span><button class="primary-btn" data-action="save-level-layout">保存布局</button><button class="secondary-btn" data-action="reset-level-layout">恢复默认</button><button class="secondary-btn" data-action="cancel-level-layout">取消</button>`
          : `<button class="secondary-btn" data-action="toggle-level-layout">调整地图布局</button>`}</div>
        <div class="level-map-board${editingClass}" aria-label="${this.levelLayoutEdit ? "拖动关卡头像调整地图布局" : "游戏关卡选择地图"}">
          <div class="level-map-shade"></div>
          <button class="level-node level-node-one available" data-layout-key="chapter-1" data-action="level-select-node" data-chapter="1" style="${pos("chapter-1")}"><span class="level-portrait"><img src="assets/enemies/forest-wolf-king.png" alt="森林狼王"></span><strong>第一关</strong><small>迷雾森林 · 森林狼王</small>${progressBadge(chapterOneProgress)}</button>
          <button class="level-node level-node-two ${unlockedChapterTwo ? "available" : "locked"}" data-layout-key="chapter-2" data-action="level-select-node" data-chapter="2" style="${pos("chapter-2")}" ${lockAttr(unlockedChapterTwo)}><span class="level-portrait"><img src="assets/enemies/goblin-queen.png" alt="翠影女王"></span><strong>第二关</strong><small>${unlockedChapterTwo ? "哥布林王庭 · 翠影女王" : "完成第一关后解锁"}</small>${unlockedChapterTwo ? progressBadge(chapterTwoProgress) : ""}</button>
          <button class="level-node level-node-three ${unlockedChapterThree ? "available" : "locked"}" data-layout-key="chapter-3" data-action="level-select-node" data-chapter="3" style="${pos("chapter-3")}" ${lockAttr(unlockedChapterThree)}><span class="level-portrait"><img src="assets/enemies/chapter3/bosses/bear-boss-20.png" alt="丰穗战母·布蕾娅"></span><strong>第三关</strong><small>${unlockedChapterThree ? "王城南部农场 · 丰穗战母" : "完成第二关后解锁"}</small>${unlockedChapterThree ? progressBadge(chapterThreeProgress) : ""}</button>
          <button class="level-node level-node-four ${unlockedChapterFour ? "available" : "locked"}" data-layout-key="chapter-4" data-action="level-select-node" data-chapter="4" style="${pos("chapter-4")}" ${lockAttr(unlockedChapterFour)}><span class="level-portrait"><img src="assets/enemies/chapter4/bosses/slime-boss-20.png" alt="碧露大贤者·涅芙莉"></span><strong>第四关</strong><small>${unlockedChapterFour ? "东部梦幻森林 · 碧露大贤者" : "完成第三关后解锁"}</small>${unlockedChapterFour ? progressBadge(chapterFourProgress) : ""}</button>
          <button class="level-node level-node-five ${unlockedChapterFive ? "available" : "locked"}" data-layout-key="chapter-5" data-action="level-select-node" data-chapter="5" style="${pos("chapter-5")}" ${lockAttr(unlockedChapterFive)}><span class="level-portrait"><img src="assets/enemies/chapter5/bosses/wolf-matriarch.png" alt="银灰狼女猎手"></span><strong>第五关</strong><small>${unlockedChapterFive ? "千枝城古城废墟 · 银灰狼女猎手" : "完成第四关后解锁"}</small>${unlockedChapterFive ? progressBadge(chapterFiveProgress) : ""}</button>
          <button class="level-node arena-world-node available" data-layout-key="arena" data-action="arena-open" style="${pos("arena")}"><span class="arena-map-icon">🏆</span><strong>王都竞技场</strong><small>64位英雄淘汰赛</small></button>
          <button class="level-node trial-world-node available" data-layout-key="trials" data-action="trials-open" style="${pos("trials")}"><span class="level-portrait"><img src="assets/trials/harold-brian.png" alt="统领试炼"></span><strong>海港 · 统领试炼</strong><small>7位归乡之战老兵的指点</small></button>
        </div><div class="menu-actions"><button class="secondary-btn" data-action="home">返回主界面</button></div></section>`);
    },
    renderTrials() {
      this.screen = "trials"; this.battle = null;
      const completed = CF.SaveSystem.data.commanderTrials.completed;
      const hasWater = CF.SaveSystem.data.items.queenBloodRiverWater;
      const nodes = CF.Trials.list.map(trial => {
        const cleared = completed.includes(trial.id);
        const unlocked = CF.Trials.isUnlocked(trial.id);
        const itemLock = trial.id === 7 && !hasWater;
        return `<article class="trial-card ${cleared ? "cleared" : unlocked ? "available" : "locked"}">
          <span class="trial-number">${trial.id}</span><img src="${trial.portrait}" alt="${trial.name}"><div><small>第${trial.id}关 · ${trial.title}</small><h3>${trial.name}</h3><p>${trial.summary}</p><span class="trial-status">${cleared ? "✓ 已通关" : itemLock ? "需要：含有女王血液的河水" : unlocked ? "可挑战 · 首次通关最大法力 +1" : "先完成上一关"}</span></div>
          <button class="${unlocked ? "primary-btn" : "secondary-btn"}" data-action="trial-start" data-trial="${trial.id}" ${unlocked ? "" : "disabled"}>${cleared ? "再次挑战" : "开始试炼"}</button>
        </article>`;
      }).join("");
      this.frame(`<section class="screen trials-screen"><div class="page-heading"><div><span class="eyebrow">海港城市 · 老兵训练场</span><h2>统领试炼</h2></div><p>已通过 ${completed.length}/7 · 当前最大法力 ${CF.SaveSystem.data.hero.maxMana}</p></div>
        <div class="trial-lobby"><div class="trial-lobby-copy"><h2>归乡之战幸存者的七堂课</h2><p>每关首次通关永久增加1点最大法力；没有碎片，也没有总上限。重复挑战不会重复获得法力。</p>${hasWater ? `<div class="quest-item-chip"><img src="assets/trials/queen-blood-water.png" alt="含有女王血液的河水"><span><strong>含有女王血液的河水</strong><small>第七关“女王的低语”已经可以进入</small></span></div>` : `<p class="trial-warning">击败第一关第一个Boss，取得女王血河水后，才能进入最终试炼。</p>`}</div></div>
        <div class="trial-list">${nodes}</div><div class="menu-actions"><button class="secondary-btn" data-action="level-select">返回世界地图</button></div></section>`);
    },
    startTrialBattle(id) {
      const trial = CF.Trials.byId(id);
      if (!trial || !CF.Trials.isUnlocked(id)) return this.toast("这项试炼尚未解锁。", "bad");
      this.screen = "battle";
      this.battle = new CF.Battle(CF.Trials.enemy(id), {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: battle => this.handleTrialVictory(battle, id),
        onDefeat: battle => this.handleTrialDefeat(battle, id)
      });
      this.battle.startPlayerTurn(true);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },
    handleTrialVictory(battle, id) {
      const trial = CF.Trials.byId(id);
      const result = CF.SaveSystem.completeCommanderTrial(id);
      this.battle = null;
      this.sfx("trialClear");
      if (result.firstClear) this.sfx("manaUp", 1300);
      this.modal(`<span class="eyebrow">统领试炼完成</span><h2>${trial.title}的认可</h2><div class="trial-result"><img src="${trial.portrait}" alt="${trial.name}"><div><strong>${trial.name}</strong><p>${result.firstClear ? `首次通关，最大法力永久提高至 ${result.maxMana}。` : "你再次完成了这项试炼；首次通关奖励已经领取。"}</p>${result.firstClear && result.id === 7 ? "<p>女王认可了你。从此你走在魔族与人族之间——背包中的女王精血已可以吸收，每瓶永久+1最大生命。</p>" : ""}</div></div><button class="primary-btn" data-modal-action="trial-continue">返回训练场</button>`);
    },
    handleTrialDefeat(battle, id) {
      const trial = CF.Trials.byId(id);
      this.battle = null;
      this.modal(`<span class="eyebrow">试炼暂未通过</span><h2>${trial.name}收起了武器</h2><p>试炼不会消耗远征生命或地图进度。调整战术后可以立即重试。</p><button class="primary-btn" data-modal-action="trial-continue">返回训练场</button>`);
    },
    selectChapter(chapter) {
      const selectedChapter = Number(chapter);
      if (selectedChapter === 2 && CF.SaveSystem.data.completedRuns < 1) return this.toast("请先击败森林狼王解锁第二关。", "bad");
      if (selectedChapter === 3 && CF.SaveSystem.data.completedRuns < 2) return this.toast("请先击败翠影女王解锁第三关。", "bad");
      if (selectedChapter === 4 && CF.SaveSystem.data.completedRuns < 3) return this.toast("请先击败丰穗战母解锁第四关。", "bad");
      if (selectedChapter === 5 && CF.SaveSystem.data.completedRuns < 4) return this.toast("请先击败碧露大贤者解锁第五关。", "bad");
      if (!this.validateDeck()) return;
      CF.Adventure.activate(selectedChapter); this.sfx("march"); this.renderMap();
    },
    startSelectedChapter() {
      const chapter = this.pendingChapter;
      this.pendingChapter = null;
      this.closeModal();
      if (!chapter || !this.validateDeck()) return;
      CF.Adventure.activate(chapter); this.renderMap();
    },
    arenaEntrantHTML(id, match) {
      if (id === null || id === undefined) return `<div class="arena-team empty"><span class="arena-team-avatar">?</span><span>等待晋级</span></div>`;
      const hero = CF.Arena.participant(id);
      if (!hero) return `<div class="arena-team empty"><span class="arena-team-avatar">?</span><span>未知选手</span></div>`;
      const winner = match.winner === id;
      const loser = match.loser === id;
      return `<div class="arena-team ${hero.player ? "player" : ""} ${winner ? "winner" : loser ? "loser" : ""}">
        <img class="arena-team-avatar" src="${hero.portrait}" alt="${hero.name}" loading="lazy"><span title="${hero.name}">${hero.name}</span>${winner ? '<b title="晋级">✓</b>' : ""}
      </div>`;
    },
    arenaBracketHTML(tournament) {
      const baseGap = 68;
      const headerHeight = 70;
      const columnStep = 238;
      const cardWidth = 190;
      const boardWidth = columnStep * 5 + cardWidth + 24;
      const boardHeight = headerHeight + baseGap * 32 + 34;
      const centerY = (round, index) => headerHeight + (index + .5) * baseGap * (2 ** round);
      const connectors = tournament.bracket.rounds.slice(1).flatMap((round, roundOffset) => {
        const roundIndex = roundOffset + 1;
        return round.map((match, index) => {
          const sourceX = (roundIndex - 1) * columnStep + cardWidth;
          const targetX = roundIndex * columnStep;
          const bendX = sourceX + (targetX - sourceX) / 2;
          const upperY = centerY(roundIndex - 1, index * 2);
          const lowerY = centerY(roundIndex - 1, index * 2 + 1);
          const targetY = centerY(roundIndex, index);
          const active = match.entrants.some(id => id !== null);
          return `<path class="arena-bracket-line ${active ? "active" : ""}" d="M${sourceX} ${upperY} H${bendX} V${lowerY} M${sourceX} ${lowerY} H${bendX} M${bendX} ${targetY} H${targetX}"></path>`;
        });
      }).join("");
      const columns = tournament.bracket.rounds.map((round, roundIndex) => {
        const matches = round.map((match, index) => {
          const playerMatch = match.entrants.includes(0);
          const current = playerMatch && !tournament.lost && !tournament.champion && roundIndex === tournament.round;
          const complete = match.status === "complete";
          const top = centerY(roundIndex, index) - 28;
          return `<article class="arena-match ${playerMatch ? "player-match" : ""} ${current ? "player-current" : ""} ${complete ? "complete" : ""}" style="top:${top}px" title="${CF.Arena.roundNames[roundIndex]} · 第${index + 1}场">
            <span class="arena-match-number">${index + 1}</span>
            ${this.arenaEntrantHTML(match.entrants[0], match)}
            ${this.arenaEntrantHTML(match.entrants[1], match)}
          </article>`;
        }).join("");
        return `<section class="arena-bracket-column" style="left:${roundIndex * columnStep}px"><header><strong>${CF.Arena.roundNames[roundIndex]}</strong><small>${round.length}场 · ${COIN_ICON}${CF.Arena.rewards[roundIndex]}</small></header>${matches}</section>`;
      }).join("");
      const champion = tournament.championId !== null ? CF.Arena.participant(tournament.championId) : null;
      const championCard = champion ? `<div class="arena-bracket-champion" style="left:${boardWidth - 12}px;top:${centerY(5, 0) - 37}px"><span>冠军</span><img src="${champion.portrait}" alt="${champion.name}"><strong>${champion.name}</strong></div>` : "";
      return `<div class="arena-schedule-heading"><div><span class="eyebrow">实时淘汰赛程</span><h3>王冠杯对阵图</h3></div><div class="arena-schedule-legend"><span class="player">玩家</span><span class="winner">晋级</span><span class="loser">淘汰</span></div></div>
        <div class="arena-bracket-scroll"><div class="arena-tournament-bracket" style="width:${boardWidth + (champion ? 150 : 0)}px;height:${boardHeight}px">
          <svg class="arena-bracket-connectors" viewBox="0 0 ${boardWidth} ${boardHeight}" aria-hidden="true">${connectors}</svg>${columns}${championCard}
        </div></div>`;
    },
    focusArenaBracket() {
      requestAnimationFrame(() => {
        const scroll = app.querySelector(".arena-bracket-scroll");
        const played = [...app.querySelectorAll(".arena-match.player-match.complete")];
        const current = app.querySelector(".arena-match.player-current") || played.at(-1);
        if (!scroll || !current) return;
        scroll.scrollTop = Math.max(0, current.offsetTop - scroll.clientHeight / 2 + current.clientHeight / 2);
        const currentLeft = current.parentElement.offsetLeft + current.offsetLeft;
        scroll.scrollLeft = Math.max(0, currentLeft - scroll.clientWidth / 3);
      });
    },
    renderArena() {
      this.screen = "arena"; this.battle = null;
      const tournament = CF.Arena.current();
      if (!tournament) {
        return this.frame(`<section class="screen arena-screen"><div class="page-heading"><div><span class="eyebrow">王都中央</span><h2>荣耀竞技场</h2></div><p>64名英雄使用相同卡池展开六轮淘汰赛，对手卡牌等级每场随机。</p></div><div class="arena-lobby"><div class="arena-lobby-copy"><span class="arena-trophy">🏆</span><h2>王冠杯 · 64强</h2><p>晋级奖金：32强100金币、16强200、8强400、4强800、亚军1200、冠军1600。</p><button class="primary-btn" data-action="arena-start">报名参赛</button></div><div class="arena-roster">${CF.Arena.heroes.map(hero => `<img src="${hero.portrait}" alt="${hero.name}" title="${hero.name}">`).join("")}</div></div></section>`);
      }
      const opponent = !tournament.lost && !tournament.champion ? CF.Arena.opponent() : null;
      const status = tournament.champion ? `<div class="arena-result champion"><span>🏆</span><h2>王冠杯冠军</h2><p>本届竞技场累计赢得${tournament.earnings}金币。</p><button class="primary-btn" data-action="arena-restart">参加新一届</button></div>` : tournament.lost ? `<div class="arena-result"><span>⚔️</span><h2>本届比赛止步</h2><p>已获得${tournament.earnings}金币，可以立即重新报名。</p><button class="primary-btn" data-action="arena-restart">重新报名</button></div>` : `<div class="arena-next"><img src="${opponent.portrait}" alt="${opponent.name}"><div class="arena-opponent-copy"><span class="eyebrow">下一场 · ${CF.Arena.roundNames[tournament.round]}</span><h2>${opponent.name}</h2><p>${opponent.skills[0].icon} ${opponent.skills[0].name}：${opponent.skills[0].description}</p><blockquote class="arena-opponent-quote">“${opponent.dialogue.intro}”</blockquote><small>使用玩家当前卡组，每张卡随机1–5级</small></div><button class="primary-btn" data-action="arena-battle">开始比赛</button></div>`;
      this.frame(`<section class="screen arena-screen"><div class="page-heading"><div><span class="eyebrow">64人单败淘汰赛</span><h2>荣耀竞技场</h2></div><p>累计奖金 ${COIN_ICON}<strong>${tournament.earnings}</strong></p></div>${status}${this.arenaBracketHTML(tournament)}<div class="menu-actions"><button class="secondary-btn" data-action="level-select">返回世界地图</button></div></section>`);
      this.focusArenaBracket();
    },
    startArenaBattle(hungry = null) {
      const enemy = CF.Arena.opponent();
      if (!enemy || !this.validateDeck()) return;
      if (hungry === null) return this.withRations(isHungry => this.startArenaBattle(isHungry));
      this.screen = "battle";
      this.battle = new CF.Battle(enemy, {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: battle => this.handleArenaVictory(battle),
        onDefeat: battle => this.handleArenaDefeat(battle)
      });
      this.battle.state.hungry = hungry;
      this.battle.startPlayerTurn(true);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },
    handleArenaVictory() {
      const result = CF.Arena.win();
      this.battle = null;
      const trainedSkill = CF.HERO_SKILLS[result.skillXp?.id] || CF.HERO_SKILLS.slash;
      const levelUpText = result.skillXp?.to > result.skillXp?.from ? `，升级至Lv${result.skillXp.to}` : "";
      const xpText = result.skillXp?.amount
        ? `<p class="arena-skill-reward">${trainedSkill.icon} 当前装备的「${trainedSkill.name}」获得<strong>2点英雄技能经验</strong>${levelUpText}。</p>`
        : `<p class="arena-skill-reward">${trainedSkill.icon} 「${trainedSkill.name}」已达到最高Lv3，本场不再累积经验。</p>`;
      this.sfx(result.champion ? "arenaChampion" : "arenaWin");
      if (result.skillXp?.to > result.skillXp?.from) this.sfx("heroLevelUp", result.champion ? 2000 : 1300);
      else if (result.unlockedSkill && !result.alreadyUnlocked) this.sfx("cardLevelUp", 2000);
      const inheritText = result.unlockedSkill
        ? `<p class="arena-skill-inherit">🏆 冠军传承：${result.unlockedSkill.icon} <strong>${result.unlockedSkill.name}</strong>${result.alreadyUnlocked ? "（已拥有）" : "已加入英雄技能收藏，可在英雄档案装备。"}</p>`
        : "";
      this.modal(`<span class="eyebrow">竞技场胜利</span><h2>成功晋级${result.advance}</h2><p>获得 ${COIN_ICON}<strong>${result.reward}金币</strong>${result.champion ? "，你成为本届王冠杯冠军！" : "。下一名对手已经就位。"}</p>${xpText}${inheritText}<button class="primary-btn" data-modal-action="arena-continue">继续</button>`);
    },
    handleArenaDefeat() {
      CF.Arena.lose(); this.battle = null;
      this.modal(`<span class="eyebrow">竞技场战报</span><h2>遗憾落败</h2><p>本届赛事已经结束，已获得的晋级奖金全部保留。</p><button class="primary-btn" data-modal-action="arena-continue">查看赛果</button>`);
    },

    renderMap() {
      this.screen = "map"; this.battle = null;
      const run = CF.Adventure.current();
      if (!run) return this.renderMenu();
      const mapStages = CF.Adventure.mapStages();
      const chapter = Number(run.chapter) || 1;
      const chapterData = CF.chapterById(chapter);
      const chapterThree = chapter === 3;
      const chapterFive = chapter === 5;
      const layout = mapStages.map(nodes => nodes[0].pos);
      const npc = chapterData.npc;
      const routeLines = CF.Adventure.routeEdges().map(([from, to]) => {
        const start = layout[from];
        const end = layout[to];
        if (chapterData.routeStyle === "curve") {
          const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
          const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
          const control = chapterData.routeControls ? (chapterData.routeControls[key] || midpoint) : [midpoint[0], midpoint[1] + ((from + to) % 2 ? -2.5 : 2.5)];
          return `<path class="boss-route-line" d="M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}"></path>`;
        }
        return `<line class="boss-route-line" x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}"></line>`;
      }).join("");
      const npcRouteLine = npc
        ? `<path class="boss-route-line npc-route-line" d="M ${npc.pos[0]} ${npc.pos[1]} Q ${npc.routeControl[0]} ${npc.routeControl[1]} ${layout[npc.adjacentNode][0]} ${layout[npc.adjacentNode][1]}"></path>`
        : "";
      const routeNodes = mapStages.map((nodes, stageIndex) => {
        const node = nodes[0];
        const position = layout[stageIndex];
        const completed = run.completed.some(entry => entry.stage === stageIndex);
        const qianzhiGarrison = chapterFive && stageIndex === 19 && (run.cleared || CF.SaveSystem.data.qianzhiGarrisonUnlocked);
        if (qianzhiGarrison) return `<button class="node-btn boss-map-node final-boss demon-garrison-node available" style="--node-x:${position[0]}%;--node-y:${position[1]}%" data-action="chapter5-postgame" title="随时挑战千枝城魔族重建据点"><span class="stage-number">∞</span><span class="node-portrait-frame"><img class="node-portrait" src="assets/enemies/chapter5/succubus-officer.webp" alt="魅魔军官"></span><small>魔族重建据点</small></button>`;
        const defeatedBoss = completed && ["normal", "elite", "boss"].includes(node.type);
        if (defeatedBoss) return "";
        const available = CF.Adventure.isNodeAvailable(stageIndex);
        const attempts = Number(run.attempts?.[stageIndex]) || 0;
        const failures = Number(run.failures?.[stageIndex]) || 0;
        const portrait = node.portrait ? `<span class="node-portrait-frame"><img class="node-portrait" src="${node.portrait}" alt="${node.label}"></span>` : `<span>${node.icon}</span>`;
        const edgeClass = `${position[1] >= 86 ? "edge-bottom" : ""} ${position[0] >= 94 ? "edge-right" : ""} ${position[0] <= 7 ? "edge-left" : ""}`;
        const attemptText = attempts ? ` · 已挑战${attempts}次${failures ? `，失败${failures}次` : ""}` : " · 尚未挑战";
        return `<button class="node-btn boss-map-node ${edgeClass} ${node.type === "boss" ? "final-boss" : ""} ${node.weaponBoss ? "weapon-boss" : ""} ${completed ? "completed" : available ? "available" : "locked"}" style="--node-x:${position[0]}%;--node-y:${position[1]}%" data-action="node" data-choice="${stageIndex}" title="第${stageIndex + 1}节点 · ${node.label}${attemptText}" ${available ? "" : "disabled"}><span class="stage-number">${stageIndex + 1}</span>${portrait}<small>${node.label}</small></button>`;
      }).join("");
      const npcUnlocked = chapterThree && CF.Adventure.farmNpcUnlocked();
      const npcNode = chapterThree ? `<button class="node-btn boss-map-node farm-npc-node ${npcUnlocked ? "available" : "locked"}" style="--node-x:${npc.pos[0]}%;--node-y:${npc.pos[1]}%" data-action="farm-npc" title="${npcUnlocked ? "与留守的农民夫妇交谈" : "先抵达相邻农田节点"}" ${npcUnlocked ? "" : "disabled"}><span class="node-portrait-frame"><img class="node-portrait" src="${CF.CHAPTER_THREE_NPC.portrait}" alt="留守的农民夫妇"></span><small>农民夫妇</small></button>` : "";
      const mapClass = chapterData.map.className;
      const mapLabel = chapterData.map.label;
      const mapRoute = `<div class="boss-map-board ${mapClass}" aria-label="${mapLabel}"><svg class="boss-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routeLines}${npcRouteLine}</svg>${routeNodes}${npcNode}</div>`;
      const progressLabel = `已完成 ${run.completed.length} / ${mapStages.length} 节点`;
      const chapterTitle = chapterData.map.title;
      const mapNote = chapterData.map.note;
      const totalFailures = Object.values(run.failures || {}).reduce((sum, count) => sum + Number(count || 0), 0);
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">${progressLabel} · 第${chapter}关独立存档</span><h2>${chapterTitle}</h2></div><p>击败一个节点后，所有相邻的未完成节点都会解锁。战败不会清空本关进度，切换关卡也会分别保存。</p></div>
        <div class="panel map-shell ${chapterData.map.shellClass}"><div class="run-status"><span class="resource-chip">❤️ <strong>${run.hp}/${run.maxHp}</strong></span><span class="resource-chip">${COIN_ICON} 本轮 <strong>+${run.earnedCoins}</strong></span><span class="resource-chip">⭐ 本轮 <strong>+${run.earnedXp}</strong></span><span class="resource-chip">⚔️ 已完成 <strong>${run.completed.length}</strong></span><span class="resource-chip">🛡️ 失败 <strong>${totalFailures}</strong></span></div>
        ${mapRoute}<p class="map-note">${mapNote}</p>
        <button class="secondary-btn" data-action="abandon-run">退出当前关卡</button></div></section>`);
    },

    renderFarmNpc() {
      if (!CF.Adventure.farmNpcUnlocked()) return this.toast("先抵达农舍旁的农田节点。", "bad");
      const npc = CF.CHAPTER_THREE_NPC;
      this.modal(`<span class="eyebrow">金麦农场 · 留守者的证言</span><h2>${npc.name}</h2><div class="farm-npc-dialogue"><img src="${npc.portrait}" alt="${npc.name}"><div>${npc.dialogue.map(text => `<p>“${text}”</p>`).join("")}</div></div><p class="farm-npc-summary">他们并不要求你放下武器，只希望你在见到丰穗战母之前，先知道这些熊族并未伤害原来的村民。</p><button class="primary-btn" data-modal-action="close">我会亲眼判断</button>`);
    },

    enterNode(choiceIndex, hungry = null) {
      const preview = CF.Adventure.mapStages()[Number(choiceIndex)]?.[0];
      if (hungry === null && ["normal", "elite", "boss"].includes(preview?.type) && CF.Adventure.isNodeAvailable(choiceIndex)) return this.withRations(isHungry => this.enterNode(choiceIndex, isHungry));
      const node = CF.Adventure.chooseNode(choiceIndex);
      if (!node) return;
      this.activeNode = node;
      if (["normal", "elite", "boss"].includes(node.type)) this.startBattle(node.type, Boolean(hungry));
      else if (node.type === "event") this.renderEvent();
      else if (node.type === "camp") this.renderCamp();
      else if (node.type === "shop") this.renderShop();
    },

    startBattle(type, hungry = false) {
      this.screen = "battle";
      const enemy = CF.Adventure.encounterFor(type);
      this.activeNode = { ...(this.activeNode || {}), type };
      this.battle = new CF.Battle(enemy, {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: battle => this.handleVictory(battle, type),
        onDefeat: battle => this.handleDefeat(battle)
      });
      this.battle.state.hungry = hungry;
      this.battle.startPlayerTurn(true);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      if (!CF.SaveSystem.data.tutorialSeen) this.showTutorial();
    },
    startChapterFivePostgame() {
      const run = CF.Adventure.current(5);
      if (!run?.cleared && !CF.SaveSystem.data.qianzhiGarrisonUnlocked) return this.toast("请先完成第五关结局，解锁千枝城魔族重建据点。", "bad");
      this.screen = "battle";
      this.activeNode = { type: "postgame" };
      const injuredBeforeChallenge = [...(CF.SaveSystem.data.injuredCards || [])];
      this.battle = new CF.Battle(CF.enemies.qianzhi_demon_garrison, {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: () => {
          CF.SaveSystem.data.coins += 500;
          CF.SaveSystem.save();
          this.battle = null;
          this.modal(`<span class="eyebrow">极限挑战</span><h2>千枝城驻军暂时退却</h2><p>你击退了不可一世的魔族驻军，获得500金币。她们仍会继续重建千枝城，之后仍可再次挑战。</p><button class="primary-btn" data-modal-action="postgame-return">返回废墟地图</button>`);
        },
        onDefeat: () => {
          CF.SaveSystem.data.injuredCards = injuredBeforeChallenge;
          CF.SaveSystem.save();
          this.battle = null;
          this.modal(`<span class="eyebrow">极限挑战</span><h2>魔族军官守住了据点</h2><p>20攻/200血的驻军压倒了小队。这场失败不会重置第五关进度，也不会造成额外惩罚。</p><button class="primary-btn" data-modal-action="postgame-return">返回废墟地图</button>`);
        }
      });
      this.battle.startPlayerTurn(true);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },

    showTutorial() {
      this.modal(`<span class="eyebrow">首次战斗</span><h2>六条战场要诀</h2><div class="tutorial-steps">
        ${["每一列的前排会保护其身后的后排。","击败前排后，才能普通攻击该列后排。","前后排全部为空时，该路线被突破。","通过突破路线可以直接攻击敌方英雄。","你的最大法力不会每回合增加。","海港的统领试炼是永久提高最大法力的唯一途径。"].map((text, index) => `<div class="tutorial-step"><b>${index + 1}</b><span>${text}</span></div>`).join("")}
        </div><button class="primary-btn" data-modal-action="tutorial-done">开始战斗</button>`);
    },

    grantRandomCardXp(amount, type = null) {
      const save = CF.SaveSystem.data;
      const eligible = Object.entries(save.collection)
        .filter(([id, owned]) => owned > 0 && (!type || CF.CARD_LIBRARY[id]?.type === type) && (save.cardProgress[id]?.level || 1) < 5)
        .map(([id]) => id);
      const deckIds = [...new Set(save.deck)].filter(id => eligible.includes(id));
      const ids = deckIds.length ? deckIds : eligible;
      if (!ids.length) return null;
      const id = ids[Math.floor(Math.random() * ids.length)];
      const upgraded = CF.SaveSystem.addCardXp(id, amount);
      if (upgraded) { CF.Adventure.current().cardsLeveled += 1; this.toast(`${CF.CARD_LIBRARY[id].name}升级至 Lv${upgraded.to}！`, "good"); }
      this.sfx(upgraded ? "cardLevelUp" : "train");
      return { id, upgraded };
    },

    handleVictory(battle, type) {
      const run = CF.Adventure.current();
      run.hp = battle.state.storyDefeat ? run.maxHp : battle.state.player.hp;
      // 基础奖励来自关卡数据表 js/data/chapters.js 的 victoryRewards。
      const { gold: baseGold, xp: baseXp } = CF.chapterById(run.chapter).victoryRewards[type];
      CF.SaveSystem.data.coins += baseGold;
      CF.SaveSystem.data.totalVictories += 1;
      run.earnedCoins += baseGold; run.earnedXp += baseXp;
      const levelUp = CF.SaveSystem.addHeroXp(baseXp);
      const used = [...new Set(battle.state.usedCards)].sort(() => Math.random() - .5).slice(0, 3);
      let cardUpgraded = false;
      used.forEach(id => {
        const upgraded = CF.SaveSystem.addCardXp(id, 1);
        if (upgraded) { cardUpgraded = true; run.cardsLeveled += 1; this.toast(`${CF.CARD_LIBRARY[id].name}升级至 Lv${upgraded.to}！`, "good"); }
      });
      CF.Adventure.syncHeroGrowth();
      if (levelUp) this.toast(`英雄升级！Lv${levelUp.from} → Lv${levelUp.to}`, "good");
      // 胜利结算音效：首领战先奏凯歌，普通战斗是金币声；随后依次是英雄升级与卡牌升级。
      const bossFight = type === "boss";
      const fanfare = bossFight ? 1300 : 350;
      this.sfx(bossFight ? "bossVictory" : "coins");
      if (levelUp) this.sfx("heroLevelUp", fanfare);
      if (cardUpgraded) this.sfx("cardLevelUp", fanfare + (levelUp ? 1100 : 0));
      CF.SaveSystem.save();
      const bossCardReward = CF.Adventure.claimActiveWeaponReward() || CF.Adventure.claimActiveChapterTwoCardReward() || CF.Adventure.claimActiveChapterThreeCardReward() || CF.Adventure.claimActiveChapterFourCardReward() || CF.Adventure.claimActiveChapterFiveCardReward();
      const chapterWeaponReward = CF.Adventure.claimActiveChapterWeaponReward();
      const questItemReward = CF.Adventure.claimActiveQueenBloodWaterReward();
      const loot = CF.Adventure.claimVictoryLoot(battle.state.enemyUnitsKilled);
      this.showRewards(type, baseGold, baseXp, bossCardReward, questItemReward, loot, chapterWeaponReward);
    },

    // 每场战斗（普通/精英/Boss）胜利后都翻开三张固定战利品牌：女王精血、粗糙装备、笔记残页。
    // 首杀固定奖励（卡牌或武器）的展示块。
    bossRewardHTML(bossCardReward) {
      return `<div class="guaranteed-weapon-drop"><span class="eyebrow">首杀固定奖励</span>${this.cardPreview(bossCardReward.cardId)}<strong>${CF.CARD_LIBRARY[bossCardReward.cardId].name}${bossCardReward.weapon ? "已放进背包" : "已永久加入收藏"}</strong>${bossCardReward.weapon ? `<small>${bossCardReward.autoEquipped ? "已自动装备为英雄武器。" : "可在英雄档案或背包中更换英雄武器。"}冒险与竞技场中每回合都能用它攻击一次，不消耗耐久。</small>` : ""}${CF.Restaurant.isCardBondLocked(bossCardReward.cardId) ? `<small>${CF.Restaurant.bondOwner(bossCardReward.cardId).boss ? `${bossCardReward.nodeLabel}被同族救走了。本关全部在押首领都在营地监狱结缘后，才能使用这张卡。` : `${bossCardReward.nodeLabel}已被押回营地监狱。带上金杯餐馆的食物去探望，好感度达到${CF.Restaurant.BOND_THRESHOLD}、与其结缘后才能使用这张卡。`}</small>` : ""}</div>`;
    },

    showRewards(type, baseGold, baseXp, bossCardReward = null, questItemReward = null, loot, chapterWeaponReward = null) {
      const bossFight = type === "boss";
      const bossName = this.battle?.enemyConfig?.name || "";
      const storyDefeat = this.battle?.state?.storyDefeat;
      const lootCards = [
        { title: "女王精血", detail: "为了唤醒更多同族，也为了让已经觉醒的同族获得更大的力量，关底首领献出了自己体内的精血——每位首领只能取得一瓶。通关统领试炼第七关、得到女王认可后，可在背包中使用，永久+1最大生命。" },
        loot.gearCount > 0
          ? { title: `粗糙武器 ×${loot.gearCount} · 粗糙盔甲 ×${loot.gearCount}`, detail: `本场击杀${loot.gearCount}个敌方随从，缴获同等数量的白色品质装备。可装备到武器/盔甲栏，也可在城镇装备店重锻为更高品质。` }
          : { title: "未缴获装备", detail: "本场没有击杀敌方随从，未能缴获粗糙武器/盔甲。击杀多少个随从，就能缴获多少件白装。" },
        loot.note
          ? { title: `${CF.LORE_BOOK_TITLE}${loot.note.title}`, detail: `笔记残页 ${loot.note.index}/${CF.LORE_PAGES.length}，翻开后可在下方阅读全文，之后也能在主界面“笔记残页”中重读。` }
          : { title: "残页已集齐", detail: `${CF.LORE_BOOK_TITLE}已全部收集，本次未获得新的残页。` }
      ];
      this.pendingBossLoot = lootCards;
      const eyebrow = bossFight ? (storyDefeat ? "第五关剧情完成" : "最终胜利") : "战斗胜利";
      const heading = bossFight ? (storyDefeat ? "千枝城反击战结束" : `${bossName}已被击败`) : "战斗胜利";
      const intro = storyDefeat ? `${bossName}已经落败；魅魔军官随后击溃了小队，但不影响通关与奖励。` : "";
      this.modal(`<span class="eyebrow">${eyebrow}</span><h2>${heading}</h2><p>${intro}基础战利品：${baseGold}金币 · ${baseXp}英雄经验。</p>
        ${bossCardReward ? this.bossRewardHTML(bossCardReward) : ""}
        ${chapterWeaponReward ? this.bossRewardHTML(chapterWeaponReward) : ""}
        ${questItemReward ? `<div class="quest-item-drop"><img src="${questItemReward.image}" alt="${questItemReward.name}"><div><span class="eyebrow">关键物品</span><strong>${questItemReward.name}</strong><p>河水中的猩红丝线与古老月辉产生共鸣。它能开启统领试炼第七关。</p></div></div>` : ""}
        <p class="boss-loot-hint">翻开三张战利品牌：</p>
        <div class="boss-loot-grid">${lootCards.map((card, index) => `<button class="boss-loot-card" data-modal-action="flip-boss-card" data-index="${index}"><span class="boss-loot-face boss-loot-front">?</span><span class="boss-loot-face boss-loot-back"><strong>${card.title}</strong><small>${card.detail}</small></span></button>`).join("")}</div>
        ${loot.note ? `<article class="loot-note-reading" hidden><span class="eyebrow">${CF.LORE_BOOK_TITLE} · 残页 ${loot.note.index}/${CF.LORE_PAGES.length}</span><h3>${loot.note.title}</h3>${loot.note.paragraphs.map(text => `<p>${text}</p>`).join("")}</article>` : ""}
        <div class="menu-actions"><button class="primary-btn" data-modal-action="continue-boss-loot">领取奖励，返回地图</button></div>`);
    },

    cardPreview(cardId, compact = false) {
      const card = cardId ? CF.CARD_LIBRARY[cardId] : null;
      if (!card) return "";
      const className = compact ? "shop-card-preview" : "reward-card-preview";
      return `<span class="${className}"><img src="${card.image || ""}" alt="${card.name}" loading="lazy"><span>${card.name}</span></span>`;
    },

    // 战利品翻牌：奖励在 claimVictoryLoot() 时已写入存档，翻牌只是揭示动画，直接切换DOM上的.flipped类。
    flipBossCard(index) {
      const card = modalRoot.querySelectorAll(".boss-loot-card")[index];
      if (!card || card.classList.contains("flipped")) return;
      card.classList.add("flipped");
      this.sfx("cardAdd");
      // 第三张是笔记残页：翻开后在牌下展开本页故事全文。
      if (index === 2) {
        const reading = modalRoot.querySelector(".loot-note-reading");
        if (reading) reading.hidden = false;
      }
    },

    finishCombatNode(type) {
      CF.Adventure.finishNode(type);
      this.closeModal(); this.pendingBossLoot = null; this.battle = null;
      this.renderMap();
    },
    finishBoss() {
      const run = CF.Adventure.current();
      const chapterData = CF.chapterById(run.chapter);
      const chapterFive = run.chapter === 5;
      CF.Adventure.finishNode("boss");
      run.cleared = true;
      if (chapterFive) CF.SaveSystem.data.qianzhiGarrisonUnlocked = true;
      CF.SaveSystem.data.completedRuns = Math.max(CF.SaveSystem.data.completedRuns, run.chapter);
      CF.SaveSystem.save();
      this.sfx("chapterClear", 150);
      const { title: summaryTitle, text: summaryText } = chapterData.clearSummary;
      this.modal(`<span class="eyebrow">冒险总结</span><h2>${summaryTitle}</h2><p>${summaryText}所有永久成长均已保存。</p><div class="summary-list">
        <div><span>本轮金币</span><strong>+${run.earnedCoins}</strong></div><div><span>英雄经验</span><strong>+${run.earnedXp}</strong></div><div><span>升级卡牌</span><strong>${run.cardsLeveled}</strong></div><div><span>完成节点</span><strong>${run.completed.length}/${chapterData.nodes.length}</strong></div>
        </div><button class="primary-btn" data-modal-action="finish-run">返回主菜单</button>`);
    },
    handleDefeat(battle) {
      const run = CF.Adventure.recordDefeat();
      this.modal(`<span class="eyebrow">本次挑战失败</span><h2>队伍退回本关营地</h2><p>第${run.chapter}关的独立存档没有回退：已击败节点、路线和奖励全部保留，英雄已恢复满生命。本战阵亡的随从仍需在队伍营地救治。</p><div class="summary-list">
        <div><span>本轮金币</span><strong>+${run.earnedCoins}</strong></div><div><span>英雄经验</span><strong>+${run.earnedXp}</strong></div><div><span>完成节点</span><strong>${run.completed.length}</strong></div></div>
        <div class="menu-actions"><button class="primary-btn" data-modal-action="failed-run">返回本关地图</button><button class="secondary-btn" data-modal-action="failed-run-menu">返回主菜单</button></div>`);
    },

    renderCamp() {
      this.screen = "camp"; const run = CF.Adventure.current();
      this.frame(`<section class="screen"><div class="encounter-panel panel"><div class="encounter-icon">⛺</div><span class="eyebrow">安全节点</span><h2>守夜营火</h2><p>火光驱散了雾气。你只能选择一种整备方式，然后继续前进。</p><div class="choice-grid">
        <button class="choice-btn" data-action="camp-choice" data-choice="rest"><strong>❤️ 休息</strong><small>恢复最大生命30%（约${Math.ceil(run.maxHp * .3)}点）</small></button>
        <button class="choice-btn" data-action="camp-choice" data-choice="train"><strong>📚 训练</strong><small>随机一张卡牌获得2经验</small></button>
      </div></div></section>`, false);
    },
    campChoice(choice) {
      const run = CF.Adventure.current();
      if (choice === "rest") { const before = run.hp; run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * .3)); this.toast(`恢复${run.hp - before}点生命。`, "good"); this.sfx("heal"); }
      else this.grantRandomCardXp(2);
      CF.Adventure.finishNode("camp"); this.renderMap();
    },

    renderEvent() {
      this.screen = "event"; this.activeEvent = CF.Adventure.randomEvent();
      const event = this.activeEvent;
      this.frame(`<section class="screen"><div class="encounter-panel panel"><div class="encounter-icon">${event.icon}</div><span class="eyebrow">随机事件</span><h2>${event.name}</h2><p>${event.text}</p><div class="choice-grid">
        ${event.choices.map((choice,index) => `<button class="choice-btn" data-action="event-choice" data-choice="${index}"><strong>${choice.label}</strong><small>${choice.detail}</small></button>`).join("")}
      </div></div></section>`, false);
    },
    eventChoice(index) {
      const choice = this.activeEvent?.choices[index]; const run = CF.Adventure.current();
      if (!choice || !run) return;
      if (choice.effect === "heal") { run.hp = Math.min(run.maxHp, run.hp + choice.value); this.sfx("heal"); }
      if (choice.effect === "card") { CF.SaveSystem.addCardToCollection(choice.cardId); this.sfx("cardAdd"); }
      if (choice.effect === "gamble") {
        if (Math.random() < .5) { CF.SaveSystem.data.coins += 30; run.earnedCoins += 30; this.toast("你找到30金币！", "good"); this.sfx("coins"); }
        else { run.hp = Math.max(1, run.hp - 5); this.toast("埋伏！你受到5点伤害。", "bad", { quiet: true }); this.sfx("heroHit"); }
      }
      if (choice.effect === "train_paid") {
        if (CF.SaveSystem.data.coins < choice.cost) return this.toast("金币不足。", "bad");
        CF.SaveSystem.data.coins -= choice.cost; this.grantRandomCardXp(2, "unit");
      }
      if (choice.effect === "crystal_study") { this.sfx("heroHit"); run.hp = Math.max(1, run.hp - 5); this.grantRandomCardXp(choice.value, "spell"); }
      if (choice.effect === "spell_xp") this.grantRandomCardXp(choice.value, "spell");
      CF.SaveSystem.save(); CF.Adventure.finishNode("event"); this.renderMap();
    },

    renderShop() {
      this.screen = "shop";
      const run = CF.Adventure.current(); run.shopPurchased = run.shopPurchased || {};
      const stock = CF.Adventure.shopStock();
      this.frame(`<section class="screen"><div class="encounter-panel panel"><div class="encounter-icon">🛒</div><span class="eyebrow">商店 · ${CF.SaveSystem.data.coins}金币</span><h2>行脚商队</h2><p>商人将货物摊在褪色的毯子上。每件货物每次造访只能购买一次。</p><div class="choice-grid">
        ${stock.map((item,index) => { const unavailable = run.shopPurchased[`${run.stage}-${index}`] || (item.type === "card" && CF.SaveSystem.data.collection[item.cardId]); return `<button class="choice-btn ${item.type === "card" ? "card-shop-choice" : ""}" data-action="shop-buy" data-index="${index}" ${unavailable ? "disabled" : ""}>${item.type === "card" ? this.cardPreview(item.cardId, true) : `<span class="shop-item-icon">${item.icon}</span>`}<strong>${item.title} · ${item.cost}金币</strong><small>${unavailable ? (CF.SaveSystem.data.collection[item.cardId] ? "已拥有" : "已售出") : item.detail}</small></button>`; }).join("")}
      </div><div class="menu-actions"><button class="primary-btn" data-action="shop-leave">继续前进</button></div></div></section>`, false);
    },
    shopBuy(index) {
      const stock = CF.Adventure.shopStock(); const item = stock[index]; const run = CF.Adventure.current();
      const key = `${run.stage}-${index}`;
      if (!item || run.shopPurchased?.[key]) return;
      if (item.type === "card" && CF.SaveSystem.data.collection[item.cardId]) return this.toast("这张卡已经在收藏中了。", "bad");
      if (CF.SaveSystem.data.coins < item.cost) return this.toast("金币不足。", "bad");
      CF.SaveSystem.data.coins -= item.cost; run.shopPurchased[key] = true;
      if (item.type === "card") CF.SaveSystem.addCardToCollection(item.cardId);
      if (item.type === "heal") run.hp = Math.min(run.maxHp, run.hp + item.value);
      if (item.type === "xp") this.grantRandomCardXp(item.value);
      this.sfx("purchase");
      CF.SaveSystem.save(); this.toast("购买成功。", "good"); this.renderShop();
    },

    resetConfirm() {
      this.modal(`<h2>删除本地存档？</h2><p>英雄、收藏、卡组与所有永久成长都会被删除。此操作无法撤销。</p><div class="menu-actions"><button class="danger-btn" data-modal-action="reset-step-two">我理解，继续</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
    },
    resetStepTwo() {
      this.modal(`<h2>最后确认</h2><p>真的要永久删除存档并恢复初始状态吗？</p><div class="menu-actions"><button class="danger-btn" data-modal-action="reset-final">永久删除</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
    },

    toggleDebug(force) {
      this.debugOpen = typeof force === "boolean" ? force : !this.debugOpen;
      if (!this.debugOpen) { debugRoot.innerHTML = ""; return; }
      debugRoot.innerHTML = `<div class="debug-panel"><h3><span>开发者面板</span><button class="mini-btn" data-debug="close">×</button></h3><div class="debug-grid">
        <button data-debug="heal">恢复生命</button><button data-debug="coins">+100金币</button><button data-debug="xp">+20经验</button><button data-debug="win">直接胜利</button><button data-debug="boss">直达Boss</button><button data-debug="draw">抽1张牌</button><button data-debug="mana">战斗法力+1</button>
      </div></div>`;
    },
    debugAction(action) {
      const run = CF.Adventure.current();
      if (action === "close") return this.toggleDebug(false);
      if (action === "heal") { if (this.battle) this.battle.state.player.hp = this.battle.state.player.maxHp; else if (run) run.hp = run.maxHp; }
      if (action === "coins") CF.SaveSystem.data.coins += 100;
      if (action === "xp") CF.SaveSystem.addHeroXp(20);
      if (action === "win" && this.battle) this.battle.forceWin();
      if (action === "boss") {
        if (!run) CF.Adventure.start();
        const mapStages = CF.Adventure.mapStages();
        const currentRun = CF.Adventure.current();
        currentRun.stage = mapStages.length - 1;
        currentRun.activeNode = mapStages.length - 1;
        currentRun.chosen[mapStages.length - 1] = 0;
        CF.SaveSystem.save(); this.closeModal();
        this.activeNode = mapStages[mapStages.length - 1][0];
        this.startBattle("boss");
      }
      if (action === "draw" && this.battle) this.battle.debugDraw();
      if (action === "mana" && this.battle) this.battle.debugMana();
      CF.SaveSystem.save(); if (this.battle) this.battle.render(); else if (this.screen === "map") this.renderMap(); else this.renderMenu();
    }
  };

  // 没有专属音效的按钮统一发出轻微的点击声。
  const QUIET_ACTIONS = new Set(["slot", "hero", "skill", "weapon-attack", "select-card", "end-turn", "player-portrait", "emote", "deck-add", "deck-remove", "hero-skill-equip", "hero-weapon-equip", "shop-buy", "rescue-injured", "train-card", "sound-preview", "flip-boss-card", "continue-boss-loot", "forge-item", "buy-food", "buy-flour", "inn-sleep", "night-choice", "feed-prisoner", "equip-target", "level-select-node", "camp-choice", "event-choice", "arena-battle", "trial-start"]);
  const clickSound = el => { if (el?.matches("button:not(:disabled), .choice-btn, .reward-card") && !QUIET_ACTIONS.has(el.dataset.action || el.dataset.modalAction)) UI.sfx("click"); };

  app.addEventListener("click", event => {
    const el = event.target.closest("[data-action]");
    const action = el?.dataset.action;
    clickSound(el);
    if (UI.battle && action === "player-portrait") return UI.battle.clickPlayerPortrait();
    if (UI.battle && action === "emote") return UI.battle.playerEmote(el.dataset.emote);
    if (UI.battle?.state.emoteMenuOpen) UI.battle.closeEmoteMenu();
    if (!el) return;
    if (UI.battle && ["slot", "hero", "skill", "weapon-attack", "select-card", "end-turn"].includes(action)) {
      if (action === "slot") UI.battle.clickSlot(el.dataset.side, el.dataset.row, Number(el.dataset.column));
      if (action === "hero") UI.battle.clickHero(el.dataset.side);
      if (action === "skill") UI.battle.selectSkill();
      if (action === "weapon-attack") UI.battle.selectWeaponAttack();
      if (action === "select-card") UI.battle.selectCard(Number(el.dataset.index));
      if (action === "end-turn") UI.battle.endTurn();
      return;
    }
    if (action === "home") {
      if (UI.screen === "battle") UI.confirmLeaveBattle();
      else if (UI.screen === "settings" && UI.settingsReturnScreen === "cover") UI.renderCover();
      else UI.renderMenu();
    }
    if (action === "cover") UI.renderCover();
    if (action === "hero-select") UI.renderHeroSelect();
    if (action === "hero-pick") { UI.heroSelectId = el.dataset.hero; UI.renderHeroSelect(); }
    if (action === "hero-select-confirm") UI.renderSaveSlots("new");
    if (action === "load-slots") UI.renderSaveSlots("load");
    if (action === "save-slots") UI.renderSaveSlots("manage");
    if (action === "slot-new") UI.slotNew(Number(el.dataset.slot));
    if (action === "slot-load") UI.slotLoad(Number(el.dataset.slot));
    if (action === "slot-save") UI.slotSave(Number(el.dataset.slot));
    if (action === "slot-delete") UI.slotDelete(Number(el.dataset.slot));
    if (action === "slot-export") UI.exportSaves(Number(el.dataset.slot));
    if (action === "slot-import") UI.openImport(Number(el.dataset.slot));
    if (action === "export-all-saves") UI.exportSaves();
    if (action === "import-saves") UI.openImport();
    if (action === "cover-continue") { if (CF.Adventure.current()) UI.renderMap(); else UI.renderMenu(); }
    if (action === "level-select") UI.renderLevelSelect();
    if (action === "toggle-level-layout") UI.beginLevelLayoutEdit();
    if (action === "save-level-layout") UI.saveLevelLayout();
    if (action === "reset-level-layout") UI.resetLevelLayoutDraft();
    if (action === "cancel-level-layout") UI.cancelLevelLayoutEdit();
    if (action === "level-select-node") {
      if (UI.levelLayoutEdit || UI.levelDragSuppressClick) return;
      UI.selectChapter(Number(el.dataset.chapter));
    }
    if (action === "arena-open") UI.renderArena();
    if (action === "trials-open") UI.renderTrials();
    if (action === "chapter5-postgame") UI.startChapterFivePostgame();
    if (action === "trial-start") UI.startTrialBattle(Number(el.dataset.trial));
    if (action === "arena-start" || action === "arena-restart") { CF.Arena.start(); UI.renderArena(); }
    if (action === "arena-battle") UI.startArenaBattle();
    if (action === "hero-page") UI.renderHero();
    if (action === "hero-skill-equip") {
      if (CF.SaveSystem.equipHeroSkill(el.dataset.skill)) { UI.toast(`已装备「${CF.HERO_SKILLS[el.dataset.skill].name}」。`, "good"); UI.sfx("equip"); }
      UI.renderHero();
    }
    if (action === "hero-weapon-equip") {
      const weaponId = el.dataset.weapon || null;
      if (CF.SaveSystem.equipHeroWeapon(weaponId)) {
        UI.toast(weaponId ? `已装备「${CF.CARD_LIBRARY[weaponId].name}」。` : "已卸下英雄武器。", "good");
        UI.sfx("equip");
      }
      if (UI.screen === "backpack") UI.renderBackpack(); else UI.renderHero();
    }
    if (action === "deck-page") UI.renderDeck();
    if (action === "training-page") UI.renderTraining();
    if (action === "prison-page") UI.renderPrison();
    if (action === "inspect-card") UI.openCardDetail(el.dataset.card);
    if (action === "settings-page") UI.renderSettings(UI.screen === "cover" ? "cover" : "menu");
    if (action === "open-card-training") UI.openCardTraining(el.dataset.cardType);
    if (action === "rescue-injured") UI.rescueInjured();
    if (action === "town-shop-page") UI.renderTownShop();
    if (action === "open-equipment-shop") UI.openEquipmentShop();
    if (action === "open-restaurant") UI.openRestaurant();
    if (action === "open-inn") UI.openInn();
    if (action === "prison-visit") UI.openPrisonerVisit(el.dataset.key);
    if (action === "labor-dispatch-all") UI.dispatchAllLabor();
    if (action === "race-stories") UI.openRaceStories();
    if (action === "backpack-page") UI.renderBackpack();
    if (action === "book-page") UI.renderBook();
    if (action === "use-queen-blood") UI.useQueenBlood();
    if (action === "equip-item") UI.openEquipTargetPicker(el.dataset.kind, Number(el.dataset.tier));
    if (action === "sound-toggle") { CF.SoundFX?.toggleMuted(); UI.renderSettings(); }
    if (action === "music-toggle") { CF.Music?.toggleMuted(); UI.renderSettings(UI.settingsReturnScreen); }
    if (action === "sound-preview") {
      CF.SoundFX?.play("melee");
      setTimeout(() => CF.SoundFX?.play("ranged"), 330);
      setTimeout(() => CF.SoundFX?.play("fire"), 650);
    }
    if (action === "new-run") UI.requestNewRun();
    if (action === "continue-run") UI.renderMap();
    if (action === "deck-remove") { const index = CF.SaveSystem.data.deck.lastIndexOf(el.dataset.card); if (index >= 0) { CF.SaveSystem.data.deck.splice(index,1); UI.sfx("cardRemove"); } CF.SaveSystem.save(); UI.renderDeck(); }
    if (action === "deck-add" && CF.CARD_LIBRARY[el.dataset.card] && CF.CARD_LIBRARY[el.dataset.card].type !== "weapon" && CF.SaveSystem.data.deck.length < CF.SaveSystem.deckLimit() && !CF.SaveSystem.data.deck.includes(el.dataset.card) && !CF.Restaurant.isCardBondLocked(el.dataset.card)) { CF.SaveSystem.data.deck.push(el.dataset.card); UI.sfx("cardAdd"); CF.SaveSystem.save(); UI.renderDeck(); }
    if (action === "node") UI.enterNode(Number(el.dataset.choice));
    if (action === "farm-npc") UI.renderFarmNpc();
    if (action === "abandon-run") { UI.modal(`<h2>退出当前关卡？</h2><p>已击败的节点、路线解锁和本轮奖励都会保留。之后点击“继续游戏”即可从当前进度继续。</p><div class="menu-actions"><button class="primary-btn" data-modal-action="confirm-pause-run">保存并退出</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`); return; }
    if (action === "camp-choice") UI.campChoice(el.dataset.choice);
    if (action === "event-choice") UI.eventChoice(Number(el.dataset.choice));
    if (action === "shop-buy") UI.shopBuy(Number(el.dataset.index));
    if (action === "shop-leave") { CF.Adventure.finishNode("shop"); UI.renderMap(); }
    if (action === "reset-save") UI.resetConfirm();
    if (action === "prepare-chapter5-finale") UI.modal(`<span class="eyebrow">第五关存档调整</span><h2>只留下最终首领？</h2><p>将第五关设置为前19个首领已经击败，只留下银灰狼女猎手。英雄、金币、收藏、卡组以及其他关卡存档均不会改变。</p><div class="menu-actions"><button class="primary-btn" data-modal-action="confirm-chapter5-finale">确认调整</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
  });

  app.addEventListener("pointerdown", event => {
    if (!UI.levelLayoutEdit) return;
    const node = event.target.closest?.(".level-node[data-layout-key]");
    const board = event.target.closest?.(".level-map-board.layout-editing");
    if (!node || !board) return;
    event.preventDefault();
    UI.levelDrag = { key: node.dataset.layoutKey, node, board, pointerId: event.pointerId, moved: false, startX: event.clientX, startY: event.clientY };
    node.setPointerCapture?.(event.pointerId);
    node.classList.add("dragging");
  });

  app.addEventListener("pointermove", event => {
    const drag = UI.levelDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rect = drag.board.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100));
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true;
    drag.node.style.setProperty("--level-x", `${x}%`);
    drag.node.style.setProperty("--level-y", `${y}%`);
    if (UI.levelLayoutDraft) UI.levelLayoutDraft[drag.key] = [x, y];
  });

  const endLevelDrag = event => {
    const drag = UI.levelDrag;
    if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return;
    drag.node.classList.remove("dragging");
    if (drag.moved) {
      UI.levelDragSuppressClick = true;
      setTimeout(() => { UI.levelDragSuppressClick = false; }, 0);
    }
    UI.levelDrag = null;
  };
  app.addEventListener("pointerup", endLevelDrag);
  app.addEventListener("pointercancel", endLevelDrag);

  app.addEventListener("input", event => {
    const musicInput = event.target.closest?.("[data-music-volume]");
    if (musicInput) {
      CF.Music?.setVolume(Number(musicInput.value) / 100);
      const musicOutput = app.querySelector("[data-music-output]");
      if (musicOutput) musicOutput.textContent = `${musicInput.value}%`;
      return;
    }
    const input = event.target.closest?.("[data-sound-volume]");
    if (!input) return;
    const value = Number(input.value);
    CF.SoundFX?.setVolume(value / 100);
    const output = app.querySelector("[data-sound-output]");
    if (output) output.textContent = `${value}%`;
  });

  app.addEventListener("change", event => {
    const select = event.target.closest?.("[data-language-select]");
    if (!select) return;
    CF.I18n.setLanguage(select.value);
    if (UI.screen === "cover") UI.renderCover();
    else UI.renderSettings(UI.settingsReturnScreen);
  });

  modalRoot.addEventListener("click", event => {
    if (event.target.classList.contains("card-inspect-modal")) { UI.closeModal(); return; }
    const el = event.target.closest("[data-modal-action]"); if (!el) return;
    const action = el.dataset.modalAction;
    clickSound(el);
    if (action === "close") {
      const closingTraining = Boolean(modalRoot.querySelector("[data-training-panel]"));
      UI.closeModal();
      if (closingTraining && UI.screen === "training") UI.renderTraining();
      else if (closingTraining && UI.screen === "menu") UI.renderMenu();
    }
    if (action === "tutorial-done") { CF.SaveSystem.data.tutorialSeen = true; CF.SaveSystem.save(); UI.closeModal(); }
    if (action === "confirm-new-run") UI.startNewRun();
    if (action === "confirm-leave-battle") { UI.closeModal(); UI.leaveCurrentRun(); }
    if (action === "confirm-slot-new") UI.startNewGame(Number(el.dataset.slot));
    if (action === "confirm-slot-load") UI.finishSlotLoad(Number(el.dataset.slot));
    if (action === "confirm-slot-save") UI.finishSlotSave(Number(el.dataset.slot));
    if (action === "save-export-download") UI.downloadExport();
    if (action === "save-export-copy") UI.copyExport();
    if (action === "save-import-read") UI.readImport();
    if (action === "save-import-confirm") UI.finishImport();
    if (action === "confirm-slot-delete") { CF.SaveSystem.deleteSlot(Number(el.dataset.slot)); UI.closeModal(); UI.toast("存档已删除。", "good"); UI.renderSaveSlots(UI.slotMode || "manage"); }
    if (action === "confirm-pause-run") { CF.Adventure.pause(); UI.closeModal(); UI.renderMenu(); return; }
    if (action === "confirm-abandon") { CF.Adventure.abandon(); UI.closeModal(); UI.renderMenu(); }
    if (action === "flip-boss-card") UI.flipBossCard(Number(el.dataset.index));
    if (action === "continue-boss-loot") {
      UI.pendingBossLoot = null;
      if (UI.activeNode?.type === "boss") UI.finishBoss(); else UI.finishCombatNode(UI.activeNode.type);
    }
    if (action === "forge-item") UI.forgeItemAction(el.dataset.kind, Number(el.dataset.tier));
    if (action === "buy-food") UI.buyFoodAction(el.dataset.food);
    if (action === "buy-flour") UI.buyFlourAction(Number(el.dataset.bags));
    if (action === "inn-sleep") UI.sleepAtInn();
    if (action === "dispatch-prisoner") UI.dispatchLabor(el.dataset.key, true);
    if (action === "night-choice") UI.resolveNightEvent(Number(el.dataset.index));
    if (action === "night-done") { UI.closeModal(); if (UI.screen === "prison") UI.renderPrison(); else UI.refreshTopbar(); }
    if (action === "ration-buy-go" && UI.pendingRationStart) {
      const pending = UI.pendingRationStart; UI.pendingRationStart = null;
      const bought = CF.Restaurant.buyFlour(pending.bags);
      if (!bought.ok) return UI.toast(bought.reason, "bad");
      UI.sfx("purchase"); UI.closeModal(); pending.go();
    }
    if (action === "ration-hungry-go" && UI.pendingRationStart) { const pending = UI.pendingRationStart; UI.pendingRationStart = null; UI.closeModal(); pending.go(); }
    if (action === "feed-prisoner") UI.feedPrisonerAction(el.dataset.key, el.dataset.food);
    if (action === "restaurant-to-prison") { UI.closeModal(); UI.renderPrison(); }
    if (action === "prison-to-restaurant") { UI.closeModal(); UI.renderTownShop(); UI.openRestaurant(); }
    if (action === "close-prison-visit") { UI.closeModal(); if (UI.screen === "prison") UI.renderPrison(); }
    if (action === "equip-target") UI.equipTarget(el.dataset.target, el.dataset.slot, Number(el.dataset.tier));
    if (action === "finish-run") { CF.Adventure.pause(); UI.closeModal(); UI.renderMenu(); }
    if (action === "failed-run") { UI.closeModal(); UI.renderMap(); }
    if (action === "failed-run-menu") { UI.closeModal(); UI.renderMenu(); }
    if (action === "reset-step-two") UI.resetStepTwo();
    if (action === "confirm-level-start") UI.startSelectedChapter();
    if (action === "arena-continue") { UI.closeModal(); UI.renderArena(); }
    if (action === "postgame-return") { UI.closeModal(); UI.renderMap(); }
    if (action === "trial-continue") { UI.closeModal(); UI.renderTrials(); }
    if (action === "train-card") UI.buyCardTraining(el.dataset.cardType, el.dataset.card);
    if (action === "reset-final") { CF.SaveSystem.reset(); UI.closeModal(); UI.toast("存档已删除并重建。", "good"); UI.renderMenu(); }
    if (action === "confirm-chapter5-finale") { CF.Adventure.prepareChapterFiveFinale(); UI.closeModal(); UI.toast("第五关已调整：前19个首领已击败，只剩最终首领。", "good"); UI.renderMap(); }
  });

  debugRoot.addEventListener("click", event => { const el = event.target.closest("[data-debug]"); if (el) UI.debugAction(el.dataset.debug); });
  document.addEventListener("keydown", event => {
    if (event.key === "F2") { event.preventDefault(); UI.toggleDebug(); return; }
    if (event.key === "Escape" && modalRoot.querySelector(".card-inspect-card")) { event.preventDefault(); UI.closeModal(); return; }
    if ((event.key === "Enter" || event.key === " ") && event.target.matches?.('.deck-row[data-action="inspect-card"]')) {
      event.preventDefault();
      UI.openCardDetail(event.target.dataset.card);
    }
  });
  document.addEventListener("pointermove", event => {
    const selected = UI.battle?.state.selected;
    const selectedCard = selected?.type === "card" ? UI.battle?.selectedCard() : null;
    const isAttacker = selected?.type === "attacker";
    const isWeapon = selected?.type === "weapon";
    const isSkill = selected?.type === "skill";
    const isSpell = selectedCard?.type === "spell" && ["damage", "heal", "buff", "front_aoe", "chain_damage", "swap_stats", "fortify", "execute_draw", "honey_salve", "growth_blessing", "bear_paw", "slime_mend", "gel_barrier", "viscous_prison"].includes(selectedCard.effect);
    if (!isAttacker && !isWeapon && !isSkill && !isSpell) return;
      const target = event.target.closest?.(isSpell
      ? ".slot.targetable .unit, .player-hero.targetable, .enemy-hero-target.targetable"
      : ".slot.targetable .enemy-unit, .enemy-hero-target.targetable");
    if (target) {
      const rect = target.getBoundingClientRect();
      UI.updateAttackArrow(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else UI.updateAttackArrow(event.clientX, event.clientY);
  });
  window.addEventListener("savechange", () => { if (UI.debugOpen) UI.toggleDebug(true); });
  // 存档写入失败（通常是浏览器存储空间已满）：每分钟最多提醒一次，避免刷屏。
  let saveFailedWarnedAt = 0;
  window.addEventListener("savefailed", () => {
    if (Date.now() - saveFailedWarnedAt < 60000) return;
    saveFailedWarnedAt = Date.now();
    UI.toast("存档写入失败：浏览器存储空间可能已满。请到“存档”页面导出存档，并删除不用的栏位。", "bad");
  });

  window.CardForge.UI = UI;

  // 游戏时间计时器：离开封面、选人与读档界面后开始流逝，页面切到后台时暂停。
  const CLOCK_PAUSED_SCREENS = new Set(["cover", "hero-select", "save-slots"]);
  let clockLast = Date.now();
  let clockSaveAt = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delta = now - clockLast;
    clockLast = now;
    const paused = document.visibilityState === "hidden" || CLOCK_PAUSED_SCREENS.has(UI.screen) || (UI.screen === "settings" && UI.settingsReturnScreen === "cover");
    if (paused) return;
    const reports = CF.GameClock.tick(delta);
    if (reports.length) { clockSaveAt = now; UI.handleNewDays(reports); }
    CF.NightEvents.check();
    if (CF.NightEvents.pending() && !UI.battle && UI.screen !== "battle" && !modalRoot.innerHTML) UI.showNightEvent();
    const returned = CF.Labor.collectReturned();
    if (returned.length) { clockSaveAt = now; UI.handleLaborReturns(returned); }
    else if (UI.screen === "prison" && !modalRoot.innerHTML) app.querySelectorAll("[data-labor-timer]").forEach(el => { el.textContent = CF.Labor.returnLabel(el.dataset.laborTimer); });
    else if (now - clockSaveAt > 15000) { clockSaveAt = now; CF.SaveSystem.save(); }
    UI.updateClockChip();
  }, 1000);
  if (new URLSearchParams(window.location.search).get("prepareChapterFiveFinale") === "1") {
    CF.Adventure.prepareChapterFiveFinale();
    window.history.replaceState(null, "", window.location.pathname);
    UI.renderMap();
    UI.toast("第五关已调整：前19个首领已击败，只剩最终首领。", "good");
  } else UI.renderCover();
})();

(function () {
  "use strict";

  const CF = window.CardForge;
  const HERO_PORTRAIT = "assets/hero/novice-swordsman.png";
  const heroProfile = () => CF.currentHero?.() || { id: "captain", name: "护卫队长", title: "边境剑士", portrait: HERO_PORTRAIT, skill: "slash", bio: "出身边境守军的年轻剑士，善于寻找防线中最薄弱的一环。" };
  const pad2 = value => String(value).padStart(2, "0");
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
  const CHAPTER_TWO_NODE_LAYOUT = [
    [6, 80], [18, 91], [38, 86], [48, 69], [60, 84],
    [75, 74], [86, 68], [93, 58], [94, 40], [82, 32],
    [59, 28], [46, 36], [34, 49], [14, 61], [21, 48],
    [16, 35], [14, 18], [52, 12], [72, 18], [87, 12]
  ];
  const CHAPTER_TWO_ROUTE_EDGES = [
    [16, 15], [15, 14], [14, 13], [13, 0], [0, 1], [1, 2], [2, 3], [3, 4],
    [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 19], [14, 12], [12, 3],
    [12, 11], [11, 10], [10, 17], [10, 18], [18, 19]
  ];
  const CHAPTER_THREE_NODE_LAYOUT = [
    [8, 54], [16, 74], [24, 37], [22, 91], [43, 23],
    [40, 91], [46, 49], [71, 70], [61, 78], [77, 85],
    [55, 36], [86, 91], [71, 40], [87, 72], [67, 21],
    [84, 55], [86, 41], [83, 31], [80, 21], [84, 9.5]
  ];
  const CHAPTER_THREE_NPC_LAYOUT = [67, 58];
  const CHAPTER_THREE_ROUTE_CONTROLS = {
    "0-1": [14, 62], "0-2": [14, 43], "1-3": [18, 82], "3-5": [31, 94],
    "5-8": [50, 91], "7-8": [66, 73], "7-9": [74, 76], "9-11": [81, 88],
    "11-13": [89, 82], "13-15": [84, 63], "2-4": [33, 11], "2-6": [29, 55],
    "4-10": [50, 24], "6-10": [51, 43], "6-8": [50, 65], "10-12": [63, 32],
    "10-14": [60, 26], "12-16": [78, 38], "14-18": [73, 21], "15-16": [87, 48],
    "16-17": [85, 36], "17-18": [81, 25], "18-19": [84, 15]
  };
  const CHAPTER_FOUR_NODE_LAYOUT = [
    [7, 83], [17, 70], [24, 88], [28, 58], [36, 78],
    [42, 48], [50, 67], [54, 37], [62, 58], [72, 72],
    [65, 35], [79, 58], [75, 27], [90, 53], [59, 22],
    [73, 16], [86, 22], [91, 69], [84, 39], [92, 32]
  ];
  const CHAPTER_FIVE_NODE_LAYOUT = [
    [8, 82], [18, 68], [28, 87], [31, 53], [43, 74], [45, 38], [56, 83], [59, 59], [67, 34], [73, 76],
    [78, 53], [85, 26], [90, 68], [93, 43], [62, 16], [51, 22], [36, 18], [24, 34], [77, 12], [88, 10]
  ];
  const CHAPTER_ONE_STAGE_LAYOUT = [
    [50, 90], [39, 79], [61, 79], [39, 66], [61, 66], [50, 54], [50, 42],
    [38, 31], [62, 31], [38, 19], [62, 19], [50, 12], [50, 5]
  ];
  const CHAPTER_ONE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6],
    [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 11], [11, 12]
  ];
  // 主菜单：每章的背景战场图与首领徽记。
  const MENU_CHAPTERS = [
    { chapter: 1, name: "第一关", background: "assets/battle/forest-battlefield.png", boss: "assets/enemies/forest-wolf-king.png", bossName: "森林狼王" },
    { chapter: 2, name: "第二关", background: "assets/battle/goblin-stronghold.png", boss: "assets/enemies/goblin-queen.png", bossName: "翠影女王" },
    { chapter: 3, name: "第三关", background: "assets/battle/harvest-farm.png", boss: "assets/enemies/chapter3/bosses/bear-boss-20.png", bossName: "丰穗战母·布蕾娅" },
    { chapter: 4, name: "第四关", background: "assets/battle/dream-slime-forest.png", boss: "assets/enemies/chapter4/bosses/slime-boss-20.png", bossName: "碧露大贤者·涅芙莉" },
    { chapter: 5, name: "第五关", background: "assets/battle/ancient-city-ruins.png", boss: "assets/enemies/chapter5/bosses/wolf-matriarch.png", bossName: "银灰狼女猎手" }
  ];
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
        </div>
        ${showHome ? '<button class="icon-btn" data-action="home" title="返回主菜单">⌂ 主菜单</button>' : ""}
      </header>`;
    },
    frame(content, showHome = true) { this.hideAttackArrow(); app.innerHTML = this.topbar(showHome) + content; if (this.screen === "deck") this.decorateDeckRows(); },
    decorateDeckRows() {
      app.querySelectorAll(".deck-row").forEach(row => {
        const cardId = row.querySelector("[data-card]")?.dataset.card;
        if (!cardId) return;
        const progress = CF.SaveSystem.data.cardProgress[cardId] || { level: 1, xp: 0 };
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
          details.innerHTML = isDeckRow ? `${details.textContent}<span class="card-xp-inline">${progressHTML}</span>` : progressHTML;
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
    toast(message, kind = "") {
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
      app.innerHTML = `<section class="cover-screen" aria-label="裂隙征途游戏封面">
        <div class="cover-shade"></div>
        ${CF.I18n.selectorHTML("cover-language")}
        <div class="cover-menu">
          <span class="cover-kicker">RIFT EXPEDITION</span>
          <h1>裂隙征途</h1>
          <p>护卫队长与王国远征军已经整装待发。</p>
          <div class="cover-actions">
            <button class="cover-button cover-new" data-action="hero-select"><span>新游戏</span><small>选择英雄，踏上新的远征</small></button>
            <button class="cover-button" data-action="cover-continue" ${canContinue ? "" : "disabled"}><span>继续游戏</span><small>${canContinue ? `栏位${activeSlot.slot} · ${activeSlot.heroName} Lv${activeSlot.level}` : "暂无进行中的存档"}</small></button>
            <button class="cover-button" data-action="load-slots" ${hasSaves ? "" : "disabled"}><span>读取存档</span><small>${hasSaves ? `共${CF.SAVE_SLOT_COUNT}个存档栏位` : "暂无存档"}</small></button>
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
        <div class="page-heading"><div><span class="eyebrow">新游戏</span><h2>选择英雄</h2></div><p>除护卫队长外还有8名英雄可选，每人拥有独特的英雄技能。</p><button class="secondary-btn back" data-action="cover">返回封面</button></div>
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
          : `<img src="${slot.portrait}" alt="${slot.heroName}"><div class="save-slot-info"><strong>${slot.heroName} · Lv${slot.level}</strong><small>第${slot.chapter}关 · 节点${slot.chapterCompleted}/${slot.chapterTotal} · 通关${slot.completedRuns}次</small><small>${COIN_ICON} ${slot.coins}${slot.savedAt ? ` · ${formatSavedAt(slot.savedAt)}` : ""}</small></div>`;
        let actions = "";
        if (mode === "new") actions = `<button class="mini-btn" data-action="slot-new" data-slot="${slot.slot}">${slot.empty ? "在此开始" : "覆盖并开始"}</button>`;
        if (mode === "load") actions = `<button class="mini-btn" data-action="slot-load" data-slot="${slot.slot}" ${slot.empty ? "disabled" : ""}>读取</button>`;
        if (mode === "manage") actions = `<button class="mini-btn" data-action="slot-load" data-slot="${slot.slot}" ${slot.empty || slot.active ? "disabled" : ""}>读取</button><button class="mini-btn" data-action="slot-save" data-slot="${slot.slot}">保存到此</button><button class="mini-btn danger" data-action="slot-delete" data-slot="${slot.slot}" ${slot.empty ? "disabled" : ""}>删除</button>`;
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
      this.renderSaveSlots("manage");
    },
    slotDelete(slot) {
      const summary = CF.SaveSystem.slotSummary(slot);
      if (summary.empty) return;
      this.modal(`<h2>删除栏位${slot}？</h2><p>${summary.heroName} Lv${summary.level}的存档将被永久删除。${summary.active ? "这是当前存档：删除后当前进度不会再自动保存到任何栏位。" : ""}</p><div class="menu-actions"><button class="danger-btn" data-modal-action="confirm-slot-delete" data-slot="${slot}">永久删除</button><button class="secondary-btn" data-modal-action="close">取消</button></div>`);
    },

    renderMenu() {
      this.screen = "menu"; this.battle = null; this.activeNode = null;
      const data = CF.SaveSystem.data;
      const activeRun = CF.Adventure.current();
      const trainableUnits = this.trainingCandidates("unit").length;
      const trainableSpells = this.trainingCandidates("spell").length;
      const trainableWeapons = this.trainingCandidates("weapon").length;
      const injuredCount = data.injuredCards?.length || 0;
      const heroNeedsHealing = Boolean(activeRun && activeRun.hp < activeRun.maxHp);
      const needsMedicalCare = injuredCount > 0 || heroNeedsHealing;
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
          <div class="hero-portrait" data-label="${heroProfile().name}"><div class="crest hero-image"><img src="${heroProfile().portrait}" alt="${heroProfile().name}"></div></div>
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
            <button class="icon-btn" data-action="save-slots"><span aria-hidden="true">💾</span> <span>存档</span></button>
            <button class="icon-btn" data-action="settings-page"><span aria-hidden="true">⚙</span> <span>设置</span></button>
          </div>
        </div>
        <div class="menu-tiles">
          <button class="menu-tile" data-action="level-select"><span class="menu-tile-art" style="background-image: url('assets/maps/world-map.png')" aria-hidden="true"></span><strong>关卡选择</strong><small>远征世界</small></button>
          <button class="menu-tile" data-action="hero-page"><span class="menu-tile-art" style="background-image: url('${heroProfile().portrait}')" aria-hidden="true"></span><strong>英雄档案</strong><small>${heroProfile().name} · Lv${data.hero.level}</small></button>
          <button class="menu-tile" data-action="deck-page"><span class="menu-tile-art" style="background-image: url('assets/cards/kingdom-knight.png')" aria-hidden="true"></span><strong>卡组编辑</strong><small>收藏 ${collected} 张</small></button>
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
        <div class="dashboard-grid">
          <div class="dashboard-card shop-card"><h3>训练广场</h3><p>每项卡牌训练或救治服务均需30金币。阵亡的真实随从会进入伤员名单，救治后才能重新出战。</p><div class="shop-actions"><button class="choice-btn" data-action="open-card-training" data-card-type="unit" ${data.coins < 30 || !trainableUnits ? "disabled" : ""}><strong>⚔️ 随从训练 · 30金币</strong><small>选择任意一张未满级随从牌，增加2点经验</small></button><button class="choice-btn" data-action="open-card-training" data-card-type="spell" ${data.coins < 30 || !trainableSpells ? "disabled" : ""}><strong>✨ 法术训练 · 30金币</strong><small>选择任意一张未满级法术牌，增加2点经验</small></button><button class="choice-btn" data-action="open-card-training" data-card-type="weapon" ${data.coins < 30 || !trainableWeapons ? "disabled" : ""}><strong>🗡️ 武器训练 · 30金币</strong><small>选择任意一张未满级武器牌，增加2点经验</small></button><button class="choice-btn" data-action="rescue-injured" ${data.coins < 30 || !needsMedicalCare ? "disabled" : ""}><strong>🩹 救治伤员 · 30金币</strong><small>${injuredCount ? `救治全部${injuredCount}名伤员` : "当前没有伤员"}${activeRun ? ` · 英雄生命 ${activeRun.hp}/${activeRun.maxHp}，同时恢复满生命` : ""}</small></button></div></div>
        </div>
      </section>`, false);
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
      this.modal(`<div class="training-modal-heading" data-training-panel="${type}"><div><span class="eyebrow">训练广场 · 每次30金币</span><h2>${labels[type]}</h2></div><span class="training-coin">${COIN_ICON}<strong data-training-coins>${CF.SaveSystem.data.coins}</strong></span></div><p>点击同一张卡即可连续训练。面板不会关闭，每次增加2点经验并立即更新等级和进度。</p><div class="choice-grid training-card-grid">${choices}</div><div class="menu-actions"><button class="secondary-btn" data-modal-action="close">完成训练</button></div>`, "training-modal");
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
      this.toast(`${rescued.length ? `已救治${rescued.length}名伤员` : "伤员名单为空"}${run ? "，英雄也已恢复满生命。" : "。"}`, "good");
      this.renderMenu();
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
          </div>
          <p>${hero.level >= levelCap ? `当前已达到第${levelCap >= 25 ? "五" : levelCap >= 20 ? "四" : levelCap >= 15 ? "三" : levelCap >= 10 ? "二" : "一"}关等级上限 Lv${levelCap}。` : `距离 Lv${hero.level + 1} 还需 ${next.xp - hero.xp} 经验`}</p><div class="progress"><span style="width:${pct}%"></span></div>
          <div class="skill-panel"><strong>${equippedSkill.icon} 当前英雄技能：${equippedSkill.name}</strong><p>技能最高3级。每赢得一场竞技场比赛，当前装备技能获得2点经验；夺冠还会获得决赛对手的英雄技能。</p></div>
        </div></div>
        <div class="hero-skills-heading"><div><span class="eyebrow">竞技场传承</span><h2>英雄技能</h2></div><p>出战竞技场前先装备想要培养的技能。</p></div>
        <div class="hero-skill-collection">${skillCards}</div>
      </section>`);
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
        const card = CF.getCard(id, data.cardProgress[id]);
        const injured = card.type === "unit" && data.injuredCards?.includes(id);
        const style = card.type === "unit" ? (card.role === "healer" ? "治疗" : (card.combatStyle === "ranged" ? "远程" : "近战")) : card.type === "weapon" ? `${card.combatStyle === "ranged" ? "远程" : "近战"}武器` : "法术";
        const thumb = card.image ? `<img class="deck-thumb" src="${card.image}" alt="" loading="lazy">` : `<span class="deck-icon">${card.icon}</span>`;
        return `<div class="deck-row ${injured ? "injured-card" : ""}" data-action="inspect-card" data-card="${id}" role="button" tabindex="0" aria-label="查看${card.name}完整卡牌"><span class="cost">${card.cost}</span><div class="deck-card-info"><strong>${thumb}<span>${card.name} ×${count}${injured ? '<b class="injured-badge">负伤</b>' : ""}</span></strong><small>Lv${card.level} · ${style} · ${card.keywords.join("、") || "无关键词"}${injured ? " · 无法出战" : ""}</small></div><small class="deck-card-details">${card.type === "unit" ? `${card.attack}/${card.health}` : card.type === "weapon" ? `${card.attack}攻/${card.durability}耐久 · ${card.description}` : card.description}</small><button class="mini-btn" data-action="deck-remove" data-card="${id}">移除</button></div>`;
      }).join("");
      const availableCollection = Object.entries(data.collection).filter(([id, owned]) => owned > 0 && !deckCounts[id]);
      const collectionRows = availableCollection.map(([id, owned]) => {
        const card = CF.getCard(id, data.cardProgress[id]);
        const injured = card.type === "unit" && data.injuredCards?.includes(id);
        const inDeck = deckCounts[id] || 0;
        const canAdd = data.deck.length < deckLimit && inDeck < 1;
        const style = card.type === "unit" ? (card.role === "healer" ? "治疗" : (card.combatStyle === "ranged" ? "远程" : "近战")) : card.type === "weapon" ? `${card.combatStyle === "ranged" ? "远程" : "近战"}武器` : "法术";
        const thumb = card.image ? `<img class="deck-thumb" src="${card.image}" alt="" loading="lazy">` : `<span class="deck-icon">${card.icon}</span>`;
        return `<div class="deck-row ${injured ? "injured-card" : ""}" data-action="inspect-card" data-card="${id}" role="button" tabindex="0" aria-label="查看${card.name}完整卡牌"><span class="cost">${card.cost}</span><div class="deck-card-info"><strong>${thumb}<span>${card.name}${injured ? '<b class="injured-badge">负伤</b>' : ""}</span></strong><small>拥有 ${owned} · 卡组 ${inDeck}/1 · ${card.rarity}</small></div><small class="deck-card-details">Lv${card.level} · ${style} · ${data.cardProgress[id].xp}经验${injured ? " · 无法出战" : ""}</small><button class="mini-btn" data-action="deck-add" data-card="${id}" ${canAdd ? "" : "disabled"}>添加</button></div>`;
      }).join("");
      const duplicateCount = data.deck.length - new Set(data.deck).size;
      const valid = data.deck.length >= 24 && data.deck.length <= deckLimit && duplicateCount === 0;
      const validation = duplicateCount > 0 ? `卡组中有${duplicateCount}张重复卡牌，请保持每张卡只有1张。` : data.deck.length < 24 ? `至少还需加入 ${24 - data.deck.length} 张卡牌。` : data.deck.length > deckLimit ? `需要移除 ${data.deck.length - deckLimit} 张卡牌。` : `✓ 卡组数量正确，可携带24–${deckLimit}张牌。`;
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">整备</span><h2>卡组编辑</h2></div><p>基础牌组为24张；英雄5级后每升一级，牌组上限增加1张。</p></div>
        <div class="deck-layout"><div class="panel deck-column"><h3><span>当前卡组</span><span>${data.deck.length}/${deckLimit}</span></h3><div class="deck-list">${deckRows || "卡组为空"}</div><p class="validation ${valid ? "ok" : ""}">${validation}</p></div>
        <div class="panel deck-column"><h3><span>卡牌收藏</span><span>${availableCollection.length}张可加入</span></h3><div class="deck-list">${collectionRows || "所有收藏卡牌都已加入当前卡组"}</div></div></div>
      </section>`);
    },

    openCardDetail(cardId) {
      const baseCard = CF.CARD_LIBRARY[cardId];
      if (!baseCard || !CF.SaveSystem.data.collection[cardId]) return;
      const progress = CF.SaveSystem.data.cardProgress[cardId] || { level: 1, xp: 0 };
      const card = CF.getCard(cardId, progress);
      const injured = card.type === "unit" && CF.SaveSystem.data.injuredCards?.includes(cardId);
      const typeClass = card.type === "spell" ? "spell" : card.type === "weapon" ? "weapon" : "unit";
      const typeLabel = card.type === "spell" ? "法术" : card.type === "weapon" ? "武器" : "随从";
      const combatLabel = card.type === "unit"
        ? (card.role === "healer" ? "治疗 · 无法攻击" : card.combatStyle === "ranged" ? "远程 · 无反击" : "近战 · 会反击")
        : card.type === "weapon" ? (card.combatStyle === "ranged" ? "远程武器 · 无反击" : "近战武器 · 会反击") : "法术牌";
      const stars = "★".repeat(card.level) + "☆".repeat(5 - card.level);
      const keywords = card.keywords.length ? card.keywords.join(" · ") : (card.type === "spell" ? "即时生效" : "无额外关键词");
      const stats = card.type === "unit"
        ? `<span class="inspect-attack" aria-label="攻击力${card.attack}">⚔<b>${card.attack}</b></span><span class="inspect-health" aria-label="生命值${card.health}">♥<b>${card.health}</b></span>`
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
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">系统</span><h2>设置</h2></div></div>
        <div class="settings-stack">
          <div class="panel language-settings"><div><h3>语言</h3><p>切换游戏界面显示的语言。</p></div>${CF.I18n.selectorHTML()}</div>
          <div class="panel sound-settings"><div><h3>战斗音效</h3><p>近战、远程、法术、死亡和Boss技能均使用不同的原创程序化音效。</p></div>
            <div class="sound-actions"><button class="secondary-btn" data-action="sound-toggle">${sound?.muted ? "开启音效" : "关闭音效"}</button><button class="mini-btn" data-action="sound-preview" ${sound?.muted ? "disabled" : ""}>试听</button></div>
            <label class="sound-volume"><span>音量 <output data-sound-output>${soundVolume}%</output></span><input type="range" min="0" max="100" value="${soundVolume}" data-sound-volume ${sound?.muted ? "disabled" : ""}></label>
          </div>
          <div class="panel"><h3>本地存档</h3><p>英雄等级、经验、法力、金币、收藏、卡组和当前冒险均保存在此浏览器的 localStorage 中。</p>
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
      this.modal(`<span class="eyebrow">统领试炼完成</span><h2>${trial.title}的认可</h2><div class="trial-result"><img src="${trial.portrait}" alt="${trial.name}"><div><strong>${trial.name}</strong><p>${result.firstClear ? `首次通关，最大法力永久提高至 ${result.maxMana}。` : "你再次完成了这项试炼；首次通关奖励已经领取。"}</p></div></div><button class="primary-btn" data-modal-action="trial-continue">返回训练场</button>`);
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
      CF.Adventure.activate(selectedChapter); this.renderMap();
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
    startArenaBattle() {
      const enemy = CF.Arena.opponent();
      if (!enemy || !this.validateDeck()) return;
      this.screen = "battle";
      this.battle = new CF.Battle(enemy, {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: battle => this.handleArenaVictory(battle),
        onDefeat: battle => this.handleArenaDefeat(battle)
      });
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
      const chapterTwo = chapter === 2;
      const chapterThree = chapter === 3;
      const chapterFour = chapter === 4;
      const chapterFive = chapter === 5;
      const layout = chapterFive ? CHAPTER_FIVE_NODE_LAYOUT : chapterFour ? CHAPTER_FOUR_NODE_LAYOUT : chapterThree ? CHAPTER_THREE_NODE_LAYOUT : chapterTwo ? CHAPTER_TWO_NODE_LAYOUT : CHAPTER_ONE_STAGE_LAYOUT;
      const routeLines = CF.Adventure.routeEdges().map(([from, to]) => {
        const start = layout[from];
        const end = layout[to];
        if (chapterThree || chapterFour || chapterFive) {
          const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
          const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
          const control = chapterThree ? (CHAPTER_THREE_ROUTE_CONTROLS[key] || midpoint) : [midpoint[0], midpoint[1] + ((from + to) % 2 ? -2.5 : 2.5)];
          return `<path class="boss-route-line" d="M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}"></path>`;
        }
        return `<line class="boss-route-line" x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}"></line>`;
      }).join("");
      const npcRouteLine = chapterThree
        ? `<path class="boss-route-line npc-route-line" d="M ${CHAPTER_THREE_NPC_LAYOUT[0]} ${CHAPTER_THREE_NPC_LAYOUT[1]} Q 68 64 ${layout[CF.CHAPTER_THREE_NPC.adjacentNode][0]} ${layout[CF.CHAPTER_THREE_NPC.adjacentNode][1]}"></path>`
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
      const npcNode = chapterThree ? `<button class="node-btn boss-map-node farm-npc-node ${npcUnlocked ? "available" : "locked"}" style="--node-x:${CHAPTER_THREE_NPC_LAYOUT[0]}%;--node-y:${CHAPTER_THREE_NPC_LAYOUT[1]}%" data-action="farm-npc" title="${npcUnlocked ? "与留守的农民夫妇交谈" : "先抵达相邻农田节点"}" ${npcUnlocked ? "" : "disabled"}><span class="node-portrait-frame"><img class="node-portrait" src="${CF.CHAPTER_THREE_NPC.portrait}" alt="留守的农民夫妇"></span><small>农民夫妇</small></button>` : "";
      const mapClass = chapterFive ? "chapter-five-map" : chapterFour ? "chapter-four-map" : chapterThree ? "chapter-three-map" : chapterTwo ? "" : "chapter-one-map";
      const mapLabel = chapterFive ? "千枝城废墟二十野兽首领路线图" : chapterFour ? "梦幻森林二十史莱姆首领路线图" : chapterThree ? "金麦农场二十首领路线图" : chapterTwo ? "哥布林王庭二十节点路线图" : "迷雾森林十三节点路线图";
      const mapRoute = `<div class="boss-map-board ${mapClass}" aria-label="${mapLabel}"><svg class="boss-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routeLines}${npcRouteLine}</svg>${routeNodes}${npcNode}</div>`;
      const progressLabel = `已完成 ${run.completed.length} / ${mapStages.length} 节点`;
      const chapterTitle = chapterFive ? "千枝城古城废墟" : chapterFour ? "梦幻森林" : chapterThree ? "金麦农场" : chapterTwo ? "哥布林王庭" : "迷雾森林远征";
      const mapNote = chapterFive ? "灰狼和其他野兽速度极快，许多单位登场即可攻击。击败全部节点后，魔族联军会在废墟建立据点，之后可以反复挑战强大的军官与魔族军队。" : chapterFour ? "沿发光溪流与林间小径推进。每个史莱姆首领都会治疗自身与随从；击败节点后开启所有相邻路线，首胜卡牌会在战后揭晓。" : chapterThree ? "沿金色路线推进。击败节点后会开启所有相邻路线；抵达农舍旁的节点后，可与留守的农民夫妇交谈。每个首领的首胜奖励会在战后揭晓。" : chapterTwo ? "击败任一节点即可开启相邻路线；翠影女王会在抵达右上方终点后开放。大部分节点由哥布林军团驻守。" : "金边节点由更强的敌人驻守；首次击败会获得未知战利品。击败节点后仍可回到岔路挑战相邻路线。";
      const totalFailures = Object.values(run.failures || {}).reduce((sum, count) => sum + Number(count || 0), 0);
      this.frame(`<section class="screen"><div class="page-heading"><div><span class="eyebrow">${progressLabel} · 第${chapter}关独立存档</span><h2>${chapterTitle}</h2></div><p>击败一个节点后，所有相邻的未完成节点都会解锁。战败不会清空本关进度，切换关卡也会分别保存。</p></div>
        <div class="panel map-shell ${chapterFive ? "chapter-five-map-shell" : chapterFour ? "chapter-four-map-shell" : chapterThree ? "chapter-three-map-shell" : chapterTwo ? "chapter-two-map" : ""}"><div class="run-status"><span class="resource-chip">❤️ <strong>${run.hp}/${run.maxHp}</strong></span><span class="resource-chip">${COIN_ICON} 本轮 <strong>+${run.earnedCoins}</strong></span><span class="resource-chip">⭐ 本轮 <strong>+${run.earnedXp}</strong></span><span class="resource-chip">⚔️ 已完成 <strong>${run.completed.length}</strong></span><span class="resource-chip">🛡️ 失败 <strong>${totalFailures}</strong></span></div>
        ${mapRoute}<p class="map-note">${mapNote}</p>
        <button class="secondary-btn" data-action="abandon-run">退出当前关卡</button></div></section>`);
    },

    renderFarmNpc() {
      if (!CF.Adventure.farmNpcUnlocked()) return this.toast("先抵达农舍旁的农田节点。", "bad");
      const npc = CF.CHAPTER_THREE_NPC;
      this.modal(`<span class="eyebrow">金麦农场 · 留守者的证言</span><h2>${npc.name}</h2><div class="farm-npc-dialogue"><img src="${npc.portrait}" alt="${npc.name}"><div>${npc.dialogue.map(text => `<p>“${text}”</p>`).join("")}</div></div><p class="farm-npc-summary">他们并不要求你放下武器，只希望你在见到丰穗战母之前，先知道这些熊族并未伤害原来的村民。</p><button class="primary-btn" data-modal-action="close">我会亲眼判断</button>`);
    },

    enterNode(choiceIndex) {
      const node = CF.Adventure.chooseNode(choiceIndex);
      if (!node) return;
      this.activeNode = node;
      if (["normal", "elite", "boss"].includes(node.type)) this.startBattle(node.type);
      else if (node.type === "event") this.renderEvent();
      else if (node.type === "camp") this.renderCamp();
      else if (node.type === "shop") this.renderShop();
    },

    startBattle(type) {
      this.screen = "battle";
      const enemy = CF.Adventure.encounterFor(type);
      this.activeNode = { ...(this.activeNode || {}), type };
      this.battle = new CF.Battle(enemy, {
        onRender: battle => { this.frame(battle.html()); this.syncAttackArrow(); },
        onToast: (message, kind) => this.toast(message, kind),
        onVictory: battle => this.handleVictory(battle, type),
        onDefeat: battle => this.handleDefeat(battle)
      });
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
      return { id, upgraded };
    },

    handleVictory(battle, type) {
      const run = CF.Adventure.current();
      run.hp = battle.state.storyDefeat ? run.maxHp : battle.state.player.hp;
      const chapterTwo = run.chapter === 2;
      const chapterThree = run.chapter === 3;
      const chapterFour = run.chapter === 4;
      const chapterFive = run.chapter === 5;
      const baseGold = chapterFive ? (type === "normal" ? 100 : type === "elite" ? 180 : 420) : chapterFour ? (type === "normal" ? 75 : type === "elite" ? 120 : 320) : chapterThree ? (type === "normal" ? 55 : type === "elite" ? 90 : 240) : chapterTwo ? (type === "normal" ? 36 : type === "elite" ? 65 : 180) : (type === "normal" ? 20 : type === "elite" ? 40 : 60);
      const baseXp = chapterFive ? (type === "normal" ? 70 : type === "elite" ? 110 : 240) : chapterFour ? (type === "normal" ? 50 : type === "elite" ? 80 : 180) : chapterThree ? (type === "normal" ? 38 : type === "elite" ? 60 : 140) : chapterTwo ? (type === "normal" ? 25 : type === "elite" ? 40 : 100) : (type === "normal" ? 10 : type === "elite" ? 20 : 50);
      CF.SaveSystem.data.coins += baseGold;
      CF.SaveSystem.data.totalVictories += 1;
      run.earnedCoins += baseGold; run.earnedXp += baseXp;
      const levelUp = CF.SaveSystem.addHeroXp(baseXp);
      const used = [...new Set(battle.state.usedCards)].sort(() => Math.random() - .5).slice(0, 3);
      used.forEach(id => {
        const upgraded = CF.SaveSystem.addCardXp(id, 1);
        if (upgraded) { run.cardsLeveled += 1; this.toast(`${CF.CARD_LIBRARY[id].name}升级至 Lv${upgraded.to}！`, "good"); }
      });
      CF.Adventure.syncHeroGrowth();
      if (levelUp) this.toast(`英雄升级！Lv${levelUp.from} → Lv${levelUp.to}`, "good");
      CF.SaveSystem.save();
      const bossCardReward = CF.Adventure.claimActiveWeaponReward() || CF.Adventure.claimActiveChapterTwoCardReward() || CF.Adventure.claimActiveChapterThreeCardReward() || CF.Adventure.claimActiveChapterFourCardReward() || CF.Adventure.claimActiveChapterFiveCardReward();
      const questItemReward = CF.Adventure.claimActiveQueenBloodWaterReward();
      this.showRewards(type, baseGold, baseXp, bossCardReward, questItemReward);
    },

    showRewards(type, baseGold, baseXp, bossCardReward = null, questItemReward = null) {
      const rewards = CF.Adventure.rewards(type);
      if (type === "boss") {
        const bossName = this.battle?.enemyConfig?.name || "Boss";
        const storyDefeat = this.battle?.state?.storyDefeat;
        this.pendingRewards = rewards;
        this.modal(`<span class="eyebrow">${storyDefeat ? "第五关剧情完成" : "最终胜利"}</span><h2>${storyDefeat ? "千枝城反击战结束" : `${bossName}已被击败`}</h2><p>${storyDefeat ? `${bossName}已经落败；魅魔军官随后击溃了小队，但不影响通关与奖励。` : ""}基础战利品：${baseGold}金币 · ${baseXp}英雄经验。请选择一项额外奖励。</p>
          ${bossCardReward ? `<div class="guaranteed-weapon-drop"><span class="eyebrow">首杀固定奖励</span>${this.cardPreview(bossCardReward.cardId)}<strong>${CF.CARD_LIBRARY[bossCardReward.cardId].name}已永久加入收藏</strong></div>` : ""}
          ${questItemReward ? `<div class="quest-item-drop"><img src="${questItemReward.image}" alt="${questItemReward.name}"><div><span class="eyebrow">关键物品</span><strong>${questItemReward.name}</strong><p>河水中的猩红丝线与古老月辉产生共鸣。它能开启统领试炼第七关。</p></div></div>` : ""}
          <div class="reward-grid">${rewards.map((r, index) => `<button class="reward-card" data-modal-action="claim-boss-reward" data-index="${index}"><div class="reward-icon">${r.icon}</div><h3>${r.title}</h3><p>${r.detail}</p></button>`).join("")}</div>`);
      } else {
        this.pendingRewards = rewards;
        this.modal(`<span class="eyebrow">战斗胜利</span><h2>选择一项额外奖励</h2><p>已获得：${baseGold}金币 · ${baseXp}英雄经验 · 使用过的卡牌经验。</p>
          ${bossCardReward ? `<div class="guaranteed-weapon-drop"><span class="eyebrow">首杀固定奖励</span>${this.cardPreview(bossCardReward.cardId)}<strong>${CF.CARD_LIBRARY[bossCardReward.cardId].name}已永久加入收藏</strong></div>` : ""}
          ${questItemReward ? `<div class="quest-item-drop"><img src="${questItemReward.image}" alt="${questItemReward.name}"><div><span class="eyebrow">关键物品</span><strong>${questItemReward.name}</strong><p>已收入行囊，可用于统领试炼第七关。</p></div></div>` : ""}
          <div class="reward-grid">${rewards.map((r, index) => `<button class="reward-card" data-modal-action="claim-reward" data-index="${index}"><div class="reward-icon">${r.icon}</div><h3>${r.title}</h3><p>${r.detail}</p></button>`).join("")}</div>`);
      }
    },

    cardPreview(cardId, compact = false) {
      const card = cardId ? CF.CARD_LIBRARY[cardId] : null;
      if (!card) return "";
      const className = compact ? "shop-card-preview" : "reward-card-preview";
      return `<span class="${className}"><img src="${card.image || ""}" alt="${card.name}" loading="lazy"><span>${card.name}</span></span>`;
    },

    applyReward(reward) {
      const run = CF.Adventure.current();
      if (!reward || !run) return;
      if (reward.type === "maxHealth") CF.SaveSystem.data.hero.maxHealth += reward.value;
      if (reward.type === "gold") { CF.SaveSystem.data.coins += reward.value; run.earnedCoins += reward.value; }
      if (reward.type === "heal") run.hp = Math.min(run.maxHp, run.hp + reward.value);
      if (reward.type === "cardXp") this.grantRandomCardXp(reward.value);
      if (reward.type === "newCard") CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.Adventure.syncHeroGrowth();
      CF.SaveSystem.save();
    },

    finishCombatNode(type) {
      CF.Adventure.finishNode(type);
      this.closeModal(); this.pendingRewards = null; this.battle = null;
      this.renderMap();
    },
    finishBoss() {
      const run = CF.Adventure.current();
      const chapterTwo = run.chapter === 2;
      const chapterThree = run.chapter === 3;
      const chapterFour = run.chapter === 4;
      const chapterFive = run.chapter === 5;
      CF.Adventure.finishNode("boss");
      run.cleared = true;
      if (chapterFive) CF.SaveSystem.data.qianzhiGarrisonUnlocked = true;
      CF.SaveSystem.data.completedRuns = Math.max(CF.SaveSystem.data.completedRuns, run.chapter);
      CF.SaveSystem.save();
      const summaryTitle = chapterFive ? "千枝城的旗帜重新升起" : chapterFour ? "梦幻森林归于寂静" : chapterThree ? "金麦农场的战事落幕" : chapterTwo ? "哥布林王庭陷落" : "密林重见曙光";
      const summaryText = chapterFive ? "你击败银灰狼女猎手后，五位魅魔军官没有继续退避。她们救下狼族首领，以20点攻击的力量击溃小队，并决定在千枝城废墟建立魔族据点、重建这座千年前的共居之城。第五关奖励照常结算，英雄等级上限提升至25级；废墟地图上已经开放可反复挑战的魔族驻军。" : chapterFour ? "你击败了碧露大贤者·涅芙莉，迫使史莱姆族群退回森林深处，并将英雄等级上限提升至20级。" : chapterThree ? "你击败了丰穗战母·布蕾娅，完成第三关并解锁东部梦幻森林与英雄20级上限。" : chapterTwo ? "你击败了翠影女王，完成第二关的二十场首领战，并解锁王城南部的金麦农场与英雄15级上限。" : "你击败了森林狼王，并解锁第二关与英雄10级上限。最大法力只在统领试炼中提升。";
      this.modal(`<span class="eyebrow">冒险总结</span><h2>${summaryTitle}</h2><p>${summaryText}所有永久成长均已保存。</p><div class="summary-list">
        <div><span>本轮金币</span><strong>+${run.earnedCoins}</strong></div><div><span>英雄经验</span><strong>+${run.earnedXp}</strong></div><div><span>升级卡牌</span><strong>${run.cardsLeveled}</strong></div><div><span>完成节点</span><strong>${run.completed.length}/${run.chapter === 1 ? 13 : 20}</strong></div>
        </div><button class="primary-btn" data-modal-action="finish-run">返回主菜单</button>`);
    },
    handleDefeat(battle) {
      const run = CF.Adventure.recordDefeat();
      this.modal(`<span class="eyebrow">本次挑战失败</span><h2>队伍退回本关营地</h2><p>第${run.chapter}关的独立存档没有回退：已击败节点、路线和奖励全部保留，英雄已恢复满生命。本战阵亡的随从仍需在训练广场救治。</p><div class="summary-list">
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
      if (choice === "rest") { const before = run.hp; run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * .3)); this.toast(`恢复${run.hp - before}点生命。`, "good"); }
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
      if (choice.effect === "heal") run.hp = Math.min(run.maxHp, run.hp + choice.value);
      if (choice.effect === "card") CF.SaveSystem.addCardToCollection(choice.cardId);
      if (choice.effect === "gamble") {
        if (Math.random() < .5) { CF.SaveSystem.data.coins += 30; run.earnedCoins += 30; this.toast("你找到30金币！", "good"); }
        else { run.hp = Math.max(1, run.hp - 5); this.toast("埋伏！你受到5点伤害。", "bad"); }
      }
      if (choice.effect === "train_paid") {
        if (CF.SaveSystem.data.coins < choice.cost) return this.toast("金币不足。", "bad");
        CF.SaveSystem.data.coins -= choice.cost; this.grantRandomCardXp(2, "unit");
      }
      if (choice.effect === "crystal_study") { run.hp = Math.max(1, run.hp - 5); this.grantRandomCardXp(choice.value, "spell"); }
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

  app.addEventListener("click", event => {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
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
      if (CF.SaveSystem.equipHeroSkill(el.dataset.skill)) UI.toast(`已装备「${CF.HERO_SKILLS[el.dataset.skill].name}」。`, "good");
      UI.renderHero();
    }
    if (action === "deck-page") UI.renderDeck();
    if (action === "inspect-card") UI.openCardDetail(el.dataset.card);
    if (action === "settings-page") UI.renderSettings(UI.screen === "cover" ? "cover" : "menu");
    if (action === "open-card-training") UI.openCardTraining(el.dataset.cardType);
    if (action === "rescue-injured") UI.rescueInjured();
    if (action === "sound-toggle") { CF.SoundFX?.toggleMuted(); UI.renderSettings(); }
    if (action === "sound-preview") {
      CF.SoundFX?.play("melee");
      setTimeout(() => CF.SoundFX?.play("ranged"), 330);
      setTimeout(() => CF.SoundFX?.play("fire"), 650);
    }
    if (action === "new-run") UI.requestNewRun();
    if (action === "continue-run") UI.renderMap();
    if (action === "deck-remove") { const index = CF.SaveSystem.data.deck.lastIndexOf(el.dataset.card); if (index >= 0) CF.SaveSystem.data.deck.splice(index,1); CF.SaveSystem.save(); UI.renderDeck(); }
    if (action === "deck-add" && CF.SaveSystem.data.deck.length < CF.SaveSystem.deckLimit() && !CF.SaveSystem.data.deck.includes(el.dataset.card)) { CF.SaveSystem.data.deck.push(el.dataset.card); CF.SaveSystem.save(); UI.renderDeck(); }
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
    if (action === "close") {
      const closingTraining = Boolean(modalRoot.querySelector("[data-training-panel]"));
      UI.closeModal();
      if (closingTraining && UI.screen === "menu") UI.renderMenu();
    }
    if (action === "tutorial-done") { CF.SaveSystem.data.tutorialSeen = true; CF.SaveSystem.save(); UI.closeModal(); }
    if (action === "confirm-new-run") UI.startNewRun();
    if (action === "confirm-leave-battle") { UI.closeModal(); UI.leaveCurrentRun(); }
    if (action === "confirm-slot-new") UI.startNewGame(Number(el.dataset.slot));
    if (action === "confirm-slot-load") UI.finishSlotLoad(Number(el.dataset.slot));
    if (action === "confirm-slot-save") UI.finishSlotSave(Number(el.dataset.slot));
    if (action === "confirm-slot-delete") { CF.SaveSystem.deleteSlot(Number(el.dataset.slot)); UI.closeModal(); UI.toast("存档已删除。", "good"); UI.renderSaveSlots(UI.slotMode || "manage"); }
    if (action === "confirm-pause-run") { CF.Adventure.pause(); UI.closeModal(); UI.renderMenu(); return; }
    if (action === "confirm-abandon") { CF.Adventure.abandon(); UI.closeModal(); UI.renderMenu(); }
    if (action === "claim-reward") { UI.applyReward(UI.pendingRewards[Number(el.dataset.index)]); UI.finishCombatNode(UI.activeNode.type); }
    if (action === "claim-boss-reward") { UI.applyReward(UI.pendingRewards[Number(el.dataset.index)]); UI.finishBoss(); }
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

  window.CardForge.UI = UI;
  if (new URLSearchParams(window.location.search).get("prepareChapterFiveFinale") === "1") {
    CF.Adventure.prepareChapterFiveFinale();
    window.history.replaceState(null, "", window.location.pathname);
    UI.renderMap();
    UI.toast("第五关已调整：前19个首领已击败，只剩最终首领。", "good");
  } else UI.renderCover();
})();

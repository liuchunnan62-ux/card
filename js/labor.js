(function () {
  "use strict";

  // 犯人派遣劳动：结缘后的在押首领每天可以派出去干一次活，游戏时间6小时（现实6分钟）后带着收获回营。
  // 各族分工不同，产出随好感等级提高：
  //   哥布林下矿挖金币；熊族种田产面粉（粮食）；史莱姆熬药给卡组里的卡牌加经验；狼族打猎带回带骨肉与少量粮食。
  // 派遣在外的首领不在牢里，当天无法投喂。
  const CF = window.CardForge;
  // 各族分工与每级收获来自经济数值表 js/data/economy.js。
  const JOB_HOURS = CF.ECONOMY.labor.jobHours;
  const JOBS = CF.ECONOMY.labor.jobs;

  const save = () => CF.SaveSystem.data;
  const laborMap = () => save().labor || (save().labor = {});
  const laborDayMap = () => save().laborDay || (save().laborDay = {});
  const jobMs = () => CF.GameClock.DAY_MS * JOB_HOURS / 24;

  const Labor = {
    JOBS,
    JOB_HOURS,
    jobFor(chapter) { return JOBS[chapter] || null; },
    // 按好感等级计算一次劳动的收获（等级 1~5）。
    yieldFor(chapter, level) {
      const lv = Math.max(1, Number(level) || 1);
      const job = JOBS[chapter];
      if (!job) return null;
      const at = values => values[Math.min(lv, values.length) - 1];
      const result = {};
      Object.entries(job.yields).forEach(([key, values]) => {
        result[key] = key === "foods" ? Object.fromEntries(Object.entries(values).map(([id, counts]) => [id, at(counts)])) : at(values);
      });
      return result;
    },
    yieldText(result) {
      if (!result) return "";
      const parts = [];
      if (result.coins) parts.push(`${result.coins}金币`);
      if (result.rations) parts.push(`${result.rations}份粮食`);
      if (result.cardXp) parts.push(`卡牌经验+${result.cardXp}`);
      Object.entries(result.foods || {}).forEach(([id, count]) => parts.push(`${CF.Restaurant.food(id)?.name || id}×${count}`));
      return parts.join("、");
    },
    job(key) { return laborMap()[key] || null; },
    isAway(key) { return Boolean(this.job(key)); },
    workedToday(key) { return Number(laborDayMap()[key]) === CF.GameClock.day(); },
    // 离回营还有多久（现实时间）。
    returnLabel(key) {
      const job = this.job(key);
      if (!job) return "";
      const seconds = Math.max(0, Math.ceil((job.returnAt - CF.GameClock.now()) / 1000));
      return seconds >= 60 ? `${Math.ceil(seconds / 60)}分钟` : `${seconds}秒`;
    },
    canDispatch(key) {
      const prisoner = CF.Adventure.prisonRoster().find(entry => entry.key === key);
      if (!prisoner?.captured || !JOBS[prisoner.chapter]) return { ok: false, reason: "这名觉醒者无法派遣。" };
      if (!CF.Restaurant.isBonded(key)) return { ok: false, reason: `${prisoner.name}还没有与你结缘，不肯替你干活。` };
      if (this.isAway(key)) return { ok: false, reason: `${prisoner.name}正在外面${JOBS[prisoner.chapter].name}。` };
      if (this.workedToday(key)) return { ok: false, reason: `${prisoner.name}今天已经干过活了，明天再派吧。` };
      return { ok: true, prisoner };
    },
    dispatch(key) {
      const check = this.canDispatch(key);
      if (!check.ok) return check;
      const now = CF.GameClock.now();
      laborMap()[key] = { chapter: check.prisoner.chapter, startedAt: now, returnAt: now + jobMs() };
      laborDayMap()[key] = CF.GameClock.day();
      CF.SaveSystem.save();
      return { ok: true, prisoner: check.prisoner, job: JOBS[check.prisoner.chapter] };
    },
    // 一键派遣：把今天还没干活、已结缘、在牢里的首领全部派出去。
    dispatchAll() {
      const sent = CF.Adventure.prisonRoster().filter(prisoner => this.canDispatch(prisoner.key).ok).map(prisoner => this.dispatch(prisoner.key)).filter(result => result.ok);
      return sent;
    },
    idleCount() { return CF.Adventure.prisonRoster().filter(prisoner => this.canDispatch(prisoner.key).ok).length; },
    awayCount() { return Object.keys(laborMap()).length; },
    // 到点回营的首领交出收获；返回每人的结算结果。
    collectReturned() {
      const now = CF.GameClock.now();
      const roster = CF.Adventure.prisonRoster();
      const results = Object.entries(laborMap()).filter(([, job]) => job.returnAt <= now).map(([key, job]) => {
        delete laborMap()[key];
        const prisoner = roster.find(entry => entry.key === key);
        const reward = this.yieldFor(job.chapter, CF.Restaurant.bondLevel(key));
        const data = save();
        if (reward.coins) data.coins += reward.coins;
        if (reward.rations) data.rations = CF.Restaurant.rations() + reward.rations;
        Object.entries(reward.foods || {}).forEach(([id, count]) => { data.foods = data.foods || {}; data.foods[id] = CF.Restaurant.foodCount(id) + count; });
        let cardLevel = null;
        if (reward.cardXp) {
          const candidates = [...new Set(data.deck)].filter(id => (data.cardProgress[id]?.level || 1) < 5);
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) { reward.cardId = target; cardLevel = CF.SaveSystem.addCardXp(target, reward.cardXp); }
          else { reward.coins = reward.cardXp * 5; data.coins += reward.coins; delete reward.cardXp; }
        }
        return { key, name: prisoner?.name || key, job: JOBS[job.chapter], reward, cardLevel };
      });
      if (results.length) CF.SaveSystem.save();
      return results;
    }
  };

  CF.Labor = Labor;
})();

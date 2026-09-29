(function () {
  "use strict";

  // 游戏时间：游戏界面打开时流逝，现实12分钟为游戏里的一天（离开封面后才开始计时，切到后台暂停）。
  // 每到新的一天：
  //   · 每名在押首领又可以投喂一次（每只首领每天只能靠投喂增加一次好感度）；
  //   · 队伍日常口粮消耗 DAILY_BATTLES 场战斗的粮食量（出战随从 + 在押犯人），不够则吃光。
  const CF = window.CardForge;
  const DAY_MS = 12 * 60 * 1000;
  const DAILY_BATTLES = 3;
  // 单次计时最多记入的毫秒数：电脑休眠、标签页被冻结时不会一下子跳过好几天。
  const MAX_TICK_MS = 5000;

  const clock = () => {
    const save = CF.SaveSystem.data;
    const raw = save.clock && typeof save.clock === "object" ? save.clock : {};
    save.clock = {
      day: Math.max(1, Math.floor(Number(raw.day) || 1)),
      elapsed: Math.max(0, Math.min(DAY_MS - 1, Number(raw.elapsed) || 0))
    };
    return save.clock;
  };

  const GameClock = {
    DAY_MS,
    DAILY_BATTLES,
    MAX_TICK_MS,
    day() { return clock().day; },
    // 当天已过去的比例（0~1）与剩余毫秒。
    progress() { return clock().elapsed / DAY_MS; },
    msUntilNextDay() { return DAY_MS - clock().elapsed; },
    // 游戏内时钟：一天从早上6点开始，24小时对应12分钟。
    timeLabel() {
      const minutes = Math.floor((6 * 60 + this.progress() * 24 * 60) % (24 * 60));
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    },
    // 离下一天还有多久（现实时间），用于提示。
    untilNextDayLabel() {
      const seconds = Math.ceil(this.msUntilNextDay() / 1000);
      return seconds >= 60 ? `${Math.ceil(seconds / 60)}分钟` : `${seconds}秒`;
    },
    dailyRations() { return CF.Restaurant.upkeep().total * DAILY_BATTLES; },
    // 推进时间；返回本次跨过的每一天的结算结果。
    advance(ms) {
      const state = clock();
      state.elapsed += Math.max(0, Number(ms) || 0);
      const reports = [];
      while (state.elapsed >= DAY_MS) {
        state.elapsed -= DAY_MS;
        state.day += 1;
        reports.push(this.startDay(state.day));
      }
      return reports;
    },
    // 新一天的结算：扣除三场战斗的口粮。投喂次数按日期自动刷新，无需在此清理。
    startDay(day) {
      const save = CF.SaveSystem.data;
      const need = this.dailyRations();
      const have = CF.Restaurant.rations();
      save.rations = Math.max(0, have - need);
      return { day, need, eaten: Math.min(have, need), hungry: have < need };
    },
    // 界面计时器每秒调用一次；delta 超过上限时按上限计。
    tick(delta) {
      const reports = this.advance(Math.min(MAX_TICK_MS, Math.max(0, delta)));
      if (reports.length) CF.SaveSystem.save();
      return reports;
    }
  };

  CF.GameClock = GameClock;
})();

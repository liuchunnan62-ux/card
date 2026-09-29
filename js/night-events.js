(function () {
  "use strict";

  // 夜晚事件：游戏时间每晚 22:00 入夜时，典狱长艾德琳会来报告一件营地监狱里发生的事，有的需要你做决定。
  // 每晚最多一件；在赤龙客栈过夜可以跳过当晚的事件。战斗中或弹窗打开时，事件会先挂起，回到普通界面再报告。
  //   · 饥饿闹事：粮食吃光时必定发生——花钱连夜补粮，或任由在押首领好感下降；
  //   · 越狱企图：好感很低的首领想逃跑——修牢门，或去和它谈谈；
  //   · 深夜礼物：好感达到挚友的首领偷偷留下东西（按种族：金币/粮食/卡牌经验/带骨肉）；
  //   · 牢房夜话：同族两名已结缘首领的夜谈被你听见，两者好感上升；
  //   · 粮仓鼠患：买捕鼠夹，或交给典狱长的猫碰碰运气；
  //   · 月圆之夜：每7天一次，狼族首领对月长嗥，好感上升。
  const CF = window.CardForge;
  const NIGHT_START = 16 / 24; // 一天从6:00开始，16小时后是22:00。
  const DAILY_GIFTS = {
    2: { text: "一小袋从矿里偷偷藏下的碎金", reward: { coins: 20 } },
    3: { text: "一捆晒干的新麦", reward: { rations: 20 } },
    4: { text: "一小瓶亮晶晶的药水", reward: { cardXp: 3 } },
    5: { text: "一块啃得干干净净、又重新烤过的带骨肉", reward: { foods: { bone_roast: 1 } } }
  };

  const save = () => CF.SaveSystem.data;
  const R = () => CF.Restaurant;
  const roster = () => CF.Adventure.prisonRoster().filter(prisoner => prisoner.captured);
  const bondable = () => roster().filter(prisoner => prisoner.cardId);
  const byKey = key => roster().find(prisoner => prisoner.key === key);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function applyReward(reward) {
    const data = save();
    const out = { ...reward };
    if (reward.coins) data.coins += reward.coins;
    if (reward.rations) data.rations = R().rations() + reward.rations;
    Object.entries(reward.foods || {}).forEach(([id, count]) => { data.foods = data.foods || {}; data.foods[id] = R().foodCount(id) + count; });
    if (reward.cardXp) {
      const candidates = [...new Set(data.deck)].filter(id => (data.cardProgress[id]?.level || 1) < 5);
      const target = pick(candidates);
      if (target) { CF.SaveSystem.addCardXp(target, reward.cardXp); out.cardId = target; }
      else { delete out.cardXp; out.coins = reward.cardXp * 5; data.coins += out.coins; }
    }
    return out;
  }

  // 每个事件：condition 决定今晚能否发生，weight 为权重，roll 生成存档里的参数，
  // view 根据参数生成标题、正文与选项；选项的 apply 返回结果说明。
  const EVENTS = {
    riot: {
      weight: 100,
      condition: () => R().rations() <= 0 && bondable().length > 0,
      roll: () => ({}),
      view: () => {
        const need = CF.GameClock.dailyRations();
        const { bags, cost } = R().flourFor(need);
        return {
          title: "牢里闹起来了",
          text: `“粮仓见底了。”艾德琳的钥匙串响个不停，“饿了一整天的家伙们在拍牢门，哥布林在骂人，熊在撞墙，狼在嚎。再不给吃的，它们会记恨你的。”`,
          choices: [
            { label: `连夜买面粉安抚（${cost}金币）`, detail: `买${bags}袋面粉，补足一天的口粮`, disabled: save().coins < cost, apply: () => {
              const bought = R().buyFlour(bags);
              return bought.ok ? `你叫醒了金杯餐馆的老板。${bags}袋面粉连夜送进监狱，牢里渐渐安静下来。` : bought.reason;
            } },
            { label: "让它们饿着", detail: "所有可结缘的在押首领好感-10（已结缘的不会跌回未结缘）", apply: () => {
              bondable().forEach(prisoner => R().adjustAffinity(prisoner.key, -10));
              return "那一夜，牢里的咒骂声一直没停。第二天早上，它们看你的眼神冷了很多（好感-10）。";
            } }
          ]
        };
      }
    },
    escape: {
      weight: 3,
      condition: () => bondable().some(prisoner => R().affinity(prisoner.key) < 30),
      roll: () => ({ key: pick(bondable().filter(prisoner => R().affinity(prisoner.key) < 30)).key }),
      view: ({ key }) => {
        const prisoner = byKey(key);
        const name = prisoner?.name || "某个犯人";
        return {
          title: "越狱企图",
          text: `“${name}用磨尖的骨头撬开了牢门的锁。”艾德琳拎着它的后颈把它丢回牢房，“我的猫先发现的。锁坏了，要么花钱换新锁，要么你自己去问问它，到底想跑去哪儿。”`,
          choices: [
            { label: "换一把新锁（20金币）", detail: "加固牢门，此事到此为止", disabled: save().coins < 20, apply: () => {
              save().coins -= 20;
              return "铁匠连夜送来一把新锁。艾德琳满意地拍了拍牢门：“这回连我的猫都打不开。”";
            } },
            { label: "去和它谈谈", detail: `${name}好感+8，但典狱长要拿5份粮食哄它睡觉`, apply: () => {
              R().adjustAffinity(key, 8);
              save().rations = Math.max(0, R().rations() - 5);
              return `${name}缩在角落里，半天才说：“我只是想回去看看……家里还有没长大的崽子。”你陪它坐了一会儿。它没有再撬锁（好感+8，粮食-5）。`;
            } }
          ]
        };
      }
    },
    gift: {
      weight: 3,
      condition: () => bondable().some(prisoner => R().bondLevel(prisoner.key) >= 3),
      roll: () => ({ key: pick(bondable().filter(prisoner => R().bondLevel(prisoner.key) >= 3)).key }),
      view: ({ key }) => {
        const prisoner = byKey(key);
        const gift = DAILY_GIFTS[prisoner?.chapter] || DAILY_GIFTS[2];
        return {
          title: "深夜礼物",
          text: `“${prisoner?.name || "有个犯人"}让我转交给你。”艾德琳把一个布包放在桌上，是${gift.text}。“它说，别让别人知道是它给的。”`,
          choices: [
            { label: "收下", detail: "收下这份心意", apply: () => {
              const got = applyReward(gift.reward);
              return `你收下了礼物：${CF.Labor.yieldText(got)}${got.cardId ? `（${CF.CARD_LIBRARY[got.cardId].name}）` : ""}。`;
            } }
          ]
        };
      }
    },
    chat: {
      weight: 2,
      condition: () => [2, 3, 4, 5].some(chapter => bondable().filter(prisoner => prisoner.chapter === chapter && R().isBonded(prisoner.key)).length >= 2),
      roll: () => {
        const chapter = pick([2, 3, 4, 5].filter(id => bondable().filter(prisoner => prisoner.chapter === id && R().isBonded(prisoner.key)).length >= 2));
        const pool = bondable().filter(prisoner => prisoner.chapter === chapter && R().isBonded(prisoner.key));
        const first = pick(pool);
        const second = pick(pool.filter(prisoner => prisoner.key !== first.key));
        return { a: first.key, b: second.key };
      },
      view: ({ a, b }) => {
        const first = byKey(a); const second = byKey(b);
        return {
          title: "牢房夜话",
          text: `巡夜时，你听见${first?.name || "一个犯人"}和${second?.name || "另一个犯人"}隔着墙小声说话。“……那个人类今天又来送吃的了。”“嗯。你说，等我们出去以后……还能再见到他吗？”`,
          choices: [
            { label: "悄悄离开", detail: "别打扰它们，两名首领好感各+5", apply: () => {
              R().adjustAffinity(a, 5); R().adjustAffinity(b, 5);
              return "你放轻脚步离开了。第二天，它们看你的时候，都多了一点笑意（好感各+5）。";
            } }
          ]
        };
      }
    },
    rats: {
      weight: 2,
      condition: () => roster().length > 0 && R().rations() > 0,
      roll: () => ({}),
      view: () => ({
        title: "粮仓鼠患",
        text: "“粮仓里闹老鼠了。”艾德琳打了个哈欠，头上的猫竖起了耳朵，“要么去买几个捕鼠夹，要么让我的猫值个夜班。它最近有点胖，抓不抓得到，看它心情。”",
        choices: [
          { label: "买捕鼠夹（10金币）", detail: "稳妥，粮食不受损失", disabled: save().coins < 10, apply: () => {
            save().coins -= 10;
            return "第二天早上，捕鼠夹上夹住了七只老鼠。粮仓安然无恙。";
          } },
          { label: "交给典狱长的猫", detail: "一半机会全部抓住，否则损失一成粮食", apply: () => {
            if (Math.random() < 0.5) return "天亮时，猫把一排老鼠整整齐齐地摆在粮仓门口，骄傲地舔着爪子。";
            const lost = Math.max(1, Math.ceil(R().rations() * 0.1));
            save().rations = Math.max(0, R().rations() - lost);
            return `猫在粮仓里睡着了。天亮时，老鼠吃掉了${lost}份粮食。艾德琳假装没看见。`;
          } }
        ]
      })
    },
    fullmoon: {
      weight: 50,
      condition: () => CF.GameClock.day() % 7 === 0 && bondable().some(prisoner => prisoner.chapter === 5),
      roll: () => ({}),
      view: () => ({
        title: "月圆之夜",
        text: "今晚是满月。狼族首领们扒着牢窗，对着月亮长嗥，声音一直传到很远的地方。艾德琳没有去制止：“让它们叫吧。千枝城的狼，满月时都会这样想家。”",
        choices: [
          { label: "陪它们看一会儿月亮", detail: "所有狼族在押首领好感+5", apply: () => {
            bondable().filter(prisoner => prisoner.chapter === 5).forEach(prisoner => R().adjustAffinity(prisoner.key, 5));
            return "你在牢窗下坐到深夜。嗥叫声渐渐低下去，最后变成了轻轻的呜咽，像是在道谢（狼族好感各+5）。";
          } }
        ]
      })
    }
  };

  const NightEvents = {
    NIGHT_START,
    EVENTS,
    isNight() { return CF.GameClock.progress() >= NIGHT_START; },
    pending() { return save().nightEvent || null; },
    // 抽取今晚的事件：优先必定发生的（闹事、月圆），其余按权重随机。
    roll(forceId = null) {
      const available = Object.entries(EVENTS).filter(([id, event]) => (forceId ? id === forceId : true) && event.condition());
      if (!available.length) return null;
      const total = available.reduce((sum, [, event]) => sum + event.weight, 0);
      let roll = Math.random() * total;
      const [id, event] = available.find(([, entry]) => (roll -= entry.weight) < 0) || available[available.length - 1];
      return { id, day: CF.GameClock.day(), params: event.roll() };
    },
    // 计时器每秒调用：入夜后每天最多抽一次事件，挂起在存档里等待报告。
    check() {
      const data = save();
      const day = CF.GameClock.day();
      if (!this.isNight() || Number(data.nightRolled) === day || data.nightEvent) return null;
      data.nightRolled = day;
      data.nightEvent = this.roll();
      CF.SaveSystem.save();
      return data.nightEvent;
    },
    // 在客栈过夜：今晚不再发生事件。
    skipTonight() { save().nightRolled = CF.GameClock.day(); },
    view(event = this.pending()) {
      if (!event || !EVENTS[event.id]) return null;
      return EVENTS[event.id].view(event.params || {});
    },
    resolve(choiceIndex) {
      const event = this.pending();
      const view = this.view(event);
      const choice = view?.choices[Number(choiceIndex)];
      if (!choice) return { ok: false, reason: "这件事已经处理过了。" };
      if (choice.disabled) return { ok: false, reason: "金币不足，选不了这个。" };
      const text = choice.apply();
      save().nightEvent = null;
      CF.SaveSystem.save();
      return { ok: true, title: view.title, text };
    }
  };

  CF.NightEvents = NightEvents;
})();

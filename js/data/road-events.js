(function () {
  "use strict";

  // 冒险地图上“❓”事件节点的随机事件。
  // 每个事件：id、name、icon、text，以及 choices（label 按钮文字、detail 说明、effect 效果类型与参数）。
  // effect 可用：heal（value 点生命）、card（获得 cardId）、gamble、train_paid（cost 金币）、crystal_study（value 经验）、spell_xp（value 经验）、leave。
  // 新的 effect 类型需要在 main.js 的事件处理里实现。
  const CF = window.CardForge = window.CardForge || {};

  const ROAD_EVENTS = [
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

  CF.ROAD_EVENTS = ROAD_EVENTS;
})();

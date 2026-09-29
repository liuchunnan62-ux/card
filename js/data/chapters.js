(function () {
  "use strict";

  // 关卡数据表：五个章节的节点、路线、地图坐标、敌人强度与胜利奖励都集中在这里。
  // 逻辑代码（adventure.js、main.js、save.js 与平衡模拟）只读这张表；调整首领、数值或地图位置时只改本文件。
  //
  // 章节字段：
  //   id / name / region          章节编号、菜单名、地区名
  //   menu                        主菜单章节徽记：background 战场背景图、boss 首领头像、bossName 首领名
  //   map                         地图页：title 标题、label 无障碍说明、note 提示文字、className/shellClass 样式类名
  //   clearSummary                通关总结弹窗的标题与正文
  //   victoryRewards              每场胜利的基础奖励 { normal|elite|boss: { gold, xp } }
  //   rewardCardIds               （第2~5关）各节点首杀奖励卡，按节点序号对应，定义在 cards.js
  //   encounter                   （第2~5关）普通/精英首领的强度公式，stage 为节点序号（0 起）：
  //       health                  生命 = round(base + stage × perStage) + 精英额外 eliteBonus
  //       mana / cardLevel        { normal, elite } 敌方法力与卡牌等级
  //       deck                    牌组：from: "enemy" 表示沿用节点 enemyId 对应敌人的牌组，再重复前 extra 张；
  //                               否则取 units/spells 卡池的前 N 张（N = min(max, base + floor(stage / per))）并复制 copies 份
  //       passive / skills / battlefield / title / icon / description  首领被动、技能说明、战场与文案
  //   heroSkill                   首领的英雄技能（arena.js 的 HERO_SKILLS 编号）：每个敌方行动回合在出牌后免费发动一次（相当于被动）；
  //                               levels 为普通/精英/最终首领使用的技能等级（1~3），boss 可为最终首领单独指定技能；
  //                               fallbackSummon（可选）：没有受伤的己方随从时改为召唤这个随从（attack/health 按技能等级取值）
  //                               overrides（可选）：只在本关覆盖技能数值，例如 { amount: 1, heal: 0 }（不影响竞技场等其他地方的同名技能）
  //   bossWeapon                  首领随身武器 { normal|elite|boss: { id, level } }：开战即装备，不消耗耐久，每个行动回合都能攻击一次；
  //                               第一关节点的 weaponId（首杀掉落武器）优先于这里的 id。冒险中的首领每个行动回合还会把手牌补到10张。
  //   chapterWeapon               （第2~5关）关卡武器（cards.js 中的武器牌）：击败本关第一个首领后永久获得，可在英雄档案装备
  //   routeStyle                  地图连线样式："line" 直线，"curve" 曲线（可用 routeControls 指定控制点）
  //   nodes                       节点列表，下标即节点序号：
  //       type                    normal 普通 / elite 精英 / boss 最终首领 / event 事件 / shop 商店 / camp 营地
  //       label                   节点名称（首领名）
  //       enemyId                 敌人编号（enemies.js）；第3~5关普通/精英节点可省略，由 encounter 公式生成
  //       portrait                地图头像
  //       weaponId                （第一关）首杀掉落的武器牌
  //       pos                     地图坐标 [x%, y%]
  //   edges                       节点之间的路线 [from, to]
  // 修改后运行 npm test：tests/content-data.test.cjs 会检查引用的敌人、卡牌、图片是否存在，路线是否连通。
  const CF = window.CardForge = window.CardForge || {};

  const CHAPTERS = [
    {
      id: 1, name: "第一关", region: "迷雾森林",
      menu: { background: "assets/battle/forest-battlefield.png", boss: "assets/enemies/forest-wolf-king.png", bossName: "森林狼王" },
      map: { title: "迷雾森林远征", label: "迷雾森林十三节点路线图", className: "chapter-one-map", shellClass: "",
        note: "金边节点由更强的敌人驻守；首次击败会获得未知战利品。击败节点后仍可回到岔路挑战相邻路线。" },
      clearSummary: { title: "密林重见曙光",
        text: "你击败了森林狼王，并解锁第二关与英雄10级上限。最大法力只在统领试炼中提升。" },
      bossWeapon: { normal: { id: "mist_dagger", level: 1 }, elite: { id: "silverfeather_bow", level: 1 }, boss: { id: "riftmoon_blade", level: 1 } }, // 节点手持自己掉落的武器（weaponId 优先）
      // 猎手射击：打生命最低的随从；狼王：寒牙撕咬。第一关削弱：每回合只造成1点伤害、不回血。
      heroSkill: { id: "hunt", boss: "frost_fang", levels: { normal: 1, elite: 2, boss: 3 }, overrides: { amount: 1, heal: 0 } },
      victoryRewards: { normal: { gold: 20, xp: 10 }, elite: { gold: 40, xp: 20 }, boss: { gold: 60, xp: 50 } },
      routeStyle: "line",
      nodes: [
        { type: "normal", label: "林道遭遇", icon: "⚔️", pos: [50, 90] },
        { type: "normal", label: "断桥之战", enemyId: "goblin_warband", icon: "⚔️", portrait: "assets/enemies/goblin-warband.png", weaponId: "mist_dagger", pos: [39, 79] },
        { type: "event", label: "迷雾岔路", icon: "❓", pos: [61, 79] },
        { type: "normal", label: "兽径伏击", enemyId: "wolf_swarm", icon: "⚔️", portrait: "assets/enemies/wolf-swarm.png", weaponId: "bridge_oathblade", pos: [39, 66] },
        { type: "shop", label: "行脚商队", icon: "🛒", pos: [61, 66] },
        { type: "elite", label: "精英据点", enemyId: "orc_patrol", icon: "☠️", portrait: "assets/enemies/orc-patrol.png", weaponId: "silverfeather_bow", pos: [50, 54] },
        { type: "camp", label: "守夜营火", icon: "⛺", pos: [50, 42] },
        { type: "normal", label: "古林深处", enemyId: "forest_bandits", icon: "⚔️", portrait: "assets/enemies/forest-bandits.png", weaponId: "redscar_axe", pos: [38, 31] },
        { type: "event", label: "古老遗迹", icon: "❓", pos: [62, 31] },
        { type: "elite", label: "暗影关隘", enemyId: "shadow_hunter", icon: "☠️", portrait: "assets/enemies/shadow-hunter.png", weaponId: "moonwood_crossbow", pos: [38, 19] },
        { type: "shop", label: "密林商人", icon: "🛒", pos: [62, 19] },
        { type: "normal", label: "王座前庭", enemyId: "orc_patrol", icon: "⚔️", portrait: "assets/enemies/orc-patrol.png", weaponId: "royal_breaker", pos: [50, 12] },
        { type: "boss", label: "森林狼王", enemyId: "wolf_king", icon: "👑", portrait: "assets/enemies/forest-wolf-king.png", weaponId: "riftmoon_blade", pos: [50, 5] }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 11], [11, 12]]
    },
    {
      id: 2, name: "第二关", region: "哥布林王庭",
      menu: { background: "assets/battle/goblin-stronghold.png", boss: "assets/enemies/goblin-queen.png", bossName: "翠影女王" },
      map: { title: "哥布林王庭", label: "哥布林王庭二十节点路线图", className: "", shellClass: "chapter-two-map",
        note: "击败任一节点即可开启相邻路线；翠影女王会在抵达右上方终点后开放。大部分节点由哥布林军团驻守。" },
      clearSummary: { title: "哥布林王庭陷落",
        text: "你击败了翠影女王，完成第二关的二十场首领战，并解锁王城南部的金麦农场与英雄15级上限。" },
      chapterWeapon: "goblin_venom_crossbow", // 翠影女王的毒针弩：哥布林擅长暗箭与毒药；击败本关第一个首领后获得
      bossWeapon: { normal: { id: "goblin_venom_crossbow", level: 1 }, elite: { id: "goblin_venom_crossbow", level: 2 }, boss: { id: "goblin_venom_crossbow", level: 3 } },
      heroSkill: { id: "venom_mark", boss: "red_tide", levels: { normal: 1, elite: 2, boss: 3 } }, // 哥布林毒箭；女王：赤潮掠夺
      victoryRewards: { normal: { gold: 36, xp: 25 }, elite: { gold: 65, xp: 40 }, boss: { gold: 180, xp: 100 } },
      rewardCardIds: CF.CHAPTER_TWO_REWARD_CARD_IDS,
      encounter: {
        title: "哥布林王庭",
        health: { base: 42, perStage: 5, eliteBonus: 18 },
        mana: { normal: 6, elite: 6 },
        cardLevel: { normal: 2, elite: 3 },
        deck: { from: "enemy", extra: { base: 8, per: 4 } },
        passive: "battle_horn",
        skills: [{ icon: "📯", name: "战斗号角", every: 1, description: "每个敌方行动回合，召唤1个2攻/2血的普通哥布林。" }],
        battlefield: "goblin_stronghold"
      },
      routeStyle: "line",
      nodes: [
        { type: "normal", label: "泥牙斥候长", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [6, 80] },
        { type: "normal", label: "树梢神射手", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [18, 91] },
        { type: "normal", label: "碎瓶投手", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [38, 86] },
        { type: "normal", label: "绿皮伏击队", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [48, 69] },
        { type: "elite", label: "赃物守门人", enemyId: "forest_bandits", portrait: "assets/enemies/forest-bandits.png", pos: [60, 84] },
        { type: "normal", label: "毒箭督军", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [75, 74] },
        { type: "normal", label: "尖牙驯兽师", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [86, 68] },
        { type: "normal", label: "沼泽劫掠者", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [93, 58] },
        { type: "normal", label: "黑帽哨兵", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [94, 40] },
        { type: "elite", label: "蛮石破门者", enemyId: "orc_patrol", portrait: "assets/enemies/orc-patrol.png", pos: [82, 32] },
        { type: "normal", label: "火药工头", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [59, 28] },
        { type: "normal", label: "双弩猎手", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [46, 36] },
        { type: "normal", label: "暗巷收税官", enemyId: "forest_bandits", portrait: "assets/enemies/forest-bandits.png", pos: [34, 49] },
        { type: "normal", label: "铁锅军需官", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [14, 61] },
        { type: "elite", label: "王庭弓术师", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [21, 48] },
        { type: "normal", label: "赤旗百夫长", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [16, 35] },
        { type: "normal", label: "夜眼追猎者", enemyId: "shadow_hunter", portrait: "assets/enemies/shadow-hunter.png", pos: [14, 18] },
        { type: "normal", label: "王庭近卫长", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png", pos: [52, 12] },
        { type: "normal", label: "金库守望者", enemyId: "goblin_marksmen", portrait: "assets/enemies/goblin-marksmen.png", pos: [72, 18] },
        { type: "boss", label: "翠影女王", enemyId: "goblin_queen", portrait: "assets/enemies/goblin-queen.png", pos: [87, 12] }
      ],
      edges: [[16, 15], [15, 14], [14, 13], [13, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 19], [14, 12], [12, 3], [12, 11], [11, 10], [10, 17], [10, 18], [18, 19]]
    },
    {
      id: 3, name: "第三关", region: "金麦农场",
      menu: { background: "assets/battle/harvest-farm.png", boss: "assets/enemies/chapter3/bosses/bear-boss-20.png", bossName: "丰穗战母·布蕾娅" },
      map: { title: "金麦农场", label: "金麦农场二十首领路线图", className: "chapter-three-map", shellClass: "chapter-three-map-shell",
        note: "沿金色路线推进。击败节点后会开启所有相邻路线；抵达农舍旁的节点后，可与留守的农民夫妇交谈。每个首领的首胜奖励会在战后揭晓。" },
      clearSummary: { title: "金麦农场的战事落幕",
        text: "你击败了丰穗战母·布蕾娅，完成第三关并解锁东部梦幻森林与英雄20级上限。" },
      chapterWeapon: "harvest_maul", // 熊族开荒碾地的大锤；击败本关第一个首领后获得
      bossWeapon: { normal: { id: "harvest_maul", level: 2 }, elite: { id: "harvest_maul", level: 3 }, boss: { id: "harvest_maul", level: 4 } },
      heroSkill: { id: "stone_skin", boss: "desert_aegis", levels: { normal: 1, elite: 2, boss: 3 } }, // 熊族磐石之肤；战母：沙幕王盾
      victoryRewards: { normal: { gold: 55, xp: 38 }, elite: { gold: 90, xp: 60 }, boss: { gold: 240, xp: 140 } },
      rewardCardIds: CF.CHAPTER_THREE_REWARD_CARD_IDS,
      encounter: {
        title: "金麦农场", icon: "🐻", enemyIdPrefix: "farm-boss-",
        description: "守卫金麦农场的新住民，擅长以高生命熊族随从稳固战线。",
        health: { base: 68, perStage: 7, eliteBonus: 28 },
        mana: { normal: 8, elite: 9 },
        cardLevel: { normal: 3, elite: 4 },
        deck: {
          units: CF.CHAPTER_THREE_UNIT_CARD_IDS, unitCount: { base: 4, per: 2, max: 10 },
          spells: CF.CHAPTER_THREE_SPELL_CARD_IDS, spellCount: { base: 2, per: 3, max: 9 },
          copies: 3
        },
        passive: "bear_harvest",
        skills: [{ icon: "🌾", name: "农垦本能", every: 2, description: "每2个敌方行动回合召唤1个会随进度成长的巡田熊民。" }],
        battlefield: "harvest_farm"
      },
      routeStyle: "curve",
      routeControls: {"0-1": [14, 62], "0-2": [14, 43], "1-3": [18, 82], "3-5": [31, 94], "5-8": [50, 91], "7-8": [66, 73], "7-9": [74, 76], "9-11": [81, 88], "11-13": [89, 82], "13-15": [84, 63], "2-4": [33, 11], "2-6": [29, 55], "4-10": [50, 24], "6-10": [51, 43], "6-8": [50, 65], "10-12": [63, 32], "10-14": [60, 26], "12-16": [78, 38], "14-18": [73, 21], "15-16": [87, 48], "16-17": [85, 36], "17-18": [81, 25], "18-19": [84, 15]},
      npc: {
        id: "farm_couple", name: "留守的农民夫妇", portrait: "assets/npcs/farm-couple.png", adjacentNode: 7, pos: [67, 58], routeControl: [68, 64],
        dialogue: [
          "别紧张，年轻人。那些熊没有杀害这里的人。它们来到农场后，只把原来的村民赶去了王城方向。",
          "我们留下，是因为没有从它们身上感到敌意。最初它们连犁怎么扶都不知道，只会用蛮力把田翻得乱七八糟。",
          "后来我们教熊男修水渠、播麦种，也教熊娘照料蜂箱和收割。它们学得很慢，但从不糟蹋粮食。",
          "它们会在谷仓里给幼熊留出最暖的位置，也会把第一袋新麦送到我们门口。至少在我们眼里，它们没有传闻中那么可恶。",
          "若你一定要继续往前，就亲眼看看再作判断吧。这里发生的事，也许并不是简单的怪物占领村庄。"
        ]
      },
      nodes: [
        { type: "normal", label: "田埂熊斥候", portrait: "assets/enemies/chapter3/bosses/bear-boss-01.png", pos: [8, 54] },
        { type: "normal", label: "麦仓蜂蜜投手", portrait: "assets/enemies/chapter3/bosses/bear-boss-02.png", pos: [16, 74] },
        { type: "normal", label: "犁沟守卫长", portrait: "assets/enemies/chapter3/bosses/bear-boss-03.png", pos: [24, 37] },
        { type: "normal", label: "稻草熊术师", portrait: "assets/enemies/chapter3/bosses/bear-boss-04.png", pos: [22, 91] },
        { type: "elite", label: "谷仓突击队长", portrait: "assets/enemies/chapter3/bosses/bear-boss-05.png", pos: [43, 23] },
        { type: "normal", label: "水渠巡田熊", portrait: "assets/enemies/chapter3/bosses/bear-boss-06.png", pos: [40, 91] },
        { type: "normal", label: "蜂巢大祭司", portrait: "assets/enemies/chapter3/bosses/bear-boss-07.png", pos: [46, 49] },
        { type: "normal", label: "麦田巨熊", portrait: "assets/enemies/chapter3/bosses/bear-boss-08.png", pos: [71, 70] },
        { type: "normal", label: "丰收战熊", portrait: "assets/enemies/chapter3/bosses/bear-boss-09.png", pos: [61, 78] },
        { type: "elite", label: "石磨堡垒", portrait: "assets/enemies/chapter3/bosses/bear-boss-10.png", pos: [77, 85] },
        { type: "normal", label: "谷仓破门者", portrait: "assets/enemies/chapter3/bosses/bear-boss-11.png", pos: [55, 36] },
        { type: "normal", label: "河湾渔熊", portrait: "assets/enemies/chapter3/bosses/bear-boss-12.png", pos: [86, 91] },
        { type: "normal", label: "金巢蜂后", portrait: "assets/enemies/chapter3/bosses/bear-boss-13.png", pos: [71, 40] },
        { type: "normal", label: "秋风熊战士", portrait: "assets/enemies/chapter3/bosses/bear-boss-14.png", pos: [87, 72] },
        { type: "elite", label: "大地守卫", portrait: "assets/enemies/chapter3/bosses/bear-boss-15.png", pos: [67, 21] },
        { type: "normal", label: "农具锻造师", portrait: "assets/enemies/chapter3/bosses/bear-boss-16.png", pos: [84, 55] },
        { type: "normal", label: "赤穗熊骑", portrait: "assets/enemies/chapter3/bosses/bear-boss-17.png", pos: [86, 41] },
        { type: "normal", label: "麦田稻草魔像", portrait: "assets/enemies/chapter3/bosses/bear-boss-18.png", pos: [83, 31] },
        { type: "elite", label: "金穗熊王", portrait: "assets/enemies/chapter3/bosses/bear-boss-19.png", pos: [80, 21] },
        { type: "boss", label: "丰穗战母·布蕾娅", enemyId: "bear_matriarch", portrait: "assets/enemies/chapter3/bosses/bear-boss-20.png", pos: [84, 9.5] }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [3, 5], [5, 8], [8, 7], [7, 9], [9, 11], [11, 13], [13, 15], [2, 4], [2, 6], [4, 10], [6, 10], [6, 8], [10, 12], [10, 14], [12, 16], [14, 18], [16, 15], [16, 17], [17, 18], [18, 19]]
    },
    {
      id: 4, name: "第四关", region: "梦幻森林",
      menu: { background: "assets/battle/dream-slime-forest.png", boss: "assets/enemies/chapter4/bosses/slime-boss-20.png", bossName: "碧露大贤者·涅芙莉" },
      map: { title: "梦幻森林", label: "梦幻森林二十史莱姆首领路线图", className: "chapter-four-map", shellClass: "chapter-four-map-shell",
        note: "沿发光溪流与林间小径推进。每个史莱姆首领都会治疗自身与随从；击败节点后开启所有相邻路线，首胜卡牌会在战后揭晓。" },
      clearSummary: { title: "梦幻森林归于寂静",
        text: "你击败了碧露大贤者·涅芙莉，迫使史莱姆族群退回森林深处，并将英雄等级上限提升至20级。" },
      // 史莱姆潮汐愈合：治疗受伤最重的随从；没有受伤的随从时召唤小史莱姆（攻击/生命按技能等级 Lv1~Lv3 取值）
      chapterWeapon: "moonpool_lash", // 史莱姆族吸取月潭露水疗伤的藤鞭；击败本关第一个首领后获得
      bossWeapon: { normal: { id: "moonpool_lash", level: 3 }, elite: { id: "moonpool_lash", level: 4 }, boss: { id: "moonpool_lash", level: 5 } },
      heroSkill: { id: "tide_mending", boss: "tide_mending", levels: { normal: 1, elite: 2, boss: 3 },
        fallbackSummon: { name: "小史莱姆", icon: "💧", image: "assets/cards/chapter4/dewdrop-scout.png", attack: [2, 3, 4], health: [4, 5, 6] } },
      victoryRewards: { normal: { gold: 75, xp: 50 }, elite: { gold: 120, xp: 80 }, boss: { gold: 320, xp: 180 } },
      rewardCardIds: CF.CHAPTER_FOUR_REWARD_CARD_IDS,
      encounter: {
        title: "梦幻森林", icon: "💧", enemyIdPrefix: "dream-slime-",
        description: "女王之血唤醒的史莱姆，以厚重生命、分裂与持续再生缓慢推进战线。",
        health: { base: 100, perStage: 9, eliteBonus: 35 },
        mana: { normal: 9, elite: 10 },
        cardLevel: { normal: 4, elite: 5 },
        deck: {
          units: CF.CHAPTER_FOUR_UNIT_CARD_IDS, unitCount: { base: 4, per: 2, max: 10 },
          spells: CF.CHAPTER_FOUR_SPELL_CARD_IDS, spellCount: { base: 2, per: 2, max: 10 },
          copies: 3
        },
        passive: "slime_regeneration",
        skills: [{ icon: "💧", name: "胶质再生", every: 1, description: "每个敌方行动回合，为首领和全部史莱姆随从恢复生命。" }],
        battlefield: "dream_slime_forest"
      },
      routeStyle: "curve",
      nodes: [
        { type: "normal", label: "露珠幼母", portrait: "assets/enemies/chapter4/bosses/slime-boss-01.png", pos: [7, 83] },
        { type: "normal", label: "苔光守望者", portrait: "assets/enemies/chapter4/bosses/slime-boss-02.png", pos: [17, 70] },
        { type: "normal", label: "蓝泡采集者", portrait: "assets/enemies/chapter4/bosses/slime-boss-03.png", pos: [24, 88] },
        { type: "normal", label: "荧蕈胶卫", portrait: "assets/enemies/chapter4/bosses/slime-boss-04.png", pos: [28, 58] },
        { type: "elite", label: "月潭医师", portrait: "assets/enemies/chapter4/bosses/slime-boss-05.png", pos: [36, 78] },
        { type: "normal", label: "藤蔓黏兽", portrait: "assets/enemies/chapter4/bosses/slime-boss-06.png", pos: [42, 48] },
        { type: "normal", label: "紫晶分裂者", portrait: "assets/enemies/chapter4/bosses/slime-boss-07.png", pos: [50, 67] },
        { type: "normal", label: "溪语祭司", portrait: "assets/enemies/chapter4/bosses/slime-boss-08.png", pos: [54, 37] },
        { type: "normal", label: "沼光巨胶", portrait: "assets/enemies/chapter4/bosses/slime-boss-09.png", pos: [62, 58] },
        { type: "elite", label: "菌伞吞食者", portrait: "assets/enemies/chapter4/bosses/slime-boss-10.png", pos: [72, 72] },
        { type: "normal", label: "幻露巡游者", portrait: "assets/enemies/chapter4/bosses/slime-boss-11.png", pos: [65, 35] },
        { type: "normal", label: "碧涡守门者", portrait: "assets/enemies/chapter4/bosses/slime-boss-12.png", pos: [79, 58] },
        { type: "normal", label: "星斑软泥姬", portrait: "assets/enemies/chapter4/bosses/slime-boss-13.png", pos: [75, 27] },
        { type: "normal", label: "古树融胶", portrait: "assets/enemies/chapter4/bosses/slime-boss-14.png", pos: [90, 53] },
        { type: "elite", label: "翠晶凝视者", portrait: "assets/enemies/chapter4/bosses/slime-boss-15.png", pos: [59, 22] },
        { type: "normal", label: "深潭回复师", portrait: "assets/enemies/chapter4/bosses/slime-boss-16.png", pos: [73, 16] },
        { type: "normal", label: "月虹胶龙", portrait: "assets/enemies/chapter4/bosses/slime-boss-17.png", pos: [86, 22] },
        { type: "normal", label: "千滴合生体", portrait: "assets/enemies/chapter4/bosses/slime-boss-18.png", pos: [91, 69] },
        { type: "elite", label: "森心史莱姆领主", portrait: "assets/enemies/chapter4/bosses/slime-boss-19.png", pos: [84, 39] },
        { type: "boss", label: "碧露大贤者·涅芙莉", enemyId: "slime_sage", portrait: "assets/enemies/chapter4/bosses/slime-boss-20.png", pos: [92, 32] }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 8], [7, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 12], [11, 13], [12, 14], [13, 15], [14, 15], [14, 16], [15, 17], [16, 18], [17, 18], [18, 19]]
    },
    {
      id: 5, name: "第五关", region: "古城废墟",
      menu: { background: "assets/battle/ancient-city-ruins.png", boss: "assets/enemies/chapter5/bosses/wolf-matriarch.png", bossName: "银灰狼女猎手" },
      map: { title: "千枝城古城废墟", label: "千枝城废墟二十野兽首领路线图", className: "chapter-five-map", shellClass: "chapter-five-map-shell",
        note: "灰狼和其他野兽速度极快，许多单位登场即可攻击。击败全部节点后，魔族联军会在废墟建立据点，之后可以反复挑战强大的军官与魔族军队。" },
      clearSummary: { title: "千枝城的旗帜重新升起",
        text: "你击败银灰狼女猎手后，五位魅魔军官没有继续退避。她们救下狼族首领，以20点攻击的力量击溃小队，并决定在千枝城废墟建立魔族据点、重建这座千年前的共居之城。第五关奖励照常结算，英雄等级上限提升至25级；废墟地图上已经开放可反复挑战的魔族驻军。" },
      chapterWeapon: "silvermoon_fang", // 狼族猎手成对挥出的银月獠牙；击败本关第一个首领后获得
      bossWeapon: { normal: { id: "silvermoon_fang", level: 4 }, elite: { id: "silvermoon_fang", level: 5 }, boss: { id: "silvermoon_fang", level: 5 } },
      heroSkill: { id: "white_wolf", boss: "frost_fang", levels: { normal: 1, elite: 2, boss: 3 } }, // 白狼急袭；狼女猎手：寒牙撕咬
      victoryRewards: { normal: { gold: 100, xp: 70 }, elite: { gold: 180, xp: 110 }, boss: { gold: 420, xp: 240 } },
      rewardCardIds: CF.CHAPTER_FIVE_REWARD_CARD_IDS,
      encounter: {
        title: "古城废墟", icon: "🐺", enemyIdPrefix: "ancient-wolf-",
        description: "喝下女王之血后开智的灰狼与野兽，攻击迅猛但防御薄弱，许多单位登场便会扑击。",
        health: { base: 300, perStage: 100 / 19, eliteBonus: 0 },
        mana: { normal: 9, elite: 10 },
        cardLevel: { normal: 4, elite: 5 },
        deck: {
          units: CF.CHAPTER_FIVE_UNIT_CARD_IDS, unitCount: { base: 4, per: 2, max: 10 },
          spells: CF.CHAPTER_FIVE_SPELL_CARD_IDS, spellCount: { base: 2, per: 2, max: 10 },
          copies: 3
        },
        passive: "wolf_raid",
        skills: [{ icon: "🐺", name: "灰狼增援", every: 1, description: "每个敌方行动回合，召唤1只4攻/1血、可立即攻击随从的突击灰狼。" }],
        battlefield: "ancient_city_ruins"
      },
      routeStyle: "curve",
      nodes: [
        { type: "normal", label: "断墙灰狼", portrait: "assets/enemies/chapter5/bosses/wolf-boss-01.png", pos: [8, 82] },
        { type: "normal", label: "青苔猎犬", portrait: "assets/enemies/chapter5/bosses/wolf-boss-02.png", pos: [18, 68] },
        { type: "normal", label: "石阶迅兽", portrait: "assets/enemies/chapter5/bosses/wolf-boss-03.png", pos: [28, 87] },
        { type: "normal", label: "旧门伏击者", portrait: "assets/enemies/chapter5/bosses/wolf-boss-04.png", pos: [31, 53] },
        { type: "elite", label: "银枝追猎者", portrait: "assets/enemies/chapter5/bosses/wolf-boss-05.png", pos: [43, 74] },
        { type: "normal", label: "残塔狼群", portrait: "assets/enemies/chapter5/bosses/wolf-boss-06.png", pos: [45, 38] },
        { type: "normal", label: "瀑布獠牙", portrait: "assets/enemies/chapter5/bosses/wolf-boss-07.png", pos: [56, 83] },
        { type: "normal", label: "碑林疾影", portrait: "assets/enemies/chapter5/bosses/wolf-boss-08.png", pos: [59, 59] },
        { type: "normal", label: "古井守卫", portrait: "assets/enemies/chapter5/bosses/wolf-boss-09.png", pos: [67, 34] },
        { type: "elite", label: "灰雾猎团", portrait: "assets/enemies/chapter5/bosses/wolf-boss-10.png", pos: [73, 76] },
        { type: "normal", label: "断桥掠夺者", portrait: "assets/enemies/chapter5/bosses/wolf-boss-11.png", pos: [78, 53] },
        { type: "normal", label: "钟楼狼哨", portrait: "assets/enemies/chapter5/bosses/wolf-boss-12.png", pos: [85, 26] },
        { type: "normal", label: "城墙奔袭兽", portrait: "assets/enemies/chapter5/bosses/wolf-boss-13.png", pos: [90, 68] },
        { type: "normal", label: "废墟斥候队", portrait: "assets/enemies/chapter5/bosses/wolf-boss-14.png", pos: [93, 43] },
        { type: "elite", label: "旧王庭猎手", portrait: "assets/enemies/chapter5/bosses/wolf-boss-15.png", pos: [62, 16] },
        { type: "normal", label: "千枝守墓狼", portrait: "assets/enemies/chapter5/bosses/wolf-boss-16.png", pos: [51, 22] },
        { type: "normal", label: "月门突袭者", portrait: "assets/enemies/chapter5/bosses/wolf-boss-17.png", pos: [36, 18] },
        { type: "normal", label: "灰牙先锋", portrait: "assets/enemies/chapter5/bosses/wolf-boss-18.png", pos: [24, 34] },
        { type: "elite", label: "遗城狼王子", portrait: "assets/enemies/chapter5/bosses/wolf-boss-19.png", pos: [77, 12] },
        { type: "boss", label: "银灰狼女猎手", enemyId: "wolf_matriarch", portrait: "assets/enemies/chapter5/bosses/wolf-matriarch.png", pos: [88, 10] }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15], [14, 16], [15, 17], [16, 18], [17, 18], [18, 19]]
    }
  ];

  const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(chapter => [chapter.id, chapter]));
  const chapterById = id => CHAPTER_BY_ID[Number(id)] || null;

  CF.CHAPTERS = CHAPTERS;
  CF.chapterById = chapterById;
})();

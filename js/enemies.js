(function () {
  "use strict";

  const repeat = (items, times = 2) => Array(times).fill(items).flat();
  const enemies = {
    goblin_warband: {
      id: "goblin_warband", name: "哥布林战团", title: "泥沼的拦路者", icon: "👺", portrait: "assets/enemies/goblin-warband.png", type: "normal",
      health: 22, mana: 3, description: "用廉价士兵迅速铺满前线。",
      deck: repeat(["goblin", "goblin_guard", "goblin_archer", "dark_bolt"], 4)
    },
    goblin_marksmen: {
      id: "goblin_marksmen", name: "哥布林射手队", title: "树梢伏击者", icon: "🏹", portrait: "assets/enemies/goblin-marksmen.png", type: "normal",
      health: 24, mana: 3, description: "偏爱后排与远程单位。",
      deck: repeat(["goblin_archer", "goblin_archer", "goblin_guard", "goblin"], 4)
    },
    wolf_swarm: {
      id: "wolf_swarm", name: "野狼群", title: "月下猎群", icon: "🐺", portrait: "assets/enemies/wolf-swarm.png", type: "normal",
      health: 25, mana: 3, description: "进攻凶猛、生命较低。",
      deck: repeat(["wild_wolf", "wild_wolf", "goblin", "dark_bolt"], 4)
    },
    forest_bandits: {
      id: "forest_bandits", name: "森林强盗", title: "旧道劫掠者", icon: "🥷", portrait: "assets/enemies/forest-bandits.png", type: "normal",
      health: 27, mana: 4, description: "突袭单位会立即争夺战场。",
      deck: repeat(["bandit", "goblin_guard", "goblin_archer", "dark_bolt"], 4)
    },
    orc_patrol: {
      id: "orc_patrol", name: "兽人巡逻队", title: "重甲先锋", icon: "👹", portrait: "assets/enemies/orc-patrol.png", type: "normal",
      health: 30, mana: 4, description: "以高生命前排构筑防线。",
      deck: repeat(["orc_grunt", "goblin_guard", "orc_breaker", "goblin"], 4)
    },
    whispering_cult: {
      id: "whispering_cult", name: "低语教团", title: "林间祭司", icon: "🕯️", portrait: "assets/enemies/whispering-cult.png", type: "normal",
      health: 28, mana: 4, description: "教徒与暗影法术相互掩护。",
      deck: repeat(["cultist", "cultist", "dark_bolt", "goblin_guard"], 4)
    },
    orc_captain: {
      id: "orc_captain", name: "兽人队长", title: "碎盾者", icon: "🪓", portrait: "assets/enemies/orc-captain.png", type: "elite",
      health: 40, mana: 4, description: "大量前排战士；前排死亡时强化友军。", passive: "front_death_buff",
      deck: repeat(["orc_grunt", "orc_grunt", "orc_breaker", "goblin_guard"], 5)
    },
    shadow_hunter: {
      id: "shadow_hunter", name: "暗影猎手", title: "幽林之眼", icon: "🌘", portrait: "assets/enemies/shadow-hunter.png", type: "elite",
      health: 35, mana: 5, description: "后排远程与狙击单位可以越过前排。",
      deck: repeat(["shadow_sniper", "goblin_archer", "cultist", "dark_bolt"], 5)
    },
    goblin_queen: {
      id: "goblin_queen", name: "翠影女王", title: "王庭的盗贼女王", icon: "👑", portrait: "assets/enemies/goblin-queen.png", type: "boss",
      health: 200, mana: 7, enemyCardLevel: 3, description: "统御整个哥布林王庭的盗贼女王，每个行动回合都会呼来两名普通哥布林。", passive: "goblin_queen", battlefield: "goblin_stronghold",
      skills: [
        { icon: "👺", name: "无尽绿潮", every: 1, description: "每个敌方行动回合，在空位免费召唤2个普通哥布林。" }
      ],
      deck: repeat(["goblin", "goblin_guard", "goblin_archer", "dark_bolt"], 15)
    },
    bear_matriarch: {
      id: "bear_matriarch", name: "丰穗战母·布蕾娅", title: "金麦农场的熊族统领", icon: "🐻", portrait: "assets/enemies/chapter3/bosses/bear-boss-20.png", type: "boss",
      health: 320, mana: 10, enemyCardLevel: 5, description: "守护熊族新家园的战母。每回合召唤丰穗近卫，每3回合强化场上全部熊族。", passive: "bear_matriarch", battlefield: "harvest_farm",
      skills: [
        { icon: "🐻", name: "护田战令", every: 1, description: "每个敌方行动回合召唤1个5攻/7血的丰穗近卫。" },
        { icon: "🌾", name: "丰收之怒", every: 3, description: "每3个敌方行动回合，使场上所有熊族随从获得+1/+2。" }
      ],
      deck: repeat(["wheat_cub", "honey_slinger", "furrow_guard", "straw_mage", "barn_charger", "hive_priest", "wheatfield_giant", "harvest_war_bear", "millstone_fortress", "golden_sheaf_king", "honey_salve", "bear_paw_shock", "wheat_barrier", "bee_swarm", "harvest_feast", "barn_ambush", "earth_tremor", "autumn_rally", "bear_god_descent"], 3)
    },
    slime_sage: {
      id: "slime_sage", name: "碧露大贤者·涅芙莉", title: "梦幻森林的史莱姆引路者", icon: "💧", portrait: "assets/enemies/chapter4/bosses/slime-boss-20.png", type: "boss",
      health: 480, mana: 10, enemyCardLevel: 5, description: "拒绝离开故土的大贤者。每个行动回合恢复首领和全部史莱姆生命，每3回合分裂出两名碧露近卫。", passive: "slime_sage", battlefield: "dream_slime_forest",
      skills: [
        { icon: "💧", name: "不灭胶质", every: 1, description: "每个敌方行动回合，为首领恢复10点生命，并为所有史莱姆随从恢复5点生命。" },
        { icon: "🫧", name: "碧露分裂", every: 3, description: "每3个敌方行动回合，免费召唤2个4攻/12血碧露近卫。" }
      ],
      deck: repeat(["dewdrop_scout", "moss_gel_guard", "spring_bubble_medic", "glowcap_slinger", "splitting_vanguard", "moonpool_sentinel", "reborn_mud_colossus", "dream_gel_sage", "verdant_devourer", "azure_slime_king", "morning_dew_heal", "gelatin_barrier", "slime_division", "moonpool_surge", "viscous_prison", "spore_assimilation", "forest_engulfment", "regeneration_domain", "verdant_flood", "all_returns_to_gel"], 3)
    },
    wolf_king: {
      id: "wolf_king", name: "森林狼王", title: "裂月之牙", icon: "🐺", portrait: "assets/enemies/forest-wolf-king.png", type: "boss",
      health: 60, mana: 5, description: "每3回合召唤幼狼；每4回合发动狼王咆哮。", passive: "wolf_king",
      skills: [
        { icon: "🐾", name: "狼王号令", every: 3, description: "每3个敌方回合，在空位免费召唤1只幼狼。" },
        { icon: "🌕", name: "裂月咆哮", every: 4, description: "每4个敌方回合，使所有狼类随从永久获得+1攻击。" }
      ],
      deck: repeat(["dire_wolf", "wild_wolf", "wolf_pack", "orc_breaker"], 6)
    },
    wolf_matriarch: {
      id: "wolf_matriarch", name: "银灰狼女猎手", title: "千枝城的灰牙首领", icon: "🐺", portrait: "assets/enemies/chapter5/bosses/wolf-matriarch.png", type: "boss",
      health: 400, mana: 10, enemyCardLevel: 5, description: "避开翡翠城追兵、占据千枝城废墟的狼族首领。每回合都会呼唤一只迅猛的灰狼投入战斗。", passive: "wolf_matriarch", battlefield: "ancient_city_ruins",
      skills: [{ icon: "🐺", name: "灰狼增援", every: 1, description: "每个敌方行动回合，召唤1只4攻/1血、可立即攻击随从的突击灰狼。" }],
      deck: repeat(["ruin_wolf_scout", "silverfang_raider", "ash_pelt_hunter", "broken_road_runner", "moonclaw_alpha", "ruin_stalker", "ancient_den_guard", "mistwing_beast", "qianzhi_wolfguard", "greyfang_matriarch", "pack_rush", "ruin_path", "howl_of_hunger", "shadow_pounce", "old_city_echo"], 3)
    },
    qianzhi_demon_garrison: {
      id: "qianzhi_demon_garrison", name: "千枝城魔族军官团", title: "拒绝退避的重建者", icon: "🜏", portrait: "assets/enemies/chapter5/succubus-officer.webp", type: "boss",
      health: 1200, mana: 10, enemyCardLevel: 5, description: "第五关剧情结束后驻扎于千枝城的魔族据点。随从均为20攻/200血，属于长期挑战内容。", passive: "demon_garrison", battlefield: "ancient_city_ruins",
      skills: [{ icon: "🜏", name: "千枝城驻军", every: 1, description: "使用20攻/200血的魅魔、龙族与开智战兽压制战场。" }],
      deck: repeat(["demon_succubus_legion", "demon_dragon_legion", "demon_awakened_beast"], 12)
    }
  };

  const normalEnemyIds = ["goblin_warband", "goblin_marksmen", "wolf_swarm", "forest_bandits", "orc_patrol", "whispering_cult"];
  const eliteEnemyIds = ["orc_captain", "shadow_hunter"];

  function pickEnemy(type, seed = Math.random()) {
    if (type === "boss") return enemies.wolf_king;
    const pool = type === "elite" ? eliteEnemyIds : normalEnemyIds;
    return enemies[pool[Math.floor(seed * pool.length) % pool.length]];
  }

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { enemies, normalEnemyIds, eliteEnemyIds, pickEnemy });
})();

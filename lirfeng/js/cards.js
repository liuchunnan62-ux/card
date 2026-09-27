(function () {
  "use strict";

  const C = (id, name, type, cost, options = {}) => ({
    id, name, type, cost,
    attack: options.attack || 0,
    health: options.health || 0,
    durability: options.durability || 0,
    keywords: options.keywords || [],
    role: options.role || "",
    combatStyle: ["unit", "weapon"].includes(type) ? (options.combatStyle || ((options.keywords || []).includes("远程") ? "ranged" : "melee")) : "spell",
    rarity: options.rarity || "普通",
    description: options.description || "",
    effect: options.effect || null,
    weaponEffect: options.weaponEffect || null,
    unitEffect: options.unitEffect || null,
    discount: options.discount || null,
    icon: options.icon || (type === "unit" ? "⚔️" : type === "weapon" ? "🗡️" : "✨"),
    image: options.image || "",
    portrait: options.portrait || ""
  });

  const CARD_LIBRARY = {
    recruit: C("recruit", "王国新兵", "unit", 1, { attack: 1, health: 2, icon: "🗡️", image: "assets/cards/recruit.png", description: "可靠的前线士兵。" }),
    shield_guard: C("shield_guard", "木盾卫兵", "unit", 2, { attack: 1, health: 4, keywords: ["守卫"], icon: "🛡️", image: "assets/cards/shield-guard.png", description: "守卫：部署在前排时获得+2最大生命。" }),
    recruit_archer: C("recruit_archer", "新兵弓箭手", "unit", 2, { attack: 2, health: 2, keywords: ["远程"], icon: "🏹", image: "assets/cards/recruit-archer.png", description: "远程：部署在后排时获得+1攻击。" }),
    forest_wolf: C("forest_wolf", "森林狼", "unit", 2, { attack: 3, health: 2, icon: "🐺", image: "assets/cards/forest-wolf.png", description: "迅捷而凶猛的野兽。" }),
    vanguard: C("vanguard", "先锋剑士", "unit", 3, { attack: 3, health: 4, icon: "⚔️", image: "assets/cards/vanguard.png", description: "攻守均衡的王国战士。" }),
    kingdom_knight: C("kingdom_knight", "王国骑士", "unit", 4, { attack: 3, health: 6, keywords: ["守卫"], icon: "♞", image: "assets/cards/kingdom-knight.png", description: "守卫：前排部署时获得额外生命。" }),
    ranger: C("ranger", "游侠", "unit", 3, { attack: 3, health: 3, keywords: ["远程"], icon: "🧝", image: "assets/cards/ranger.png", description: "远程：后排部署时攻击力+1。" }),
    raider: C("raider", "冲锋战士", "unit", 4, { attack: 4, health: 3, keywords: ["突袭"], icon: "🪓", image: "assets/cards/raider.png", description: "突袭：登场回合可以攻击随从。" }),

    fire_flask: C("fire_flask", "火焰瓶", "spell", 2, { icon: "🔥", image: "assets/cards/spells/fire-flask.png", effect: "damage", description: "对一个敌方随从造成{value}点伤害。" }),
    healing_potion: C("healing_potion", "治疗药剂", "spell", 2, { icon: "🧪", image: "assets/cards/spells/healing-potion.png", effect: "heal", description: "恢复友方随从{value}点生命；选择英雄时恢复{heroValue}点。" }),
    battle_cry: C("battle_cry", "战斗怒吼", "spell", 2, { icon: "📯", image: "assets/cards/spells/battle-cry.png", effect: "buff", description: "一个友方随从本回合获得+{value}攻击。" }),
    arrow_rain: C("arrow_rain", "箭雨", "spell", 4, { icon: "🌧️", image: "assets/cards/spells/arrow-rain.png", effect: "front_aoe", description: "对敌方所有前排随从造成{value}点伤害。" }),

    goblin: C("goblin", "哥布林斗士", "unit", 1, { attack: 2, health: 1, icon: "👺", image: "assets/cards/enemies/goblin.png", description: "数量众多的林地掠夺者。" }),
    goblin_guard: C("goblin_guard", "哥布林盾手", "unit", 2, { attack: 1, health: 4, keywords: ["守卫"], icon: "🛡️", image: "assets/cards/enemies/goblin-guard.png", description: "守卫：擅长阻断战线。" }),
    goblin_archer: C("goblin_archer", "哥布林射手", "unit", 2, { attack: 2, health: 2, keywords: ["远程"], icon: "🎯", image: "assets/cards/enemies/goblin-archer.png", description: "远程：后排部署获得攻击加成。" }),
    wild_wolf: C("wild_wolf", "荒野狼", "unit", 2, { attack: 3, health: 2, icon: "🐺", image: "assets/cards/enemies/wild-wolf.png", description: "饥饿的狼群成员。" }),
    orc_grunt: C("orc_grunt", "兽人蛮兵", "unit", 3, { attack: 3, health: 5, keywords: ["守卫"], icon: "👹", image: "assets/cards/enemies/orc-grunt.png", description: "结实的前排战士。" }),
    orc_breaker: C("orc_breaker", "兽人破阵者", "unit", 4, { attack: 5, health: 3, keywords: ["穿透"], icon: "🔨", image: "assets/cards/enemies/orc-breaker.png", description: "穿透：溢出伤害传递给同列后排。" }),
    shadow_sniper: C("shadow_sniper", "暗影狙击手", "unit", 4, { attack: 4, health: 3, keywords: ["远程", "狙击"], icon: "🥷", image: "assets/cards/enemies/shadow-sniper.png", description: "狙击：可以无视前排攻击任意后排。" }),
    cultist: C("cultist", "低语教徒", "unit", 2, { attack: 2, health: 3, icon: "🕯️", image: "assets/cards/enemies/cultist.png", description: "被古老力量蛊惑的追随者。" }),
    bandit: C("bandit", "森林强盗", "unit", 3, { attack: 4, health: 3, keywords: ["突袭"], icon: "🗡️", image: "assets/cards/enemies/bandit.png", description: "突袭：登场即可攻击随从。" }),
    wolf_cub: C("wolf_cub", "幼狼", "unit", 0, { attack: 1, health: 2, icon: "🐾", image: "assets/cards/enemies/wolf-cub.png", description: "狼王召来的幼狼。" }),
    dire_wolf: C("dire_wolf", "狂暴狼", "unit", 4, { attack: 5, health: 4, keywords: ["突袭"], icon: "🌑", image: "assets/cards/enemies/dire-wolf.png", description: "狼王麾下的狂暴猎手。" }),
    wolf_pack: C("wolf_pack", "狼群", "spell", 3, { icon: "🐺", image: "assets/cards/spells/wolf-pack.png", effect: "summon_wolves", description: "在空余位置召唤两只幼狼。" }),
    dark_bolt: C("dark_bolt", "暗影箭", "spell", 2, { icon: "🟣", image: "assets/cards/spells/dark-bolt.png", effect: "damage", description: "对一个敌方随从造成{value}点伤害。" }),

    iron_lancer: C("iron_lancer", "铁矛卫", "unit", 3, { attack: 3, health: 5, keywords: ["穿透"], rarity: "稀有", icon: "🔱", image: "assets/cards/iron-lancer.png", description: "穿透：溢出伤害会击中同列后排。" }),
    eagle_eye: C("eagle_eye", "鹰眼猎手", "unit", 4, { attack: 4, health: 3, keywords: ["远程", "狙击"], rarity: "稀有", icon: "🦅", image: "assets/cards/eagle-eye.png", description: "狙击：无视前排攻击后排。" }),
    royal_medic: C("royal_medic", "王庭医师", "unit", 3, { attack: 2, health: 5, role: "healer", combatStyle: "support", rarity: "稀有", icon: "⚕️", image: "assets/cards/royal-medic.png", description: "治疗随从：每回合可恢复一个我方随从或英雄，恢复量等于本卡攻击力；无法攻击。" })
  };

  Object.assign(CARD_LIBRARY, {
    twilight_lancer: C("twilight_lancer", "暮光枪卫", "unit", 1, { attack: 2, health: 1, keywords: ["突袭"], icon: "🗡️", image: "assets/cards/new/twilight-lancer.png", description: "突袭。脆弱但能在登场回合立即攻击。" }),
    silver_feather_scout: C("silver_feather_scout", "银羽斥候", "unit", 2, { attack: 1, health: 3, keywords: ["远程"], icon: "🏹", image: "assets/cards/new/silver-feather-scout.png", description: "远程。部署在后排时额外获得1点攻击。" }),
    iron_oath_sister: C("iron_oath_sister", "铁誓修女", "unit", 2, { attack: 1, health: 5, keywords: ["守卫"], icon: "🛡️", image: "assets/cards/new/iron-oath-sister.png", description: "守卫。部署在前排时额外获得2点生命。" }),
    storm_rune_brawler: C("storm_rune_brawler", "雷纹斗士", "unit", 2, { attack: 4, health: 2, icon: "⚡", image: "assets/cards/new/storm-rune-brawler.png", description: "高攻击的近战斗士，但难以承受反击。" }),
    griffin_knight: C("griffin_knight", "狮鹫骑士", "unit", 3, { attack: 4, health: 3, keywords: ["远程"], icon: "🦅", image: "assets/cards/new/griffin-knight.png", description: "远程。可以越过前排发动攻击。" }),
    sanctum_warden: C("sanctum_warden", "圣坛守望者", "unit", 4, { attack: 2, health: 8, keywords: ["守卫"], icon: "🗿", image: "assets/cards/new/sanctum-warden.png", description: "守卫。坚不可摧的古代防线。" }),
    chain_lightning: C("chain_lightning", "闪电锁链", "spell", 3, { icon: "⚡", image: "assets/cards/new/chain-lightning.png", effect: "chain_damage", description: "对一个敌方随从造成{value}点伤害，并对同排其他随从造成{splash}点伤害。" }),
    mirror_shift: C("mirror_shift", "镜像换位", "spell", 4, { icon: "🪞", image: "assets/cards/new/mirror-shift.png", effect: "swap_stats", description: "交换一个友方随从的攻击力与当前生命值。" }),
    frost_bulwark: C("frost_bulwark", "霜铸壁垒", "spell", 2, { icon: "❄️", image: "assets/cards/new/frost-bulwark.png", effect: "fortify", description: "使一个友方随从获得+{health}生命，并获得守卫。" }),
    royal_muster: C("royal_muster", "王庭征召", "spell", 2, { icon: "🎖️", image: "assets/cards/new/royal-muster.png", effect: "summon_recruits", description: "在空位召唤2个{tokenAttack}/{tokenHealth}王庭卫兵。" }),
    holy_spring: C("holy_spring", "圣泉涌流", "spell", 2, { icon: "💧", image: "assets/cards/new/holy-spring.png", effect: "group_heal", description: "为英雄和所有友方随从恢复{value}点生命。" }),
    judgment_spear: C("judgment_spear", "审判之矛", "spell", 4, { icon: "☀️", image: "assets/cards/new/judgment-spear.png", effect: "execute_draw", description: "对一个敌方随从造成{value}点伤害；若将其消灭，抽1张牌。" })
  });

  Object.assign(CARD_LIBRARY, {
    mist_dagger: C("mist_dagger", "雾行短匕", "weapon", 1, { attack: 1, durability: 2, weaponEffect: "kill_draw", image: "assets/cards/weapons/mist-dagger.png", description: "近战。用此武器消灭随从后，抽1张牌。" }),
    bridge_oathblade: C("bridge_oathblade", "断桥守誓剑", "weapon", 2, { attack: 2, durability: 2, weaponEffect: "heal_after", image: "assets/cards/weapons/bridge-oathblade.png", description: "近战。每次攻击后，为英雄恢复1点生命。" }),
    silverfeather_bow: C("silverfeather_bow", "银羽猎弓", "weapon", 3, { attack: 2, durability: 3, keywords: ["远程"], weaponEffect: "ranged", image: "assets/cards/weapons/silverfeather-bow.png", description: "远程。攻击随从时不会受到反击。" }),
    redscar_axe: C("redscar_axe", "赤痕战斧", "weapon", 4, { attack: 4, durability: 2, weaponEffect: "grow_on_kill", image: "assets/cards/weapons/redscar-axe.png", description: "近战。用此武器消灭随从后，本武器获得+1攻击。" }),
    moonwood_crossbow: C("moonwood_crossbow", "幽月穿林弩", "weapon", 5, { attack: 4, durability: 3, keywords: ["远程", "狙击"], weaponEffect: "sniper", image: "assets/cards/weapons/moonwood-crossbow.png", description: "远程，狙击。可无视前排攻击任意后排，且不受反击。" }),
    royal_breaker: C("royal_breaker", "王庭破阵锤", "weapon", 6, { attack: 5, durability: 3, weaponEffect: "front_breaker", image: "assets/cards/weapons/royal-breaker.png", description: "近战。攻击敌方前排随从时额外造成2点伤害。" }),
    riftmoon_blade: C("riftmoon_blade", "裂月王刃", "weapon", 7, { attack: 6, durability: 3, rarity: "传说", weaponEffect: "hero_echo", image: "assets/cards/weapons/riftmoon-blade.png", description: "近战。每次攻击后，额外对敌方英雄造成2点伤害。" })
  });

  Object.assign(CARD_LIBRARY, {
    pebble_scout: C("pebble_scout", "石子斥候", "unit", 1, { attack: 1, health: 1, keywords: ["远程"], unitEffect: "scout_draw", image: "assets/cards/chapter2/pebble-scout.png", description: "远程。登场时抽1张牌。" }),
    mudfang_guard: C("mudfang_guard", "泥牙盾卫", "unit", 2, { attack: 1, health: 5, keywords: ["守卫"], image: "assets/cards/chapter2/mudfang-guard.png", description: "守卫。部署在前排时额外获得2点生命。" }),
    spore_alchemist: C("spore_alchemist", "菌光炼金师", "unit", 3, { attack: 2, health: 4, role: "healer", combatStyle: "support", unitEffect: "hero_heal", image: "assets/cards/chapter2/spore-alchemist.png", description: "治疗随从，无法攻击。登场时为英雄恢复3点生命。" }),
    redfang_rider: C("redfang_rider", "赤耳狼骑", "unit", 4, { attack: 4, health: 4, keywords: ["突袭"], image: "assets/cards/chapter2/redfang-rider.png", description: "突袭。登场回合可以立即攻击敌方随从。" }),
    formation_breaker: C("formation_breaker", "锅盔破阵者", "unit", 5, { attack: 6, health: 5, keywords: ["穿透"], image: "assets/cards/chapter2/formation-breaker.png", description: "穿透。溢出伤害会继续命中同列后排。" }),
    thorn_troll: C("thorn_troll", "荆沼巨魔", "unit", 6, { attack: 4, health: 10, keywords: ["守卫", "荆棘"], image: "assets/cards/chapter2/thorn-troll.png", description: "守卫，荆棘。受到近战攻击时，额外对攻击者造成2点伤害。" }),
    twinbolt_hunter: C("twinbolt_hunter", "双弩夜猎者", "unit", 7, { attack: 7, health: 5, keywords: ["远程", "狙击"], image: "assets/cards/chapter2/twinbolt-hunter.png", description: "远程，狙击。可无视前排攻击任意后排，且不会受到反击。" }),
    war_drum_ogre: C("war_drum_ogre", "绿潮战鼓手", "unit", 8, { attack: 5, health: 9, unitEffect: "war_drum", discount: "allied_units", image: "assets/cards/chapter2/war-drum-ogre.png", description: "每有一个友方随从，本牌费用减少1。登场时其他友方随从永久获得+2攻击。" }),
    royal_war_machine: C("royal_war_machine", "王庭战争机", "unit", 9, { attack: 9, health: 12, keywords: ["守卫", "重甲"], discount: "missing_health", image: "assets/cards/chapter2/royal-war-machine.png", description: "每失去5点英雄生命，本牌费用减少1。重甲：每次受到的伤害减少2，最低为1。" }),
    emerald_drake_commander: C("emerald_drake_commander", "翡翠龙骑统领", "unit", 10, { attack: 12, health: 12, keywords: ["远程", "突袭"], unitEffect: "dragon_breath", discount: "cards_played", rarity: "传说", image: "assets/cards/chapter2/emerald-drake-commander.png", description: "本场每打出2张牌，本牌费用减少1。登场时对所有敌方随从造成3点伤害。" }),

    flash_powder: C("flash_powder", "闪光粉", "spell", 1, { effect: "draw_cards", image: "assets/cards/chapter2/flash-powder.png", description: "抽{count}张牌。" }),
    marsh_venom: C("marsh_venom", "沼泽毒剂", "spell", 2, { effect: "poison", image: "assets/cards/chapter2/marsh-venom.png", description: "对一个敌方随从造成{value}点伤害，并使其永久失去{weaken}点攻击。" }),
    bait_switch: C("bait_switch", "诱饵换位", "spell", 3, { effect: "rescue", image: "assets/cards/chapter2/bait-switch.png", description: "使一个友方随从返回手牌，然后抽1张牌。" }),
    powder_keg: C("powder_keg", "火药桶", "spell", 4, { effect: "row_blast", image: "assets/cards/chapter2/powder-keg.png", description: "对选中的敌方一排所有随从造成{value}点伤害。" }),
    green_tide_rally: C("green_tide_rally", "绿潮集结", "spell", 5, { effect: "goblin_tide", image: "assets/cards/chapter2/green-tide-rally.png", description: "召唤3个{tokenAttack}/{tokenHealth}绿潮斗士。" }),
    venomous_feast: C("venomous_feast", "毒宴狂欢", "spell", 6, { effect: "army_buff", image: "assets/cards/chapter2/venomous-feast.png", description: "所有友方随从永久获得+{attack}/+{health}。" }),
    shadow_kidnap: C("shadow_kidnap", "暗巷绑票", "spell", 7, { effect: "banish", image: "assets/cards/chapter2/shadow-kidnap.png", description: "使一个敌方随从返回其拥有者手牌；若手牌已满则将其消灭。" }),
    royal_rocket_rain: C("royal_rocket_rain", "王庭火箭雨", "spell", 8, { effect: "enemy_aoe", discount: "enemy_units", image: "assets/cards/chapter2/royal-rocket-rain.png", description: "每有一个敌方随从，本牌费用减少1。对所有敌方随从造成{value}点伤害。" }),
    treasury_ransom: C("treasury_ransom", "金库赎金", "spell", 9, { effect: "treasury", discount: "missing_health", image: "assets/cards/chapter2/treasury-ransom.png", description: "每失去5点英雄生命，本牌费用减少1。恢复{heal}点生命并抽2张牌。" }),
    queens_final_trick: C("queens_final_trick", "女王的终幕诡计", "spell", 10, { effect: "queen_final", discount: "cards_played", rarity: "传说", image: "assets/cards/chapter2/queens-final-trick.png", description: "本场每打出2张牌，本牌费用减少1。对所有敌方随从造成{value}点伤害，并召唤2个{tokenAttack}/{tokenHealth}王庭幻卫。" })
  });

  Object.assign(CARD_LIBRARY, {
    wheat_cub: C("wheat_cub", "麦穗熊崽", "unit", 1, { attack: 1, health: 2, unitEffect: "forage_draw", image: "assets/cards/chapter3/wheat-cub.png", description: "登场时抽1张牌。" }),
    honey_slinger: C("honey_slinger", "蜂蜜投手", "unit", 2, { attack: 2, health: 3, keywords: ["远程"], unitEffect: "honey_toss", image: "assets/cards/chapter3/honey-slinger.png", description: "远程。登场时对生命最低的敌方随从造成1点伤害。" }),
    furrow_guard: C("furrow_guard", "犁沟守卫", "unit", 3, { attack: 2, health: 6, keywords: ["守卫"], image: "assets/cards/chapter3/furrow-guard.png", description: "守卫。部署在前排时额外获得2点生命。" }),
    straw_mage: C("straw_mage", "稻草熊术士", "unit", 4, { attack: 3, health: 5, keywords: ["远程"], unitEffect: "soil_blessing", image: "assets/cards/chapter3/straw-mage.png", description: "远程。登场时使相邻友方随从获得+1/+1。" }),
    barn_charger: C("barn_charger", "谷仓突击熊", "unit", 5, { attack: 5, health: 6, keywords: ["突袭"], image: "assets/cards/chapter3/barn-charger.png", description: "突袭。登场回合可以立即攻击敌方随从。" }),
    hive_priest: C("hive_priest", "蜂巢祭司", "unit", 6, { attack: 3, health: 9, role: "healer", combatStyle: "support", unitEffect: "hive_heal", image: "assets/cards/chapter3/hive-priest.png", description: "治疗随从，无法攻击。登场时为英雄恢复5点生命。" }),
    wheatfield_giant: C("wheatfield_giant", "麦田巨熊", "unit", 7, { attack: 6, health: 11, keywords: ["守卫", "荆棘"], image: "assets/cards/chapter3/wheatfield-giant.png", description: "守卫，荆棘。受到近战攻击时额外反击2点伤害。" }),
    harvest_war_bear: C("harvest_war_bear", "丰收战熊", "unit", 8, { attack: 7, health: 9, unitEffect: "harvest_rally", image: "assets/cards/chapter3/harvest-war-bear.png", description: "登场时其他友方随从永久获得+1/+1。" }),
    millstone_fortress: C("millstone_fortress", "石磨堡垒熊", "unit", 9, { attack: 7, health: 15, keywords: ["守卫", "重甲"], image: "assets/cards/chapter3/millstone-fortress.png", description: "守卫，重甲。每次受到的伤害减少2，最低为1。" }),
    golden_sheaf_king: C("golden_sheaf_king", "金穗熊王", "unit", 10, { attack: 12, health: 14, rarity: "传说", unitEffect: "bear_king", image: "assets/cards/chapter3/golden-sheaf-king.png", description: "登场时召唤2个4/5田园熊卫，并使所有其他友方熊族获得+2/+2。" }),

    honey_salve: C("honey_salve", "蜂蜜药膏", "spell", 1, { effect: "honey_salve", image: "assets/cards/chapter3/honey-salve.png", description: "为一个友方随从或英雄恢复{heal}点生命；随从还永久获得+{attack}攻击。" }),
    sprout_blessing: C("sprout_blessing", "春芽祝福", "spell", 2, { effect: "growth_blessing", image: "assets/cards/chapter3/sprout-blessing.png", description: "使一个友方随从永久获得+{attack}/+{health}。" }),
    bear_paw_shock: C("bear_paw_shock", "熊掌震击", "spell", 3, { effect: "bear_paw", image: "assets/cards/chapter3/bear-paw-shock.png", description: "对一个敌方随从造成{value}点伤害，并对其同排其他随从造成{splash}点伤害。" }),
    wheat_barrier: C("wheat_barrier", "麦浪屏障", "spell", 4, { effect: "wheat_barrier", image: "assets/cards/chapter3/wheat-barrier.png", description: "所有友方随从获得+{health}生命；前排随从获得守卫。" }),
    bee_swarm: C("bee_swarm", "蜂群侵袭", "spell", 5, { effect: "bee_swarm", image: "assets/cards/chapter3/bee-swarm.png", description: "对所有敌方随从造成{value}点伤害，并使存活者永久失去{weaken}点攻击。" }),
    harvest_feast: C("harvest_feast", "丰收盛宴", "spell", 6, { effect: "harvest_feast", image: "assets/cards/chapter3/harvest-feast.png", description: "为英雄和所有友方随从恢复{heal}点生命，并抽{count}张牌。" }),
    barn_ambush: C("barn_ambush", "谷仓伏兵", "spell", 7, { effect: "bear_ambush", image: "assets/cards/chapter3/barn-ambush.png", description: "召唤3个{tokenAttack}/{tokenHealth}谷仓熊战士。" }),
    earth_tremor: C("earth_tremor", "大地震颤", "spell", 8, { effect: "earth_tremor", image: "assets/cards/chapter3/earth-tremor.png", description: "对所有敌方随从造成{value}点伤害，存活者永久失去{weaken}点攻击。" }),
    autumn_rally: C("autumn_rally", "秋收号令", "spell", 9, { effect: "autumn_rally", image: "assets/cards/chapter3/autumn-rally.png", description: "所有友方随从永久获得+{attack}/+{health}。" }),
    bear_god_descent: C("bear_god_descent", "熊神降临", "spell", 10, { effect: "bear_god", rarity: "传说", image: "assets/cards/chapter3/bear-god-descent.png", description: "恢复英雄{heal}点生命，并召唤至多4个{tokenAttack}/{tokenHealth}熊神化身。" })
  });

  Object.assign(CARD_LIBRARY, {
    dewdrop_scout: C("dewdrop_scout", "滴露幼胶", "unit", 1, { attack: 1, health: 3, unitEffect: "slime_hero_heal", image: "assets/cards/chapter4/dewdrop-scout.png", description: "登场时为英雄恢复2点生命。" }),
    moss_gel_guard: C("moss_gel_guard", "苔甲胶卫", "unit", 2, { attack: 1, health: 6, keywords: ["守卫"], image: "assets/cards/chapter4/moss-gel-guard.png", description: "守卫。部署在前排时额外获得2点生命。" }),
    spring_bubble_medic: C("spring_bubble_medic", "泡泉医师", "unit", 3, { attack: 1, health: 5, role: "healer", combatStyle: "support", unitEffect: "slime_medic", image: "assets/cards/chapter4/spring-bubble-medic.png", description: "治疗随从，无法攻击。登场时为英雄恢复4点生命。" }),
    glowcap_slinger: C("glowcap_slinger", "荧蕈投手", "unit", 4, { attack: 2, health: 7, keywords: ["远程"], unitEffect: "slime_ally_heal", image: "assets/cards/chapter4/glowcap-slinger.png", description: "远程。登场时为受伤最重的友方随从恢复3点生命。" }),
    splitting_vanguard: C("splitting_vanguard", "分裂先锋", "unit", 5, { attack: 3, health: 8, keywords: ["突袭"], unitEffect: "slime_split", image: "assets/cards/chapter4/splitting-vanguard.png", description: "突袭。登场时召唤1个1/3软泥分身。" }),
    moonpool_sentinel: C("moonpool_sentinel", "月潭凝卫", "unit", 6, { attack: 3, health: 11, keywords: ["守卫", "再生"], image: "assets/cards/chapter4/moonpool-sentinel.png", description: "守卫，再生。每个己方回合开始时恢复2点生命。" }),
    reborn_mud_colossus: C("reborn_mud_colossus", "返生泥巨像", "unit", 7, { attack: 4, health: 13, keywords: ["再生", "重甲"], image: "assets/cards/chapter4/reborn-mud-colossus.png", description: "再生，重甲。每个己方回合恢复2点生命；每次受到的伤害减少2点。" }),
    dream_gel_sage: C("dream_gel_sage", "幻林胶质贤者", "unit", 8, { attack: 4, health: 12, keywords: ["远程"], unitEffect: "slime_group_heal", image: "assets/cards/chapter4/dream-gel-sage.png", description: "远程。登场时为英雄及所有友方随从恢复3点生命。" }),
    verdant_devourer: C("verdant_devourer", "苍翠吞噬者", "unit", 9, { attack: 5, health: 16, keywords: ["守卫", "再生"], unitEffect: "slime_major_heal", image: "assets/cards/chapter4/verdant-devourer.png", description: "守卫，再生。登场时为英雄恢复6点生命。" }),
    azure_slime_king: C("azure_slime_king", "沧澜史莱姆王", "unit", 10, { attack: 6, health: 20, keywords: ["守卫", "再生"], rarity: "传说", unitEffect: "slime_king", image: "assets/cards/chapter4/azure-slime-king.png", description: "登场时召唤2个2/6碧波胶卫，并为英雄和全部友方随从恢复4点生命。" }),

    morning_dew_heal: C("morning_dew_heal", "晨露愈合", "spell", 1, { effect: "slime_mend", image: "assets/cards/chapter4/morning-dew-heal.png", description: "为一个友方随从恢复{heal}点生命；选择英雄时恢复{heroValue}点。" }),
    gelatin_barrier: C("gelatin_barrier", "凝胶护膜", "spell", 2, { effect: "gel_barrier", image: "assets/cards/chapter4/gelatin-barrier.png", description: "使一个友方随从获得+{health}最大生命与再生。" }),
    slime_division: C("slime_division", "软泥分裂", "spell", 3, { effect: "slime_division", image: "assets/cards/chapter4/slime-division.png", description: "召唤2个{tokenAttack}/{tokenHealth}软泥分身。" }),
    moonpool_surge: C("moonpool_surge", "月潭涌泉", "spell", 4, { effect: "moonpool_surge", image: "assets/cards/chapter4/moonpool-surge.png", description: "为英雄及所有友方随从恢复{heal}点生命；高等级时额外抽牌。" }),
    viscous_prison: C("viscous_prison", "黏液禁锢", "spell", 5, { effect: "viscous_prison", image: "assets/cards/chapter4/viscous-prison.png", description: "使一个敌方随从永久失去{weaken}点攻击，并令其本回合无法攻击。" }),
    spore_assimilation: C("spore_assimilation", "孢子同化", "spell", 6, { effect: "spore_assimilation", image: "assets/cards/chapter4/spore-assimilation.png", description: "所有友方随从获得+{health}最大生命并恢复{heal}点生命，然后抽1张牌。" }),
    forest_engulfment: C("forest_engulfment", "森林吞没", "spell", 7, { effect: "forest_engulfment", image: "assets/cards/chapter4/forest-engulfment.png", description: "对所有敌方随从造成{value}点伤害；每命中一个目标，为英雄恢复{heal}点生命。" }),
    regeneration_domain: C("regeneration_domain", "再生领域", "spell", 8, { effect: "regeneration_domain", image: "assets/cards/chapter4/regeneration-domain.png", description: "所有友方随从获得+{health}最大生命、恢复{heal}点生命并获得再生。" }),
    verdant_flood: C("verdant_flood", "翠绿洪流", "spell", 9, { effect: "verdant_flood", image: "assets/cards/chapter4/verdant-flood.png", description: "召唤3个{tokenAttack}/{tokenHealth}洪流胶卫。" }),
    all_returns_to_gel: C("all_returns_to_gel", "万物归胶", "spell", 10, { effect: "all_returns_to_gel", rarity: "传说", image: "assets/cards/chapter4/all-returns-to-gel.png", description: "为英雄和全部友方随从恢复{heal}点生命，并召唤至多4个{tokenAttack}/{tokenHealth}森灵凝胶。" })
  });

  const CHAPTER_FIVE_UNIT_CARD_IDS = ["ruin_wolf_scout", "silverfang_raider", "ash_pelt_hunter", "broken_road_runner", "moonclaw_alpha", "ruin_stalker", "ancient_den_guard", "mistwing_beast", "qianzhi_wolfguard", "greyfang_matriarch"];
  const CHAPTER_FIVE_SPELL_CARD_IDS = ["pack_rush", "ruin_path", "howl_of_hunger", "shadow_pounce", "old_city_echo", "silver_moon_mark", "predator_surge", "broken_gate", "bloodtrail", "qianzhi_reclamation"];
  const chapterFiveImages = Array.from({ length: 20 }, (_, index) => `assets/cards/chapter5/wolf-card-${String(index + 1).padStart(2, "0")}.png`);
  Object.assign(CARD_LIBRARY, {
    ruin_wolf_scout: C("ruin_wolf_scout", "废墟狼斥候", "unit", 1, { attack: 3, health: 1, keywords: ["突袭"], image: chapterFiveImages[0], description: "突袭：登场回合可以立即攻击。" }),
    silverfang_raider: C("silverfang_raider", "银牙掠袭者", "unit", 2, { attack: 4, health: 2, keywords: ["突袭"], image: chapterFiveImages[1], description: "突袭：登场回合可以立即攻击。" }),
    ash_pelt_hunter: C("ash_pelt_hunter", "灰裘猎手", "unit", 3, { attack: 5, health: 2, keywords: ["远程"], image: chapterFiveImages[2], description: "远程攻击不触发反击。" }),
    broken_road_runner: C("broken_road_runner", "断路疾行兽", "unit", 4, { attack: 6, health: 3, keywords: ["突袭"], image: chapterFiveImages[3], description: "突袭：登场回合可以立即攻击。" }),
    moonclaw_alpha: C("moonclaw_alpha", "月爪头狼", "unit", 5, { attack: 8, health: 3, image: chapterFiveImages[4], description: "攻击力高，生命较低。" }),
    ruin_stalker: C("ruin_stalker", "遗城潜行者", "unit", 6, { attack: 9, health: 4, keywords: ["突袭"], image: chapterFiveImages[5], description: "突袭：登场回合可以立即攻击。" }),
    ancient_den_guard: C("ancient_den_guard", "古穴守卫", "unit", 7, { attack: 10, health: 5, keywords: ["守卫"], image: chapterFiveImages[6], description: "守卫：部署在前排时保护后排。" }),
    mistwing_beast: C("mistwing_beast", "雾翼荒兽", "unit", 8, { attack: 12, health: 5, keywords: ["突袭", "远程"], image: chapterFiveImages[7], description: "突袭与远程：登场回合即可从后排发动攻击。" }),
    qianzhi_wolfguard: C("qianzhi_wolfguard", "千枝狼卫", "unit", 9, { attack: 13, health: 6, keywords: ["守卫"], image: chapterFiveImages[8], description: "守卫：前排部署时获得额外生命。" }),
    greyfang_matriarch: C("greyfang_matriarch", "灰牙狼母", "unit", 10, { attack: 16, health: 7, keywords: ["突袭"], image: chapterFiveImages[9], description: "突袭：登场回合可以立即攻击。" }),
    pack_rush: C("pack_rush", "群狼疾袭", "spell", 1, { image: chapterFiveImages[10], effect: "buff", value: 2, description: "一个友方随从本回合获得+2攻击。" }),
    ruin_path: C("ruin_path", "废墟捷径", "spell", 2, { image: chapterFiveImages[11], effect: "draw_cards", count: 2, description: "抽2张牌。" }),
    howl_of_hunger: C("howl_of_hunger", "饥腹长嗥", "spell", 3, { image: chapterFiveImages[12], effect: "group_heal", value: 3, description: "所有友方随从恢复3点生命。" }),
    shadow_pounce: C("shadow_pounce", "暗影扑杀", "spell", 4, { image: chapterFiveImages[13], effect: "damage", value: 6, description: "对一个敌方随从造成6点伤害。" }),
    old_city_echo: C("old_city_echo", "古城回声", "spell", 5, { image: chapterFiveImages[14], effect: "army_buff", attack: 2, health: 2, description: "所有友方随从获得+2/+2。" }),
    silver_moon_mark: C("silver_moon_mark", "银月追迹", "spell", 6, { image: chapterFiveImages[15], effect: "poison", value: 4, description: "使敌方生命最低的随从受到4点伤害。" }),
    predator_surge: C("predator_surge", "掠食潮汐", "spell", 7, { image: chapterFiveImages[16], effect: "enemy_aoe", value: 3, description: "对所有敌方随从造成3点伤害。" }),
    broken_gate: C("broken_gate", "破门狂奔", "spell", 8, { image: chapterFiveImages[17], effect: "row_blast", value: 7, description: "对敌方一排造成7点伤害。" }),
    bloodtrail: C("bloodtrail", "血迹追猎", "spell", 9, { image: chapterFiveImages[18], effect: "execute_draw", value: 8, description: "对一个敌方随从造成8点伤害；若其被消灭，抽1张牌。" }),
    qianzhi_reclamation: C("qianzhi_reclamation", "千枝重建", "spell", 10, { image: chapterFiveImages[19], effect: "all_returns_to_gel", description: "英雄和所有友方随从恢复生命，并召唤森灵凝胶。" })
  });
  Object.assign(CARD_LIBRARY, {
    demon_succubus_legion: C("demon_succubus_legion", "魅魔军官", "unit", 1, { attack: 20, health: 200, keywords: ["突袭"], image: "assets/enemies/chapter5/succubus-officer.webp", description: "千枝城魔族据点的军官，登场即可攻击。" }),
    demon_dragon_legion: C("demon_dragon_legion", "龙族重骑", "unit", 2, { attack: 20, health: 200, keywords: ["守卫"], image: "assets/cards/chapter5/wolf-card-09.png", description: "重建千枝城的龙族军队。" }),
    demon_awakened_beast: C("demon_awakened_beast", "开智战兽", "unit", 3, { attack: 20, health: 200, keywords: ["突袭"], image: "assets/cards/chapter5/wolf-card-10.png", description: "女王之血唤醒的魔族战兽。" })
  });

  const STARTER_DECK = [
    "recruit", "shield_guard", "recruit_archer", "forest_wolf", "vanguard", "kingdom_knight",
    "ranger", "raider", "fire_flask", "healing_potion", "battle_cry", "arrow_rain",
    "twilight_lancer", "silver_feather_scout", "iron_oath_sister", "storm_rune_brawler", "griffin_knight", "sanctum_warden",
    "chain_lightning", "mirror_shift", "frost_bulwark", "royal_muster", "holy_spring", "judgment_spear"
  ];
  const NEW_CARD_IDS = ["twilight_lancer", "silver_feather_scout", "iron_oath_sister", "storm_rune_brawler", "griffin_knight", "sanctum_warden", "chain_lightning", "mirror_shift", "frost_bulwark", "royal_muster", "holy_spring", "judgment_spear"];
  const WEAPON_CARD_IDS = ["mist_dagger", "bridge_oathblade", "silverfeather_bow", "redscar_axe", "moonwood_crossbow", "royal_breaker", "riftmoon_blade"];
  const CHAPTER_TWO_UNIT_CARD_IDS = ["pebble_scout", "mudfang_guard", "spore_alchemist", "redfang_rider", "formation_breaker", "thorn_troll", "twinbolt_hunter", "war_drum_ogre", "royal_war_machine", "emerald_drake_commander"];
  const CHAPTER_TWO_SPELL_CARD_IDS = ["flash_powder", "marsh_venom", "bait_switch", "powder_keg", "green_tide_rally", "venomous_feast", "shadow_kidnap", "royal_rocket_rain", "treasury_ransom", "queens_final_trick"];
  const CHAPTER_TWO_REWARD_CARD_IDS = [...CHAPTER_TWO_UNIT_CARD_IDS, ...CHAPTER_TWO_SPELL_CARD_IDS];
  const CHAPTER_THREE_UNIT_CARD_IDS = ["wheat_cub", "honey_slinger", "furrow_guard", "straw_mage", "barn_charger", "hive_priest", "wheatfield_giant", "harvest_war_bear", "millstone_fortress", "golden_sheaf_king"];
  const CHAPTER_THREE_SPELL_CARD_IDS = ["honey_salve", "sprout_blessing", "bear_paw_shock", "wheat_barrier", "bee_swarm", "harvest_feast", "barn_ambush", "earth_tremor", "autumn_rally", "bear_god_descent"];
  const CHAPTER_THREE_REWARD_CARD_IDS = [...CHAPTER_THREE_UNIT_CARD_IDS, ...CHAPTER_THREE_SPELL_CARD_IDS];
  const CHAPTER_FOUR_UNIT_CARD_IDS = ["dewdrop_scout", "moss_gel_guard", "spring_bubble_medic", "glowcap_slinger", "splitting_vanguard", "moonpool_sentinel", "reborn_mud_colossus", "dream_gel_sage", "verdant_devourer", "azure_slime_king"];
  const CHAPTER_FOUR_SPELL_CARD_IDS = ["morning_dew_heal", "gelatin_barrier", "slime_division", "moonpool_surge", "viscous_prison", "spore_assimilation", "forest_engulfment", "regeneration_domain", "verdant_flood", "all_returns_to_gel"];
  const CHAPTER_FOUR_REWARD_CARD_IDS = [...CHAPTER_FOUR_UNIT_CARD_IDS, ...CHAPTER_FOUR_SPELL_CARD_IDS];
  const CHAPTER_FIVE_REWARD_CARD_IDS = [...CHAPTER_FIVE_UNIT_CARD_IDS, ...CHAPTER_FIVE_SPELL_CARD_IDS];
  const STARTER_IDS = [...new Set(STARTER_DECK)];
  const REWARD_CARD_IDS = ["iron_lancer", "eagle_eye", "royal_medic"];

  function valuesFor(card, level) {
    const lv = Math.max(1, Math.min(5, Number(level) || 1));
    if (card.type === "unit") return { attack: card.attack + lv - 1, health: card.health + lv - 1 };
    if (card.type === "weapon") return { attack: card.attack + Math.floor((lv - 1) / 2), durability: card.durability + (lv >= 4 ? 1 : 0) };
    if (card.effect === "damage") return { value: 2 + lv };
    if (card.effect === "heal") return { value: 3 + lv, heroValue: 2 + lv };
    if (card.effect === "buff") return { value: 1 + lv };
    if (card.effect === "front_aoe") return { value: 1 + lv };
    if (card.effect === "chain_damage") return { value: 2 + lv, splash: Math.ceil(lv / 2) };
    if (card.effect === "fortify") return { health: 2 + lv };
    if (card.effect === "summon_recruits") return { tokenAttack: 1 + Math.floor((lv - 1) / 2), tokenHealth: 1 + Math.floor(lv / 2) };
    if (card.effect === "group_heal") return { value: 1 + lv };
    if (card.effect === "execute_draw") return { value: 4 + lv };
    if (card.effect === "draw_cards") return { count: 1 + (lv >= 4 ? 1 : 0) };
    if (card.effect === "poison") return { value: 1 + lv, weaken: Math.ceil(lv / 2) };
    if (card.effect === "row_blast") return { value: 2 + lv };
    if (card.effect === "goblin_tide") return { tokenAttack: 1 + Math.floor(lv / 2), tokenHealth: 2 + Math.floor((lv - 1) / 2) };
    if (card.effect === "army_buff") return { attack: 1 + Math.floor(lv / 2), health: 1 + Math.ceil(lv / 2) };
    if (card.effect === "enemy_aoe") return { value: 2 + lv };
    if (card.effect === "treasury") return { heal: 6 + lv * 2 };
    if (card.effect === "queen_final") return { value: 4 + lv, tokenAttack: 2 + lv, tokenHealth: 3 + lv };
    if (card.effect === "honey_salve") return { heal: 2 + lv, attack: 1 + Math.floor((lv - 1) / 3) };
    if (card.effect === "growth_blessing") return { attack: 1 + Math.floor(lv / 2), health: 2 + lv };
    if (card.effect === "bear_paw") return { value: 3 + lv, splash: 1 + Math.floor(lv / 2) };
    if (card.effect === "wheat_barrier") return { health: 1 + lv };
    if (card.effect === "bee_swarm") return { value: 1 + Math.floor(lv / 2), weaken: 1 + Math.floor((lv - 1) / 3) };
    if (card.effect === "harvest_feast") return { heal: 2 + lv, count: 1 + (lv >= 4 ? 1 : 0) };
    if (card.effect === "bear_ambush") return { tokenAttack: 2 + Math.floor(lv / 2), tokenHealth: 3 + Math.ceil(lv / 2) };
    if (card.effect === "earth_tremor") return { value: 3 + lv, weaken: 1 + Math.floor(lv / 2) };
    if (card.effect === "autumn_rally") return { attack: 2 + Math.floor(lv / 2), health: 2 + Math.ceil(lv / 2) };
    if (card.effect === "bear_god") return { tokenAttack: 4 + lv, tokenHealth: 5 + lv, heal: 5 + lv * 2 };
    if (card.effect === "slime_mend") return { heal: 3 + lv, heroValue: 2 + lv };
    if (card.effect === "gel_barrier") return { health: 3 + lv };
    if (card.effect === "slime_division") return { tokenAttack: 1 + Math.floor((lv - 1) / 2), tokenHealth: 3 + lv };
    if (card.effect === "moonpool_surge") return { heal: 2 + lv, count: lv >= 4 ? 1 : 0 };
    if (card.effect === "viscous_prison") return { weaken: 1 + Math.floor(lv / 2) };
    if (card.effect === "spore_assimilation") return { health: 2 + lv, heal: 1 + lv };
    if (card.effect === "forest_engulfment") return { value: 1 + Math.floor(lv / 2), heal: 2 + lv };
    if (card.effect === "regeneration_domain") return { health: 1 + Math.floor(lv / 2), heal: 3 + lv };
    if (card.effect === "verdant_flood") return { tokenAttack: 2 + Math.floor(lv / 2), tokenHealth: 5 + lv };
    if (card.effect === "all_returns_to_gel") return { heal: 8 + lv * 2, tokenAttack: 3 + lv, tokenHealth: 8 + lv };
    return { value: lv };
  }

  function getCard(id, progress) {
    const base = CARD_LIBRARY[id];
    if (!base) return null;
    const level = Math.max(1, Math.min(5, progress?.level || 1));
    const values = valuesFor(base, level);
    let description = base.description;
    Object.entries(values).forEach(([key, value]) => { description = description.replaceAll(`{${key}}`, value); });
    return { ...base, ...values, level, description };
  }

  function makeDeck(ids, progressMap = {}) {
    return ids.map((id, index) => ({ ...getCard(id, progressMap[id]), instanceId: `${id}-${index}-${Math.random().toString(36).slice(2, 7)}` }));
  }

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { CARD_LIBRARY, STARTER_DECK, STARTER_IDS, REWARD_CARD_IDS, NEW_CARD_IDS, WEAPON_CARD_IDS, CHAPTER_TWO_UNIT_CARD_IDS, CHAPTER_TWO_SPELL_CARD_IDS, CHAPTER_TWO_REWARD_CARD_IDS, CHAPTER_THREE_UNIT_CARD_IDS, CHAPTER_THREE_SPELL_CARD_IDS, CHAPTER_THREE_REWARD_CARD_IDS, CHAPTER_FOUR_UNIT_CARD_IDS, CHAPTER_FOUR_SPELL_CARD_IDS, CHAPTER_FOUR_REWARD_CARD_IDS, CHAPTER_FIVE_UNIT_CARD_IDS, CHAPTER_FIVE_SPELL_CARD_IDS, CHAPTER_FIVE_REWARD_CARD_IDS, getCard, makeDeck, valuesFor });
})();

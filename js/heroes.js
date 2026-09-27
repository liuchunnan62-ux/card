(function () {
  "use strict";

  // 可选英雄：护卫队长 + 8名可选英雄 + 3名成就英雄（魅魔、狼人、吸血鬼；暂未开放，只展示头像）。
  // 数组顺序与原始立绘图一致。
  // 每名可选英雄拥有一个独特的英雄技能，新游戏选择英雄后自动解锁并装备。
  const CF = window.CardForge;
  const pick = (value, level) => Array.isArray(value) ? value[Math.max(0, Math.min(2, Number(level || 1) - 1))] : value;

  const SIGNATURE_SKILLS = [
    {
      id: "sig_piercing_arrow", icon: "🏹", name: "穿林箭", cost: 1, target: "enemy-any", effect: "piercing_arrow",
      amount: [2, 3, 4],
      playerDescription: level => `无视前排保护，对任意一个敌方随从造成${pick([2, 3, 4], level)}点伤害；若击杀目标，抽1张牌。`
    },
    {
      id: "sig_arcane_missiles", icon: "🔮", name: "奥术飞弹", cost: 1, target: "auto", effect: "arcane_missiles",
      count: [3, 4, 5],
      playerDescription: level => `发射${pick([3, 4, 5], level)}枚奥术飞弹，每枚随机对一个敌方随从或敌方英雄造成1点伤害。`
    },
    {
      id: "sig_dawn_revival", icon: "☀️", name: "晨曦复苏", cost: 2, target: "auto", effect: "dawn_revival",
      heal: [2, 3, 4],
      playerDescription: level => `使所有己方随从恢复至满生命，并为英雄恢复${pick([2, 3, 4], level)}点生命。`
    },
    {
      id: "sig_blood_frenzy", icon: "🩸", name: "血怒狂击", cost: 1, target: "friendly-unit", effect: "blood_frenzy",
      attack: [2, 3, 4], selfDamage: [2, 2, 2],
      playerDescription: level => `英雄失去2点生命，使一个己方随从本回合获得+${pick([2, 3, 4], level)}攻击，并可以立即再次攻击。`
    },
    {
      id: "sig_crimson_chain", icon: "🗡️", name: "猩红连刃", cost: 1, target: "enemy-front", effect: "crimson_chain",
      amount: [2, 3, 4],
      playerDescription: level => `对一个敌方前排随从造成${pick([2, 3, 4], level)}点伤害；若击杀目标，返还法力且本回合可以再次使用。`
    },
    {
      id: "sig_forest_ambush", icon: "🍃", name: "林间伏兵", cost: 2, target: "auto", effect: "forest_ambush",
      attack: [2, 3, 4], health: [1, 2, 3],
      playerDescription: level => `在后排召唤一个${pick([2, 3, 4], level)}攻/${pick([1, 2, 3], level)}血的远程林影弓手，它可以立即攻击随从。`
    },
    {
      id: "sig_aegis_wall", icon: "🛡️", name: "圣盾壁垒", cost: 2, target: "auto", effect: "aegis_wall",
      health: [2, 3, 4], guard: [4, 5, 6],
      playerDescription: level => `所有己方前排随从永久获得+${pick([2, 3, 4], level)}生命；若前排为空，则召唤一个0攻/${pick([4, 5, 6], level)}血的圣盾卫士。`
    },
    {
      id: "sig_sapling", icon: "🌱", name: "萌芽古树", cost: 2, target: "auto", effect: "sapling",
      attack: [1, 1, 2], health: [2, 3, 4],
      playerDescription: level => `召唤一个${pick([1, 1, 2], level)}攻/${pick([2, 3, 4], level)}血的古树幼苗；它在你每回合开始时永久获得+1/+1。`
    }
  ].map(skill => ({ ...skill, description: skill.playerDescription(1) }));

  const HEROES = [
    {
      id: "captain", name: "护卫队长", title: "边境剑士", portrait: "assets/hero/novice-swordsman.png", skill: "slash",
      bio: "出身边境守军的年轻剑士，善于寻找防线中最薄弱的一环。"
    },
    {
      id: "elf_archer", name: "莉瑟尔", title: "翠羽射手", portrait: "assets/heroes/elf-archer.webp", skill: "sig_piercing_arrow",
      bio: "林海边境最年轻的神射手，她的箭能穿过层层枝叶，找到藏在阵后的敌人。"
    },
    {
      id: "violet_witch", name: "薇奥菈", title: "紫晶魔女", portrait: "assets/heroes/violet-witch.webp", skill: "sig_arcane_missiles",
      bio: "离开法塔独自研究裂隙的魔女，擅长把魔力拆成无数枚难以躲避的飞弹。"
    },
    {
      id: "dawn_priestess", name: "赛琳娜", title: "晨曦圣女", portrait: "assets/heroes/dawn-priestess.webp", skill: "sig_dawn_revival",
      bio: "太阳神殿派往前线的圣女，相信每一名士兵都值得再站起来一次。"
    },
    {
      id: "horned_berserker", name: "格罗姆", title: "裂角蛮王", portrait: "assets/heroes/horned-berserker.webp", skill: "sig_blood_frenzy",
      bio: "北地部族的蛮王，以自己的鲜血点燃战士的怒火。"
    },
    { id: "locked_succubus", locked: true, portrait: "assets/heroes/locked-succubus.webp" },
    {
      id: "silverleaf_ranger", name: "埃尔德", title: "银叶游侠", portrait: "assets/heroes/silverleaf-ranger.webp", skill: "sig_forest_ambush",
      bio: "月林巡林员的首领，总能让敌人在树影里看到不该出现的弓手。"
    },
    { id: "locked_werewolf", locked: true, portrait: "assets/heroes/locked-werewolf.webp" },
    {
      id: "crimson_hood", name: "瑟拉", title: "猩红刺客", portrait: "assets/heroes/crimson-hood.webp", skill: "sig_crimson_chain",
      bio: "游走于王都暗巷的刺客，只在一击必杀时才会拔出猩红短刃，而一击之后往往还有下一击。"
    },
    {
      id: "aegis_knight", name: "奥斯坦", title: "银盾骑士", portrait: "assets/heroes/aegis-knight.webp", skill: "sig_aegis_wall",
      bio: "王都晨辉骑士团的老兵，他的盾阵从未在他面前后退一步。"
    },
    {
      id: "grove_dryad", name: "希尔瓦", title: "森灵德鲁伊", portrait: "assets/heroes/grove-dryad.webp", skill: "sig_sapling",
      bio: "古林之心孕育的德鲁伊，她种下的每一株幼苗都会长成守护森林的古树。"
    },
    { id: "locked_count", locked: true, portrait: "assets/heroes/locked-vampire-count.webp" }
  ];

  const SIGNATURE_BY_ID = Object.fromEntries(SIGNATURE_SKILLS.map(skill => [skill.id, skill]));
  const HERO_BY_ID = Object.fromEntries(HEROES.map(hero => [hero.id, hero]));

  function heroById(id) {
    const hero = HERO_BY_ID[id];
    return hero && !hero.locked ? hero : HERO_BY_ID.captain;
  }

  function currentHero() {
    return heroById(CF.SaveSystem?.data?.hero?.heroId);
  }

  function isSignatureSkill(id) { return Boolean(SIGNATURE_BY_ID[id]); }

  CF.HERO_SKILLS = Object.assign(CF.HERO_SKILLS || {}, SIGNATURE_BY_ID);
  Object.assign(CF, {
    HEROES,
    SIGNATURE_SKILLS: SIGNATURE_BY_ID,
    heroById,
    currentHero,
    isSignatureSkill,
    selectableHeroes: () => HEROES.filter(hero => !hero.locked)
  });
})();

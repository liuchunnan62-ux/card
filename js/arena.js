(function () {
  "use strict";

  const CF = window.CardForge;
  const ROUND_NAMES = ["64强赛", "32强赛", "16强赛", "8强赛", "半决赛", "决赛"];
  const ADVANCE_NAMES = ["32强", "16强", "8强", "4强", "亚军", "冠军"];
  const REWARDS = [100, 200, 400, 800, 1200, 1600];
  const PLAYER_ID = 0;
  const HERO_NAMES = [
    "曙光圣骑", "铁炉战王", "苍叶游侠", "赤焰导师", "裂牙酋长", "雷铜工匠", "寒骨领主", "月林守望", "夜幕之刃",
    "霜冠女王", "荒原先知", "圣辉祭司", "药剂大师", "赤鳞冠军", "沙海猎手", "黑潮船长", "邪刃猎魔", "鸦木女巫",
    "银冠王子", "血痕蛮王", "星界学者", "战矛督军", "古熊卫士", "红狐剑客", "天穹武僧", "瘟疫博士", "雄狮元帅",
    "红莲术士", "磐石统帅", "月夜伯爵", "钢鬃斗士", "高等剑法师", "沼泽巫祝", "苍鹰骑士", "暗影主祭", "黄铜机兵",
    "太阳圣女", "风暴贤者", "群峰巨人", "乌羽刺客", "红龙术士", "森语长者", "炼狱女王", "王家铳士", "骸骨教宗",
    "寒牙战王", "暮色契约者", "铜须盾女", "枭羽大法师", "荒野半人马", "赤潮海盗", "碧鳞神谕", "沙幕王子", "白狼骑士",
    "不灭凰女", "黑锋骑士", "蒲公英诗人", "血斧角斗士", "晶辉法师", "鹿角德鲁伊", "机巧提督", "虚空观星者", "黄金狮鹫"
  ];
  const HERO_PERSONAS = [
    ["honor", "王都晨辉骑士团", "让荣誉由守住阵线的人证明"],
    ["trash", "铁炉擂台", "你的盾看上去像报名处送的纪念品"],
    ["citizen", "苍叶精灵", "道路测绘、林地公约与公开军校"],
    ["scholar", "赤焰学院", "把火焰从破坏变成可计算的战术"],
    ["citizen", "裂牙兽人", "统一军粮、公开军籍与按功授衔"],
    ["citizen", "雷铜矮人", "标准化工坊、跨城铁路与工匠保险"],
    ["citizen", "寒骨亡者", "让亡者也能申诉和立契的王国法庭"],
    ["citizen", "月林精灵", "公共林地、识字学校与巡林员制度"],
    ["trash", "王都暗巷", "你每犹豫一秒，我就多想好一种让你退场的姿势"],
    ["honor", "北境霜冠卫", "让王冠的重量落在承担责任的人肩上"],
    ["citizen", "荒原牛头人", "灌溉渠、公共粮仓与灾年赈济"],
    ["honor", "圣辉教会", "让力量先学会克制，再谈胜利"],
    ["scholar", "王立药剂院", "用剂量、记录与复验取代碰运气"],
    ["citizen", "赤鳞蜥人", "下水道、防疫隔离与跨种族医馆"],
    ["honor", "沙海边军", "让每一支箭都对得起身后的商旅"],
    ["trash", "黑潮舰队", "我打沉过的船比你打赢过的比赛还多"],
    ["citizen", "魔裔猎手", "允许魔裔凭考核加入边境军团的军籍改革"],
    ["scholar", "鸦木学派", "把诅咒拆成能够理解和反制的符文结构"],
    ["trash", "银冠王室", "你能和我同场，是本届王冠杯最大的平民福利"],
    ["trash", "北地蛮族", "我会把你的战术连同桌子一起劈开"],
    ["scholar", "星界学院", "用观测和演算让星象不再只是预言"],
    ["trash", "战矛军团", "等你看清我的矛尖，裁判已经在数秒了"],
    ["citizen", "开智熊族", "蜂房、农具、冬粮制度与农学课堂"],
    ["citizen", "红狐族", "公开商会、契约法与不问出身的城市户籍"],
    ["honor", "天穹寺", "在出拳前先学会为何收拳"],
    ["scholar", "王都防疫署", "用统计、隔离和清洁水源战胜瘟疫"],
    ["citizen", "雄狮族", "按能力授衔、伤兵抚恤与军属安置"],
    ["trash", "红莲法塔", "你的牌组很适合生火，可惜这里已经够热了"],
    ["citizen", "磐石石裔", "桥梁工法、公共工程与有期限的劳务契约"],
    ["citizen", "月夜血族", "夜间工坊、公民登记与对异族有效的同一部法律"],
    ["citizen", "钢鬃野猪人", "军团食堂、伤残抚恤与面向所有人的征兵考核"],
    ["citizen", "高等精灵", "王立学院不问血统的招生与公开考试"],
    ["citizen", "沼泽蛙人", "排水工程、药材贸易与湿地保护法"],
    ["citizen", "苍鹰翼人", "驿站航空塔、开放军籍与统一空域规则"],
    ["trash", "暗影教团", "你带来了二十四张牌，我只需要一张墓志铭"],
    ["citizen", "黄铜构装体", "承认拥有意志的构装体也能成为公民"],
    ["honor", "太阳神殿", "让胜者有照亮败者道路的气度"],
    ["scholar", "风暴高塔", "记录气压与魔力，让雷霆服从推演"],
    ["citizen", "群峰巨人", "工会契约、城市桥梁与巨型工种的安全规范"],
    ["trash", "乌羽氏族", "我会从你手里偷走胜利，再把失败留作小费"],
    ["citizen", "红龙裔", "炼金消防队、法术安全规范与灾后重建"],
    ["citizen", "森语树人", "林权公约、轮作农学与共享水源"],
    ["trash", "炼狱魔裔", "别怕火焰，真正该怕的是我还没开始认真"],
    ["honor", "王家铳士团", "让新技术受纪律约束，而不是受傲慢驱使"],
    ["citizen", "骸骨亡灵", "墓园法、亡者劳动契约与不因外貌定罪的审判"],
    ["citizen", "寒牙狼族", "边境巡防、平民粮仓与合法军籍"],
    ["trash", "暮色契约会", "你的每个选择都在我的契约里标好了价钱"],
    ["citizen", "铜须矮人", "同工同酬的工匠行会与公开技术标准"],
    ["citizen", "枭羽人", "夜校、公共图书馆与向异族开放的考试"],
    ["citizen", "荒野半人马", "公路网、驿站通行权与牧道协定"],
    ["trash", "赤潮海盗团", "别数法力了，数数自己还剩几颗牙吧"],
    ["citizen", "碧鳞娜迦", "净水渠、跨种族医馆与河道共同管理"],
    ["honor", "沙幕王庭", "让王族先承担风险，再接受欢呼"],
    ["citizen", "白狼族", "合法军籍、家属安置与面向兽族的城市教育"],
    ["citizen", "不灭凰族", "火灾救援、灾后重建与对重生者的身份登记"],
    ["honor", "黑锋骑士团", "让锋刃只指向准备好应战的人"],
    ["citizen", "蒲公英花灵", "市集、印刷术与允许异族登台的演出许可"],
    ["trash", "血斧角斗场", "裁判最好离远点，我的胜利通常会溅到前三排"],
    ["scholar", "晶辉学院", "用晶体测量魔力，让法术可以被复现"],
    ["citizen", "鹿角兽人", "护林法、共享牧道与边地自治议会"],
    ["citizen", "机巧侏儒", "专利制度、公开船坞与事故追责"],
    ["scholar", "虚空观测站", "用长期观测区分天启、幻觉和噪声"],
    ["citizen", "黄金狮鹫族", "空骑军籍、兽族居住权与救援航线"]
  ];
  const buildArenaDialogue = (name, persona, index) => {
    const [kind, origin, belief] = persona;
    const variants = index % 3;
    if (kind === "citizen") {
      const turnLines = [
        `有人说${origin}永远不可能被人类接纳。可我的军籍、薪饷和选票都是真的。`,
        `我加入王国不是为了变成人类，而是因为这里允许我保留自己，也允许我凭本事向前。`,
        `血统只决定出生，制度和选择才决定我们能否并肩站在这里。`
      ];
      return {
        intro: `记住报名册上的名字——${name}。我来自${origin}，也认同人类建立的${belief}；所以我选择加入，他们也接受了我。`,
        turns: [turnLines[variants], "今天我代表的不是归顺，而是一个异族也能公开竞争、堂堂正正赢得掌声的王国。"],
        wounded: "漂亮。能把我逼到这里，说明王都接纳的也确实是一位值得尊敬的对手。",
        desperate: "我不会替那些偏见证明异族只配躲在荒野。来，最后一轮！",
        defeat: "你赢了。愿这座竞技场继续证明：人类与异族可以争胜，却不必彼此仇恨。"
      };
    }
    if (kind === "trash") {
      const turnLines = [
        "出牌再快一点。观众买票不是来看你思考人生的。",
        "你管这叫战线？我家的晾衣绳都比它更难突破。",
        "放心，我会给你留点体面——至少等裁判宣布以后再笑。"
      ];
      return {
        intro: `记好名字，${name}。${belief}。等你退场时，至少知道是谁送你的。`,
        turns: [turnLines[variants], "别看记分牌了，它不会因为你盯得够久就站到你那边。"],
        wounded: "刚才那一下还算像样。不过想让我闭嘴，你还差最后一段路。",
        desperate: "别急着向观众挥手！我只是把翻盘留到最吵的时候。",
        defeat: "今天算你赢。下次我会先击败你，再投诉这块明显偏向你的地板。"
      };
    }
    if (kind === "scholar") {
      const turnLines = [
        "别介意，我正在记录你的出牌习惯。真正危险的数据，往往来自自信的人。",
        "每次交换都在缩小答案范围。再过几轮，你的选择就会只剩一种。",
        "竞技场比实验室诚实：错误的理论会当场掉血。"
      ];
      return {
        intro: `我是${name}，来自${origin}。我的研究是${belief}；而你，是今天最有价值的实战样本。`,
        turns: [turnLines[variants], "放心，若你击败我，我会如实把结论写进报告。"],
        wounded: "数据偏离预测了。很好，没有意外的研究才最无聊。",
        desperate: "样本正在反过来验证研究者……我承认这个结果很有说服力。",
        defeat: "结论成立：你的临场判断胜过我的模型。下一版论文会写上这一条。"
      };
    }
    const turnLines = [
      "竞技场没有真正的仇敌，只有愿意把本领摆到阳光下的人。",
      "别为保存生命而放弃阵线。荣誉来自承担风险，不是躲过风险。",
      "观众记得胜负，战士应当记得自己在压力下做过什么选择。"
    ];
    return {
      intro: `我是${name}，来自${origin}。我信奉${belief}。护卫队长，请用一场完整的战斗回应我。`,
      turns: [turnLines[variants], "无需留手。尊重对手最好的方式，就是拿出真正想赢的力量。"],
      wounded: "好一记正面突破。疼痛会过去，失去判断才是真正的败势。",
      desperate: "只剩最后一点生命，正好用来检验最后一点意志。",
      defeat: "胜负已定。我记住了你的战术，也会把掌声留给配得上它的人。"
    };
  };
  const skillValue = (skill, key, level = 1) => {
    const value = skill[key];
    if (!Array.isArray(value)) return Number(value) || 0;
    return Number(value[Math.max(0, Math.min(2, Number(level) - 1))] ?? value[value.length - 1]) || 0;
  };
  const skillDescription = (skill, level = 1) => {
    const amount = skillValue(skill, "amount", level);
    const attack = skillValue(skill, "attack", level);
    const health = skillValue(skill, "health", level);
    const heal = skillValue(skill, "heal", level);
    const draw = skillValue(skill, "draw", level);
    const mana = skillValue(skill, "mana", level);
    const count = Math.max(1, skillValue(skill, "count", level));
    const selfDamage = skillValue(skill, "selfDamage", level);
    const heroDamage = skillValue(skill, "heroDamage", level);
    const splash = skillValue(skill, "splash", level);
    const durability = skillValue(skill, "durability", level);
    const bonus = skillValue(skill, "bonus", level);
    const extras = [];
    if (skill.effect === "front_strike") {
      if (splash) extras.push(`并对同路后排造成${splash}点伤害`);
      if (heroDamage) extras.push(`同时对敌方英雄造成${heroDamage}点伤害`);
      if (heal) extras.push(`为英雄恢复${heal}点生命`);
      return `对一个敌方前排随从造成${amount}点伤害${extras.length ? `，${extras.join("，")}` : ""}。`;
    }
    if (skill.effect === "hero_damage") {
      if (heal) extras.push(`恢复${heal}点生命`);
      if (draw) extras.push(`抽${draw}张牌`);
      if (selfDamage) extras.push(`自己受到${selfDamage}点伤害`);
      return `对敌方英雄造成${amount}点伤害${extras.length ? `，${extras.join("并")}` : ""}。`;
    }
    if (skill.effect === "hero_heal") return `为英雄恢复${amount}点生命${draw ? `并抽${draw}张牌` : ""}。`;
    if (skill.effect === "summon") return `召唤${count}个${attack}攻/${health}血的${skill.tokenName}${skill.rush ? "，它们可以立即攻击" : ""}。`;
    if (skill.effect === "weakest_damage") return `对生命最低的敌方随从造成${amount}点伤害；没有随从时攻击英雄${heroDamage ? `，并额外对英雄造成${heroDamage}点伤害` : ""}${heal ? `，为自己恢复${heal}点生命` : ""}。`;
    if (skill.effect === "enemy_aoe") return `对所有敌方随从造成${amount}点伤害${heroDamage ? `，并对敌方英雄造成${heroDamage}点伤害` : ""}${heal ? `，恢复${heal}点生命` : ""}。`;
    if (skill.effect === "draw") return `${selfDamage ? `失去${selfDamage}点生命并` : ""}抽${draw}张牌${mana ? `，本回合恢复${mana}点法力` : ""}。`;
    if (skill.effect === "buff_unit") return `使一个己方随从永久获得${attack ? `+${attack}攻击` : ""}${attack && health ? "和" : ""}${health ? `+${health}生命` : ""}${skill.keyword ? `并获得${skill.keyword}` : ""}。`;
    if (skill.effect === "army_buff") return `使所有己方随从${attack ? `${skill.permanent ? "永久" : "本回合"}获得+${attack}攻击` : ""}${attack && health ? "并" : ""}${health ? `永久获得+${health}生命` : ""}${draw ? `，抽${draw}张牌` : ""}。`;
    if (skill.effect === "front_aoe") return `对敌方前排所有随从造成${amount}点伤害${heroDamage ? `，并对敌方英雄造成${heroDamage}点伤害` : ""}。`;
    if (skill.effect === "heal_weakest") return `为受伤最重的己方随从恢复${heal}点生命；没有随从时治疗英雄${draw ? `，并抽${draw}张牌` : ""}。`;
    if (skill.effect === "mana") return `本回合恢复${mana}点法力${draw ? `并抽${draw}张牌` : ""}。`;
    if (skill.effect === "weapon") return `使装备的武器永久获得+${attack}攻击${durability ? `和+${durability}耐久` : ""}；没有武器时抽1张牌。`;
    if (skill.effect === "execute") return `对生命最低的敌方随从造成${amount}点伤害；目标生命不高于${skillValue(skill, "threshold", level)}时额外造成${bonus}点伤害。`;
    if (skill.effect === "heal_all") return `为英雄恢复${heal}点生命，并为所有己方随从恢复${amount}点生命${attack ? `且使其本回合获得+${attack}攻击` : ""}。`;
    return "发动独特的竞技场英雄技能。";
  };
  const makeSkill = spec => {
    const skill = { target: "auto", cost: 1, ...spec };
    skill.description = skillDescription(skill, 1);
    skill.playerDescription = level => skillDescription(skill, level);
    return skill;
  };

  const SLASH_SKILL = makeSkill({ id: "slash", icon: "⚔️", name: "斩击", cost: 1, target: "enemy-front", effect: "front_strike", amount: [2, 3, 4] });
  const ARENA_SKILL_SPECS = [
    { id: "fire", icon: "🔥", name: "火焰冲击", effect: "hero_damage", amount: [2,3,4] },
    { id: "heal", icon: "✨", name: "圣光祷言", effect: "hero_heal", amount: [3,4,5] },
    { id: "reinforce", icon: "🛡️", name: "白银援军", effect: "summon", tokenName: "白银卫兵", attack: [2,3,4], health: [2,3,4], count: [1,1,1] },
    { id: "totem", icon: "🗿", name: "先祖图腾", effect: "summon", tokenName: "先祖图腾", attack: [1,2,3], health: [3,4,5], count: [1,1,1] },
    { id: "hunt", icon: "🏹", name: "猎手射击", effect: "weakest_damage", amount: [2,3,4] },
    { id: "curse", icon: "☠️", name: "暗影诅咒", cost: 2, effect: "enemy_aoe", amount: [1,2,3] },
    { id: "tap", icon: "🩸", name: "生命契约", cost: 0, effect: "draw", draw: [1,2,3], selfDamage: [2,2,2] },
    { id: "blade", icon: "🗡️", name: "磨砺兵刃", target: "friendly-unit", effect: "buff_unit", attack: [1,2,3], health: [0,0,0] },
    { id: "wild", icon: "🐾", name: "野性之力", cost: 2, effect: "army_buff", attack: [1,2,3], health: [0,0,0], permanent: false },
    { id: "frost_guard", icon: "❄️", name: "霜冠守势", target: "friendly-unit", effect: "buff_unit", attack: [0,1,1], health: [3,4,5], keyword: "嘲讽" },
    { id: "thunder_insight", icon: "⚡", name: "雷霆洞见", cost: 2, effect: "hero_damage", amount: [1,2,3], draw: [1,1,1] },
    { id: "earth_sentinel", icon: "🪨", name: "大地哨卫", effect: "summon", tokenName: "岩甲守卫", attack: [1,1,2], health: [4,5,6], count: [1,1,1], keyword: "嘲讽" },
    { id: "venom_mark", icon: "🐍", name: "毒牙标记", effect: "weakest_damage", amount: [2,3,4], heroDamage: [1,1,2] },
    { id: "tide_mending", icon: "🌊", name: "潮汐愈合", effect: "heal_weakest", heal: [4,6,8] },
    { id: "gale_barrage", icon: "🌪️", name: "疾风齐射", cost: 2, effect: "front_aoe", amount: [1,2,3] },
    { id: "blood_drain", icon: "🦇", name: "绯红汲取", cost: 2, effect: "hero_damage", amount: [2,3,4], heal: [1,2,3] },
    { id: "moon_guard", icon: "🌙", name: "月辉庇护", cost: 2, effect: "hero_heal", amount: [2,3,4], draw: [1,1,1] },
    { id: "iron_wall", icon: "🏰", name: "铁壁列阵", cost: 2, effect: "army_buff", attack: [0,0,0], health: [1,2,3], permanent: true },
    { id: "arcane_surge", icon: "🔮", name: "奥术涌流", cost: 0, effect: "mana", mana: [1,2,3], draw: [1,1,1] },
    { id: "wolf_pack", icon: "🐺", name: "双狼奔袭", cost: 2, effect: "summon", tokenName: "霜牙幼狼", attack: [1,2,3], health: [1,2,3], count: [2,2,2] },
    { id: "emberstorm", icon: "🌋", name: "余烬风暴", cost: 2, effect: "enemy_aoe", amount: [1,1,2], heroDamage: [1,2,2] },
    { id: "precise_execute", icon: "🎯", name: "精确处决", cost: 2, effect: "execute", amount: [3,4,5], threshold: [2,3,4], bonus: [2,3,4] },
    { id: "war_chant", icon: "📯", name: "裂阵战歌", cost: 2, effect: "army_buff", attack: [1,1,2], health: [0,1,1], permanent: true },
    { id: "spring_blessing", icon: "🌿", name: "春泉祝祷", cost: 2, effect: "heal_all", heal: [2,3,4], amount: [1,2,3] },
    { id: "shadow_pierce", icon: "🌑", name: "影隙穿刺", target: "enemy-front", effect: "front_strike", amount: [2,3,4], splash: [1,1,2] },
    { id: "alchemy_cycle", icon: "⚗️", name: "炼金循环", cost: 0, effect: "draw", draw: [1,2,2], mana: [0,1,2], selfDamage: [0,0,0] },
    { id: "lion_roar", icon: "🦁", name: "雄狮怒吼", cost: 2, effect: "army_buff", attack: [1,2,3], health: [1,1,2], permanent: false },
    { id: "flame_lance", icon: "🔱", name: "炎枪贯日", cost: 2, target: "enemy-front", effect: "front_strike", amount: [3,4,5], heroDamage: [1,1,2] },
    { id: "stone_skin", icon: "⛰️", name: "磐石之肤", target: "friendly-unit", effect: "buff_unit", attack: [0,0,0], health: [4,6,8], keyword: "嘲讽" },
    { id: "night_feast", icon: "🌘", name: "夜宴吸魂", cost: 2, effect: "hero_damage", amount: [1,2,3], heal: [1,2,3] },
    { id: "boar_charge", icon: "🐗", name: "钢鬃冲锋", cost: 2, effect: "weakest_damage", amount: [3,4,5], heal: [1,1,2] },
    { id: "starfall", icon: "🌠", name: "星界坠落", cost: 2, effect: "enemy_aoe", amount: [1,2,2], heroDamage: [2,2,3] },
    { id: "swamp_blessing", icon: "🐸", name: "沼泽生息", cost: 2, effect: "heal_weakest", heal: [3,5,7], draw: [1,1,1] },
    { id: "eagle_volley", icon: "🦅", name: "苍鹰俯射", cost: 2, effect: "front_aoe", amount: [2,2,3], heroDamage: [1,1,1] },
    { id: "grave_march", icon: "💀", name: "墓园行军", cost: 2, effect: "summon", tokenName: "契约骸骨", attack: [2,2,3], health: [1,2,2], count: [1,2,2] },
    { id: "gear_up", icon: "⚙️", name: "黄铜校准", effect: "weapon", attack: [1,2,3], durability: [1,1,2] },
    { id: "sunray", icon: "☀️", name: "日轮圣辉", cost: 2, effect: "hero_damage", amount: [2,3,4], heal: [2,3,4] },
    { id: "storm_charge", icon: "⛈️", name: "风暴充能", cost: 0, effect: "mana", mana: [2,2,3], draw: [0,1,1] },
    { id: "giant_step", icon: "👣", name: "群峰降临", cost: 2, effect: "summon", tokenName: "山脊巨灵", attack: [3,4,5], health: [5,6,7], count: [1,1,1] },
    { id: "black_feather", icon: "🪶", name: "乌羽终裁", cost: 2, effect: "execute", amount: [2,3,4], threshold: [3,4,5], bonus: [3,4,5] },
    { id: "dragon_breath", icon: "🐉", name: "赤龙吐息", cost: 2, effect: "front_aoe", amount: [2,3,4], heroDamage: [1,1,2] },
    { id: "forest_grace", icon: "🌳", name: "森语恩泽", cost: 2, effect: "heal_all", heal: [3,4,5], amount: [2,2,3] },
    { id: "inferno_oath", icon: "😈", name: "炼狱誓火", cost: 1, effect: "hero_damage", amount: [3,4,5], selfDamage: [1,1,1] },
    { id: "royal_musket", icon: "💥", name: "王铳点名", cost: 2, effect: "weakest_damage", amount: [3,4,5], draw: [1,1,1] },
    { id: "bone_ward", icon: "🦴", name: "白骨壁垒", effect: "summon", tokenName: "白骨盾卫", attack: [1,2,2], health: [4,5,7], count: [1,1,1], keyword: "嘲讽" },
    { id: "frost_fang", icon: "🧊", name: "寒牙撕咬", target: "enemy-front", effect: "front_strike", amount: [3,4,5], heal: [1,1,2] },
    { id: "twilight_pact", icon: "📜", name: "暮色契约", cost: 0, effect: "draw", draw: [2,2,3], selfDamage: [3,2,2] },
    { id: "forgeheart", icon: "🔨", name: "炉心锻锋", effect: "weapon", attack: [2,3,4], durability: [0,1,1] },
    { id: "owl_wisdom", icon: "🦉", name: "枭羽博闻", cost: 0, effect: "draw", draw: [1,2,3], mana: [1,1,2], selfDamage: [0,0,0] },
    { id: "centaur_march", icon: "🐎", name: "牧道奔军", cost: 2, effect: "summon", tokenName: "半人马斥候", attack: [2,3,3], health: [2,3,4], count: [1,1,2], rush: true },
    { id: "red_tide", icon: "🏴‍☠️", name: "赤潮掠夺", cost: 1, effect: "hero_damage", amount: [2,3,4], draw: [1,1,1], selfDamage: [1,1,2] },
    { id: "scale_tide", icon: "🐚", name: "碧鳞回潮", cost: 2, effect: "heal_all", heal: [2,3,4], amount: [1,2,2], attack: [1,1,2] },
    { id: "desert_aegis", icon: "🏜️", name: "沙幕王盾", target: "friendly-unit", effect: "buff_unit", attack: [1,2,2], health: [3,4,6], keyword: "嘲讽" },
    { id: "white_wolf", icon: "🐺", name: "白狼急袭", effect: "summon", tokenName: "白狼先锋", attack: [2,3,4], health: [2,3,4], count: [1,1,1], rush: true },
    { id: "phoenix_rebirth", icon: "🕊️", name: "凰火再生", cost: 2, effect: "hero_heal", amount: [4,6,8], draw: [0,0,1] },
    { id: "black_edge", icon: "⚔️", name: "黑锋断罪", cost: 2, target: "enemy-front", effect: "front_strike", amount: [4,5,6] },
    { id: "dandelion_song", icon: "🌼", name: "蒲公英行歌", cost: 2, effect: "army_buff", attack: [0,1,1], health: [1,1,2], draw: [1,1,1], permanent: false },
    { id: "blood_axe", icon: "🪓", name: "血斧献祭", cost: 1, effect: "hero_damage", amount: [3,4,5], selfDamage: [2,2,2] },
    { id: "crystal_prism", icon: "💎", name: "晶辉折射", cost: 2, effect: "enemy_aoe", amount: [1,2,3], heal: [1,2,3] },
    { id: "antler_growth", icon: "🦌", name: "鹿角繁生", target: "friendly-unit", effect: "buff_unit", attack: [1,2,3], health: [2,3,4] },
    { id: "admiral_order", icon: "🚢", name: "提督齐射", cost: 2, effect: "summon", tokenName: "机巧水兵", attack: [2,3,4], health: [3,3,4], count: [1,2,2], combatStyle: "ranged" },
    { id: "void_glimpse", icon: "🌀", name: "虚空窥见", cost: 0, effect: "draw", draw: [2,3,3], selfDamage: [1,1,0] },
    { id: "griffin_dive", icon: "🦅", name: "狮鹫天坠", cost: 2, effect: "weakest_damage", amount: [4,5,6], heroDamage: [0,1,2] }
  ];
  const ARENA_SKILLS = ARENA_SKILL_SPECS.map(makeSkill);
  const HERO_SKILLS = Object.fromEntries([SLASH_SKILL, ...ARENA_SKILLS].map(skill => [skill.id, skill]));
  const SKILLS = ARENA_SKILLS;

  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const makeRounds = () => ROUND_NAMES.map((name, round) => Array.from({ length: 32 >> round }, (_, index) => ({
    id: `r${round}-m${index}`, round, index, entrants: [null, null], winner: null, loser: null, status: "waiting"
  })));

  const Arena = {
    heroes: HERO_NAMES.map((name, index) => ({
      id: index + 1,
      name,
      portrait: `assets/arena/portraits/hero-${String(index + 1).padStart(2, "0")}.webp`,
      skill: SKILLS[index],
      persona: HERO_PERSONAS[index][0],
      dialogue: buildArenaDialogue(name, HERO_PERSONAS[index], index)
    })),
    roundNames: ROUND_NAMES,
    advanceNames: ADVANCE_NAMES,
    rewards: REWARDS,
    participant(id) {
      if (id === PLAYER_ID) return { id: PLAYER_ID, name: "护卫队长", portrait: "assets/hero/novice-swordsman.png", player: true, skill: HERO_SKILLS[CF.SaveSystem.data.hero.equippedSkill || "slash"] || HERO_SKILLS.slash };
      return this.heroes.find(hero => hero.id === id) || null;
    },
    preferredFinalist() {
      const progress = CF.SaveSystem.data.hero.skillProgress || {};
      const unowned = this.heroes.filter(hero => !progress[hero.skill.id]?.unlocked);
      const pool = unowned.length ? unowned : this.heroes;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    createTournament() {
      const preferredFinalist = this.preferredFinalist();
      const playerSlot = Math.floor(Math.random() * 64);
      const oppositeSlots = Array.from({ length: 32 }, (_, index) => playerSlot < 32 ? index + 32 : index);
      const featuredSlot = oppositeSlots[Math.floor(Math.random() * oppositeSlots.length)];
      const remaining = shuffle(this.heroes.map(hero => hero.id).filter(id => id !== preferredFinalist.id));
      const entrants = Array(64).fill(null);
      entrants[playerSlot] = PLAYER_ID;
      entrants[featuredSlot] = preferredFinalist.id;
      entrants.forEach((id, index) => { if (id === null) entrants[index] = remaining.shift(); });
      const rounds = makeRounds();
      rounds[0].forEach((match, index) => {
        match.entrants = [entrants[index * 2], entrants[index * 2 + 1]];
        match.status = "ready";
      });
      const tournament = {
        version: 3, round: 0, earnings: 0, path: Array(6).fill(null), defeated: [], match: null,
        featuredFinalistId: preferredFinalist.id,
        lost: false, lostAt: null, champion: false, championId: null,
        bracket: { version: 3, rounds }
      };
      this.resolveAiMatches(tournament, 0);
      this.rememberCurrentOpponent(tournament);
      return tournament;
    },
    current() {
      const tournament = CF.SaveSystem.data.arena || null;
      if (!tournament) return null;
      if ((tournament.version === 2 || tournament.version === 3) && tournament.bracket?.rounds?.length === 6) return tournament;
      return this.migrateTournament(tournament);
    },
    start() {
      CF.SaveSystem.data.arena = this.createTournament();
      CF.SaveSystem.save();
      return CF.SaveSystem.data.arena;
    },
    playerMatch(tournament, round = tournament?.round) {
      return tournament?.bracket?.rounds?.[round]?.find(match => match.entrants.includes(PLAYER_ID)) || null;
    },
    decideWinner(match, tournament = null) {
      const [first, second] = match.entrants;
      if (first === null || second === null) return null;
      if (tournament?.featuredFinalistId && match.entrants.includes(tournament.featuredFinalistId)) return tournament.featuredFinalistId;
      const firstPower = 45 + ((first * 17 + match.round * 11) % 24) + Math.random() * 28;
      const secondPower = 45 + ((second * 19 + match.round * 7) % 24) + Math.random() * 28;
      return firstPower >= secondPower ? first : second;
    },
    finishMatch(match, winner) {
      if (!match || winner === null || !match.entrants.includes(winner)) return null;
      match.winner = winner;
      match.loser = match.entrants.find(id => id !== winner);
      match.status = "complete";
      return winner;
    },
    resolveAiMatches(tournament, round) {
      tournament.bracket.rounds[round].forEach(match => {
        if (match.winner !== null || match.entrants.includes(PLAYER_ID) || match.entrants.some(id => id === null)) return;
        this.finishMatch(match, this.decideWinner(match, tournament));
      });
    },
    openNextRound(tournament, completedRound) {
      if (completedRound >= 5) {
        tournament.championId = tournament.bracket.rounds[5][0].winner;
        return false;
      }
      const source = tournament.bracket.rounds[completedRound];
      if (source.some(match => match.winner === null)) return false;
      const next = tournament.bracket.rounds[completedRound + 1];
      next.forEach((match, index) => {
        match.entrants = [source[index * 2].winner, source[index * 2 + 1].winner];
        match.status = "ready";
      });
      this.resolveAiMatches(tournament, completedRound + 1);
      return true;
    },
    rememberCurrentOpponent(tournament) {
      const match = this.playerMatch(tournament);
      const opponentId = match?.entrants.find(id => id !== PLAYER_ID);
      if (opponentId && tournament.path[tournament.round] !== opponentId) tournament.path[tournament.round] = opponentId;
      return opponentId || null;
    },
    replayPlayerWin(tournament) {
      const round = tournament.round;
      const match = this.playerMatch(tournament, round);
      if (!match) return false;
      this.finishMatch(match, PLAYER_ID);
      if (round >= 5) {
        tournament.round = 6;
        tournament.champion = true;
        tournament.championId = PLAYER_ID;
        return true;
      }
      this.openNextRound(tournament, round);
      tournament.round = round + 1;
      this.rememberCurrentOpponent(tournament);
      return true;
    },
    completeAfterPlayerExit(tournament) {
      let round = tournament.lostAt ?? tournament.round;
      while (round < 5) {
        this.openNextRound(tournament, round);
        round += 1;
      }
      tournament.championId = tournament.bracket.rounds[5][0].winner;
    },
    migrateTournament(legacy) {
      const upgraded = this.createTournament();
      const completed = Math.max(0, Math.min(6, Number(legacy.round) || 0));
      for (let round = 0; round < completed; round += 1) this.replayPlayerWin(upgraded);
      upgraded.earnings = Math.max(0, Number(legacy.earnings) || 0);
      upgraded.defeated = Array.isArray(legacy.defeated) ? [...legacy.defeated] : [];
      if (legacy.champion || completed >= 6) {
        upgraded.champion = true;
        upgraded.championId = PLAYER_ID;
        upgraded.round = 6;
      } else if (legacy.lost) {
        const playerMatch = this.playerMatch(upgraded);
        const opponentId = playerMatch?.entrants.find(id => id !== PLAYER_ID);
        if (playerMatch && opponentId) this.finishMatch(playerMatch, opponentId);
        upgraded.lost = true;
        upgraded.lostAt = upgraded.round;
        this.completeAfterPlayerExit(upgraded);
      }
      upgraded.match = null;
      CF.SaveSystem.data.arena = upgraded;
      CF.SaveSystem.save();
      return upgraded;
    },
    ensureMatch() {
      const tournament = this.current();
      if (!tournament || tournament.lost || tournament.champion) return null;
      const heroId = this.rememberCurrentOpponent(tournament);
      if (!heroId) return null;
      if (!tournament.match || tournament.match.heroId !== heroId) {
        const levels = {};
        [...new Set(CF.SaveSystem.data.deck)].forEach(id => { levels[id] = { level: 1 + Math.floor(Math.random() * 5), xp: 0 }; });
        tournament.match = { heroId, levels };
        CF.SaveSystem.save();
      }
      return tournament.match;
    },
    opponent() {
      const tournament = this.current();
      const match = this.ensureMatch();
      if (!tournament || !match) return null;
      const hero = this.heroes.find(item => item.id === match.heroId);
      const round = tournament.round;
      const health = 30 + round * 5;
      const arenaSkillLevel = Math.max(1, Math.min(3, 1 + Math.floor(round / 2)));
      return {
        id: `arena-${hero.id}`, name: hero.name, title: `王都竞技场 · ${ROUND_NAMES[round]}`,
        icon: "🏆", portrait: hero.portrait, type: "arena", mode: "arena", battlefield: "arena",
        health, mana: Math.max(3, Math.min(7, CF.SaveSystem.data.hero.maxMana + Math.floor(round / 2))),
        deck: [...CF.SaveSystem.data.deck], cardProgress: match.levels,
        arenaSkill: hero.skill.id, arenaSkillLevel,
        skills: [{ ...hero.skill, every: 1, description: `Lv${arenaSkillLevel}：${hero.skill.playerDescription(arenaSkillLevel)}` }],
        dialogue: hero.dialogue,
        description: `${hero.name}使用与你完全相同的卡组，但卡牌等级在本场随机决定。`
      };
    },
    win() {
      const tournament = this.current();
      if (!tournament) return null;
      const reward = REWARDS[tournament.round];
      const advance = ADVANCE_NAMES[tournament.round];
      const playerMatch = this.playerMatch(tournament);
      const defeatedHero = this.heroes.find(hero => hero.id === tournament.match?.heroId);
      if (!playerMatch || !defeatedHero) return null;
      this.finishMatch(playerMatch, PLAYER_ID);
      tournament.defeated.push(tournament.match?.heroId);
      tournament.earnings += reward;
      CF.SaveSystem.data.coins += reward;
      const skillXp = CF.SaveSystem.addHeroSkillXp(2);
      tournament.match = null;
      if (tournament.round >= 5) {
        tournament.round = 6;
        tournament.champion = true;
        tournament.championId = PLAYER_ID;
      } else {
        const completedRound = tournament.round;
        this.openNextRound(tournament, completedRound);
        tournament.round += 1;
        this.rememberCurrentOpponent(tournament);
      }
      const skillUnlock = tournament.champion && defeatedHero
        ? CF.SaveSystem.unlockHeroSkill(defeatedHero.skill.id)
        : null;
      CF.SaveSystem.save();
      return {
        reward, advance, champion: tournament.champion, skillXp,
        unlockedSkill: skillUnlock ? defeatedHero.skill : null,
        alreadyUnlocked: Boolean(skillUnlock?.alreadyUnlocked)
      };
    },
    lose() {
      const tournament = this.current();
      if (!tournament) return;
      const playerMatch = this.playerMatch(tournament);
      const opponentId = playerMatch?.entrants.find(id => id !== PLAYER_ID);
      if (playerMatch && opponentId) this.finishMatch(playerMatch, opponentId);
      tournament.lost = true;
      tournament.lostAt = tournament.round;
      tournament.match = null;
      this.completeAfterPlayerExit(tournament);
      CF.SaveSystem.save();
    }
  };

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { Arena, HERO_SKILLS });
})();

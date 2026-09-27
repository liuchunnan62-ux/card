(function () {
  "use strict";

  // 战斗表情：点击我方头像弹出表情菜单，对面会按身份给出对应回应。
  // 每条台词可以是字符串或字符串数组（数组时随机选一句）。
  const CF = window.CardForge = window.CardForge || {};

  const EMOTES = [
    { id: "greet", icon: "👋", label: "问候" },
    { id: "well_played", icon: "👏", label: "称赞" },
    { id: "thanks", icon: "🤝", label: "感谢" },
    { id: "wow", icon: "😮", label: "惊叹" },
    { id: "sorry", icon: "🙇", label: "抱歉" },
    { id: "threaten", icon: "⚔️", label: "嘲讽" }
  ];

  const PLAYER_LINES = {
    greet: ["我是王国的护卫队长。报上你的名字。", "你好。……我想，你听得懂我在说什么。"],
    well_played: ["打得漂亮。", "这一手，连王城的教官都未必想得到。"],
    thanks: ["谢谢。", "多谢手下留情。"],
    wow: ["……这真的是野兽能做到的事？", "不可思议。"],
    sorry: ["抱歉。", "我只是奉命行事……对不起。"],
    threaten: ["讨伐令上写着你的名字。", "退回去，否则别怪我的剑。"]
  };

  // 各章节普通与精英关卡：由该关守卫以族群口吻回应。
  const CHAPTER_REPLIES = {
    1: {
      greet: ["名字？一年前我还没有名字。现在有了，却不打算告诉拿剑的人。", "我听得懂。正因为听得懂，才更清楚你们的讨伐令上写了什么。"],
      well_played: ["你的剑很快。森林会记住这种速度。", "……你比从前的猎人强。对我们来说，这不是好消息。"],
      thanks: ["别谢我。我只是还没饿到那个地步。", "谢谢？这是人类第一次对我们说这两个字。"],
      wow: ["是那条河。它让狼学会绕开陷阱，也让熊学会记仇。", "惊讶什么？你们挖的陷阱，我们看了整整五年。"],
      sorry: ["道歉之前，先把剑收回鞘里。", "你的抱歉，填不饱幼崽的肚子。"],
      threaten: ["我们已经退无可退。你要赌，就赌上性命。", "来吧。这片林子里每一棵树都记得人类的斧头。"]
    },
    2: {
      greet: ["哟，人类。先说好，王庭里的热粥没有你的份。", "打招呼可以，过路税交了吗？"],
      well_played: ["不错嘛。女王说要多向强者学习——这招我记下了。", "这一手我偷……啊不，借走了。"],
      thanks: ["谢什么，我又没把你的钱袋还给你。", "哈！第一次有人类对哥布林说谢谢，我得把它记进账本。"],
      wow: ["吓到了？吃饱饭以后，我们的脑子也跟着转得快了。", "这叫战术，护卫队长。我们现在会写这两个字了。"],
      sorry: ["道歉又不能当饭吃。赔粮食吧。", "你踢翻的那口锅，可不是一句抱歉能补上的。"],
      threaten: ["威胁哥布林？我们在泥沟里被威胁了几百年，早就听腻了。", "有本事就来！王庭每个巷口都有饿过肚子的眼睛盯着你。"]
    },
    3: {
      greet: ["你好，人类。走路轻点，麦苗刚冒头。", "老农夫教过我，见面要先问好。你好。"],
      well_played: ["好力气。可惜没用在扶犁上。", "嗯，这一下打得实在。熊族敬重实在的对手。"],
      thanks: ["不客气。战母说，礼貌和粮食一样不该浪费。", "……你们人类也说这个？那对老夫妇也常这么说。"],
      wow: ["熊会种地，很奇怪吗？那条河让我们学会了等待发芽。", "别瞪眼。幼熊第一次看见你的铠甲时，也是这副表情。"],
      sorry: ["如果你真觉得抱歉，就让粮车过去。", "道歉我收下了。可剑还在你手里，这仗还得打。"],
      threaten: ["吼——！熊族不追杀逃走的人，但也从不在田埂上后退。", "你脚下是冬麦。再往前一步，我就不客气了。"]
    },
    4: {
      greet: ["你好……你的声音让露珠在颤抖。", "咕啾。我是说：欢迎来到森林边缘，请止步。"],
      well_played: ["我的一部分被你打散了，另一部分觉得你很厉害。", "分裂的伤口会愈合，你的判断却值得记住。"],
      thanks: ["我们只拿走无人看守的果子，也不需要谢意。", "水不会拒绝感谢。可悬赏令会。"],
      wow: ["千滴意识一起思考，看上去当然像魔法。", "第一次看见史莱姆说话吧？我第一次听见自己的声音时，也吓了一跳。"],
      sorry: ["道歉……会让翠绿城撤回悬赏吗？", "我们接受道歉。森林接不接受，要看你下一步踩在哪里。"],
      threaten: ["你的剑能切开胶体，切不开整片沼泽。", "威胁对史莱姆没用。我们会慢慢地、一直地，重新聚合。"]
    },
    5: {
      greet: ["护卫队长。灰牙记得你一路走来的足迹。", "你好。这座城的旧碑上说，人类也曾这样和我们打招呼。"],
      well_played: ["干净利落。可惜这份本事，用在了追击撤退的背影上。", "好身手。灰牙尊重强者，却不追随拿悬赏令的人。"],
      thanks: ["别谢我。我放你一马，是因为首领不想让幼崽学会复仇。", "谢谢？把这两个字带回翡翠城，写进下一张告示里吧。"],
      wow: ["千枝城本就属于许多种族。该惊讶的，是你们竟遗忘得如此彻底。", "我们会修井、会敲钟、会识字。这就让你惊讶了？"],
      sorry: ["道歉刻不上石碑。停下脚步，才算数。", "你说抱歉，墙后的幼崽听不懂。她们只听得懂脚步声。"],
      threaten: ["威胁？悬赏令上的每一个字，我们都背下来了。", "千枝城不会再退。你想要废墟，就得先踏过灰牙。"]
    }
  };

  // 各章最终首领与特殊对手的专属回应。
  const BOSS_REPLIES = {
    wolf_king: {
      greet: "护卫队长。我曾是林子里最普通的一头狼，直到那条河让我听懂了你们的话。",
      well_played: "好一剑。你若生在林中，会是一位好狼王。",
      thanks: "你向一头野兽道谢？……也许那条河改变的，不止我们。",
      wow: "是的，我会说话，也会记账——记着你们烧掉了多少片林子。",
      sorry: "你的抱歉来得太晚了。幼崽已经饿了一整个冬天。",
      threaten: "我退过河滩、退过旧道。这里是最后一片林子——没有退路的狼最危险。"
    },
    goblin_queen: {
      greet: "欢迎来到翠影王庭！鞋底的泥擦一擦，地板是我们刚铺好的。",
      well_played: "哈，好一手！要不要辞掉王国的差事，来王庭当个教头？包三餐。",
      thanks: "嗯哼，挺有礼貌。那五个魅魔客人也很有礼貌——所以她们喝到了我最好的酒。",
      wow: "惊讶吗？一个哥布林戴上王冠，还把王庭管得井井有条。",
      sorry: "道歉？那就赔我的王座。金币或者麦子，我都收。",
      threaten: "别吓唬我，护卫队长。我挨过的饿，比你挥过的剑还多。"
    },
    bear_matriarch: {
      greet: "护卫队长，你好。请绕开东边那片田，那是幼熊们亲手种下的。",
      well_played: "你很强。若你肯放下剑拿起镰刀，今年的收成会更好。",
      thanks: "不必谢。那对老夫妇教会我：善意要趁早说出口。",
      wow: "一头熊当上战母，还会清点粮袋——这就是伊瑟兰妲之血给我们的未来。",
      sorry: "我接受你的道歉。但粮车走完之前，我不会让开。",
      threaten: "要战便战。只是记住：你每拖住我一刻，就有一车冬麦穿过裂隙。"
    },
    slime_sage: {
      greet: "你好，护卫队长。我是涅芙莉——不是悬赏令上的吞城魔女。",
      well_played: "精彩的判断。希望你下一次判断的，是这场讨伐该不该继续。",
      thanks: "水会记住善意，就像它记住了女王的血。",
      wow: "我活得比翠绿城还久。史莱姆会说话，只是森林终于开口了。",
      sorry: "若你真心道歉，就让追兵停在森林边缘。",
      threaten: "你可以蒸干我的身体，却蒸不干那条流向故土的河。"
    },
    wolf_matriarch: {
      greet: "护卫队长。一路上倒下的守卫都有名字——你记住了几个？",
      well_played: "好身手。我本可以突袭翡翠城，却选择了绕路。希望你的本事也用在对的方向。",
      thanks: "谢意我收下了。把它带回翡翠城，比带回我的头颅更有价值。",
      wow: "千枝城的旧碑上刻着四种文字。该惊讶的是你们，竟忘得这么干净。",
      sorry: "抱歉不能让废墟重新立起来。但至少说明，你开始思考了。",
      threaten: "威胁我？千枝城已经毁过一次。这一次，它不会再退让。"
    },
    succubus_officers: {
      greet: "护卫队长，久仰。伊瑟兰妲殿下的血流过的地方，我们都会去看一看。",
      well_played: "漂亮。人类里偶尔也会出现值得记住的名字。",
      thanks: "不必客气。魅魔从不白白收下谢意——下次记得回礼。",
      wow: "惊讶吗？千年来你们只肯记住‘魔族’这个称呼，却从不记得我们的脸。",
      sorry: "道歉？千年前，你们也没向被赶出河岸的族群道过歉。",
      threaten: "威胁魔族联军？上一个这么说话的，是白石城的守将。"
    },
    queen_iselanda: {
      greet: "你好，喝下我血液的人类。在梦里，不必拔剑。",
      well_played: "称赞我？你们的史书可从未这样写过。",
      thanks: "不必谢我。河水只是流向了它该去的地方。",
      wow: "惊讶吗？一个没有王冠的魅魔，也能让整片大陆记住她。",
      sorry: "你的道歉，该说给那些被赶出河岸的族群，而不是一个死者。",
      threaten: "威胁一个早已沉入河底的人？莱昂的圣剑也没能做到。"
    },
    trial_mentor: {
      greet: ["少说客套，统领。把阵线摆给我看。", "来了？很好，今天的课开始了。"],
      well_played: ["不错。可真正的战场上，没人会替你喝彩。", "这一步走得对。记住它。"],
      thanks: ["别谢我，谢你自己没犯错。", "等你活着走出寒河谷那样的战场，再来谢我。"],
      wow: ["惊讶？归乡之战时，比这离奇的事多得是。", "敌人不会等你回过神来。"],
      sorry: ["在训练场上道歉可以，在战场上只会少一条命。", "错了就改，道歉留给阵亡者的家人。"],
      threaten: ["哈！有这股劲，就留到真正的敌人面前。", "嘴上的锋芒，先用在剑上。"]
    },
    arena: {
      greet: ["幸会。愿这一场打得漂亮。", "观众都在看着，别让他们失望。"],
      well_played: ["好一手！", "这一下，值得看台上的掌声。"],
      thanks: ["客气了。", "比赛归比赛，礼数不能少。"],
      wow: ["哈，没想到吧？", "竞技场从来不缺惊喜。"],
      sorry: ["不必道歉，这就是比赛。", "道歉就免了，打完再说。"],
      threaten: ["王冠杯只会有一个冠军。", "口气不小，让我看看你的本事。"]
    }
  };

  const FINAL_BOSS_IDS = ["wolf_king", "goblin_queen", "bear_matriarch", "slime_sage", "wolf_matriarch"];

  const pick = (lines, random = Math.random) => Array.isArray(lines) ? lines[Math.floor(random() * lines.length) % lines.length] : lines;

  function replySetFor(enemyConfig, rescueActive = false) {
    if (!enemyConfig) return BOSS_REPLIES.arena;
    if (rescueActive || enemyConfig.id === "qianzhi_demon_garrison") return BOSS_REPLIES.succubus_officers;
    if (enemyConfig.mode === "trial") return enemyConfig.trialId === 7 ? BOSS_REPLIES.queen_iselanda : BOSS_REPLIES.trial_mentor;
    if (enemyConfig.mode === "arena") return BOSS_REPLIES.arena;
    if (FINAL_BOSS_IDS.includes(enemyConfig.id)) return BOSS_REPLIES[enemyConfig.id];
    return CHAPTER_REPLIES[enemyConfig.chapter] || CHAPTER_REPLIES[1];
  }

  function playerLine(emoteId, random) {
    return PLAYER_LINES[emoteId] ? pick(PLAYER_LINES[emoteId], random) : "";
  }

  function replyFor(enemyConfig, emoteId, options = {}) {
    const set = replySetFor(enemyConfig, options.rescueActive);
    return set?.[emoteId] ? pick(set[emoteId], options.random) : "";
  }

  CF.Emotes = { list: EMOTES, PLAYER_LINES, CHAPTER_REPLIES, BOSS_REPLIES, replySetFor, playerLine, replyFor };
})();

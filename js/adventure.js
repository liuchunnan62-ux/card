(function () {
  "use strict";

  const CF = window.CardForge;
  const COIN_ICON = '<img class="coin-icon" src="assets/ui/gold-coin.png" alt="金币">';
  // 笔记残页：共享收集池，内容是世界观故事《源血纪元》，按章节与段落切分为71页（每页约100字），一场胜利解锁一页。
  // 每场战斗（普通/精英/Boss）胜利后，翻牌第三张按顺序解锁下一页；集满后第三张不再有奖励。
  const LORE_BOOK_TITLE = "《源血纪元》";
  const LORE_PAGES = [
    { title: "序章·流淌在大陆血脉中的女王（一）", paragraphs: [
      "很久以前，泽亚大陆并没有所谓的“人界”与“魔界”。",
      "那时，大陆北方覆盖着终年不化的雪山，南方是温暖辽阔的海洋。贯穿整个大陆的源初之河，从北境最高的神脊雪山流下，穿过森林、平原、丘陵、峡谷与湿地，最后在大陆最南端汇入无涯海。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（二）", paragraphs: [
      "源初之河并不是泽亚大陆上最长的河流，却是最重要的一条河流。",
      "它的支流如同大地上的血脉，遍布大陆大部分地区。人族、兽族、羽族、蛇人、角魔、精灵、矮人、魅魔以及许多如今已经消失的古老种族，都曾在它的两岸建立村庄与城镇。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（三）", paragraphs: [
      "在那个遥远的年代，不同种族虽然时有争斗，却也彼此贸易、通婚、结盟。",
      "牛头人在平原上开垦土地，矮人在山脉中挖掘矿石，精灵在森林深处守护古树，魅魔经营着河岸上的旅馆、酒馆和商队，蛇人则沿着支流运送药草与香料。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（四）", paragraphs: [
      "那个时代并不和平，却也没有谁认为某一种族天生应该占据整片大陆。",
      "直到人族崛起。",
      "人类没有最强壮的身体，也没有最长久的寿命。他们无法像鸟人一样飞翔，无法像蛇人一样感知地下的震动，也无法像魅魔一样触碰他人的梦境。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（五）", paragraphs: [
      "但他们拥有另外一种可怕的天赋。",
      "他们繁衍迅速，适应力极强，而且极善于组织。",
      "最初，人族只是在源初之河中游建立了几座小城。后来，这些城市通过道路、税制、军团和统一的文字彼此联结，逐渐形成了泽亚大陆上第一个真正意义上的大型王国。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（六）", paragraphs: [
      "此后数百年里，人族不断向外扩张。",
      "他们在丰饶的平原上筑起城墙，在森林边缘修建堡垒，在河流上架设桥梁。他们将土地划入贵族的领地，把森林改造成农田，把其他种族原本自由使用的河岸、山谷和草场登记为王国财产。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（七）", paragraphs: [
      "最初，人类给出的理由是秩序。",
      "后来，理由变成了安全。",
      "再后来，他们不再需要理由。",
      "人类学者开始编写新的历史。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（八）", paragraphs: [
      "在新编纂的典籍中，其他种族不再被称为泽亚大陆的古老居民，而被描述为“异类”“蛮族”和“受黑暗污染的生物”。",
      "拥有角的人被说成恶魔。",
      "能够操纵梦境的人被说成邪灵。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（九）", paragraphs: [
      "崇拜自然的人被说成不服从王权的野蛮人。",
      "反抗人类征服的所有族群，最终都被归入了同一个名称。",
      "魔族。",
      "这个名称起初只是人类军队对敌人的蔑称，后来却成为一道无法抹去的界线。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（十）", paragraphs: [
      "人族将其他种族赶出肥沃的平原，逼迫他们迁入泽亚大陆上最不适合生存的地区。",
      "角魔被驱逐到流金沙海。",
      "蛇人与蜥蜴人被迫退入幽影沼泽。",
      "牛头人和巨魔被赶进裂土荒漠。",
      "哥布林、地精和穴居人躲进褐石矿场。"
    ] },
    { title: "序章·流淌在大陆血脉中的女王（十一）", paragraphs: [
      "魅魔则失去了曾经遍布河岸的旅馆、商会和城市，只能迁往大陆西部终年被暮色笼罩的黑暗山谷。",
      "人类将这些地方统称为魔界。",
      "然而，所谓的魔界并不是另一个世界。",
      "它只是人类不愿居住的土地。"
    ] },
    { title: "第一章·千年的战争（一）", paragraphs: [
      "驱逐并没有带来和平。",
      "被夺走家园的族群不断反抗，人族王国也一次次发动征讨。",
      "战争持续了近千年。",
      "魔族并非没有强者。",
      "沙海中的角魔大酋长曾率领三万骑兵攻破人族西境十二座堡垒；幽影沼泽的蛇人祭司曾用毒雾封锁整片南部湿地；黑曜山脉的石像鬼曾在夜晚越过城墙，从天空袭击人类贵族的宫殿。"
    ] },
    { title: "第一章·千年的战争（二）", paragraphs: [
      "可是，每一次战争最终都以魔族失败告终。",
      "他们并不是败给了人族的力量，而是败给了自己。",
      "角魔看不起弱小的哥布林。",
      "蛇人不愿踏入干旱的沙漠。",
      "牛头人憎恨魅魔操纵心灵的能力。"
    ] },
    { title: "第一章·千年的战争（三）", paragraphs: [
      "魅魔则认为那些只懂挥舞武器的族群粗鲁而愚蠢。",
      "即使面对同一个敌人，他们也很少真正联合。",
      "当角魔进攻人类西境时，沼泽诸族选择沉默；当蛇人被人类军团围剿时，沙海中的魔族认为那与自己无关。"
    ] },
    { title: "第一章·千年的战争（四）", paragraphs: [
      "人类一次次利用魔族之间的矛盾，分化、收买、挑拨，最终将他们逐一击败。",
      "久而久之，魔族自己也开始相信，也许他们天生就无法团结。",
      "也许混乱才是魔界永恒的命运。",
      "直到伊瑟兰妲·维尔摩斯出现。"
    ] },
    { title: "第二章·没有王冠的女王（一）", paragraphs: [
      "伊瑟兰妲并不是第一代魅魔。",
      "她出生时，魅魔一族已经衰落了数百年。",
      "曾经遍布大陆的魅魔商会早已消失，古老的梦境宫殿也被人类改造成教堂和军营。残存的魅魔分散在暮色山谷的各个城镇，为争夺仅有的食物、水源和灵魂结晶彼此争斗。"
    ] },
    { title: "第二章·没有王冠的女王（二）", paragraphs: [
      "伊瑟兰妲的母亲只是一个经营破旧酒馆的普通魅魔。",
      "她的父亲是谁，没有人知道。",
      "有人说她的父亲是一名流浪的人类骑士，也有人说他是黑曜堡垒中某位古老恶魔的后裔。伊瑟兰妲从不解释这件事。"
    ] },
    { title: "第二章·没有王冠的女王（三）", paragraphs: [
      "她幼年时，没有表现出惊人的魔力。",
      "她不像其他魅魔那样擅长魅惑，也无法轻易进入别人的梦境。她甚至因为角太短、翅膀太小，经常受到同族孩子的嘲笑。",
      "但她有一种远比魅惑更危险的力量。",
      "她能够理解别人真正想要什么。"
    ] },
    { title: "第二章·没有王冠的女王（四）", paragraphs: [
      "她知道饥饿的哥布林需要的不是荣耀，而是一块可以耕种的土地；她知道角魔酋长口中的尊严，实际上来自对族群灭亡的恐惧；她也知道那些满口复仇的魅魔长老，真正想要的不过是重新获得曾经的地位。"
    ] },
    { title: "第二章·没有王冠的女王（五）", paragraphs: [
      "伊瑟兰妲十六岁时，暮色山谷爆发了一场持续三年的内战。",
      "七个魅魔家族为了争夺一处灵魂结晶矿互相征伐。战争导致粮食断绝，附近村落中饿死了数千人。",
      "伊瑟兰妲没有参加任何一方。"
    ] },
    { title: "第二章·没有王冠的女王（六）", paragraphs: [
      "她先是带领一批无家可归的魅魔和哥布林占领了废弃的河谷仓库，随后利用山道截断了七个家族的粮食运输。",
      "当七位家主被迫坐到同一张桌前时，伊瑟兰妲把一张暮色山谷的地图铺在他们面前。"
    ] },
    { title: "第二章·没有王冠的女王（七）", paragraphs: [
      "她没有要求他们臣服，也没有威胁要杀死他们。",
      "她只是问了一个问题。",
      "“你们想要一座矿，还是想要一个能够让魅魔继续存在下去的国家？”",
      "没有人回答。",
      "伊瑟兰妲便将七家的纹章一一投入火盆。"
    ] },
    { title: "第二章·没有王冠的女王（八）", paragraphs: [
      "“既然你们只懂得争夺，那就不配继续统治。”",
      "那一夜，她处决了拒绝停战的三位家主，赦免了愿意交出军队的四位家主。",
      "第二天清晨，暮色山谷第一次升起了黑底银月的旗帜。",
      "那不是某个家族的旗帜。",
      "那是整个魅魔一族的旗帜。"
    ] },
    { title: "第二章·没有王冠的女王（九）", paragraphs: [
      "此后的二十年里，伊瑟兰妲先后统一暮色山谷，整顿魅魔军队，修建道路、粮仓与水渠。",
      "她禁止魅魔随意吞噬弱小种族的灵魂，规定所有族群都必须按照人口和土地缴纳赋税。她建立了裁判庭，允许哥布林控告魅魔贵族，也允许奴隶通过服役获得自由。"
    ] },
    { title: "第二章·没有王冠的女王（十）", paragraphs: [
      "这在当时的魔界几乎是一件无法想象的事。",
      "反对她的人称她背叛了魔族的传统。",
      "伊瑟兰妲却回答：",
      "“让强者任意吞食弱者，从来不是传统。”",
      "“那只是愚蠢。”",
      "她没有正式举行加冕仪式，也没有为自己打造王冠。"
    ] },
    { title: "第二章·没有王冠的女王（十一）", paragraphs: [
      "她只是让所有愿意遵守新法的族群来到黑曜王座前签署契约。",
      "第一年，只有魅魔和少量哥布林加入。",
      "第三年，暮色山谷附近的地精部落加入。",
      "第五年，黑曜山脉的石像鬼接受了她的统治。"
    ] },
    { title: "第二章·没有王冠的女王（十二）", paragraphs: [
      "第八年，幽影沼泽的蛇人祭司派来使者。",
      "第十二年，角魔大酋长亲自来到暮色山谷，与她签订了血盟。",
      "当最后一位部族首领在契约上留下印记时，伊瑟兰妲站在黑曜堡垒的高台上，对下方无数不同种族的士兵说道："
    ] },
    { title: "第二章·没有王冠的女王（十三）", paragraphs: [
      "“人类称我们为魔族，是因为他们不愿记住我们的名字。”",
      "“从今日起，我们接受这个名字。”",
      "“但魔族不再意味着被驱逐的人，不再意味着躲藏在沼泽与沙漠中的败者。”"
    ] },
    { title: "第二章·没有王冠的女王（十四）", paragraphs: [
      "“从今日起，魔族意味着所有不愿被人类决定命运之人。”",
      "这一天，后来被魔界史书记载为第二魔界纪元的开端。",
      "伊瑟兰妲也因此被称为第二魔界纪元的开创者。"
    ] },
    { title: "第三章·源初之河上的黑帆（一）", paragraphs: [
      "伊瑟兰妲很清楚，魔族正面与人类开战几乎没有胜算。",
      "人类占据着泽亚大陆最肥沃的土地，拥有庞大的人口和完善的道路。即使魔族暂时攻下一座城，人类也可以从其他地区迅速调集援军。",
      "因此，她没有选择从沙漠、沼泽和山谷向人类边境发动进攻。"
    ] },
    { title: "第三章·源初之河上的黑帆（二）", paragraphs: [
      "她选择了源初之河。",
      "这条河养育了人类文明，也成为了人类最致命的弱点。",
      "源初之河上游位于神脊雪山与北境峡谷之间。那里河道狭窄湍急，人类只在几个重要渡口驻扎了少量军队。",
      "人类从来不认为魔族能够从上游发动袭击。"
    ] },
    { title: "第三章·源初之河上的黑帆（三）", paragraphs: [
      "他们认为魔族不懂造船，更无法在复杂的河流上组织大规模运输。",
      "伊瑟兰妲用了十一年证明他们错了。",
      "地精工匠在黑曜山脉中打造铁钉与锁链，蛇人水手绘制河道地图，魅魔商人通过地下渠道从人类手中购买木材，哥布林则在峡谷深处秘密建造船坞。"
    ] },
    { title: "第三章·源初之河上的黑帆（四）", paragraphs: [
      "整整十一年，没有一艘战船驶出船坞。",
      "直到魔历二百一十七年的春天，神脊雪山出现了百年不遇的融雪。",
      "源初之河水位暴涨。",
      "伊瑟兰妲下令开闸。",
      "三百余艘悬挂黑色船帆的战船从隐藏在峡谷中的船坞驶出，沿着暴涨的河水奔涌而下。"
    ] },
    { title: "第三章·源初之河上的黑帆（五）", paragraphs: [
      "人类北境第一座遭到袭击的城市名叫白石城。",
      "那是一座修建在河道两侧的贸易城市。城内驻扎着三千名士兵，城墙高大，仓库中储存着足够十万人度过一年的粮食。",
      "但白石城的城墙是为了防御陆军修建的。"
    ] },
    { title: "第三章·源初之河上的黑帆（六）", paragraphs: [
      "魔族战船在凌晨顺流而至。",
      "石像鬼越过城墙，破坏城门机关；蛇人潜入水下，割断河港的锁链；魅魔法师用梦雾笼罩守军营地；角魔战士则从船上直接冲入码头。",
      "战斗只持续了两个时辰。",
      "白石城陷落。",
      "伊瑟兰妲没有屠城。"
    ] },
    { title: "第三章·源初之河上的黑帆（七）", paragraphs: [
      "她打开粮仓，把粮食分给城中的平民，只处决了参与过魔族奴隶贸易的贵族和商人。",
      "她还命人在城墙上刻下一句话：",
      "“我们不是来毁灭你们。”",
      "“我们只是来取回本属于我们的东西。”",
      "白石城陷落后，黑帆舰队继续向下游前进。"
    ] },
    { title: "第三章·源初之河上的黑帆（八）", paragraphs: [
      "接下来的三个月里，魔族先后袭击灰岩城、金穗港、王桥镇和圣河要塞。",
      "这些城市都是人类王国沿源初之河修建的重要节点。",
      "有的储存粮食，有的铸造武器，有的控制桥梁，有的负责征收河道税。"
    ] },
    { title: "第三章·源初之河上的黑帆（九）", paragraphs: [
      "伊瑟兰妲并不长期占领这些城市。",
      "她焚毁军械库，释放奴隶，带走粮食与船只，随后继续前进。",
      "人类军团一次次赶到，却只能看到已经离去的黑色船帆。",
      "恐慌第一次沿着源初之河蔓延。"
    ] },
    { title: "第三章·源初之河上的黑帆（十）", paragraphs: [
      "人类终于意识到，他们一直视为天险和生命之源的大河，已经变成了一条直指王国心脏的道路。",
      "曾经远离战争的人类城镇开始加固城墙，贵族把财物转移到远离河流的城堡，商船不敢出港，粮食价格飞速上涨。"
    ] },
    { title: "第三章·源初之河上的黑帆（十一）", paragraphs: [
      "魔族并没有夺回多少土地，却动摇了人类持续千年的信心。",
      "更重要的是，在那些曾经被人类征服的地区，许多被压迫的异族开始响应伊瑟兰妲。"
    ] },
    { title: "第三章·源初之河上的黑帆（十二）", paragraphs: [
      "山林中的兽人袭击税站，矿场里的地精奴工杀死监工，甚至一些对王国不满的人类农民也开始为黑帆舰队提供情报。",
      "人类史书将这场战争称为黑帆之乱。",
      "魔界史书则称它为归乡战争。"
    ] },
    { title: "第四章·七人小队（一）", paragraphs: [
      "人类王国无法在河面上抓住伊瑟兰妲。",
      "她的舰队顺流而行，速度极快，而且总能提前获得人类军队的动向。",
      "王国议会最终决定，不再追击黑帆舰队。",
      "他们要直接杀死伊瑟兰妲。"
    ] },
    { title: "第四章·七人小队（二）", paragraphs: [
      "人类从各地挑选了七名最强大的战士，组成了一支不受任何军团指挥的秘密小队。",
      "小队的首领是圣剑骑士莱昂。",
      "他出身于北境贵族，曾在一天之内斩杀三只成年巨魔，被誉为人类王国最年轻的剑圣。"
    ] },
    { title: "第四章·七人小队（三）", paragraphs: [
      "第二名成员是圣堂祭司艾蕾娜，她能够治疗致命伤，也能够用圣光驱散魅魔的精神法术。",
      "第三名成员是猎魔人雷格，熟悉几乎所有魔族的弱点。",
      "第四名成员是宫廷法师奥德里克，掌握传送与封印魔法。"
    ] },
    { title: "第四章·七人小队（四）", paragraphs: [
      "第五名成员是影卫刺客无面者。",
      "第六名成员是来自金穗平野的神射手塞拉。",
      "最后一名成员没有留下真实姓名。",
      "人类史书只称他为背叛者。",
      "因为他本身就是魔族。",
      "他曾是伊瑟兰妲最信任的将领之一，也是黑帆舰队河道地图的绘制者。"
    ] },
    { title: "第四章·七人小队（五）", paragraphs: [
      "没有人知道他为什么背叛女王。",
      "有人说，人类抓住了他的家人。",
      "有人说，他从一开始就是人类安插在魔界的间谍。",
      "还有人说，他并不反对伊瑟兰妲统一魔界，却无法接受她把整个魔族拖入一场可能招致灭亡的战争。"
    ] },
    { title: "第四章·七人小队（六）", paragraphs: [
      "在他的带领下，七人小队避开黑帆舰队的侦察，从神脊雪山西侧翻越山岭，沿一条废弃的古道抵达源初之河上游。",
      "当时，伊瑟兰妲正带领最精锐的部队驻扎在寒河谷。"
    ] },
    { title: "第四章·七人小队（七）", paragraphs: [
      "她计划在那里等待来自黑曜山脉的援军，然后发动战争中最大规模的一次进攻。",
      "她的目标是人类王国的旧都，圣源城。",
      "只要圣源城陷落，源初之河中游将完全失去控制。",
      "然而，援军没有到来。"
    ] },
    { title: "第四章·七人小队（八）", paragraphs: [
      "人类军队提前封锁了黑曜山脉的出口。",
      "寒河谷中的魔族部队孤立无援。",
      "七人小队在暴风雪中潜入峡谷，破坏了魔族营地周围的防御法阵，并用传送术将三千名人类精锐送入河谷。",
      "伊瑟兰妲直到战斗开始，才意识到自己遭到了背叛。"
    ] },
    { title: "第五章·女王的最后一战（一）", paragraphs: [
      "寒河谷之战持续了整整一天。",
      "河谷两侧被厚厚的积雪覆盖，中央则是刚刚解冻的源初之河。",
      "魔族士兵仓促迎战。",
      "角魔骑兵无法在狭窄的谷地中展开冲锋，石像鬼在暴风雪中难以飞行，蛇人也无法适应上游冰冷的河水。"
    ] },
    { title: "第五章·女王的最后一战（二）", paragraphs: [
      "伊瑟兰妲站在旗舰船头，亲自指挥军队。",
      "她没有试图逃走。",
      "她命令哥布林和地精士兵优先撤离，将仍能行动的船只交给伤员和后勤人员，自己则带领魅魔禁卫守住峡谷入口。"
    ] },
    { title: "第五章·女王的最后一战（三）", paragraphs: [
      "莱昂率领七人小队冲破了三道防线。",
      "他第一次看见伊瑟兰妲时，女王正站在燃烧的战船上。",
      "她穿着黑色铠甲，身后披着被鲜血浸湿的长袍。她的一侧翅膀已经被箭矢射穿，头顶的银角也断了一截。"
    ] },
    { title: "第五章·女王的最后一战（四）", paragraphs: [
      "可即便如此，仍然没有任何人敢直视她的眼睛。",
      "她没有使用魅惑。",
      "她只是站在那里，便让人感到自己面对的不是一个普通的魅魔，而是一整个时代。",
      "“投降吧。”",
      "莱昂举起圣剑。"
    ] },
    { title: "第五章·女王的最后一战（五）", paragraphs: [
      "“你的军队已经败了。”",
      "伊瑟兰妲看了一眼河谷。",
      "剩余的魔族士兵还在战斗，撤离的船只正沿着河道向上游驶去。",
      "她知道，战争已经结束。",
      "但她没有放下武器。",
      "“你们总是这样。”",
      "她缓缓说道。"
    ] },
    { title: "第五章·女王的最后一战（六）", paragraphs: [
      "“抢走别人的家园，然后要求被驱逐者接受现实。”",
      "“你们把反抗称为罪恶，把征服写成荣耀。”",
      "莱昂没有回答。",
      "他从小接受的教育告诉他，魔族是邪恶的。",
      "但白石城陷落后，他曾亲眼看见伊瑟兰妲释放人类平民。"
    ] },
    { title: "第五章·女王的最后一战（七）", paragraphs: [
      "他也曾在被魔族攻破的奴隶市场里，看见那些被人类贵族折磨得不成人形的异族。",
      "“战争继续下去，只会死更多人。”莱昂说道。",
      "“战争从来不是我开始的。”",
      "伊瑟兰妲抬起手中的长剑。"
    ] },
    { title: "第五章·女王的最后一战（八）", paragraphs: [
      "“我只是让你们第一次感受到了它。”",
      "双方的最后一战由此开始。",
      "伊瑟兰妲同时面对七名强者。",
      "她用梦境困住神射手，用黑炎逼退祭司，以翅膀挡住刺客的匕首，又在宫廷法师完成封印之前斩断了他的法杖。"
    ] },
    { title: "第五章·女王的最后一战（九）", paragraphs: [
      "她的力量远远超过人类的预想。",
      "但她已经连续战斗了一整天。",
      "圣堂祭司的光芒压制了她的魔力，猎魔人的锁链缠住她的左臂，圣剑骑士最终刺穿了她的胸口。",
      "剑锋从她背后穿出。",
      "鲜血滴落在燃烧的甲板上。"
    ] },
    { title: "第五章·女王的最后一战（十）", paragraphs: [
      "莱昂以为一切已经结束。",
      "但伊瑟兰妲没有立刻倒下。",
      "她握住贯穿胸口的圣剑，缓缓向前一步。",
      "莱昂看见她脸上没有恐惧，也没有愤怒。",
      "她甚至露出了一丝微笑。",
      "“你们以为杀死我，就能够让一切回到从前。”"
    ] },
    { title: "第五章·女王的最后一战（十一）", paragraphs: [
      "她低声说道。",
      "“可河流从不倒流。”",
      "伊瑟兰妲突然折断圣剑，将断裂的剑刃连同自己的鲜血一起推入源初之河。",
      "她体内残存的全部魔力在那一刻爆发。",
      "血液化作无数赤红的丝线，在冰冷的河水中迅速扩散。"
    ] },
    { title: "第五章·女王的最后一战（十二）", paragraphs: [
      "圣堂祭司试图净化河流，却发现那些血液并不是诅咒，也不是普通的魔力。",
      "它们像活着一样融入了源初之河。",
      "莱昂想要抓住伊瑟兰妲。",
      "女王却已经后退到甲板边缘。",
      "在坠入河流之前，她望向神脊雪山，又看了一眼奔向大陆远方的河水。"
    ] },
    { title: "第五章·女王的最后一战（十三）", paragraphs: [
      "“我将以我自己的方式归来。”",
      "这是伊瑟兰妲·维尔摩斯留下的最后一句话。",
      "随后，她的身体坠入源初之河。",
      "燃烧的战船在下一刻断裂。",
      "洪水吞没了甲板，也吞没了魅魔女王的身影。",
      "人类搜索了整整七天，却始终没有找到她的尸体。"
    ] },
    { title: "第六章·沉睡在河水中的血（一）", paragraphs: [
      "伊瑟兰妲战败后，黑帆舰队失去了统一指挥。",
      "各族首领纷纷撤军。",
      "角魔返回流金沙海，蛇人退回幽影沼泽，石像鬼重新封闭黑曜山脉。",
      "刚刚联合起来的魔界联军迅速瓦解。",
      "人类王国宣布战争胜利。"
    ] },
    { title: "第六章·沉睡在河水中的血（二）", paragraphs: [
      "圣剑骑士莱昂成为拯救大陆的英雄，七人小队的雕像被立在圣源城中央。王国重新控制河道，各地举行了持续数日的庆典。",
      "在人类看来，一切都结束了。",
      "然而，没有人注意到，源初之河已经不一样了。"
    ] },
    { title: "第六章·沉睡在河水中的血（三）", paragraphs: [
      "女王的血液与河水一起经过白石城、灰岩古道、金穗平野、暮色密林和泽南湿地，进入数百条支流。",
      "农民用河水灌溉田地。",
      "牧民让牛羊在河边饮水。",
      "城镇居民从水井中打水。",
      "鱼类吞下河中的细小血丝，野兽又吃下河鱼。"
    ] },
    { title: "第六章·沉睡在河水中的血（四）", paragraphs: [
      "魅魔女王的血液最终进入了泽亚大陆大部分生命的体内。",
      "但什么都没有立刻发生。",
      "第一年，人们没有发现异常。",
      "第二年，靠近河流的野草长得比往年更加茂盛。",
      "第三年，金穗平野上的野牛体型明显变大。"
    ] },
    { title: "第六章·沉睡在河水中的血（五）", paragraphs: [
      "第四年，暮色密林中的狼群开始使用复杂的战术围猎商队。",
      "第五年，有猎人声称自己在森林里听见一头黑熊说出了人类的语言。",
      "没有人相信他。",
      "王国学者认为，这些变化只是战争结束后自然环境恢复造成的。"
    ] },
    { title: "第六章·沉睡在河水中的血（六）", paragraphs: [
      "但异变越来越明显。",
      "普通的野兽开始拥有远超同类的力量。",
      "野狼学会绕过陷阱。",
      "巨熊能够推倒石墙。",
      "毒蛇会隐藏在道路附近，专门袭击运送武器的车队。",
      "一些活得足够久的野兽甚至逐渐生出灵智。"
    ] },
    { title: "第六章·沉睡在河水中的血（七）", paragraphs: [
      "它们开始理解人类的语言，也开始记得人类对森林、河流和山脉所做的一切。",
      "最早拥有完整灵智的，是暮色密林中的一只白狐。",
      "它活了近百年，饮下过无数次源初之河支流的水。",
      "某个月圆之夜，它第一次化作人形。"
    ] },
    { title: "第六章·沉睡在河水中的血（八）", paragraphs: [
      "它站在被人类砍伐殆尽的森林边缘，看着远处不断扩建的城镇，向聚集在身后的野兽说出了第一句话：",
      "“这是我们的土地。”",
      "此后，类似的事情开始在大陆各地发生。",
      "野兽不再只是本能地袭击人类。"
    ] },
    { title: "第六章·沉睡在河水中的血（九）", paragraphs: [
      "它们会破坏道路，抢夺粮仓，释放笼中的同类，袭击猎人和伐木队。",
      "王国称它们为妖兽。",
      "而在妖兽自己的语言里，它们称自己为新生者。",
      "人类与魔族之间延续千年的战争尚未真正结束，一场更加危险的变化已经悄然开始。"
    ] }
  ].map(page => ({ ...page, text: page.paragraphs.join("\n") }));
  const MAP_STAGES = [
    [{ type: "normal", label: "林道遭遇", icon: "⚔️" }],
    [{ type: "normal", label: "断桥之战", icon: "⚔️", weaponBoss: true, weaponId: "mist_dagger", enemyId: "goblin_warband", portrait: "assets/enemies/goblin-warband.png" }, { type: "event", label: "迷雾岔路", icon: "❓" }],
    [{ type: "normal", label: "兽径伏击", icon: "⚔️", weaponBoss: true, weaponId: "bridge_oathblade", enemyId: "wolf_swarm", portrait: "assets/enemies/wolf-swarm.png" }, { type: "shop", label: "行脚商队", icon: "🛒" }],
    [{ type: "elite", label: "精英据点", icon: "☠️", weaponBoss: true, weaponId: "silverfeather_bow", enemyId: "orc_patrol", portrait: "assets/enemies/orc-patrol.png" }],
    [{ type: "camp", label: "守夜营火", icon: "⛺" }],
    [{ type: "normal", label: "古林深处", icon: "⚔️", weaponBoss: true, weaponId: "redscar_axe", enemyId: "forest_bandits", portrait: "assets/enemies/forest-bandits.png" }, { type: "event", label: "古老遗迹", icon: "❓" }],
    [{ type: "elite", label: "暗影关隘", icon: "☠️", weaponBoss: true, weaponId: "moonwood_crossbow", enemyId: "shadow_hunter", portrait: "assets/enemies/shadow-hunter.png" }, { type: "shop", label: "密林商人", icon: "🛒" }],
    [{ type: "normal", label: "王座前庭", icon: "⚔️", weaponBoss: true, weaponId: "royal_breaker", enemyId: "orc_patrol", portrait: "assets/enemies/orc-patrol.png" }],
    [{ type: "boss", label: "森林狼王", icon: "👑", portrait: "assets/enemies/forest-wolf-king.png", weaponBoss: true, weaponId: "riftmoon_blade", enemyId: "wolf_king" }]
  ];

  const CHAPTER_ONE_STAGES = MAP_STAGES.flat().map(node => [node]);
  const CHAPTER_ONE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6],
    [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 11], [11, 12]
  ];

  const CHAPTER_TWO_ENCOUNTERS = [
    ["泥牙斥候长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["树梢神射手", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["碎瓶投手", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["绿皮伏击队", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["赃物守门人", "forest_bandits", "assets/enemies/forest-bandits.png"],
    ["毒箭督军", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["尖牙驯兽师", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["沼泽劫掠者", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["黑帽哨兵", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["蛮石破门者", "orc_patrol", "assets/enemies/orc-patrol.png"],
    ["火药工头", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["双弩猎手", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["暗巷收税官", "forest_bandits", "assets/enemies/forest-bandits.png"],
    ["铁锅军需官", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["王庭弓术师", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["赤旗百夫长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["夜眼追猎者", "shadow_hunter", "assets/enemies/shadow-hunter.png"],
    ["王庭近卫长", "goblin_warband", "assets/enemies/goblin-warband.png"],
    ["金库守望者", "goblin_marksmen", "assets/enemies/goblin-marksmen.png"],
    ["翠影女王", "goblin_queen", "assets/enemies/goblin-queen.png"]
  ];
  const CHAPTER_TWO_STAGES = CHAPTER_TWO_ENCOUNTERS.map(([label, enemyId, portrait], index) => [{
    type: index === CHAPTER_TWO_ENCOUNTERS.length - 1 ? "boss" : (index % 5 === 4 ? "elite" : "normal"),
    label,
    enemyId,
    portrait,
    icon: "",
    rewardCardId: CF.CHAPTER_TWO_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_TWO_ROUTE_EDGES = [
    [16, 15], [15, 14], [14, 13], [13, 0], [0, 1], [1, 2], [2, 3], [3, 4],
    [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 19], [14, 12], [12, 3],
    [12, 11], [11, 10], [10, 17], [10, 18], [18, 19]
  ];

  const CHAPTER_THREE_ENCOUNTERS = [
    ["田埂熊斥候", "assets/cards/chapter3/wheat-cub.png"],
    ["麦仓蜂蜜投手", "assets/cards/chapter3/honey-slinger.png"],
    ["犁沟守卫长", "assets/cards/chapter3/furrow-guard.png"],
    ["稻草熊术师", "assets/cards/chapter3/straw-mage.png"],
    ["谷仓突击队长", "assets/cards/chapter3/barn-charger.png"],
    ["水渠巡田熊", "assets/cards/chapter3/wheat-cub.png"],
    ["蜂巢大祭司", "assets/cards/chapter3/hive-priest.png"],
    ["麦田巨熊", "assets/cards/chapter3/wheatfield-giant.png"],
    ["丰收战熊", "assets/cards/chapter3/harvest-war-bear.png"],
    ["石磨堡垒", "assets/cards/chapter3/millstone-fortress.png"],
    ["谷仓破门者", "assets/cards/chapter3/barn-charger.png"],
    ["河湾渔熊", "assets/cards/chapter3/honey-slinger.png"],
    ["金巢蜂后", "assets/cards/chapter3/bee-swarm.png"],
    ["秋风熊战士", "assets/cards/chapter3/harvest-war-bear.png"],
    ["大地守卫", "assets/cards/chapter3/earth-tremor.png"],
    ["农具锻造师", "assets/cards/chapter3/furrow-guard.png"],
    ["赤穗熊骑", "assets/cards/chapter3/wheatfield-giant.png"],
    ["麦田稻草魔像", "assets/cards/chapter3/wheat-barrier.png"],
    ["金穗熊王", "assets/cards/chapter3/golden-sheaf-king.png"],
    ["丰穗战母·布蕾娅", "assets/enemies/chapter3/bear-matriarch-portrait.png"]
  ];
  const CHAPTER_THREE_PORTRAITS = Array.from(
    { length: 20 },
    (_, index) => `assets/enemies/chapter3/bosses/bear-boss-${String(index + 1).padStart(2, "0")}.png`
  );
  const CHAPTER_THREE_STAGES = CHAPTER_THREE_ENCOUNTERS.map(([label], index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"),
    label,
    enemyId: index === 19 ? "bear_matriarch" : `farm-boss-${index + 1}`,
    portrait: CHAPTER_THREE_PORTRAITS[index],
    icon: "",
    rewardCardId: CF.CHAPTER_THREE_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_THREE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [3, 5], [5, 8], [8, 7], [7, 9], [9, 11],
    [11, 13], [13, 15], [2, 4], [2, 6], [4, 10], [6, 10], [6, 8], [10, 12],
    [10, 14], [12, 16], [14, 18], [16, 15], [16, 17], [17, 18], [18, 19]
  ];
  const CHAPTER_THREE_NPC = {
    id: "farm_couple", name: "留守的农民夫妇", portrait: "assets/npcs/farm-couple.png", adjacentNode: 7,
    dialogue: [
      "别紧张，年轻人。那些熊没有杀害这里的人。它们来到农场后，只把原来的村民赶去了王城方向。",
      "我们留下，是因为没有从它们身上感到敌意。最初它们连犁怎么扶都不知道，只会用蛮力把田翻得乱七八糟。",
      "后来我们教熊男修水渠、播麦种，也教熊娘照料蜂箱和收割。它们学得很慢，但从不糟蹋粮食。",
      "它们会在谷仓里给幼熊留出最暖的位置，也会把第一袋新麦送到我们门口。至少在我们眼里，它们没有传闻中那么可恶。",
      "若你一定要继续往前，就亲眼看看再作判断吧。这里发生的事，也许并不是简单的怪物占领村庄。"
    ]
  };

  const CHAPTER_FOUR_ENCOUNTERS = [
    "露珠幼母", "苔光守望者", "蓝泡采集者", "荧蕈胶卫", "月潭医师",
    "藤蔓黏兽", "紫晶分裂者", "溪语祭司", "沼光巨胶", "菌伞吞食者",
    "幻露巡游者", "碧涡守门者", "星斑软泥姬", "古树融胶", "翠晶凝视者",
    "深潭回复师", "月虹胶龙", "千滴合生体", "森心史莱姆领主", "碧露大贤者·涅芙莉"
  ];
  const CHAPTER_FOUR_PORTRAITS = Array.from(
    { length: 20 },
    (_, index) => `assets/enemies/chapter4/bosses/slime-boss-${String(index + 1).padStart(2, "0")}.png`
  );
  const CHAPTER_FOUR_STAGES = CHAPTER_FOUR_ENCOUNTERS.map((label, index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"),
    label,
    enemyId: index === 19 ? "slime_sage" : `dream-slime-${index + 1}`,
    portrait: CHAPTER_FOUR_PORTRAITS[index],
    icon: "",
    rewardCardId: CF.CHAPTER_FOUR_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_FOUR_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 6],
    [5, 7], [6, 8], [7, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 12],
    [11, 13], [12, 14], [13, 15], [14, 15], [14, 16], [15, 17], [16, 18],
    [17, 18], [18, 19]
  ];
  const CHAPTER_FIVE_ENCOUNTERS = [
    "断墙灰狼", "青苔猎犬", "石阶迅兽", "旧门伏击者", "银枝追猎者", "残塔狼群", "瀑布獠牙", "碑林疾影", "古井守卫", "灰雾猎团",
    "断桥掠夺者", "钟楼狼哨", "城墙奔袭兽", "废墟斥候队", "旧王庭猎手", "千枝守墓狼", "月门突袭者", "灰牙先锋", "遗城狼王子", "银灰狼女猎手"
  ];
  const CHAPTER_FIVE_PORTRAITS = Array.from({ length: 19 }, (_, index) => `assets/enemies/chapter5/bosses/wolf-boss-${String(index + 1).padStart(2, "0")}.png`).concat("assets/enemies/chapter5/bosses/wolf-matriarch.png");
  const CHAPTER_FIVE_STAGES = CHAPTER_FIVE_ENCOUNTERS.map((label, index) => [{
    type: index === 19 ? "boss" : ([4, 9, 14, 18].includes(index) ? "elite" : "normal"), label,
    enemyId: index === 19 ? "wolf_matriarch" : `ancient-wolf-${index + 1}`, portrait: CHAPTER_FIVE_PORTRAITS[index], icon: "",
    rewardCardId: CF.CHAPTER_FIVE_REWARD_CARD_IDS[index]
  }]);
  const CHAPTER_FIVE_ROUTE_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15], [14, 16], [15, 17], [16, 18], [17, 18], [18, 19]
  ];

  const EVENTS = [
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

  function freshRun(save, chapterOverride = null) {
    return {
      chapter: chapterOverride || (save.completedRuns >= 4 ? 5 : save.completedRuns >= 3 ? 4 : save.completedRuns >= 2 ? 3 : save.completedRuns >= 1 ? 2 : 1),
      stage: 0,
      hp: save.hero.maxHealth,
      maxHp: save.hero.maxHealth,
      completed: [],
      chosen: {},
      earnedCoins: 0,
      earnedXp: 0,
      cardsLeveled: 0,
      activeNode: null,
      attempts: {},
      failures: {},
      cleared: false,
      shopPurchased: {},
      startedAt: Date.now(),
      lastPlayedAt: Date.now()
    };
  }

  function chapterId(value, save = CF.SaveSystem.data) {
    const requested = Number(value);
    if ([1, 2, 3, 4].includes(requested)) return requested;
    return save.completedRuns >= 4 ? 5 : save.completedRuns >= 3 ? 4 : save.completedRuns >= 2 ? 3 : save.completedRuns >= 1 ? 2 : 1;
  }

  function ensureChapterRuns(save) {
    if (!save.chapterRuns || typeof save.chapterRuns !== "object") save.chapterRuns = { 1: null, 2: null, 3: null, 4: null, 5: null };
    [1, 2, 3, 4, 5].forEach(chapter => { if (!(chapter in save.chapterRuns)) save.chapterRuns[chapter] = null; });
    return save.chapterRuns;
  }

  const Adventure = {
    prepareChapterFiveFinale() {
      const save = CF.SaveSystem.data;
      const runs = ensureChapterRuns(save);
      const previous = runs[5] || {};
      const run = freshRun(save, 5);
      run.completed = CHAPTER_FIVE_STAGES.slice(0, 19).map((nodes, stage) => ({ stage, type: nodes[0].type }));
      run.chosen = Object.fromEntries(run.completed.map(entry => [entry.stage, 0]));
      run.attempts = Object.fromEntries(run.completed.map(entry => [String(entry.stage), Math.max(1, Number(previous.attempts?.[entry.stage]) || 0)]));
      run.failures = { ...(previous.failures || {}) };
      run.stage = 19;
      run.hp = save.hero.maxHealth;
      run.maxHp = save.hero.maxHealth;
      run.activeNode = null;
      run.cleared = false;
      runs[5] = run;
      save.completedRuns = 4;
      save.activeChapter = 5;
      save.run = run;
      save.qianzhiGarrisonUnlocked = false;
      save.chapterFiveFinalePreset = CF.CHAPTER_FIVE_FINALE_PRESET_VERSION;
      save.chapterFiveBossRewards ||= {};
      delete save.chapterFiveBossRewards[19];
      CF.SaveSystem.save();
      return run;
    },
    start(chapterOverride = null) {
      return this.activate(chapterOverride, false);
    },
    restart(chapterOverride = null) {
      return this.activate(chapterOverride, true);
    },
    activate(chapterOverride = null, reset = false) {
      const save = CF.SaveSystem.data;
      const chapter = chapterId(chapterOverride, save);
      const runs = ensureChapterRuns(save);
      if (reset || !runs[chapter]) runs[chapter] = freshRun(save, chapter);
      const run = runs[chapter];
      if (save.hero.maxHealth > run.maxHp) {
        const delta = save.hero.maxHealth - run.maxHp;
        run.maxHp += delta;
        run.hp = Math.min(run.maxHp, run.hp + delta);
      }
      run.activeNode = null;
      run.lastPlayedAt = Date.now();
      save.activeChapter = chapter;
      save.run = run;
      CF.SaveSystem.save();
      return run;
    },
    abandon(chapterOverride = null) {
      const save = CF.SaveSystem.data;
      const chapter = chapterId(chapterOverride ?? save.activeChapter, save);
      ensureChapterRuns(save)[chapter] = null;
      if (Number(save.activeChapter) === chapter) save.run = null;
      CF.SaveSystem.save();
    },
    pause() {
      const run = this.current();
      if (!run) return;
      run.activeNode = null;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
    },
    current(chapterOverride = null) {
      const save = CF.SaveSystem.data;
      const runs = ensureChapterRuns(save);
      if (chapterOverride !== null && chapterOverride !== undefined) return runs[chapterId(chapterOverride, save)] || null;
      const active = chapterId(save.activeChapter, save);
      const run = runs[active] || (Number(save.run?.chapter) === active ? save.run : null);
      if (run && !runs[active]) runs[active] = run;
      save.activeChapter = active;
      save.run = run || null;
      return save.run;
    },
    chapterProgress(chapterOverride) {
      const chapter = chapterId(chapterOverride);
      const run = this.current(chapter);
      const total = chapter === 1 ? CHAPTER_ONE_STAGES.length : chapter === 2 ? CHAPTER_TWO_STAGES.length : chapter === 3 ? CHAPTER_THREE_STAGES.length : chapter === 4 ? CHAPTER_FOUR_STAGES.length : CHAPTER_FIVE_STAGES.length;
      return {
        chapter,
        completed: run?.completed?.length || 0,
        total,
        cleared: Boolean(run?.cleared || (run?.completed?.length || 0) >= total),
        attempts: Object.values(run?.attempts || {}).reduce((sum, count) => sum + Number(count || 0), 0),
        failures: Object.values(run?.failures || {}).reduce((sum, count) => sum + Number(count || 0), 0),
        exists: Boolean(run)
      };
    },
    mapStages(chapterOverride = null) {
      const chapter = chapterOverride === null ? this.current()?.chapter : chapterId(chapterOverride);
      return chapter === 5 ? CHAPTER_FIVE_STAGES : chapter === 4 ? CHAPTER_FOUR_STAGES : chapter === 3 ? CHAPTER_THREE_STAGES : chapter === 2 ? CHAPTER_TWO_STAGES : CHAPTER_ONE_STAGES;
    },
    routeEdges(chapterOverride = null) {
      const chapter = chapterOverride === null ? this.current()?.chapter : chapterId(chapterOverride);
      return chapter === 5 ? CHAPTER_FIVE_ROUTE_EDGES : chapter === 4 ? CHAPTER_FOUR_ROUTE_EDGES : chapter === 3 ? CHAPTER_THREE_ROUTE_EDGES : chapter === 2 ? CHAPTER_TWO_ROUTE_EDGES : CHAPTER_ONE_ROUTE_EDGES;
    },
    choices() {
      const run = this.current();
      return run ? (this.mapStages()[run.stage] || []) : [];
    },
    isNodeAvailable(nodeIndex) {
      const run = this.current();
      if (!run) return false;
      const index = Number(nodeIndex);
      const completed = new Set((run.completed || []).map(entry => Number(entry.stage)));
      if (completed.has(index)) return false;
      if (completed.size === 0) return index === 0;
      return this.routeEdges().some(([from, to]) =>
        (from === index && completed.has(to)) || (to === index && completed.has(from))
      );
    },
    chooseNode(choiceIndex) {
      const run = this.current();
      const nodeIndex = Number(choiceIndex);
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!run || !node || !this.isNodeAvailable(nodeIndex)) return null;
      run.activeNode = nodeIndex;
      run.chosen[nodeIndex] = 0;
      run.attempts ||= {};
      run.attempts[nodeIndex] = (Number(run.attempts[nodeIndex]) || 0) + 1;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
      return node;
    },
    finishNode(type) {
      const run = this.current();
      if (!run) return;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      if (!run.completed.some(entry => entry.stage === nodeIndex)) run.completed.push({ stage: nodeIndex, type });
      run.activeNode = null;
      run.stage = run.completed.length;
      run.cleared = run.completed.length >= this.mapStages().length;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
    },
    recordDefeat(nodeIndexOverride = null) {
      const run = this.current();
      if (!run) return null;
      const hasExplicitNode = nodeIndexOverride !== null && nodeIndexOverride !== undefined && Number.isInteger(Number(nodeIndexOverride));
      const nodeIndex = hasExplicitNode ? Number(nodeIndexOverride)
        : Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      run.failures ||= {};
      run.failures[nodeIndex] = (Number(run.failures[nodeIndex]) || 0) + 1;
      run.lastFailedNode = nodeIndex;
      run.activeNode = null;
      run.hp = run.maxHp;
      run.lastPlayedAt = Date.now();
      CF.SaveSystem.save();
      return run;
    },
    syncHeroGrowth() {
      const run = this.current();
      if (!run) return;
      if (CF.SaveSystem.data.hero.maxHealth > run.maxHp) {
        const delta = CF.SaveSystem.data.hero.maxHealth - run.maxHp;
        run.maxHp += delta;
        run.hp += delta;
      }
      CF.SaveSystem.save();
    },
    encounterFor(type) {
      const run = this.current();
      const encounterNodeIndex = Number.isInteger(run?.activeNode) ? run.activeNode : run?.stage;
      const node = this.mapStages()[encounterNodeIndex]?.[0];
      if (run?.chapter === 1) {
        const pool = type === "elite" ? CF.eliteEnemyIds : CF.normalEnemyIds;
        const fallbackIndex = ((encounterNodeIndex || 0) + (run?.completed?.length || 0)) % pool.length;
        const base = type === "boss"
          ? CF.enemies.wolf_king
          : (node?.enemyId && CF.enemies[node.enemyId] ? CF.enemies[node.enemyId] : CF.enemies[pool[fallbackIndex]]);
        return {
          ...base,
          chapter: 1,
          chapterStage: encounterNodeIndex,
          type: node?.type || base.type,
          title: `${node?.label || "迷雾森林"} · ${base.title}`,
          dialogue: CF.bossDialogueFor?.(1, encounterNodeIndex) || base.dialogue || null
        };
      }
      if (run?.chapter === 2 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "goblin_queen") return {
          ...CF.enemies.goblin_queen,
          chapter: 2,
          chapterStage: stage,
          dialogue: CF.bossDialogueFor?.(2, stage) || CF.enemies.goblin_queen.dialogue
        };
        const base = CF.enemies[node.enemyId] || CF.enemies.goblin_warband;
        return {
          ...base,
          id: `chapter2-${stage + 1}-${base.id}`,
          chapter: 2,
          chapterStage: stage,
          name: node.label,
          title: `哥布林王庭 · 第${stage + 1}关`,
          type: node.type,
          health: 42 + stage * 5 + (node.type === "elite" ? 18 : 0),
          mana: 6,
          enemyCardLevel: node.type === "elite" ? 3 : 2,
          passive: "battle_horn",
          dialogue: CF.bossDialogueFor?.(2, stage),
          skills: [{ icon: "📯", name: "战斗号角", every: 1, description: "每个敌方行动回合，召唤1个2攻/2血的普通哥布林。" }],
          battlefield: "goblin_stronghold",
          deck: [...base.deck, ...base.deck.slice(0, 8 + Math.floor(stage / 4))]
        };
      }
      if (run?.chapter === 3 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "bear_matriarch") return {
          ...CF.enemies.bear_matriarch,
          chapter: 3,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(3, stage) || CF.enemies.bear_matriarch.dialogue
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(9, 2 + Math.floor(stage / 3));
        const core = [...CF.CHAPTER_THREE_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_THREE_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter3-${stage + 1}`,
          chapter: 3,
          chapterStage: stage,
          name: node.label,
          title: `金麦农场 · 第${stage + 1}关`,
          icon: "🐻",
          portrait: node.portrait,
          type: node.type,
          health: 68 + stage * 7 + (node.type === "elite" ? 28 : 0),
          mana: node.type === "elite" ? 9 : 8,
          enemyCardLevel: node.type === "elite" ? 4 : 3,
          description: "守卫金麦农场的新住民，擅长以高生命熊族随从稳固战线。",
          passive: "bear_harvest",
          dialogue: CF.bossDialogueFor?.(3, stage),
          skills: [{ icon: "🌾", name: "农垦本能", every: 2, description: "每2个敌方行动回合召唤1个会随进度成长的巡田熊民。" }],
          battlefield: "harvest_farm",
          deck: Array(3).fill(core).flat()
        };
      }
      if (run?.chapter === 4 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "slime_sage") return {
          ...CF.enemies.slime_sage,
          chapter: 4,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(4, stage) || CF.enemies.slime_sage.dialogue
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(10, 2 + Math.floor(stage / 2));
        const core = [...CF.CHAPTER_FOUR_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_FOUR_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter4-${stage + 1}`,
          chapter: 4,
          chapterStage: stage,
          name: node.label,
          title: `梦幻森林 · 第${stage + 1}关`,
          icon: "💧",
          portrait: node.portrait,
          type: node.type,
          health: 100 + stage * 9 + (node.type === "elite" ? 35 : 0),
          mana: node.type === "elite" ? 10 : 9,
          enemyCardLevel: node.type === "elite" ? 5 : 4,
          description: "女王之血唤醒的史莱姆，以厚重生命、分裂与持续再生缓慢推进战线。",
          passive: "slime_regeneration",
          dialogue: CF.bossDialogueFor?.(4, stage),
          skills: [{ icon: "💧", name: "胶质再生", every: 1, description: "每个敌方行动回合，为首领和全部史莱姆随从恢复生命。" }],
          battlefield: "dream_slime_forest",
          deck: Array(3).fill(core).flat()
        };
      }
      if (run?.chapter === 5 && node?.enemyId) {
        const stage = encounterNodeIndex || 0;
        if (node.enemyId === "wolf_matriarch") return {
          ...CF.enemies.wolf_matriarch,
          chapter: 5,
          chapterStage: stage,
          portrait: node.portrait,
          dialogue: CF.bossDialogueFor?.(5, stage),
          battlefield: "ancient_city_ruins"
        };
        const unitCount = Math.min(10, 4 + Math.floor(stage / 2));
        const spellCount = Math.min(10, 2 + Math.floor(stage / 2));
        const core = [...CF.CHAPTER_FIVE_UNIT_CARD_IDS.slice(0, unitCount), ...CF.CHAPTER_FIVE_SPELL_CARD_IDS.slice(0, spellCount)];
        return {
          id: `chapter5-${stage + 1}`, chapter: 5, chapterStage: stage, name: node.label, title: `古城废墟 · 第${stage + 1}关`, icon: "🐺", portrait: node.portrait, type: node.type,
          health: 300 + Math.round(stage * 100 / 19), mana: node.type === "elite" ? 10 : 9, enemyCardLevel: node.type === "elite" ? 5 : 4,
          description: "喝下女王之血后开智的灰狼与野兽，攻击迅猛但防御薄弱，许多单位登场便会扑击。", passive: "wolf_raid", dialogue: CF.bossDialogueFor?.(5, stage), battlefield: "ancient_city_ruins",
          skills: [{ icon: "🐺", name: "灰狼增援", every: 1, description: "每个敌方行动回合，召唤1只4攻/1血、可立即攻击随从的突击灰狼。" }],
          deck: Array(3).fill(core).flat()
        };
      }
      if (type === "boss") return CF.enemies.wolf_king;
      const index = ((run?.stage || 0) + (run?.completed?.length || 0)) % (type === "elite" ? CF.eliteEnemyIds.length : CF.normalEnemyIds.length);
      const pool = type === "elite" ? CF.eliteEnemyIds : CF.normalEnemyIds;
      return CF.enemies[pool[index]];
    },
    activeWeaponReward() {
      const run = this.current();
      if (!run || run.chapter !== 1) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.weaponBoss || !node.weaponId || CF.SaveSystem.data.weaponBossRewards?.[node.weaponId]) return null;
      return { nodeIndex, cardId: node.weaponId, nodeLabel: node.label };
    },
    claimActiveWeaponReward() {
      const reward = this.activeWeaponReward();
      if (!reward) return null;
      CF.SaveSystem.data.weaponBossRewards ||= {};
      CF.SaveSystem.data.weaponBossRewards[reward.cardId] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterTwoCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 2) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterTwoBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterTwoCardReward() {
      const reward = this.activeChapterTwoCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterTwoBossRewards ||= {};
      CF.SaveSystem.data.chapterTwoBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterThreeCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 3) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterThreeBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterThreeCardReward() {
      const reward = this.activeChapterThreeCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterThreeBossRewards ||= {};
      CF.SaveSystem.data.chapterThreeBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterFourCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 4) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterFourBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterFourCardReward() {
      const reward = this.activeChapterFourCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterFourBossRewards ||= {};
      CF.SaveSystem.data.chapterFourBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    activeChapterFiveCardReward() {
      const run = this.current();
      if (!run || run.chapter !== 5) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      const node = this.mapStages()[nodeIndex]?.[0];
      if (!node?.rewardCardId || CF.SaveSystem.data.chapterFiveBossRewards?.[nodeIndex]) return null;
      return { nodeIndex, cardId: node.rewardCardId, nodeLabel: node.label };
    },
    claimActiveChapterFiveCardReward() {
      const reward = this.activeChapterFiveCardReward();
      if (!reward) return null;
      CF.SaveSystem.data.chapterFiveBossRewards ||= {};
      CF.SaveSystem.data.chapterFiveBossRewards[reward.nodeIndex] = true;
      CF.SaveSystem.addCardToCollection(reward.cardId, 1);
      CF.SaveSystem.save();
      return reward;
    },
    farmNpcUnlocked() {
      const run = this.current();
      return !!run && run.chapter === 3 && run.completed.some(entry => Number(entry.stage) === CHAPTER_THREE_NPC.adjacentNode);
    },
    activeQueenBloodWaterReward() {
      const run = this.current();
      if (!run || run.chapter !== 1) return null;
      const nodeIndex = Number.isInteger(run.activeNode) ? run.activeNode : run.stage;
      if (nodeIndex !== 0 || CF.SaveSystem.data.questItemRewards?.queenBloodRiverWater) return null;
      return { nodeIndex, itemId: "queenBloodRiverWater", name: "含有女王血液的河水", image: "assets/trials/queen-blood-water.png" };
    },
    claimActiveQueenBloodWaterReward() {
      const reward = this.activeQueenBloodWaterReward();
      if (!reward) return null;
      CF.SaveSystem.data.questItemRewards ||= {};
      CF.SaveSystem.data.items ||= {};
      CF.SaveSystem.data.questItemRewards.queenBloodRiverWater = true;
      CF.SaveSystem.data.items.queenBloodRiverWater = true;
      CF.SaveSystem.save();
      return reward;
    },
    randomEvent() {
      const run = this.current();
      return EVENTS[(run?.stage + run?.completed?.length || 0) % EVENTS.length];
    },
    // 战斗胜利翻牌战利品：每场战斗（普通/精英/Boss）胜利后都会翻开三张固定战利品牌——
    // 女王精血、粗糙装备、笔记残页。第二张的粗糙武器/盔甲数量等于本场击杀的敌方随从数；
    // 第三张按顺序解锁《源血纪元》的下一页，集满后不再有奖励。
    generateVictoryLoot(unitsKilled = 0) {
      const gearCount = Math.max(0, Math.floor(Number(unitsKilled) || 0));
      return { gearCount };
    },
    claimVictoryLoot(unitsKilled = 0) {
      const { gearCount } = this.generateVictoryLoot(unitsKilled);
      CF.SaveSystem.addInventoryItem("queenEssenceBlood", 1);
      if (gearCount > 0) {
        CF.SaveSystem.addInventoryItem("weaponT1", gearCount);
        CF.SaveSystem.addInventoryItem("armorT1", gearCount);
      }
      let note = null;
      if (CF.SaveSystem.data.notesUnlocked < LORE_PAGES.length) {
        note = { ...LORE_PAGES[CF.SaveSystem.data.notesUnlocked], index: CF.SaveSystem.data.notesUnlocked + 1 };
        CF.SaveSystem.data.notesUnlocked += 1;
      }
      CF.SaveSystem.save();
      return { gearCount, note };
    },
    shopStock() {
      if (this.current()?.chapter === 1) {
        return ["eagle_eye", "iron_lancer", "royal_medic"].map(cardId => ({
          type: "card", cardId, icon: "🃏", title: CF.CARD_LIBRARY[cardId].name, detail: "永久加入卡牌收藏", cost: 20
        }));
      }
      const rewardId = CF.REWARD_CARD_IDS[(this.current()?.stage || 0) % CF.REWARD_CARD_IDS.length];
      return [
        { type: "card", cardId: rewardId, icon: "🃏", title: CF.CARD_LIBRARY[rewardId].name, detail: "加入卡牌收藏", cost: 35 },
        { type: "heal", icon: "❤️", title: "温热炖汤", detail: "恢复12点生命", value: 12, cost: 20 },
        { type: "xp", icon: "📚", title: "战术笔记", detail: "随机卡牌获得2经验", value: 2, cost: 25 },
        { type: "xp", icon: "📜", title: "高阶战术手册", detail: "随机卡牌获得4经验", value: 4, cost: 45 }
      ];
    }
  };

  window.CardForge = window.CardForge || {};
  Object.assign(window.CardForge, { MAP_STAGES, CHAPTER_TWO_STAGES, CHAPTER_TWO_ROUTE_EDGES, CHAPTER_THREE_STAGES, CHAPTER_THREE_ROUTE_EDGES, CHAPTER_THREE_NPC, CHAPTER_FOUR_STAGES, CHAPTER_FOUR_ROUTE_EDGES, CHAPTER_FIVE_STAGES, CHAPTER_FIVE_ROUTE_EDGES, EVENTS, LORE_BOOK_TITLE, LORE_PAGES, Adventure, freshRun });
})();

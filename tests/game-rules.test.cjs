const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const storage = new Map();
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  JSON,
  window: null,
  CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }
});
context.window = context;
context.dispatchEvent = () => {};

function load(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
}

load("js/cards.js");
load("js/enemies.js");
load("js/boss-dialogues.js");
load("js/emotes.js");
load("js/save.js");
load("js/adventure.js");
load("js/restaurant.js");
load("js/clock.js");
load("js/labor.js");
load("js/bond-stories.js");
load("js/night-events.js");
load("js/trials.js");
load("js/arena.js");
load("js/heroes.js");
load("js/sound.js");
load("js/music.js");
load("js/game.js");

const CF = context.CardForge;
const board = CF.emptyBoard();
assert.ok(CF.SoundFX, "程序化战斗音效系统应加载");
assert.equal(CF.SoundFX.play("melee"), false, "缺少浏览器音频上下文时音效应安全跳过");
{
  const soundSource = fs.readFileSync(path.join(root, "js/sound.js"), "utf8");
  const used = new Set();
  for (const file of ["js/main.js", "js/game.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(/(?:sfx|sound|SoundFX\?\.play)\((?:[^"()]*\?\s*)?"([A-Za-z]+)"(?:\s*:\s*"([A-Za-z]+)")?/g)) match.slice(1).filter(Boolean).forEach(name => used.add(name));
    for (const match of source.matchAll(/sfx\(\{([^}]*)\}/g)) for (const name of match[1].matchAll(/"([A-Za-z]+)"/g)) used.add(name[1]);
  }
  ["bossVictory", "chapterClear", "arenaWin", "arenaChampion", "trialClear", "cardLevelUp", "heroLevelUp", "rescue", "purchase"].forEach(name => assert.ok(used.has(name), `界面应在相应操作时播放${name}音效`));
  used.forEach(name => assert.match(soundSource, new RegExp(`\\n\\s+${name}: \\(\\) =>`), `音效${name}应在sound.js中定义`));
}
assert.ok(CF.Music, "程序化背景音乐系统应加载");
assert.deepEqual(Object.keys(CF.Music.tracks).sort(), ["adventure", "arena", "menu", "trial"], "主界面、冒险、竞技场与试炼应各有一首背景音乐");
Object.entries(CF.Music.tracks).forEach(([name, track]) => {
  assert.ok(track.melody.length > 0 && track.melody.every(event => Number.isFinite(event.note)), `${name}曲目的旋律音符应全部可解析`);
  assert.ok(track.melody.every(event => event.step + event.len <= track.chords.length * 16), `${name}曲目的旋律不应超出循环长度`);
});
assert.equal(CF.Music.setTrack("arena"), true, "缺少音频上下文时切换曲目也应安全");
const battleCss = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const cardsSource = fs.readFileSync(path.join(root, "js/cards.js"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const trialsSource = fs.readFileSync(path.join(root, "js/trials.js"), "utf8");
assert.ok(mainSource.includes('const defeatedBoss = completed && ["normal", "elite", "boss"].includes(node.type);'), "已击败的战斗首领应从地图中隐藏");
assert.ok(mainSource.includes('if (defeatedBoss) return "";'), "首领击败后不应继续生成地图头像");
assert.match(mainSource, /availableCollection\s*=\s*Object\.entries\(data\.collection\)\.filter\(\(\[id, owned\]\)\s*=>\s*owned\s*>\s*0\s*&&\s*!deckCounts\[id\]\)/, "收藏栏应隐藏已加入当前卡组的卡牌");
assert.match(mainSource, /const pct = level >= 5 \? 100 : Math\.min\(100, Math\.round\(currentXp \/ nextXp \* 100\)\)/, "Lv4卡牌经验条应按实际进度显示");
assert.match(mainSource, /经验 \$\{level >= 5 \? "已满"/, "仅满级Lv5卡牌应显示经验已满");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const bossDialogueSource = fs.readFileSync(path.join(root, "js/boss-dialogues.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.equal(Object.keys(CF.BOSS_DIALOGUES[1]).length, 8, "第一关8场战斗都应拥有独立Boss台词");
assert.equal(Object.keys(CF.BOSS_DIALOGUES[2]).length, 20, "第二关20个Boss都应拥有独立台词");
assert.equal(Object.keys(CF.BOSS_DIALOGUES[3]).length, 20, "第三关20个Boss都应拥有独立台词");
assert.equal(Object.keys(CF.BOSS_DIALOGUES[4]).length, 20, "第四关20个史莱姆Boss都应拥有独立台词");
assert.equal(Object.keys(CF.BOSS_DIALOGUES[5]).length, 20, "第五关20个古城Boss都应拥有独立台词");
assert.equal(new Set(Object.values(CF.BOSS_DIALOGUES[5]).map(dialogue => dialogue.intro)).size, 20, "第五关Boss开场台词不应重复");
assert.ok(Object.values(CF.BOSS_DIALOGUES[5]).every(dialogue => dialogue.turns.length >= 3), "第五关每个Boss都应拥有至少3段独立回合台词");
Object.values(CF.BOSS_DIALOGUES).flatMap(chapter => Object.values(chapter)).forEach(dialogue => {
  assert.ok(dialogue.intro && dialogue.turns.length && dialogue.wounded && dialogue.desperate && dialogue.defeat, "每个Boss应具备开场、回合、受伤、濒死与落败台词");
});
assert.equal(CF.BOSS_DIALOGUES[2][19].rescueEpilogue.officers.length, 5, "翠影女王应由五位魅魔军官救援");
assert.equal(CF.BOSS_DIALOGUES[3][19].rescueEpilogue.officers.length, 5, "丰穗战母应由五位魅魔军官救援");
assert.equal(CF.BOSS_DIALOGUES[4][19].rescueEpilogue.officers.length, 5, "碧露大贤者应由五位魅魔军官救援");
assert.match(bossDialogueSource, /女王之血|血河|那条河/, "Boss台词应贯穿女王之血唤醒灵智的背景");
assert.match(bossDialogueSource, /食量|饭量|填不满的胃/, "Boss台词应说明强化后的族群食量显著增加");
assert.match(bossDialogueSource, /雌性|母兽|母熊/, "Boss台词应说明女王之血更容易强化雌性");
assert.match(bossDialogueSource, /没有杀过村民|不是杀死|无人被杀|只驱赶/, "Boss台词应说明开智族群极少杀人并倾向驱赶居民");
assert.match(CF.Trials.list[6].dialogue[6], /体魄与灵智[\s\S]*饥饿[\s\S]*雌性/, "女王低语应解释女王之血的三项主要影响");
assert.match(CF.Trials.list[6].dialogue[7], /不再挨饿[\s\S]*极少杀人/, "女王低语应解释后续族群进入人类地区的原因");
assert.match(indexSource, /js\/boss-dialogues\.js/, "游戏入口应加载Boss剧情台词配置");
assert.match(battleCss, /\.boss-dialogue-frame\s*\{[^}]*position:\s*absolute[^}]*grid-template-columns/s, "战斗场地应显示带头像的Boss对白框");
const chapterTwoLayout = mainSource.match(/const CHAPTER_TWO_NODE_LAYOUT = \[([\s\S]*?)\n  \];/);
assert.ok(chapterTwoLayout, "chapter two should declare a fixed map layout");
assert.equal((chapterTwoLayout[1].match(/\[\d+,\s*\d+\]/g) || []).length, 20, "chapter two should place exactly 20 boss nodes");
assert.match(mainSource, /boss-map-board/, "chapter two should render a dedicated route board");
assert.match(mainSource, /boss-route-lines/, "chapter two should render connecting route lines");
assert.match(mainSource, /boss-map-node/, "chapter two should render boss nodes over the map");
assert.match(battleCss, /\.boss-map-board\s*\{[^}]*position:\s*relative[^}]*goblin-expedition\.png/s, "chapter two map should use the supplied landscape as its route board");
assert.match(battleCss, /\.boss-map-node\s*\{[^}]*position:\s*absolute/s, "boss nodes should use fixed map coordinates");
const chapterThreeLayout = mainSource.match(/const CHAPTER_THREE_NODE_LAYOUT = \[([\s\S]*?)\n  \];/);
const chapterThreeBossPortraits = Array.from(CF.CHAPTER_THREE_STAGES, nodes => nodes[0].portrait);
assert.equal(chapterThreeBossPortraits.length, 20, "第三关应有20张熊族Boss头像");
assert.equal(new Set(chapterThreeBossPortraits).size, 20, "第三关每个Boss应使用独立头像");
chapterThreeBossPortraits.forEach(portrait => assert.ok(fs.existsSync(path.join(root, portrait)), `${portrait}应存在于游戏素材中`));
assert.ok(chapterThreeLayout, "第三关应声明固定农场节点布局");
assert.equal((chapterThreeLayout[1].match(/\[[\d.]+,\s*[\d.]+\]/g) || []).length, 20, "第三关应在农场地图放置20个Boss节点");
const chapterThreeConnected = new Set([0]);
let chapterThreeExpanded = true;
while (chapterThreeExpanded) {
  chapterThreeExpanded = false;
  for (const [from, to] of CF.CHAPTER_THREE_ROUTE_EDGES) {
    if (chapterThreeConnected.has(from) && !chapterThreeConnected.has(to)) { chapterThreeConnected.add(to); chapterThreeExpanded = true; }
    if (chapterThreeConnected.has(to) && !chapterThreeConnected.has(from)) { chapterThreeConnected.add(from); chapterThreeExpanded = true; }
  }
}
assert.equal(chapterThreeConnected.size, 20, "第三关20个Boss节点应全部由同一张路线网连通");
assert.ok(CF.CHAPTER_THREE_ROUTE_EDGES.some(([from, to]) => from === 18 && to === 19), "第三关最终Boss应与前置节点相连");
assert.match(mainSource, /data-action="farm-npc"/, "第三关地图应提供农民夫妇NPC节点");
assert.match(battleCss, /\.boss-map-board\.chapter-three-map\s*\{[^}]*farm-expedition-clean\.png/s, "第三关应使用用户提供的无标记农场地图");
assert.match(mainSource, /CHAPTER_THREE_ROUTE_CONTROLS/, "第三关应使用独立曲线控制点绘制路线");
assert.match(battleCss, /\.battlefield\.harvest-farm\s*\{[^}]*harvest-farm\.png/s, "第三关战斗应使用新农田背景");
const chapterFourLayout = mainSource.match(/const CHAPTER_FOUR_NODE_LAYOUT = \[([\s\S]*?)\n  \];/);
const chapterFourBossPortraits = Array.from(CF.CHAPTER_FOUR_STAGES, nodes => nodes[0].portrait);
assert.equal(chapterFourBossPortraits.length, 20, "第四关应有20张史莱姆Boss头像");
assert.equal(new Set(chapterFourBossPortraits).size, 20, "第四关每个Boss应使用独立史莱姆头像");
chapterFourBossPortraits.forEach(portrait => assert.ok(fs.existsSync(path.join(root, portrait)), `${portrait}应存在于游戏素材中`));
assert.ok(chapterFourLayout, "第四关应声明固定梦幻森林节点布局");
assert.equal((chapterFourLayout[1].match(/\[[\d.]+,\s*[\d.]+\]/g) || []).length, 20, "第四关应在梦幻森林放置20个Boss节点");
const chapterFourConnected = new Set([0]);
let chapterFourExpanded = true;
while (chapterFourExpanded) {
  chapterFourExpanded = false;
  for (const [from, to] of CF.CHAPTER_FOUR_ROUTE_EDGES) {
    if (chapterFourConnected.has(from) && !chapterFourConnected.has(to)) { chapterFourConnected.add(to); chapterFourExpanded = true; }
    if (chapterFourConnected.has(to) && !chapterFourConnected.has(from)) { chapterFourConnected.add(from); chapterFourExpanded = true; }
  }
}
assert.equal(chapterFourConnected.size, 20, "第四关20个史莱姆节点应全部由同一张路线网连通");
assert.ok(CF.CHAPTER_FOUR_ROUTE_EDGES.some(([from, to]) => from === 18 && to === 19), "第四关最终Boss应与前置节点相连");
assert.match(battleCss, /\.boss-map-board\.chapter-four-map\s*\{[^}]*dream-forest-expedition\.png/s, "第四关应使用用户提供的梦幻森林地图");
assert.match(battleCss, /\.battlefield\.dream-slime-forest\s*\{[^}]*dream-slime-forest\.png/s, "第四关战斗应使用新绘制的史莱姆森林背景");
const chapterFiveLayout = mainSource.match(/const CHAPTER_FIVE_NODE_LAYOUT = \[([\s\S]*?)\n  \];/);
assert.ok(chapterFiveLayout, "第五关应声明固定古城废墟节点布局");
assert.equal((chapterFiveLayout[1].match(/\[[\d.]+,\s*[\d.]+\]/g) || []).length, 20, "第五关应放置20个Boss节点");
assert.equal(CF.CHAPTER_FIVE_STAGES.length, 20, "第五关应包含20个灰狼与野兽Boss");
assert.equal(new Set(Array.from(CF.CHAPTER_FIVE_STAGES, nodes => nodes[0].portrait)).size, 20, "第五关20个Boss应使用独立头像路径");
Array.from(CF.CHAPTER_FIVE_STAGES, nodes => nodes[0].portrait).forEach(portrait => assert.ok(fs.existsSync(path.join(root, portrait)), `${portrait}应存在于第五关素材中`));
assert.match(battleCss, /\.boss-map-board\.chapter-five-map\s*\{[^}]*ancient-city-expedition\.png/s, "第五关应使用古城废墟地图");
assert.match(battleCss, /\.battlefield\.ancient-city-ruins\s*\{[^}]*ancient-city-ruins\.png/s, "第五关战斗应使用新古城废墟背景");
assert.match(gameJs, /name:\s*"罗兰·维克"/, "默认战斗英雄名称应为罗兰·维克");
assert.equal(CF.heroById("captain").name, "罗兰·维克", "默认英雄应名为罗兰·维克");
assert.equal(CF.heroById("captain").title, "前王都护卫队长", "罗兰的称号应为前王都护卫队长");
assert.match(mainSource, /罗兰·维克/, "英雄档案应使用罗兰·维克");
assert.match(cardsSource, /royal_medic:\s*C\("royal_medic",\s*"王庭医师"[\s\S]*role:\s*"healer"/, "王庭医师应改为治疗随从");
assert.match(battleCss, /\.battle-screen\s*\{[^}]*animation:\s*none/, "战斗重绘不应触发整屏入场动画");
assert.doesNotMatch(battleCss, /hitShake/, "受击抖动动画应完全移除");
assert.match(battleCss, /\.battlefield\s*\{[^}]*height:\s*610px[^}]*max-height:\s*610px/s, "战场应保持固定高度");
assert.match(battleCss, /\.battlefield \.slot\s*\{[^}]*height:\s*100%[^}]*overflow:\s*hidden/s, "格位不应被随从撑高");
assert.match(indexSource, /id="spell-arrowhead"/, "法术指示箭头应有独立的蓝色箭头标记");
assert.match(indexSource, /id="skill-arrowhead"/, "英雄技能应有独立的金色箭头标记");
assert.match(battleCss, /\.attack-arrow-layer\.spell \.attack-arrow\s*\{[^}]*stroke:\s*#2d9cff[^}]*spell-arrowhead/s, "法术指示箭头应使用蓝色样式");
assert.match(battleCss, /\.attack-arrow-layer\.skill \.attack-arrow\s*\{[^}]*stroke:\s*#f2b84b[^}]*skill-arrowhead/s, "英雄技能指示箭头应使用金色样式");
assert.match(battleCss, /\.slot\.targetable \.unit\s*\{[^}]*0 0 42px/s, "可攻击随从应拥有更大的卡牌光晕");
assert.match(battleCss, /\.unit\.ready:not\(\.enemy-unit\)\s*\{[^}]*0 0 48px/s, "本回合未攻击的我方随从应拥有更明显的待攻击光晕");
assert.match(mainSource, /isSpell[\s\S]*game-card\.spell\.selected[\s\S]*classList\.toggle\("spell", isSpell\)/, "法术牌应接入指示箭头逻辑");
assert.match(mainSource, /classList\.toggle\("skill", isSkill\)/, "英雄技能应接入金色指示箭头逻辑");
assert.match(gameJs, /const BOSS_ACTION_DELAY = 1000/, "Boss行动间隔应为1秒");
assert.match(gameJs, /await wait\(BOSS_ACTION_DELAY\)/, "Boss每个操作后应等待1秒");
assert.match(gameJs, /const DIALOGUE_EXTRA_DURATION = 3000/, "全部限时对白应在原停留时间上增加3秒");
assert.match(gameJs, /const BOSS_DIALOGUE_DURATION = 4200 \+ DIALOGUE_EXTRA_DURATION/, "普通Boss对白应延长3秒");
assert.match(gameJs, /const BOSS_DIALOGUE_SEQUENCE_GAP = 1300 \+ DIALOGUE_EXTRA_DURATION/, "连续剧情对白每句应延长3秒");
assert.match(gameJs, /const BOSS_DEFEAT_DIALOGUE_DELAY = 1900 \+ DIALOGUE_EXTRA_DURATION/, "落败对白应延长3秒后再结算");
assert.match(gameJs, /BOSS_DIALOGUE_SEQUENCE_GAP \* \(index \+ 1\)/, "魅魔救援的连续对白应使用延长后的间隔");
assert.match(trialsSource, /await new Promise\(resolve => setTimeout\(resolve, FINAL_STORY_DIALOGUE_DELAY\)\)/, "女王低语最后一句应额外停留3秒");
assert.match(gameJs, /battleNotices:\s*\[\]/, "战场应维护临时敌方行动提示");
assert.match(gameJs, /setTimeout\(\(\) => \{[\s\S]*3000/, "敌方行动提示应在3秒后消失");
assert.match(gameJs, /deck-remaining-panel/, "战斗侧栏应显示我方剩余牌库");
assert.match(gameJs, /battle-announcements/, "敌方行动记录应显示在战场中央");
assert.match(battleCss, /\.battle-announcements\s*\{[^}]*flex-direction:\s*column/s, "多条敌方行动记录应分行堆叠");

const illustratedPlayerUnits = [
  "recruit", "shield_guard", "recruit_archer", "forest_wolf", "vanguard", "kingdom_knight",
  "ranger", "raider", "iron_lancer", "eagle_eye", "royal_medic"
];
for (const id of illustratedPlayerUnits) {
  const image = CF.CARD_LIBRARY[id].image;
  assert.ok(image, `${id} should declare an illustration`);
  assert.ok(fs.existsSync(path.join(root, image)), `${id} illustration should exist`);
}

const illustratedEnemyUnits = [
  "goblin", "goblin_guard", "goblin_archer", "wild_wolf", "orc_grunt", "orc_breaker",
  "shadow_sniper", "cultist", "bandit", "wolf_cub", "dire_wolf"
];
for (const id of illustratedEnemyUnits) {
  const image = CF.CARD_LIBRARY[id].image;
  assert.ok(image, `${id} should declare an enemy illustration`);
  assert.ok(fs.existsSync(path.join(root, image)), `${id} enemy illustration should exist`);
}
const illustratedSpells = [
  "fire_flask", "healing_potion", "battle_cry", "arrow_rain", "wolf_pack", "dark_bolt"
];
for (const id of illustratedSpells) {
  const card = CF.CARD_LIBRARY[id];
  assert.equal(card.type, "spell", `${id} should remain a spell`);
  assert.ok(card.image, `${id} should declare a spell illustration`);
  assert.ok(fs.existsSync(path.join(root, card.image)), `${id} spell illustration should exist`);
}
assert.match(battleCss, /\.game-card\.spell\s*\{[^}]*border-color:\s*#f0c75d/s, "spell cards should use the ornate gold frame");
assert.match(battleCss, /\.game-card:not\(\.spell\) \.card-art\.has-image\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s, "随从卡立绘应铺满卡面");
assert.match(battleCss, /\.game-card:not\(\.spell\) \.card-stats\s*\{[^}]*position:\s*absolute/s, "随从攻血应浮在立绘上方");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.unit-icon\.has-image\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s, "上场随从立绘应铺满单位卡面");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.unit-stats\s*\{[^}]*position:\s*absolute/s, "上场随从攻血应浮在立绘上方");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.unit-stats \.attack-stat\s*\{[^}]*left:\s*6px/s, "上场随从攻击力应位于左下角");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.unit-stats \.health-stat\s*\{[^}]*right:\s*6px/s, "上场随从生命值应位于右下角");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.combat-tag\s*\{[^}]*right:\s*6px[^}]*top:\s*6px/s, "上场随从近战远程应位于右上角");
assert.match(battleCss, /\.unit:has\(\.unit-icon\.has-image\) \.level-tag\s*\{[^}]*display:\s*none\s*!important/s, "上场随从不应显示等级标记");
assert.match(battleCss, /\.unit \.combat-tag\s*\{[^}]*position:\s*absolute\s*!important[^}]*right:\s*6px[^}]*top:\s*6px/s, "近战远程标记应强制固定在右上角");
assert.doesNotMatch(gameJs, /class="level-tag"/, "登场随从结构不应输出等级标记");
assert.doesNotMatch(gameJs, /class="unit-keyword"/, "登场随从结构不应输出突袭等关键词标记");
assert.ok(fs.existsSync(path.join(root, "assets/hero/novice-swordsman.png")), "hero portrait should exist");
assert.ok(fs.existsSync(path.join(root, "assets/battle/forest-battlefield.png")), "forest battlefield background should exist");
assert.ok(fs.existsSync(path.join(root, "assets/battle/goblin-stronghold.png")), "第二关哥布林战斗背景应存在");
assert.ok(fs.existsSync(path.join(root, "assets/maps/goblin-expedition.png")), "第二关大地图背景应存在");
assert.ok(fs.existsSync(path.join(root, "assets/maps/forest-expedition.png")), "第一关雾林大地图背景应存在");
assert.ok(fs.existsSync(path.join(root, "assets/maps/world-map.png")), "关卡选择世界地图背景应存在");
assert.ok(fs.existsSync(path.join(root, "assets/maps/farm-expedition.png")), "第三关农场地图应复制到项目资源目录");
assert.ok(fs.existsSync(path.join(root, "assets/battle/harvest-farm.png")), "第三关农田战斗背景应存在");
assert.ok(fs.existsSync(path.join(root, "assets/enemies/chapter3/bear-matriarch.png")), "第三关最终Boss熊娘头像应存在");
assert.ok(fs.existsSync(path.join(root, "assets/npcs/farm-couple.png")), "农民夫妇NPC头像应存在");
assert.ok(fs.existsSync(path.join(root, "assets/arena/arena-battlefield.png")), "竞技场战斗地图应存在");
assert.equal(fs.readdirSync(path.join(root, "assets/arena/portraits")).filter(file => file.endsWith(".webp")).length, 63, "竞技场应有63个其余英雄头像");
assert.equal(CF.Arena.heroes.length, 63, "竞技场应配置63名对手和玩家组成64队");
assert.equal(CF.Arena.rewards.join(","), "100,200,400,800,1200,1600", "竞技场晋级奖金应按要求设置");
assert.equal(new Set(CF.Arena.heroes.map(hero => hero.name)).size, 63, "竞技场英雄应拥有独立名字");
assert.equal(new Set(CF.Arena.heroes.map(hero => hero.skill.id)).size, 63, "63名竞技场英雄应各自拥有独立技能");
assert.equal(new Set(CF.Arena.heroes.map(hero => hero.skill.name)).size, 63, "63种竞技场技能应使用独立名称");
assert.ok(CF.Arena.heroes.every(hero => hero.dialogue?.intro && hero.dialogue?.turns?.length >= 2 && hero.dialogue?.wounded && hero.dialogue?.desperate && hero.dialogue?.defeat), "63名竞技场对手都应拥有完整战斗对白");
assert.equal(new Set(CF.Arena.heroes.map(hero => hero.dialogue.intro)).size, 63, "每名竞技场对手都应拥有独立赛前宣言");
assert.ok(CF.Arena.heroes.filter(hero => hero.persona === "citizen").length >= 20, "竞技场应有多名认可人类进步并被王国接纳的异族选手");
assert.ok(CF.Arena.heroes.filter(hero => hero.persona === "trash").length >= 10, "竞技场应有多名擅长挑衅和垃圾话的选手");
assert.equal(Object.keys(CF.HERO_SKILLS).length, 72, "玩家应可收集斩击、63种竞技场英雄技能，另有8名可选英雄的独特技能");
assert.ok(Object.values(CF.HERO_SKILLS).every(skill => typeof skill.playerDescription === "function"), "每种英雄技能都应有随等级变化的玩家版效果");
const arenaSkillSignatures = CF.Arena.heroes.map(hero => JSON.stringify({
  effect: hero.skill.effect, target: hero.skill.target, cost: hero.skill.cost,
  amount: hero.skill.amount, attack: hero.skill.attack, health: hero.skill.health,
  heal: hero.skill.heal, draw: hero.skill.draw, mana: hero.skill.mana,
  heroDamage: hero.skill.heroDamage, selfDamage: hero.skill.selfDamage,
  splash: hero.skill.splash, count: hero.skill.count, threshold: hero.skill.threshold,
  bonus: hero.skill.bonus, durability: hero.skill.durability, tokenName: hero.skill.tokenName,
  keyword: hero.skill.keyword, rush: hero.skill.rush, permanent: hero.skill.permanent,
  combatStyle: hero.skill.combatStyle
}));
assert.equal(new Set(arenaSkillSignatures).size, 63, "63种竞技场英雄技能应拥有不同的机制或三级数值组合");
assert.match(mainSource, /CHAPTER_ONE_STAGE_LAYOUT\s*=\s*\[/, "第一关应使用固定雾林节点布局");
assert.match(mainSource, /chapter-one-map/, "第一关地图应渲染雾林地图画布");
assert.match(mainSource, /level-map-board/, "主界面应提供世界地图关卡选择");
assert.match(mainSource, /assets\/enemies\/forest-wolf-king\.png[\s\S]*assets\/enemies\/goblin-queen\.png/, "世界地图应显示两关最终Boss头像");
assert.match(mainSource, /selectChapter\(chapter\)/, "点击关卡头像应进入对应章节");
assert.match(mainSource, /arena-world-node[\s\S]*data-action="arena-open"/, "世界地图中央应提供王都竞技场入口");
assert.match(mainSource, /trial-world-node[\s\S]*data-action="trials-open"/, "世界地图海港城市应提供统领试炼入口");
assert.match(mainSource, /data-action="toggle-level-layout"/, "世界地图应提供关卡布局调整入口");
assert.match(mainSource, /data-action="save-level-layout"[\s\S]*data-action="reset-level-layout"/, "关卡布局调整应支持保存与恢复默认");
assert.match(mainSource, /levelMapLayout[\s\S]*pointerdown[\s\S]*pointermove/, "关卡布局应支持拖动并保存坐标");
assert.match(battleCss, /\.level-map-board\.layout-editing[\s\S]*\.level-node\.dragging/, "布局编辑模式应提供拖动视觉反馈");
assert.match(mainSource, /renderTrials\(\)/, "统领试炼应提供独立七关选择界面");
assert.match(mainSource, /renderTraining\(\)[\s\S]*<h2>队伍营地<\/h2>/, "队伍营地应作为独立界面");
assert.match(mainSource, /data-action="training-page"[\s\S]*<strong>队伍营地<\/strong>/, "主界面应提供进入队伍营地的入口");
assert.ok(fs.existsSync(path.join(root, "assets/ui/training-grounds.webp")), "队伍营地场景图应位于项目资源目录");
assert.match(mainSource, /renderCover\(\)[\s\S]*新游戏[\s\S]*继续游戏[\s\S]*游戏设置/, "启动封面应提供新游戏、继续游戏与游戏设置三个按钮");
assert.match(mainSource, /UI\.renderCover\(\);\s*\}\)\(\);/, "游戏启动时应首先显示封面");
assert.ok(fs.existsSync(path.join(root, "assets/ui/game-cover.png")), "游戏封面图片应复制到项目资源目录");
assert.doesNotMatch(mainSource, /英雄训练|buy-health|buyHealthUpgrade/, "队伍营地不应继续出售英雄最大生命值");
for (const service of ["随从训练", "法术训练", "武器训练", "救治伤员"]) assert.match(mainSource, new RegExp(`TRAINING_NPCS = \\[[\\s\\S]*${service} · 30金币`), `队伍营地应提供${service}`);
assert.match(mainSource, /点击同一张卡即可连续训练[\s\S]*data-training-coins[\s\S]*data-training-card/, "卡牌训练面板应支持保持开启并连续训练同一张卡");
assert.match(mainSource, /buyCardTraining\(type, id\)[\s\S]*addCardXp\(id, 2\)[\s\S]*refreshCardTraining\(type, id\)/, "每次卡牌训练后应原地刷新金币、等级和经验进度");
assert.match(mainSource, /buyCardTraining\(type, id\)[\s\S]*save\.coins -= 30;[\s\S]*addCardXp\(id, 2\)/, "卡牌训练应允许选择对应卡牌并以30金币增加2点经验");
assert.match(mainSource, /rescueInjured\(\)[\s\S]*save\.coins -= 30;[\s\S]*rescueInjuredCards\(\)[\s\S]*run\.hp = run\.maxHp/, "救治伤员应消耗30金币、清除伤员并恢复英雄满生命");
assert.match(mainSource, /data-action="inspect-card"[\s\S]*openCardDetail\(cardId\)/, "卡组编辑中的卡牌应可点击打开完整预览");
assert.match(mainSource, /card-inspect-close[\s\S]*关闭卡牌预览[\s\S]*card-inspect-card/, "完整卡牌预览应提供右上角关闭按钮和完整卡面");
assert.match(mainSource, /event\.key === "Escape"[\s\S]*card-inspect-card[\s\S]*closeModal/, "完整卡牌预览应支持Esc返回卡组编辑");
assert.match(gameJs, /availablePlayerDeck = CF\.SaveSystem\.availableDeck\(\)/, "新战斗应从实际牌库中排除负伤随从");
assert.match(gameJs, /CF\.SaveSystem\.injureCard\(unit\.cardId\)/, "我方真实随从阵亡后应写入伤员名单");
assert.equal(CF.Trials.list.length, 7, "统领试炼应包含七关");
assert.equal(CF.Trials.list[5].health, 1999, "天穹之剑应拥有1999点生命");
assert.equal(CF.Trials.list[6].health, 9999, "魅魔女王应拥有9999点生命");
assert.equal(CF.Trials.list[6].dialogue.length, 8, "女王低语应包含八段泽亚历史");
assert.equal(CF.Trials.enemy(5).openingHand, 10, "王国第一骑士应拥有10张起手牌");
assert.ok(CF.Trials.list[4].enemyCardLevel === 5, "王国第一骑士应使用五星随从");
const trialFiveCardIds = [...new Set(CF.Trials.list[4].deck)];
const expectedTrialFiveCards = [...new Set(CF.STARTER_DECK.filter(id => CF.CARD_LIBRARY[id].type === "unit")), "eagle_eye", "iron_lancer", "royal_medic"];
assert.deepEqual(Array.from(trialFiveCardIds), expectedTrialFiveCards, "王国第一骑士只应使用初始随从与三张指定稀有随从");
assert.ok(trialFiveCardIds.every(id => CF.CARD_LIBRARY[id].type === "unit"), "王国第一骑士的牌库应全部是随从");
assert.ok(trialFiveCardIds.every(id => CF.Trials.enemy(5).cardProgress[id].level === 5), "王国第一骑士牌库中的每张牌都应为五星");
assert.ok(trialFiveCardIds.every(id => !CF.WEAPON_CARD_IDS.includes(id) && !CF.CHAPTER_TWO_REWARD_CARD_IDS.includes(id) && !CF.CHAPTER_THREE_REWARD_CARD_IDS.includes(id)), "王国第一骑士不应使用击败各关Boss获得的首杀卡牌");
CF.SaveSystem.load();
const executionTrial = new CF.Battle(CF.Trials.enemy(3));
assert.equal(executionTrial.state.player.hp, 1, "斩杀线试炼中玩家应只有1点生命");
assert.equal(executionTrial.state.player.maxMana, 5, "通过前两关后斩杀线试炼应拥有5颗法力水晶");
assert.equal(executionTrial.state.enemy.board.front.concat(executionTrial.state.enemy.board.back).filter(Boolean).length, 8, "斩杀线试炼应铺满八个1/3随从");
assert.equal(executionTrial.state.player.hand.map(card => card.id).join(","), "fire_flask,battle_cry,frontline_strike", "斩杀线试炼应固定提供火焰瓶、战斗怒吼与前线突击");
const frontlineStrike = executionTrial.state.player.hand[2];
assert.equal(frontlineStrike.cost, 1, "前线突击应为1费");
assert.equal(frontlineStrike.value, 3, "前线突击应造成3点伤害");
assert.ok(fs.existsSync(path.join(root, frontlineStrike.image)), "前线突击卡图应存在");
assert.ok(!CF.CARD_LIBRARY.frontline_strike, "前线突击只属于斩杀线试炼，不应进入卡牌库、奖励或商店");
Object.assign(executionTrial.state, { phase: "player", busy: false });
executionTrial.selectCard(2);
assert.equal(executionTrial.isTargetable("enemy", "back", 0), false, "前线突击不能指向敌方后排");
assert.equal(executionTrial.isTargetable("enemy", "front", 0), true, "前线突击可以指向敌方前排");
executionTrial.clickUnit("enemy", "back", 0);
assert.equal(executionTrial.state.player.hand.length, 3, "选择后排时前线突击不应被打出");
executionTrial.clickUnit("enemy", "front", 0);
assert.equal(executionTrial.state.enemy.board.front[0], null, "前线突击应以3点伤害击破1/3盾列");
assert.equal(executionTrial.state.player.mana, 4, "前线突击应消耗1点法力");
assert.equal(new CF.Battle(CF.Trials.enemy(4)).state.player.hand.concat(new CF.Battle(CF.Trials.enemy(4)).state.player.deck).some(card => card.id === "frontline_strike"), false, "其他试炼不应出现前线突击");
const captainTrial = new CF.Battle(CF.Trials.enemy(4));
assert.ok(captainTrial.state.player.deck.concat(captainTrial.state.player.hand).every(card => card.type !== "unit"), "钢腕教官试炼的玩家牌库不应包含随从");
const skybladeTrial = new CF.Battle(CF.Trials.enemy(6));
assert.equal(skybladeTrial.state.player.maxHp, CF.SaveSystem.data.hero.maxHealth, "天穹之剑试炼应使用英雄当前生命上限");
assert.equal(skybladeTrial.state.player.hp, CF.SaveSystem.data.hero.maxHealth, "天穹之剑试炼应以英雄当前生命值满血开始");
const queenStoryTrial = new CF.Battle(CF.Trials.enemy(7));
assert.equal(queenStoryTrial.state.player.deck.length, 0, "女王低语试炼不应提供牌库");
assert.equal(queenStoryTrial.state.player.hand.length, 0, "女王低语试炼不应提供手牌");
const queenStoryStartingHp = queenStoryTrial.state.player.hp;
queenStoryTrial.startPlayerTurn(false);
assert.equal(queenStoryTrial.state.player.fatigue, 1, "女王低语试炼仍应在空牌库抽牌时累积疲劳");
assert.equal(queenStoryTrial.state.player.hp, queenStoryStartingHp - 1, "女王低语试炼第一次疲劳应造成1点伤害");
assert.match(gameJs, /CF\.Trials\?\.mentorHTML\(this\)/, "试炼战场应显示带头像的前辈指导框");
assert.match(battleCss, /training-ground\.png/, "统领试炼应使用新训练场地图");
assert.match(battleCss, /queen-dream\.png/, "女王低语应使用新梦境地图");
assert.doesNotMatch(fs.readFileSync(path.join(root, "js/adventure.js"), "utf8"), /type:\s*"shard"|blood_shard/, "冒险奖励、商店与事件不应再提供法力碎片");
for (const file of ["training-ground.png","queen-dream.png","harold-brian.png","gavin-stoneshield.png","roderick-valen.png","gerard-steelhand.png","reynard-crownsword.png","aetherlan-raine.png","queen-iselanda.png","queen-blood-water.png"]) {
  assert.ok(fs.existsSync(path.join(root, "assets/trials", file)), `${file}试炼素材应存在`);
}
assert.match(mainSource, /arenaBracketHTML\(tournament\)/, "竞技场应渲染完整的体育赛事淘汰赛程");
assert.match(mainSource, /arena-bracket-connectors/, "竞技场赛程应使用连线展示胜者晋级关系");
assert.match(battleCss, /\.arena-tournament-bracket\s*\{[^}]*position:\s*relative/s, "竞技场对阵图应使用固定赛程画布");
assert.match(battleCss, /\.arena-match\.player-current\s*\{[^}]*border-color:\s*#ffe093/s, "玩家当前场次应使用醒目的金色高亮");
assert.match(mainSource, /CHAPTER_ONE_ROUTE_EDGES\s*=\s*\[/, "第一关应配置独立的分支连线");
assert.equal((mainSource.match(/\[50, 90\][\s\S]*?\[50, 5\]/)?.[0].match(/\[\d+, \d+\]/g) || []).length, 13, "第一关应配置13个可回溯的节点位置");
assert.ok(fs.existsSync(path.join(root, "assets/enemies/goblin-queen.png")), "女哥布林最终Boss头像应存在");
assert.ok(fs.existsSync(path.join(root, "assets/ui/mana-crystals.png")), "mana crystal sprite should exist");
assert.ok(fs.existsSync(path.join(root, "assets/ui/gold-coin.png")), "custom gold coin icon should exist");
assert.match(mainSource, /assets\/ui\/gold-coin\.png/, "游戏资源栏应使用自定义金币图标");
assert.match(mainSource, /cardPreview\(cardId, compact = false\)/, "奖励与商店应提供卡牌预览组件");
assert.match(mainSource, /boss-loot-grid[\s\S]*flip-boss-card/, "所有战斗胜利都应翻牌揭示三项固定战利品，而不是三选一");
assert.doesNotMatch(mainSource, /claim-reward|applyReward|pendingRewards/, "旧的三选一奖励机制应彻底删除");
assert.match(mainSource, /item\.type === "card" \? this\.cardPreview\(item\.cardId, true\)/, "购买卡牌奖励应显示对应卡面");
assert.match(cardsSource + fs.readFileSync(path.join(root, "js/adventure.js"), "utf8"), /assets\/ui\/gold-coin\.png/, "金币奖励应使用自定义金币图标");
assert.ok(fs.existsSync(path.join(root, "assets/enemies/forest-wolf-king.png")), "wolf king portrait should exist");
assert.equal(CF.enemies.wolf_king.portrait, "assets/enemies/forest-wolf-king.png", "狼王应使用专属头像");
Object.values(CF.enemies).forEach(enemy => {
  assert.ok(enemy.portrait, `${enemy.name}应配置专属头像`);
  assert.ok(fs.existsSync(path.join(root, enemy.portrait)), `${enemy.name}头像文件应存在`);
});
assert.equal(CF.enemies.wolf_king.skills.length, 2, "狼王应显示两项Boss技能");
assert.equal(CF.enemies.wolf_king.skills.map(skill => skill.every).join(","), "3,4", "狼王技能应按3/4敌方回合触发");
assert.equal(CF.enemies.goblin_queen.health, 200, "翠影女王应拥有200点生命");
assert.equal(CF.enemies.goblin_queen.passive, "goblin_queen", "翠影女王应使用每回合召唤被动");
assert.equal(CF.enemies.goblin_queen.skills[0].every, 1, "翠影女王技能应每个敌方回合触发");
const crystalHTML = CF.Battle.prototype.manaCrystalsHTML({ mana: 2, maxMana: 4 });
assert.equal((crystalHTML.match(/mana-crystal charged/g) || []).length, 2, "2点可用法力应显示2颗充能水晶");
assert.equal((crystalHTML.match(/mana-crystal spent/g) || []).length, 2, "消耗2点法力应熄灭2颗水晶");

assert.equal(CF.STARTER_DECK.length, 24, "初始牌组应为24张");
assert.equal(new Set(CF.STARTER_DECK).size, 24, "初始牌组中的每张卡都应只有一张");
for (const id of CF.NEW_CARD_IDS) {
  const card = CF.CARD_LIBRARY[id];
  assert.ok(card, `${id}应为独立新卡`);
  assert.equal(CF.STARTER_DECK.filter(cardId => cardId === id).length, 1, `${id}应只有一张`);
  assert.ok(card.image, `${id}应有独立立绘`);
  assert.ok(fs.existsSync(path.join(root, card.image)), `${id}立绘文件应存在`);
}
assert.equal(new Set(CF.NEW_CARD_IDS.map(id => CF.CARD_LIBRARY[id].name)).size, 12, "12张新卡应使用12个独立名称");
assert.equal(new Set(CF.NEW_CARD_IDS.map(id => CF.CARD_LIBRARY[id].image)).size, 12, "12张新卡应使用12张独立立绘");

const wolf4 = CF.getCard("forest_wolf", { level: 4 });
assert.deepEqual([wolf4.attack, wolf4.health, wolf4.level], [6, 5, 4], "forest wolf level 4 should scale stats");
const wolf5 = CF.getCard("forest_wolf", { level: 5 });
assert.deepEqual([wolf5.attack, wolf5.health, wolf5.level], [7, 6, 5], "forest wolf level 5 should scale stats");
const wolf3 = CF.getCard("forest_wolf", { level: 3 });
assert.deepEqual([wolf3.cost, wolf3.attack, wolf3.health], [2, 5, 4], "森林狼Lv3数值");
assert.equal(CF.getCard("fire_flask", { level: 3 }).value, 5, "火焰瓶Lv3应造成5点伤害");
assert.equal(CF.getCard("recruit", { level: 1 }).combatStyle, "melee", "普通单位应归类为近战");
assert.equal(CF.getCard("ranger", { level: 1 }).combatStyle, "ranged", "远程关键词单位应归类为远程");
assert.equal(CF.getCard("royal_medic", { level: 1 }).role, "healer", "治疗随从应具备治疗角色");
assert.equal(CF.getCard("royal_medic", { level: 1 }).combatStyle, "support", "治疗随从不应归类为近战或远程");

assert.equal(CF.Rules.isLaneOpen(board, 0), true, "空路线应突破");
board.front[0] = { name: "盾卫" };
board.back[0] = { name: "弓手" };
assert.equal(CF.Rules.canTargetBack(board, 0, []), false, "前排存活时普通攻击不能选后排");
assert.equal(CF.Rules.canTargetBack(board, 0, ["狙击"]), true, "狙击可以无视前排");
board.front[0] = null;
assert.equal(CF.Rules.canTargetBack(board, 0, []), true, "前排清空后可攻击后排");
assert.equal(CF.Rules.isLaneOpen(board, 0), false, "后排仍在时路线未突破");
board.back[0] = null;
assert.equal(CF.Rules.isLaneOpen(board, 0), true, "前后排都清空才突破");

const sealed = CF.emptyBoard();
for (let i = 0; i < 4; i += 1) sealed.back[i] = { name: `守线${i}` };
assert.equal(CF.Rules.canAttackHero(sealed), false, "四路均有单位时不能攻击英雄");
sealed.back[2] = null;
assert.equal(CF.Rules.canAttackHero(sealed), true, "任一路线清空后可以攻击英雄");

CF.SaveSystem.load();
const arenaRun = CF.Arena.start();
assert.equal(arenaRun.path.length, 6, "玩家夺冠需要连续赢得6轮比赛");
assert.equal(arenaRun.bracket.rounds.length, 6, "竞技场应生成从64强到决赛的六轮赛程");
assert.equal(arenaRun.bracket.rounds.map(round => round.length).join(","), "32,16,8,4,2,1", "六轮应包含完整的63场单败淘汰赛");
assert.equal(arenaRun.bracket.rounds.flat().length, 63, "64名选手的赛程图应包含63场比赛");
assert.equal(arenaRun.bracket.rounds[0].flatMap(match => match.entrants).length, 64, "首轮应展示全部64名参赛者");
const preferredFinalist = CF.Arena.heroes.find(hero => hero.id === arenaRun.featuredFinalistId);
assert.ok(preferredFinalist && !CF.SaveSystem.data.hero.skillProgress[preferredFinalist.skill.id]?.unlocked, "新赛程应优先选择携带未拥有技能的决赛候选人");
const arenaOpponent = CF.Arena.opponent();
assert.equal(arenaOpponent.deck.join(","), CF.SaveSystem.data.deck.join(","), "竞技场对手应使用与玩家相同的卡组");
assert.ok(Object.values(arenaOpponent.cardProgress).every(progress => progress.level >= 1 && progress.level <= 5), "竞技场对手卡牌等级应在1到5级之间随机");
assert.ok(arenaOpponent.dialogue?.intro && arenaOpponent.dialogue?.defeat, "当前竞技场对手的对白应接入战斗配置");
const arenaDialogueBattle = new CF.Battle(arenaOpponent, {});
assert.equal(arenaDialogueBattle.state.bossDialogueNotice?.text, arenaOpponent.dialogue.intro, "竞技场开战时应在对手头像下方显示赛前对白");
assert.match(arenaDialogueBattle.bossDialogueHTML(), /boss-dialogue-frame/, "竞技场对白应沿用头像下方的Boss对白框");
const coinsBeforeArenaWin = CF.SaveSystem.data.coins;
const firstArenaWin = CF.Arena.win();
assert.equal(`${firstArenaWin.reward},${firstArenaWin.advance},${firstArenaWin.champion}`, "100,32强,false", "赢得首轮应晋级32强并获得100金币");
assert.equal(CF.SaveSystem.data.coins, coinsBeforeArenaWin + 100, "竞技场奖金应立即加入金币余额");
assert.equal(CF.SaveSystem.data.hero.skillProgress.slash.xp, 2, "竞技场每胜一场应给当前装备技能增加2点经验");
for (let round = 1; round < 5; round += 1) {
  CF.Arena.ensureMatch();
  CF.Arena.win();
}
const finalHeroId = CF.Arena.ensureMatch().heroId;
const finalSkillId = CF.Arena.heroes.find(hero => hero.id === finalHeroId).skill.id;
assert.equal(finalHeroId, arenaRun.featuredFinalistId, "玩家打入决赛时应匹配预选的未收集技能参赛者");
const championship = CF.Arena.win();
assert.equal(championship.champion, true, "赢得决赛后应成为竞技场冠军");
assert.equal(championship.unlockedSkill.id, finalSkillId, "冠军应获得决赛对手即亚军的英雄技能");
assert.equal(CF.SaveSystem.data.hero.skillProgress[finalSkillId].unlocked, true, "亚军英雄技能应永久加入收藏");
assert.equal(arenaRun.bracket.rounds[5][0].winner, 0, "夺冠后决赛应明确标记护卫队长获胜");
assert.equal(arenaRun.bracket.rounds.flat().filter(match => match.status === "complete").length, 63, "夺冠时赛程图中的63场比赛都应拥有赛果");
CF.SaveSystem.data.hero.skillProgress.slash = { level: 1, xp: 0, unlocked: true };
CF.SaveSystem.addHeroSkillXp(3, "slash");
assert.deepEqual([CF.SaveSystem.data.hero.skillProgress.slash.level, CF.SaveSystem.data.hero.skillProgress.slash.xp], [2, 0], "斩击累计3经验应升至Lv2");
CF.SaveSystem.addHeroSkillXp(6, "slash");
assert.deepEqual([CF.SaveSystem.data.hero.skillProgress.slash.level, CF.SaveSystem.data.hero.skillProgress.slash.xp], [3, 0], "英雄技能累计成长后应在Lv3封顶");
assert.equal(CF.SaveSystem.addHeroSkillXp(1, "slash").amount, 0, "满级英雄技能不应继续累积经验");
const losingArenaRun = CF.Arena.start();
CF.Arena.ensureMatch();
CF.Arena.lose();
assert.equal(losingArenaRun.lost, true, "玩家落败后本届竞技场应结束");
assert.notEqual(losingArenaRun.championId, 0, "玩家落败后应由另一名选手获得冠军");
assert.equal(losingArenaRun.bracket.rounds.flat().filter(match => match.status === "complete").length, 63, "玩家落败后也应模拟完成剩余赛程并显示冠军");
CF.SaveSystem.reset();
CF.SaveSystem.data.arena = null;
assert.equal(CF.SaveSystem.data.deck.length, 24, "首次打开自动建立24张牌存档");
assert.equal(CF.SaveSystem.levelCap(), 5, "第一关通关前英雄等级上限应为5级");
assert.equal(CF.HERO_LEVELS[10].maxHealth, 39, "英雄升级应固定每级增加1点最大生命值");
const levelOneMaxHealth = CF.SaveSystem.data.hero.maxHealth;
CF.SaveSystem.addHeroXp(140);
assert.equal(CF.SaveSystem.data.hero.level, 5, "第一关英雄应能成长到5级");
assert.equal(CF.SaveSystem.data.hero.maxHealth, levelOneMaxHealth + 4, "连续提升4级应只增加4点最大生命值");
CF.SaveSystem.addCardXp("forest_wolf", 3);
assert.equal(CF.SaveSystem.data.cardProgress.forest_wolf.level, 2, "3经验应使卡牌升至Lv2");
const persisted = storage.get("rift-expedition-save-v1");
assert.ok(persisted.includes('"forest_wolf":{"level":2'), "升级结果应写入localStorage");

CF.SaveSystem.addCardXp("forest_wolf", 6);
CF.SaveSystem.addCardXp("forest_wolf", 9);
CF.SaveSystem.addCardXp("forest_wolf", 12);
assert.equal(CF.SaveSystem.data.cardProgress.forest_wolf.level, 5, "card should grow to level 5");
const run = CF.Adventure.start();
assert.equal(run.stage, 0);
assert.equal(CF.Adventure.rewards, undefined, "旧的三选一奖励函数应彻底删除");
{
  const roster = CF.Adventure.prisonRoster();
  assert.equal(roster.length, 83, "营地监狱应收押第二至第五关各19名、第一关7名觉醒者");
  assert.ok(roster.every(prisoner => prisoner.type !== "boss"), "各关最终首领（战死的狼王与被救走的首领）不应被收押");
  assert.equal(roster.filter(prisoner => prisoner.chapter === 1).length, 7, "第一关应有7名在押者");
  assert.ok(roster.every(prisoner => prisoner.portrait), "每名在押者都应有头像");
  const savedPrisoners = { ...CF.SaveSystem.data.prisoners };
  const savedRun = CF.SaveSystem.data.run;
  CF.SaveSystem.data.prisoners = {};
  run.activeNode = 1;
  CF.Adventure.finishNode("normal");
  assert.equal(CF.SaveSystem.data.prisoners["1-1"], true, "击败战斗节点后应把觉醒者押回营地监狱");
  run.completed = run.completed.filter(entry => entry.stage !== 1);
  run.stage = run.completed.length;
  assert.equal(CF.Adventure.prisonRoster().find(prisoner => prisoner.key === "1-1").captured, true, "重开章节后已押回的觉醒者不应被释放");
  CF.SaveSystem.data.prisoners = savedPrisoners;
  CF.SaveSystem.data.run = savedRun;
}
{
  // 金杯餐馆与在押首领好感度：第二关起的首领卡牌需结缘后才能出战，继续投喂可升级好感、强化卡牌。
  const R = CF.Restaurant;
  // 每名首领每天只能投喂一次：测试好感成长时先把时间推进到下一天。
  const feedNextDay = (key, foodId) => { CF.GameClock.advance(CF.GameClock.DAY_MS); return R.feed(key, foodId); };
  const data = CF.SaveSystem.data;
  const saved = { coins: data.coins, rations: data.rations, clock: { ...data.clock }, fedDay: { ...data.fedDay }, labor: { ...data.labor }, laborDay: { ...data.laborDay }, nightEvent: data.nightEvent, nightRolled: data.nightRolled, foods: { ...data.foods }, affinity: { ...data.affinity }, prisoners: { ...data.prisoners }, deck: [...data.deck], collection: { ...data.collection } };
  const goblinCard = CF.CHAPTER_TWO_REWARD_CARD_IDS[0];
  const queenCard = CF.CHAPTER_TWO_REWARD_CARD_IDS[19];
  const owners = CF.Adventure.bondCardOwners();
  assert.equal(`${R.bondOwner(goblinCard).key}·${R.bondOwner(goblinCard).name}`, "2-0·泥牙斥候长", "第二关首领奖励卡应对应监狱里的同一名首领");
  assert.equal(Object.keys(owners).length, 80, "第二至第五关各19张首领卡与4张最终首领卡都需要结缘");
  assert.equal(R.bondOwner(queenCard).boss, true, "最终首领卡应对应本关全部在押首领");
  assert.equal(R.bondOwner(queenCard).members.length, 19, "最终首领卡应关联本关19名在押首领");
  assert.equal(R.isCardBondLocked(CF.STARTER_DECK[0]), false, "基础卡牌不受好感度限制");
  data.affinity = {}; data.foods = {}; data.coins = 100;
  data.prisoners = { "2-0": true };
  data.collection[goblinCard] = 1;
  assert.equal(R.isCardBondLocked(goblinCard), true, "未结缘时第二关首领卡牌应被锁定");
  assert.equal(R.isCardBondLocked(queenCard), true, "本关在押首领未全部结缘时，最终首领卡应被锁定");
  data.deck = [...saved.deck.filter(id => id !== goblinCard), goblinCard];
  assert.ok(!CF.SaveSystem.availableDeck().includes(goblinCard), "未结缘的卡牌即使在卡组中也不能出战");
  assert.equal(R.buyFood("charred_skewer").ok, true, "金币足够时应能买到食物");
  assert.equal(data.coins, 70, "购买食物应扣除金币");
  assert.equal(R.foodCount("charred_skewer"), 1, "买到的食物应放进背包");
  assert.equal(R.buyFood("harvest_feast").ok, false, "金币不足时不能购买");
  const fed = feedNextDay("2-0", "charred_skewer");
  assert.equal(fed.ok, true, "应能投喂在押首领");
  assert.equal(fed.gained, 30, "哥布林最爱的炭烤肉串应使好感翻倍");
  assert.equal(R.foodCount("charred_skewer"), 0, "投喂会消耗食物");
  assert.equal(feedNextDay("2-0", "charred_skewer").ok, false, "没有食物时不能投喂");
  assert.equal(feedNextDay("2-1", "wheat_bread").ok, false, "未押回监狱的首领无法探望");
  data.foods = { harvest_feast: 20 };
  assert.equal(feedNextDay("2-0", "harvest_feast").to, 90, "普通食物按原值增加好感");
  const bonded = feedNextDay("2-0", "harvest_feast");
  assert.equal(bonded.bonded, true, "好感度达到100时应结缘");
  assert.equal(R.cardBondLevel(goblinCard), 1, "结缘为好感Lv1");
  assert.equal(R.isCardBondLocked(goblinCard), false, "结缘后卡牌应解锁");
  assert.ok(CF.SaveSystem.availableDeck().includes(goblinCard), "结缘后卡牌可以出战");
  const baseUnit = CF.getCard(goblinCard, data.cardProgress[goblinCard]);
  assert.equal(R.cardBondBonus(goblinCard), 0, "刚结缘只是解锁，没有属性加成");
  while (R.bondLevel("2-0") < 3) feedNextDay("2-0", "harvest_feast");
  assert.equal(R.cardBondBonus(goblinCard), 2, "好感Lv3比结缘高两级");
  const boosted = CF.getCard(goblinCard, data.cardProgress[goblinCard], R.cardBondBonus(goblinCard));
  assert.equal(boosted.attack, baseUnit.attack + 2, "随从每高一级好感+1攻击");
  assert.equal(boosted.health, baseUnit.health + 20, "随从每高一级好感+10生命");
  const deck = CF.makeDeck([goblinCard], data.cardProgress, id => R.cardBondBonus(id));
  assert.equal(deck[0].health, baseUnit.health + 20, "出战卡组应带上好感加成");
  const spellId = CF.CHAPTER_TWO_SPELL_CARD_IDS.find(id => ["damage", "row_blast", "enemy_aoe", "poison"].includes(CF.CARD_LIBRARY[id].effect)) || CF.CHAPTER_TWO_SPELL_CARD_IDS[0];
  const spellBase = CF.getCard(spellId, { level: 1 });
  const spellBoosted = CF.getCard(spellId, { level: 1 }, 1);
  assert.ok(Object.keys(CF.valuesFor(CF.CARD_LIBRARY[spellId], 1)).some(key => spellBoosted[key] > spellBase[key]), "法术牌好感加成应提升伤害或效果");
  assert.equal(CF.getCard(goblinCard, { level: 1 }).attack, baseUnit.attack, "敌方同名卡牌不受玩家好感加成影响");
  while (feedNextDay("2-0", "harvest_feast").ok) {}
  assert.equal(R.affinity("2-0"), R.MAX_AFFINITY, "好感度应封顶于最高等级");
  assert.equal(R.bondLevel("2-0"), R.MAX_BOND_LEVEL, "好感最高5级");
  // 最终首领卡：全部在押首领结缘才解锁，等级取最低的一位。
  const members = R.bondOwner(queenCard).members;
  members.forEach(key => { data.affinity[key] = 100; });
  data.affinity[members[1]] = 99;
  assert.equal(R.isCardBondLocked(queenCard), true, "任一在押首领未结缘，最终首领卡仍锁定");
  data.affinity[members[1]] = 100;
  assert.equal(R.cardBondLevel(queenCard), 1, "全部结缘后最终首领卡解锁");
  members.forEach(key => { data.affinity[key] = 300; });
  data.affinity[members[5]] = 250;
  assert.equal(R.cardBondLevel(queenCard), 2, "最终首领卡等级取本关在押首领的最低好感等级");
  data.prisoners[members[5]] = true; data.foods = { harvest_feast: 1 };
  const bossUp = feedNextDay(members[5], "harvest_feast");
  assert.equal(bossUp.bossCard?.to, 3, "最后一名在押首领升级时，最终首领卡同步升级");
  // 队伍粮食：每场战斗按出战随从数 + 在押犯人数消耗，面粉2金币一袋补充。
  data.prisoners = { "2-0": true, "2-1": true, "3-0": true };
  const upkeep = R.upkeep();
  const unitCount = CF.SaveSystem.availableDeck().filter(id => CF.CARD_LIBRARY[id].type === "unit").length;
  assert.equal(upkeep.units, unitCount, "粮食消耗应计入能出战的随从牌");
  assert.ok(upkeep.prisoners >= 3, "粮食消耗应计入在押犯人");
  assert.equal(upkeep.total, upkeep.units + upkeep.prisoners, "每场消耗 = 随从 + 犯人");
  assert.equal(R.FLOUR.price, 2, "面粉应是2金币的便宜基础口粮");
  data.coins = 10; data.rations = 0;
  assert.equal(R.buyFlour(5).ok, true, "金币足够时应能买面粉");
  assert.equal(data.coins, 0, "买面粉应扣金币");
  assert.equal(R.rations(), 5 * R.FLOUR.rations, "面粉应转换为粮食");
  assert.equal(R.buyFlour(1).ok, false, "金币不足时不能买面粉");
  data.rations = upkeep.total + 4;
  const fedBattle = R.consumeForBattle();
  assert.equal(fedBattle.hungry, false, "粮食充足时不会挨饿");
  assert.equal(R.rations(), 4, "开战应扣除本场粮食");
  const hungryBattle = R.consumeForBattle();
  assert.equal(hungryBattle.hungry, true, "粮食不够时队伍挨饿");
  assert.equal(R.rations(), 0, "挨饿时剩余粮食全部吃光");
  assert.deepEqual(JSON.parse(JSON.stringify(R.flourFor(12))), { bags: 3, cost: 6 }, "补足12份粮食需要3袋面粉、6金币");
  assert.match(gameJs, /side === "player" && this\.state\.hungry\) unit\.attack = Math\.max\(0, unit\.attack - 1\)/, "饿着肚子出战时我方随从攻击-1");
  assert.match(mainSource, /withRations\(isHungry => this\.enterNode/, "冒险战斗节点开战前应检查粮食");
  assert.match(mainSource, /withRations\(isHungry => this\.startArenaBattle/, "竞技场开战前应检查粮食");
  assert.match(mainSource, /rationChip\(\)/, "顶栏应显示粮食");
  // 游戏时间：24分钟一天；每只首领每天只能投喂一次；每天扣除三场战斗的口粮。
  const G = CF.GameClock;
  assert.equal(G.DAY_MS, 24 * 60 * 1000, "现实24分钟为游戏里的一天");
  data.clock = { day: 1, elapsed: 0 };
  data.prisoners = { "2-0": true, "2-1": true }; data.affinity = { "2-1": 0 }; data.fedDay = {};
  data.foods = { wheat_bread: 5 };
  assert.equal(R.feed("2-1", "wheat_bread").ok, true, "新的一天可以投喂");
  const again = R.feed("2-1", "wheat_bread");
  assert.equal(again.ok, false, "同一天不能再次投喂同一只首领");
  assert.equal(R.affinity("2-1"), 6, "同一天重复投喂不会增加好感");
  assert.equal(R.foodCount("wheat_bread"), 4, "被拒绝的投喂不消耗食物");
  data.affinity["2-0"] = 0;
  assert.equal(R.feed("2-0", "wheat_bread").ok, true, "每只首领的投喂次数各自独立");
  const dailyNeed = R.upkeep().total * G.DAILY_BATTLES;
  data.rations = dailyNeed + 7;
  assert.equal(G.tick(60 * 1000).length, 0, "未满一天不会结算");
  assert.equal(G.tick(10 * 60 * 1000).length, 0, "单次计时有上限，休眠或冻结不会一下跳过一天");
  const reports = G.advance(G.DAY_MS);
  assert.equal(reports.length, 1, "满24分钟进入新的一天");
  assert.equal(G.day(), 2, "天数应加一");
  assert.equal(R.rations(), 7, "新的一天扣除三场战斗的口粮");
  assert.equal(R.feed("2-1", "wheat_bread").ok, true, "新的一天可以再次投喂");
  data.rations = 1;
  const hungryDay = G.advance(G.DAY_MS)[0];
  assert.equal(hungryDay.hungry, true, "口粮不够时当天挨饿");
  assert.equal(R.rations(), 0, "口粮不够时库存吃光");
  // 赤龙客栈：30金币睡一晚，直接进入第二天，照常结算一天的口粮。
  data.clock = { day: 5, elapsed: 60 * 1000 };
  data.rations = dailyNeed + 3; data.coins = 40; data.fedDay = { "2-1": 5 };
  const slept = G.sleepAtInn();
  assert.equal(slept.ok, true, "金币足够时可以在客栈住一晚");
  assert.equal(data.coins, 10, "住一晚花费30金币");
  assert.equal(G.day(), 6, "睡一晚直接进入第二天");
  assert.equal(G.progress(), 0, "醒来是新一天的开始");
  assert.equal(R.rations(), 3, "睡一晚照常扣除一天的口粮");
  assert.equal(R.fedToday("2-1"), false, "睡一晚后在押首领又可以投喂");
  assert.equal(G.sleepAtInn().ok, false, "金币不足时不能住店");
  assert.equal(G.day(), 6, "住不起店时时间不变");
  assert.match(mainSource, /action: "open-inn"/, "城镇商店应开放赤龙客栈");
  // 犯人派遣劳动：结缘首领每天干一次活，6小时后回营交出收获。
  const L = CF.Labor;
  data.clock = { day: 1, elapsed: 0 }; data.labor = {}; data.laborDay = {}; data.fedDay = {};
  data.prisoners = { "2-0": true, "3-0": true, "4-0": true, "5-0": true, "2-1": true };
  data.affinity = { "2-0": 100, "3-0": 300, "4-0": 500, "5-0": 300, "2-1": 50 };
  data.coins = 0; data.rations = 0; data.foods = {};
  assert.equal(L.dispatch("2-1").ok, false, "未结缘的首领不肯干活");
  assert.equal(L.idleCount(), 4, "已结缘且在牢里的首领可以派遣");
  assert.equal(L.dispatchAll().length, 4, "一键派遣全部空闲首领");
  assert.equal(L.dispatch("2-0").ok, false, "在外干活的首领不能重复派遣");
  data.foods = { wheat_bread: 1 };
  assert.equal(R.feed("2-0", "wheat_bread").ok, false, "干活期间不能投喂");
  G.advance(G.DAY_MS * L.JOB_HOURS / 24 - 1000);
  assert.equal(L.collectReturned().length, 0, "未满6小时不会回营");
  G.advance(1000);
  const back = L.collectReturned();
  assert.equal(back.length, 4, "满6小时全部回营");
  assert.equal(data.coins, 10, "哥布林结缘Lv1下矿带回10金币");
  assert.equal(R.rations(), 16 + 6, "熊族Lv3种田16份粮食 + 狼族Lv3打猎6份粮食");
  assert.equal(R.foodCount("bone_roast"), 2, "狼族Lv3打猎带回2份带骨肉");
  assert.equal(back.find(item => item.key === "4-0").reward.cardXp, 5, "史莱姆誓约Lv5熬药给卡牌5点经验");
  assert.equal(L.dispatch("2-0").ok, false, "同一天不能再次派遣");
  G.advance(G.DAY_MS);
  assert.equal(L.dispatch("2-0").ok, true, "新的一天可以再派遣");
  assert.ok(indexSource.indexOf("js/labor.js") > indexSource.indexOf("js/clock.js"), "游戏入口应加载派遣劳动模块");
  // 好感剧情：每名可结缘首领都有个人往事，每族5章族群往事按好感等级总和解锁。
  const S = CF.BondStories;
  const bondable = CF.Adventure.prisonRoster().filter(prisoner => prisoner.cardId);
  assert.equal(bondable.length, 76, "第二至第五关共76名可结缘首领");
  bondable.forEach(prisoner => assert.ok(S.personal(prisoner.name).length >= 40, `${prisoner.name}应有自己的个人往事`));
  assert.equal(Object.keys(CF.BOND_PERSONAL_STORIES).length, 76, "个人往事不应多出无主条目");
  [2, 3, 4, 5].forEach(chapter => {
    assert.equal(S.RACE_CHAPTERS[chapter].chapters.length, 5, `第${chapter}关族群往事应有5章`);
    [1, 2, 3, 4, 5].forEach(level => assert.ok(S.voice(chapter, level), `第${chapter}关Lv${level}应有心声`));
  });
  data.affinity = {}; data.prisoners = {};
  assert.equal(S.unlockedChapters(3), 0, "没有结缘时族群往事全部锁定");
  data.prisoners["3-0"] = true; data.affinity["3-0"] = 100;
  assert.equal(S.unlockedChapters(3), 1, "结缘一名首领即解锁第一章");
  assert.equal(S.personalUnlocked("3-0"), false, "结缘Lv1时个人往事仍锁定");
  data.affinity["3-0"] = 300;
  assert.equal(S.personalUnlocked("3-0"), true, "挚友Lv3解锁个人往事");
  CF.Adventure.prisonRoster().filter(prisoner => prisoner.chapter === 3).forEach(prisoner => { data.prisoners[prisoner.key] = true; data.affinity[prisoner.key] = 500; });
  assert.equal(S.chapterBondTotal(3), 95, "19名首领全部誓约Lv5时好感等级总和为95");
  assert.equal(S.unlockedChapters(3), 5, "全部誓约后解锁族群往事最终章");
  assert.ok(indexSource.indexOf("js/bond-stories.js") > indexSource.indexOf("js/restaurant.js"), "游戏入口应加载好感剧情");
  // 夜晚事件：22:00入夜后每晚最多一件，客栈过夜可跳过。
  const N = CF.NightEvents;
  data.clock = { day: 3, elapsed: 0 }; data.nightEvent = null; data.nightRolled = 0;
  data.prisoners = { "2-0": true, "2-1": true, "5-0": true }; data.affinity = { "2-0": 350, "2-1": 10, "5-0": 150 };
  data.rations = 50; data.coins = 100;
  assert.equal(N.check(), null, "白天不会发生夜晚事件");
  data.clock.elapsed = G.DAY_MS * 16 / 24;
  assert.equal(N.isNight(), true, "22:00入夜");
  const tonight = N.check();
  assert.ok(tonight && N.EVENTS[tonight.id], "入夜后抽取一件事件");
  assert.equal(N.check(), null, "同一晚不会再抽第二件");
  assert.ok(N.view().choices.length >= 1, "事件应有可选的处理方式");
  data.nightEvent = null;
  assert.equal(N.check(), null, "处理完后当晚也不会再发生");
  data.clock = { day: 4, elapsed: G.DAY_MS * 17 / 24 }; data.rations = 0;
  assert.equal(N.check().id, "riot", "粮食吃光的夜里必定闹事");
  assert.equal(N.resolve(N.view().choices.length - 1).ok, true, "可以选择让它们饿着");
  assert.equal(R.affinity("2-0"), 340, "饿着会让在押首领好感-10");
  assert.equal(R.affinity("2-1"), 0, "好感不会跌到0以下");
  data.affinity["5-0"] = 105; N.EVENTS.riot.view().choices[1].apply();
  assert.equal(R.affinity("5-0"), 100, "已结缘的首领不会因闹事跌回未结缘");
  assert.equal(N.pending(), null, "处理后事件清空");
  data.rations = 50;
  data.nightEvent = { id: "escape", day: 4, params: { key: "2-1" } };
  N.resolve(1);
  assert.equal(R.affinity("2-1"), 8, "和逃跑的首领谈谈：好感+8");
  assert.equal(R.rations(), 45, "典狱长哄它睡觉用掉5份粮食");
  data.nightEvent = { id: "gift", day: 4, params: { key: "2-0" } };
  const coinsBeforeGift = data.coins; N.resolve(0);
  assert.equal(data.coins, coinsBeforeGift + 20, "哥布林的深夜礼物是20金币");
  data.nightEvent = { id: "rats", day: 4, params: {} };
  N.resolve(0);
  assert.equal(R.rations(), 45, "买捕鼠夹后粮食不受损失");
  data.clock = { day: 7, elapsed: G.DAY_MS * 20 / 24 }; data.nightRolled = 0; data.nightEvent = null; data.affinity["5-0"] = 150;
  assert.equal(N.check().id, "fullmoon", "每7天的满月之夜，狼族首领对月长嗥");
  N.resolve(0);
  assert.equal(R.affinity("5-0"), 155, "陪狼族看月亮：好感+5");
  data.clock = { day: 8, elapsed: G.DAY_MS / 2 }; data.nightRolled = 0; data.nightEvent = null; data.coins = 100;
  G.sleepAtInn();
  assert.equal(data.nightRolled, 8, "在客栈过夜会跳过当晚事件");
  assert.equal(N.pending(), null, "客栈过夜不留下待处理事件");
  assert.ok(indexSource.indexOf("js/night-events.js") > indexSource.indexOf("js/labor.js"), "游戏入口应加载夜晚事件");
  assert.ok(indexSource.indexOf("js/clock.js") > indexSource.indexOf("js/restaurant.js"), "游戏入口应加载时间系统");
  assert.match(mainSource, /clockChip\(\)/, "顶栏应显示游戏时间");
  Object.assign(data, saved);
}
assert.match(mainSource, /data-action="open-restaurant"|action: "open-restaurant"/, "城镇商店应开放金杯餐馆");
assert.ok(indexSource.indexOf("js/restaurant.js") > indexSource.indexOf("js/adventure.js"), "游戏入口应在冒险模块之后加载餐馆模块");
assert.ok(fs.existsSync(path.join(root, "assets/ui/prison-hall.webp")) && fs.existsSync(path.join(root, "assets/ui/prison-warden.webp")), "营地监狱场景图与典狱长立绘应位于项目资源目录");
assert.match(mainSource, /camp-warden[\s\S]*data-action="prison-page"/, "点击队伍营地门口的典狱长应进入营地监狱");
assert.match(mainSource, /prison-screen" style="background-image: url\('\$\{PRISON_ART\}'\)"[\s\S]*prison-roster/, "营地监狱应以监狱场景图为整页背景，直接列出在押者头像");
assert.equal(CF.Adventure.generateVictoryLoot(4).gearCount, 4, "战斗胜利的粗糙武器/盔甲数量应等于击杀的敌方随从数");
assert.equal(CF.Adventure.generateVictoryLoot(0).gearCount, 0, "未击杀随从时不应获得粗糙武器/盔甲");
const priorNotes = CF.SaveSystem.data.notesUnlocked;
const priorWater = CF.SaveSystem.data.inventory.queenEssenceBlood || 0;
const priorWeapons = CF.SaveSystem.data.inventory.weaponT1 || 0;
const priorArmors = CF.SaveSystem.data.inventory.armorT1 || 0;
const loot = CF.Adventure.claimVictoryLoot(5);
assert.equal(loot.gearCount, 5, "翻牌第二张应按击杀数发放白装");
assert.equal(CF.SaveSystem.data.inventory.weaponT1, priorWeapons + 5, "击杀5个随从应获得5件粗糙武器");
assert.equal(CF.SaveSystem.data.inventory.armorT1, priorArmors + 5, "击杀5个随从应获得5件粗糙盔甲");
assert.match(mainSource, /claimVictoryLoot\(battle\.state\.enemyUnitsKilled\)/, "胜利结算应把本场击杀数传给战利品翻牌");
assert.equal(CF.SaveSystem.data.inventory.queenEssenceBlood, priorWater + 1, "每场战斗胜利（不限普通/精英/Boss）都应获得1瓶女王精血");
{
  const savedTrials = CF.SaveSystem.data.commanderTrials;
  const savedMaxHealth = CF.SaveSystem.data.hero.maxHealth;
  const bloodBefore = CF.SaveSystem.data.inventory.queenEssenceBlood;
  CF.SaveSystem.data.commanderTrials = { completed: [1, 2, 3, 4, 5, 6] };
  assert.equal(CF.SaveSystem.queenBloodAwakened(), false, "未通关试炼第七关时不应得到女王认可");
  assert.equal(CF.SaveSystem.useQueenEssenceBlood(), false, "未通关试炼第七关时不能使用女王精血");
  assert.equal(CF.SaveSystem.data.inventory.queenEssenceBlood, bloodBefore, "被拒绝使用时不应消耗女王精血");
  assert.equal(CF.SaveSystem.data.hero.maxHealth, savedMaxHealth, "被拒绝使用时不应增加最大生命");
  CF.SaveSystem.data.commanderTrials = { completed: [1, 2, 3, 4, 5, 6, 7] };
  assert.equal(CF.SaveSystem.useQueenEssenceBlood(), true, "通关试炼第七关、得到女王认可后才能使用女王精血");
  assert.equal(CF.SaveSystem.data.hero.maxHealth, savedMaxHealth + 1, "使用女王精血应永久+1最大生命");
  CF.SaveSystem.data.commanderTrials = savedTrials;
  CF.SaveSystem.data.hero.maxHealth = savedMaxHealth;
  CF.SaveSystem.data.inventory.queenEssenceBlood = bloodBefore;
}
assert.match(mainSource, /data-action="use-queen-blood" \$\{waterCount && bloodAwakened/, "背包中的女王精血按钮应在得到女王认可前禁用");
assert.equal(CF.SaveSystem.data.notesUnlocked, priorNotes + 1, "笔记残页应按顺序解锁");
assert.ok(loot.note && typeof loot.note.text === "string", "尚未收集满的残页应携带文案");
assert.equal(CF.LORE_BOOK_TITLE, "《源血纪元》", "笔记残页应收录世界观故事《源血纪元》");
assert.equal(CF.LORE_PAGES.length, 71, "《源血纪元》应切分为71页残页，一场胜利解锁一页");
assert.ok(CF.LORE_PAGES.every(page => page.text.length >= 50 && page.text.length <= 140), "每页残页篇幅应在约100字左右");
assert.equal(CF.LORE_PAGES[0].title, "序章·流淌在大陆血脉中的女王（一）", "第一页应从序章开始");
assert.match(CF.LORE_PAGES[CF.LORE_PAGES.length - 1].text, /新生者/, "最后一页应讲到妖兽自称新生者");
assert.ok(CF.LORE_PAGES.every(page => page.paragraphs.length && page.text === page.paragraphs.join("\n")), "每页残页应按段落保存故事全文");
assert.deepEqual(Array.from(loot.note.paragraphs), Array.from(CF.LORE_PAGES[priorNotes].paragraphs), "翻牌第三张应按顺序给出下一页故事");
assert.match(mainSource, /loot-note-reading[\s\S]*loot\.note\.paragraphs/, "翻开第三张战利品牌后应能阅读本页故事全文");
assert.match(mainSource, /claimActiveWeaponReward\(\)\s*\|\|\s*CF\.Adventure\.claimActiveChapterTwoCardReward\(\)\s*\|\|\s*CF\.Adventure\.claimActiveChapterThreeCardReward\(\)\s*\|\|\s*CF\.Adventure\.claimActiveChapterFourCardReward\(\)/, "每个章节原有的首杀固定卡牌奖励应继续发放");
assert.match(mainSource, /首杀固定奖励[\s\S]*cardPreview\(bossCardReward\.cardId\)/, "首杀卡牌应与战利品翻牌分开展示");
assert.match(mainSource, /continue-boss-loot[\s\S]*UI\.finishBoss/, "翻开三张战利品牌后，Boss战应可领取并进入通关总结");
assert.ok(CF.Adventure.shopStock().every(item => item.type !== "skill"), "冒险商店不应出售英雄技能经验或等级");
assert.deepEqual(Array.from(CF.Adventure.shopStock(), item => `${item.cardId}:${item.cost}`), ["eagle_eye:20", "iron_lancer:20", "royal_medic:20"], "第一关商店应以20金币出售三张指定随从牌");
assert.equal(CF.Adventure.mapStages().length, 13, "第一关应将事件和商店作为独立路线节点");
assert.equal(CF.Adventure.isNodeAvailable(0), true, "第一关起点应可挑战");
assert.equal(CF.Adventure.isNodeAvailable(1), false, "相邻节点在起点完成前应锁定");
assert.ok(CF.Adventure.chooseNode(0), "第一关起点应可选择");
CF.Adventure.finishNode("normal");
assert.equal(CF.Adventure.isNodeAvailable(1), true, "第一关完成起点后应解锁左侧分支");
assert.equal(CF.Adventure.isNodeAvailable(2), true, "第一关完成起点后应解锁右侧分支");
assert.ok(CF.Adventure.chooseNode(2), "第一关应允许选择右侧分支");
CF.Adventure.finishNode("event");
assert.equal(CF.Adventure.isNodeAvailable(1), true, "第一关完成一条分支后仍可回头挑战另一条相邻分支");
assert.equal(CF.Adventure.isNodeAvailable(3), true, "第一关完成分支后应继续解锁相邻节点");

CF.SaveSystem.data.completedRuns = 1;
const chapterTwoRun = CF.Adventure.start();
assert.equal(chapterTwoRun.chapter, 2, "首次通关后新冒险应进入第二关");
assert.equal(CF.Adventure.mapStages().length, 20, "第二关应有20个线性Boss节点");
assert.ok(CF.Adventure.mapStages().every(nodes => nodes.length === 1 && nodes[0].portrait), "第二关所有节点都应使用Boss头像");
assert.equal(CF.CHAPTER_TWO_UNIT_CARD_IDS.length, 10, "第二关应新增10张随从牌");
assert.equal(CF.CHAPTER_TWO_SPELL_CARD_IDS.length, 10, "第二关应新增10张法术牌");
assert.equal(CF.CHAPTER_TWO_UNIT_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第二关随从牌应覆盖1至10费");
assert.equal(CF.CHAPTER_TWO_SPELL_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第二关法术牌应覆盖1至10费");
assert.ok(CF.CHAPTER_TWO_UNIT_CARD_IDS.every(id => CF.CARD_LIBRARY[id].type === "unit"), "第二关随从奖励类型应正确");
assert.ok(CF.CHAPTER_TWO_SPELL_CARD_IDS.every(id => CF.CARD_LIBRARY[id].type === "spell"), "第二关法术奖励类型应正确");
assert.equal(new Set(CF.CHAPTER_TWO_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].name)).size, 20, "第二关20张牌应有独立名称");
assert.equal(new Set(CF.CHAPTER_TWO_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].image)).size, 20, "第二关20张牌应有独立立绘");
for (const id of CF.CHAPTER_TWO_REWARD_CARD_IDS) assert.ok(fs.existsSync(path.join(root, CF.CARD_LIBRARY[id].image)), `${id}的独立立绘应存在`);
assert.deepEqual(Array.from(CF.Adventure.mapStages(), nodes => nodes[0].rewardCardId), Array.from(CF.CHAPTER_TWO_REWARD_CARD_IDS), "第二关20个Boss应逐一对应20张固定探索奖励");
assert.doesNotMatch(mainSource, /rewardCardId|weapon-drop-marker/, "地图界面不应提前显示Boss掉落卡牌");
const chapterTwoNormal = CF.Adventure.encounterFor("normal");
assert.equal(chapterTwoNormal.mana, 6, "第二关普通Boss应拥有6颗法力水晶");
assert.equal(chapterTwoNormal.enemyCardLevel, 2, "第二关普通Boss随从应提升至2级");
assert.equal(CF.Adventure.isNodeAvailable(0), true, "chapter2 start node should be available");
assert.equal(CF.Adventure.isNodeAvailable(1), false, "adjacent node should remain locked before completion");
assert.equal(CF.Adventure.chooseNode(0).enemyId, "goblin_warband", "chapter2 start node should be selectable");
CF.Adventure.finishNode("normal");
assert.equal(CF.Adventure.isNodeAvailable(1), true, "right adjacent node should unlock after completion");
assert.equal(CF.Adventure.isNodeAvailable(13), true, "left adjacent node should unlock after completion");
assert.equal(CF.Adventure.isNodeAvailable(2), false, "non-adjacent node should remain locked");
for (let stage = 0; stage < 19; stage += 1) {
  chapterTwoRun.stage = stage;
  chapterTwoRun.chosen[stage] = 0;
  const stageNode = CF.Adventure.mapStages()[stage][0];
  const stageEnemy = CF.Adventure.encounterFor(stageNode.type);
  assert.equal(stageEnemy.mana, 6, `第二关第${stage + 1}个Boss应拥有6颗法力水晶`);
}
chapterTwoRun.stage = 4;
const chapterTwoElite = CF.Adventure.encounterFor("elite");
assert.equal(chapterTwoElite.mana, 6, "第二关精英Boss应拥有6颗法力水晶");
assert.equal(chapterTwoElite.enemyCardLevel, 3, "第二关精英Boss随从应提升至3级");
chapterTwoRun.stage = 19;
chapterTwoRun.chosen[19] = 0;
assert.equal(CF.Adventure.encounterFor("boss").id, "goblin_queen", "第二关最终节点应进入女哥布林Boss战");
assert.equal(CF.Adventure.encounterFor("boss").mana, 7, "第二关最终Boss应拥有7颗法力水晶");
assert.equal(CF.Adventure.encounterFor("boss").enemyCardLevel, 3, "最终Boss随从应提升至3级");
CF.SaveSystem.data.chapterTwoBossRewards = {};
chapterTwoRun.activeNode = 0;
const firstChapterTwoReward = CF.Adventure.claimActiveChapterTwoCardReward();
assert.equal(firstChapterTwoReward.cardId, "pebble_scout", "第二关第一个Boss应解锁1费石子斥候");
assert.equal(CF.SaveSystem.data.collection.pebble_scout, 1, "第二关Boss奖励应永久加入收藏");
assert.equal(CF.Adventure.claimActiveChapterTwoCardReward(), null, "同一第二关Boss奖励不可重复领取");
chapterTwoRun.activeNode = 10;
assert.equal(CF.Adventure.claimActiveChapterTwoCardReward().cardId, "flash_powder", "第二关第11个Boss应开始掉落1费法术闪光粉");
chapterTwoRun.activeNode = null;
assert.equal(CF.SaveSystem.levelCap(), 10, "第一关通关后英雄等级上限应解锁到10级");
CF.SaveSystem.data.hero.level = 5;
CF.SaveSystem.data.hero.xp = 140;
CF.SaveSystem.data.hero.maxMana = 6;
CF.SaveSystem.data.commanderTrials = { completed: [] };
const firstTrialMana = CF.SaveSystem.completeCommanderTrial(1);
assert.equal(`${firstTrialMana.firstClear},${CF.SaveSystem.data.hero.maxMana}`, "true,7", "统领试炼首次通关应永久增加1点法力");
assert.equal(CF.SaveSystem.completeCommanderTrial(1).firstClear, false, "重复通关同一试炼不应重复增加法力");
assert.equal(CF.SaveSystem.data.hero.maxMana, 7, "统领试炼法力奖励不应重复领取");
CF.SaveSystem.addHeroXp(480);
assert.equal(CF.SaveSystem.data.hero.level, 10, "第二关解锁后英雄应能成长到10级");
assert.equal(CF.SaveSystem.deckLimit(), 29, "英雄10级时应可携带29张牌");

CF.SaveSystem.data.completedRuns = 2;
const chapterThreeRun = CF.Adventure.start();
assert.equal(chapterThreeRun.chapter, 3, "完成第二关后新冒险应进入第三关");
assert.equal(CF.SaveSystem.levelCap(), 15, "完成第二关后英雄等级上限应解锁到15级");
assert.equal(CF.HERO_LEVELS[15].maxHealth, 44, "英雄成长表到15级仍应保持每级增加1点生命");
assert.equal(CF.Adventure.mapStages().length, 20, "第三关应包含20个Boss节点");
assert.ok(CF.Adventure.mapStages().every(nodes => nodes.length === 1 && nodes[0].portrait), "第三关所有Boss节点都应显示头像");
assert.equal(CF.CHAPTER_THREE_UNIT_CARD_IDS.length, 10, "第三关应新增10张熊主题随从牌");
assert.equal(CF.CHAPTER_THREE_SPELL_CARD_IDS.length, 10, "第三关应新增10张熊主题法术牌");
assert.equal(CF.CHAPTER_THREE_UNIT_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第三关随从牌应覆盖1至10费");
assert.equal(CF.CHAPTER_THREE_SPELL_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第三关法术牌应覆盖1至10费");
assert.equal(new Set(CF.CHAPTER_THREE_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].name)).size, 20, "第三关20张卡应拥有独立名称");
assert.equal(new Set(CF.CHAPTER_THREE_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].image)).size, 20, "第三关20张卡应拥有独立立绘");
for (const id of CF.CHAPTER_THREE_REWARD_CARD_IDS) assert.ok(fs.existsSync(path.join(root, CF.CARD_LIBRARY[id].image)), `${id}的熊主题立绘应存在`);
assert.deepEqual(Array.from(CF.Adventure.mapStages(), nodes => nodes[0].rewardCardId), Array.from(CF.CHAPTER_THREE_REWARD_CARD_IDS), "第三关20个Boss应逐一对应20张固定探索奖励");
const chapterThreeNormal = CF.Adventure.encounterFor("normal");
assert.equal(chapterThreeNormal.mana, 8, "第三关普通Boss应拥有8颗法力水晶");
assert.equal(chapterThreeNormal.enemyCardLevel, 3, "第三关普通Boss应使用3级熊族卡牌");
assert.equal(chapterThreeNormal.battlefield, "harvest_farm", "第三关Boss应进入农田战场");
chapterThreeRun.activeNode = 4;
const chapterThreeElite = CF.Adventure.encounterFor("elite");
assert.equal(chapterThreeElite.mana, 9, "第三关精英Boss应拥有9颗法力水晶");
assert.equal(chapterThreeElite.enemyCardLevel, 4, "第三关精英Boss应使用4级熊族卡牌");
chapterThreeRun.activeNode = 19;
assert.equal(CF.Adventure.encounterFor("boss").id, "bear_matriarch", "第三关最终节点应进入丰穗战母Boss战");
assert.equal(CF.Adventure.encounterFor("boss").mana, 10, "丰穗战母应拥有10颗法力水晶");
assert.equal(CF.Adventure.encounterFor("boss").health, 320, "丰穗战母应拥有320点生命");
CF.SaveSystem.data.chapterThreeBossRewards = {};
chapterThreeRun.activeNode = 0;
assert.equal(CF.Adventure.claimActiveChapterThreeCardReward().cardId, "wheat_cub", "第三关第一个Boss应掉落1费麦穗熊崽");
assert.equal(CF.Adventure.claimActiveChapterThreeCardReward(), null, "同一第三关Boss卡牌奖励不可重复领取");
chapterThreeRun.completed = [{ stage: 7, type: "normal" }];
assert.equal(CF.Adventure.farmNpcUnlocked(), true, "抵达相邻农田后应能与农民夫妇交谈");
assert.ok(CF.CHAPTER_THREE_NPC.dialogue.join("").includes("没有杀害") && CF.CHAPTER_THREE_NPC.dialogue.join("").includes("教熊男"), "农民夫妇应说明熊族未杀人且愿意学习种田");
CF.SaveSystem.data.hero.level = 15;
assert.equal(CF.SaveSystem.deckLimit(), 34, "英雄15级时应可携带34张牌");

CF.SaveSystem.data.completedRuns = 3;
const chapterFourRun = CF.Adventure.start();
assert.equal(chapterFourRun.chapter, 4, "完成第三关后新冒险应进入第四关");
assert.equal(CF.SaveSystem.levelCap(), 20, "完成第三关后英雄等级上限应解锁到20级");
assert.equal(CF.HERO_LEVELS[20].maxHealth, 49, "英雄成长表到20级仍应保持每级增加1点生命");
assert.equal(CF.Adventure.mapStages().length, 20, "第四关应包含20个史莱姆Boss节点");
assert.equal(CF.CHAPTER_FOUR_UNIT_CARD_IDS.length, 10, "第四关应新增10张史莱姆随从牌");
assert.equal(CF.CHAPTER_FOUR_SPELL_CARD_IDS.length, 10, "第四关应新增10张史莱姆法术牌");
assert.equal(CF.CHAPTER_FOUR_UNIT_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第四关随从牌应覆盖1至10费");
assert.equal(CF.CHAPTER_FOUR_SPELL_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第四关法术牌应覆盖1至10费");
assert.ok(CF.CHAPTER_FOUR_UNIT_CARD_IDS.every(id => CF.CARD_LIBRARY[id].attack <= 6 && CF.CARD_LIBRARY[id].health >= 3), "史莱姆随从应保持低攻击、高生命的共同特征");
assert.equal(new Set(CF.CHAPTER_FOUR_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].name)).size, 20, "第四关20张卡应拥有独立名称");
assert.equal(new Set(CF.CHAPTER_FOUR_REWARD_CARD_IDS.map(id => CF.CARD_LIBRARY[id].image)).size, 20, "第四关20张卡应拥有独立立绘");
for (const id of CF.CHAPTER_FOUR_REWARD_CARD_IDS) assert.ok(fs.existsSync(path.join(root, CF.CARD_LIBRARY[id].image)), `${id}的史莱姆主题立绘应存在`);
assert.deepEqual(Array.from(CF.Adventure.mapStages(), nodes => nodes[0].rewardCardId), Array.from(CF.CHAPTER_FOUR_REWARD_CARD_IDS), "第四关20个Boss应逐一对应20张固定探索奖励");
const chapterFourNormal = CF.Adventure.encounterFor("normal");
assert.equal(chapterFourNormal.mana, 9, "第四关普通Boss应拥有9颗法力水晶");
assert.equal(chapterFourNormal.enemyCardLevel, 4, "第四关普通Boss应使用4级史莱姆卡牌");
assert.equal(chapterFourNormal.passive, "slime_regeneration", "第四关普通Boss应具有胶质再生被动");
assert.equal(chapterFourNormal.battlefield, "dream_slime_forest", "第四关Boss应进入梦幻森林战场");
chapterFourRun.activeNode = 4;
const chapterFourElite = CF.Adventure.encounterFor("elite");
assert.equal(chapterFourElite.mana, 10, "第四关精英Boss应拥有10颗法力水晶");
assert.equal(chapterFourElite.enemyCardLevel, 5, "第四关精英Boss应使用5级史莱姆卡牌");
chapterFourRun.activeNode = 19;
const chapterFourBoss = CF.Adventure.encounterFor("boss");
assert.equal(chapterFourBoss.id, "slime_sage", "第四关最终节点应进入碧露大贤者Boss战");
assert.equal(chapterFourBoss.health, 480, "碧露大贤者应拥有480点生命");
assert.equal(chapterFourBoss.passive, "slime_sage", "碧露大贤者应拥有强化再生和分裂被动");
CF.SaveSystem.data.chapterFourBossRewards = {};
chapterFourRun.activeNode = 0;
assert.equal(CF.Adventure.claimActiveChapterFourCardReward().cardId, "dewdrop_scout", "第四关第一个Boss应掉落1费滴露幼胶");
assert.equal(CF.Adventure.claimActiveChapterFourCardReward(), null, "同一第四关Boss卡牌奖励不可重复领取");
CF.SaveSystem.data.hero.level = 20;
assert.equal(CF.SaveSystem.deckLimit(), 39, "英雄20级时应可携带39张牌");
CF.SaveSystem.data.completedRuns = 4;
const chapterFiveRun = CF.Adventure.start();
assert.equal(chapterFiveRun.chapter, 5, "完成第四关后新冒险应进入第五关");
assert.equal(CF.SaveSystem.levelCap(), 25, "完成第四关后英雄等级上限应解锁到25级");
assert.equal(CF.HERO_LEVELS[25].maxHealth, 54, "英雄成长表到25级仍应保持每级增加1点生命");
assert.equal(CF.CHAPTER_FIVE_UNIT_CARD_IDS.length, 10, "第五关应新增10张野兽随从牌");
assert.equal(CF.CHAPTER_FIVE_SPELL_CARD_IDS.length, 10, "第五关应新增10张野兽法术牌");
assert.equal(CF.CHAPTER_FIVE_UNIT_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第五关随从牌应覆盖1至10费");
assert.equal(CF.CHAPTER_FIVE_SPELL_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7,8,9,10", "第五关法术牌应覆盖1至10费");
for (const id of CF.CHAPTER_FIVE_REWARD_CARD_IDS) assert.ok(fs.existsSync(path.join(root, CF.CARD_LIBRARY[id].image)), `${id}的第五关独立立绘应存在`);
assert.ok(CF.CHAPTER_FIVE_UNIT_CARD_IDS.filter(id => CF.CARD_LIBRARY[id].keywords.includes("突袭")).length >= 6, "第五关随从应以快速突袭为核心");
chapterFiveRun.activeNode = 0;
const chapterFiveOpeningBoss = CF.Adventure.encounterFor("normal");
assert.equal(chapterFiveOpeningBoss.health, 300, "第五关第一个Boss应从300点生命起步");
assert.match(chapterFiveOpeningBoss.skills[0].description, /4攻\/1血.*突击灰狼/, "第五关所有Boss应显示4/1突击灰狼英雄技能");
chapterFiveRun.activeNode = 18;
const chapterFivePenultimateBoss = CF.Adventure.encounterFor("elite");
assert.ok(chapterFivePenultimateBoss.health >= 300 && chapterFivePenultimateBoss.health < 400, "第五关前19个Boss生命应在300至400点之间递增");
chapterFiveRun.activeNode = 19;
const chapterFiveBoss = CF.Adventure.encounterFor("boss");
assert.equal(chapterFiveBoss.id, "wolf_matriarch", "第五关最终节点应进入银灰狼女猎手Boss战");
assert.equal(chapterFiveBoss.health, 400, "第五关最终Boss应拥有400点生命");
assert.match(chapterFiveBoss.skills[0].description, /4攻\/1血.*突击灰狼/, "第五关最终Boss也应拥有灰狼增援英雄技能");
assert.equal(chapterFiveBoss.battlefield, "ancient_city_ruins", "第五关应使用古城废墟战场");
assert.match(gameJs, /summonGreyRushWolf\("灰狼增援"\)/, "第五关Boss回合应实际召唤突击灰狼");
assert.match(gameJs, /attack:\s*4,\s*health:\s*1,\s*maxHealth:\s*1/, "灰狼增援应生成4攻1血随从");
assert.match(gameJs, /ready:\s*true,\s*justSummoned:\s*true/, "增援灰狼应能突击随从但不能在登场回合攻击英雄");
assert.equal(CF.enemies.qianzhi_demon_garrison.deck.length, 36, "通关后魔族驻军应使用长期高难挑战牌库");
assert.equal(CF.CARD_LIBRARY.demon_succubus_legion.attack, 20, "魅魔军官随从应拥有20点攻击");
assert.equal(CF.CARD_LIBRARY.demon_succubus_legion.health, 200, "魅魔军官随从应拥有200点生命");
assert.equal(CF.BOSS_DIALOGUES[5][19].rescueEpilogue.mode, "counterattack", "第五关最终Boss落败后应进入魅魔军官反击剧情");
assert.equal(CF.BOSS_DIALOGUES[5][19].rescueEpilogue.officerAttack, 20, "千枝城反击中的魅魔军官应拥有20点攻击");
const qianzhiFinaleBattle = new CF.Battle(CF.enemies.wolf_matriarch, {});
qianzhiFinaleBattle.state.enemy.hp = 0;
qianzhiFinaleBattle.checkOutcome();
const qianzhiOfficers = qianzhiFinaleBattle.state.enemy.board.front.filter(Boolean);
assert.equal(qianzhiOfficers.length, 4, "一名魅魔军官救走灰狼首领后应有四名军官留在战场");
assert.ok(qianzhiOfficers.every(unit => unit.attack === 20 && unit.health === 200), "千枝城反击的四名军官都应为20攻/200血");
assert.match(qianzhiFinaleBattle.html(), /千枝城反击/, "第五关结局战应明确提示剧情落败仍会正常通关");
qianzhiFinaleBattle.completeRescueCounterattack();
assert.ok(qianzhiFinaleBattle.state.storyDefeat && qianzhiFinaleBattle.state.ended, "魅魔反击击溃小队后应标记剧情落败并走胜利奖励回调");
assert.match(gameJs, /四名魅魔军官依次以20点攻击杀向小队/, "千枝城结局应由四名魅魔军官直接杀退玩家");
assert.match(mainSource, /stageIndex === 19[\s\S]{0,500}data-action="chapter5-postgame"/, "通关后最终Boss节点应原位替换为魔族重建据点");
assert.doesNotMatch(mainSource, /const postgameNode/, "魔族据点不应以额外重叠节点叠在最终Boss位置上");
CF.SaveSystem.data.chapterFiveBossRewards[19] = true;
const preparedChapterFive = CF.Adventure.prepareChapterFiveFinale();
assert.equal(preparedChapterFive.completed.length, 19, "第五关直达最终战应把前19个首领标记为已击败");
assert.equal(preparedChapterFive.stage, 19, "第五关直达最终战应只留下第20个最终首领");
assert.equal(preparedChapterFive.cleared, false, "直达最终战后第五关不应提前标记通关");
assert.equal(CF.Adventure.isNodeAvailable(19), true, "银灰狼女猎手节点应成为唯一可挑战节点");
assert.equal(CF.SaveSystem.data.qianzhiGarrisonUnlocked, false, "重置第五关最终战时不应提前解锁魔族据点");
assert.equal(CF.SaveSystem.data.chapterFiveBossRewards[19], undefined, "最终首领的首杀奖励应可重新获得");
assert.match(mainSource, /prepareChapterFiveFinale.*=== "1"[\s\S]{0,180}prepareChapterFiveFinale\(\)/, "本地维护链接应能把当前浏览器存档直达第五关最终战");
assert.match(mainSource, /shouldPrepareChapterFiveFinale[\s\S]{0,260}prepareChapterFiveFinale\(\)/, "已有第五关旧存档加载新版时应一次性自动直达最终战");
CF.SaveSystem.data.completedRuns = 1;

CF.SaveSystem.data.run = null;
CF.SaveSystem.data.deck = [...CF.STARTER_DECK];
CF.SaveSystem.data.hero.maxMana = 3;
CF.SaveSystem.unlockHeroSkill("fire");
CF.SaveSystem.data.hero.skillProgress.fire.level = 2;
CF.SaveSystem.equipHeroSkill("fire");
const heroSkillBattle = new CF.Battle(CF.enemies.goblin_warband, {});
heroSkillBattle.state.player.mana = 3;
const heroSkillEnemyHp = heroSkillBattle.state.enemy.hp;
heroSkillBattle.selectSkill();
assert.equal(heroSkillBattle.state.enemy.hp, heroSkillEnemyHp - 3, "Lv2火焰冲击应对敌方英雄造成3点伤害");
assert.equal(heroSkillBattle.state.player.mana, 2, "火焰冲击应消耗1点法力");
assert.equal(heroSkillBattle.state.player.skillCooldown, 1, "英雄技能每回合只能使用一次");
CF.SaveSystem.equipHeroSkill("slash");
const killCountBattle = new CF.Battle(CF.enemies.goblin_warband, {});
assert.equal(killCountBattle.state.enemyUnitsKilled, 0, "新战斗的击杀数应从0开始");
killCountBattle.state.enemy.board.front[0] = { name: "测试哥布林", health: 0, maxHealth: 2, attack: 1, keywords: [] };
killCountBattle.state.player.board.front[0] = { name: "测试新兵", cardId: "test_token", health: 0, maxHealth: 2, attack: 1, keywords: [] };
killCountBattle.cleanDead();
assert.equal(killCountBattle.state.enemyUnitsKilled, 1, "只有敌方随从阵亡才计入击杀数");
const battle = new CF.Battle(CF.enemies.goblin_warband, {});
assert.equal(battle.state.player.hand.length, 10, "每次Boss战开局应抽取10张我方手牌");
assert.equal(battle.state.player.deck.length, 14, "开局抽取10张后牌库应剩14张");
battle.startPlayerTurn(true);
battle.state.player.mana = 0;
battle.startPlayerTurn(false);
assert.equal(battle.state.player.maxMana, 3, "最大法力不得随回合增加");
assert.equal(battle.state.player.mana, 3, "回合开始当前法力恢复到固定上限");

battle.state.player.hand = [{ ...CF.getCard("recruit", { level: 1 }), instanceId: "test-recruit" }];
battle.state.player.mana = 3;
assert.equal(battle.summon("player", 0, "front", 0), true, "空前排格可以部署");
assert.equal(battle.state.player.board.front[0].ready, false, "普通随从登场不能立刻攻击");
battle.state.player.hand = [{ ...CF.getCard("raider", { level: 1 }), instanceId: "test-raider" }];
battle.state.player.mana = 4;
assert.equal(battle.summon("player", 0, "back", 1), true, "空后排格可以部署");
assert.equal(battle.state.player.board.back[1].ready, true, "突袭随从登场可以攻击随从");
assert.equal(battle.state.log[0].kind, "player", "我方动作应写入我方分类日志");
assert.match(battle.state.log[0].message, /剩余.*法力/, "出牌日志应记录剩余法力");

battle.state.enemy.hand = [{ ...CF.getCard("goblin", { level: 1 }), instanceId: "test-goblin" }];
battle.state.enemy.mana = 3;
assert.equal(battle.summon("enemy", 0, "front", 3), true, "敌方可以部署随从");
assert.equal(battle.state.log[0].kind, "enemy", "敌方动作应写入敌方分类日志");
assert.match(battle.state.log[0].message, /第4路前排/, "敌方部署日志应记录具体路线和排位");

const combatUnit = (id, overrides = {}) => {
  const card = CF.getCard(id, { level: 1 });
  return {
    uid: `${id}-test`, cardId: id, name: card.name, icon: card.icon,
    attack: card.attack, health: card.health, maxHealth: card.health, level: 1,
    keywords: [...card.keywords], combatStyle: card.combatStyle, role: card.role || "",
    ready: true, justSummoned: false, tempAttack: 0, healUsed: false, ...overrides
  };
};

battle.state.player.board = CF.emptyBoard();
battle.state.enemy.board = CF.emptyBoard();
battle.state.player.board.front[0] = combatUnit("recruit", { attack: 2, health: 6, maxHealth: 6 });
battle.state.enemy.board.front[0] = combatUnit("orc_grunt", { attack: 3, health: 6, maxHealth: 6 });
battle.performUnitAttack("player", "front", 0, "enemy", "front", 0);
assert.equal(battle.state.player.board.front[0].health, 3, "近战攻击应承受目标攻击力的反击");
assert.equal(battle.state.enemy.board.front[0].health, 4, "近战攻击应正常造成伤害");

battle.state.player.board.back[1] = combatUnit("ranger", { attack: 3, health: 5, maxHealth: 5 });
battle.state.enemy.board.front[1] = combatUnit("orc_grunt", { attack: 4, health: 7, maxHealth: 7 });
battle.performUnitAttack("player", "back", 1, "enemy", "front", 1);
assert.equal(battle.state.player.board.back[1].health, 5, "远程攻击不应承受反击");
assert.equal(battle.state.enemy.board.front[1].health, 4, "远程攻击应正常造成伤害");

battle.state.player.board = CF.emptyBoard();
battle.state.player.hp = 20;
battle.state.player.maxHp = 30;
battle.state.player.board.front[0] = combatUnit("royal_medic", { health: 3, maxHealth: 5, ready: false });
battle.state.selected = { type: "healer", side: "player", row: "front", column: 0, unitId: "royal_medic-test" };
battle.healWithUnit("front", 0, "player", "hero", -1);
assert.equal(battle.state.player.hp, 22, "治疗随从应按自身攻击力恢复英雄");
assert.equal(battle.state.player.board.front[0].healUsed, true, "治疗随从每回合只能治疗一次");
assert.equal(battle.state.selected, null, "治疗完成后应取消选中状态");
battle.state.player.hp = 20;
battle.state.player.selected = null;
battle.state.player.board.front[0].healUsed = true;
battle.startPlayerTurn(true);
assert.equal(battle.state.player.board.front[0].healUsed, false, "新回合应重置治疗次数");
assert.equal(battle.state.player.board.front[0].ready, false, "治疗随从不能攻击");

const queenBattle = new CF.Battle(CF.enemies.goblin_queen, {});
queenBattle.state.enemy.board = CF.emptyBoard();
queenBattle.goblinQueenReinforcements();
const summonedGoblins = [...queenBattle.state.enemy.board.front, ...queenBattle.state.enemy.board.back].filter(unit => unit?.cardId === "goblin");
assert.equal(summonedGoblins.length, 2, "翠影女王每回合应免费召唤2个普通哥布林");
assert.match(queenBattle.html(), /goblin-stronghold/, "第二关战斗应使用新的哥布林营地背景");
queenBattle.state.enemy.hp = 0;
queenBattle.checkOutcome();
const queenRescueGuards = queenBattle.state.enemy.board.front.filter(Boolean);
assert.ok(queenBattle.state.rescueEpilogue && !queenBattle.state.ended, "翠影女王落败后应进入救援尾声而非立刻结算胜利");
assert.equal(queenRescueGuards.length, 4, "一名军官带走女王后应有四名军官封锁前排");
assert.ok(queenRescueGuards.every(unit => unit.attack === 10 && unit.health === 200), "四名魅魔军官都应为10攻/200血");
assert.match(queenBattle.html(), /魅魔军官撤离/, "救援阶段应显示两回合撤离目标");
queenBattle.completeRescueEpilogue();
assert.ok(queenBattle.state.ended && queenBattle.state.enemy.board.front.every(unit => !unit), "两回合撤离结束后军官应离场并结算胜利");
const bearRescueBattle = new CF.Battle(CF.enemies.bear_matriarch, {});
bearRescueBattle.state.enemy.hp = 0;
bearRescueBattle.checkOutcome();
assert.equal(bearRescueBattle.state.enemy.board.front.filter(Boolean).length, 4, "丰穗战母落败后同样应由四名魅魔军官封锁前排");
assert.ok(bearRescueBattle.state.rescueEpilogue && !bearRescueBattle.state.ended, "丰穗战母救援尾声应等待两回合撤离");
bearRescueBattle.completeRescueEpilogue();

console.log("✓ 两关地图、20节点、女哥布林Boss、治疗、成长、牌组与战斗规则测试全部通过");
const hornRun = CF.Adventure.start();
hornRun.stage = 0;
hornRun.activeNode = 0;
hornRun.chosen[0] = 0;
const hornEnemy = CF.Adventure.encounterFor("normal");
assert.equal(hornEnemy.passive, "battle_horn", "chapter2 first 19 bosses should have battle horn");
assert.ok(hornEnemy.dialogue?.intro && hornEnemy.dialogue?.defeat, "第二关普通Boss也应接入独立剧情台词");
assert.equal(hornEnemy.skills[0].name, "战斗号角", "battle horn skill should be labeled");
assert.match(hornEnemy.skills[0].description, /召唤1个2攻\/2血/, "battle horn should describe one 2/2 goblin");
const hornBattle = new CF.Battle(hornEnemy, {});
hornBattle.state.enemy.board = CF.emptyBoard();
hornBattle.battleHornReinforcements();
const hornGoblins = [...hornBattle.state.enemy.board.front, ...hornBattle.state.enemy.board.back].filter(unit => unit?.cardId === "goblin");
assert.equal(hornGoblins.length, 1, "battle horn should summon one goblin");
assert.deepEqual(hornGoblins.map(unit => [unit.attack, unit.health]), [[2, 2]], "battle horn goblin should be 2/2");

const spellBattle = new CF.Battle(CF.enemies.goblin_warband, {});
spellBattle.state.player.mana = 99;
spellBattle.state.player.board = CF.emptyBoard();
spellBattle.state.enemy.board = CF.emptyBoard();
spellBattle.state.enemy.board.front[0] = combatUnit("orc_grunt", { health: 6, maxHealth: 6 });
spellBattle.state.enemy.board.front[1] = combatUnit("goblin_guard", { health: 6, maxHealth: 6 });
spellBattle.state.player.hand = [{ ...CF.getCard("chain_lightning", { level: 1 }), instanceId: "test-chain" }];
spellBattle.state.selected = { type: "card", index: 0, cardId: "test-chain" };
spellBattle.castPlayerSpell("enemy", "front", 0);
assert.equal(spellBattle.state.enemy.board.front[0].health, 3, "闪电锁链应对主目标造成3点伤害");
assert.equal(spellBattle.state.enemy.board.front[1].health, 5, "闪电锁链应对同排其他目标造成1点伤害");

spellBattle.state.player.board.front[0] = combatUnit("recruit", { attack: 2, health: 6, maxHealth: 6 });
spellBattle.state.player.hand = [{ ...CF.getCard("mirror_shift", { level: 1 }), instanceId: "test-mirror" }];
spellBattle.state.selected = { type: "card", index: 0, cardId: "test-mirror" };
spellBattle.castPlayerSpell("player", "front", 0);
assert.deepEqual([spellBattle.state.player.board.front[0].attack, spellBattle.state.player.board.front[0].health], [6, 2], "镜像换位应交换攻血");

spellBattle.state.player.hand = [{ ...CF.getCard("frost_bulwark", { level: 1 }), instanceId: "test-frost" }];
spellBattle.state.selected = { type: "card", index: 0, cardId: "test-frost" };
spellBattle.castPlayerSpell("player", "front", 0);
assert.equal(spellBattle.state.player.board.front[0].health, 5, "霜铸壁垒Lv1应增加3点生命");
assert.ok(spellBattle.state.player.board.front[0].keywords.includes("守卫"), "霜铸壁垒应赋予守卫");

spellBattle.state.player.board = CF.emptyBoard();
spellBattle.state.player.hand = [{ ...CF.getCard("royal_muster", { level: 1 }), instanceId: "test-muster" }];
spellBattle.selectCard(0);
const royalRecruits = [...spellBattle.state.player.board.front, ...spellBattle.state.player.board.back].filter(unit => unit?.cardId === "royal_recruit_token");
assert.equal(royalRecruits.length, 2, "王庭征召应召唤两个独立衍生随从");
assert.deepEqual(royalRecruits.map(unit => [unit.attack, unit.health]), [[1, 1], [1, 1]], "王庭征召Lv1应召唤1/1卫兵");

spellBattle.state.player.hp = 20;
spellBattle.state.player.maxHp = 30;
spellBattle.state.player.board.front[0].health = 1;
spellBattle.state.player.board.front[0].maxHealth = 5;
spellBattle.state.player.hand = [{ ...CF.getCard("holy_spring", { level: 1 }), instanceId: "test-spring" }];
spellBattle.selectCard(0);
assert.equal(spellBattle.state.player.hp, 22, "圣泉涌流Lv1应为英雄恢复2点生命");
assert.equal(spellBattle.state.player.board.front[0].health, 3, "圣泉涌流Lv1应为随从恢复2点生命");

spellBattle.state.enemy.board.front[2] = combatUnit("goblin", { health: 5, maxHealth: 5 });
spellBattle.state.player.deck = [{ ...CF.getCard("recruit", { level: 1 }), instanceId: "execute-draw" }];
spellBattle.state.player.hand = [{ ...CF.getCard("judgment_spear", { level: 1 }), instanceId: "test-judgment" }];
spellBattle.state.selected = { type: "card", index: 0, cardId: "test-judgment" };
spellBattle.castPlayerSpell("enemy", "front", 2);
assert.equal(spellBattle.state.enemy.board.front[2], null, "审判之矛Lv1应消灭5血目标");
assert.equal(spellBattle.state.player.hand.length, 1, "审判之矛击杀后应抽1张牌");

const chapterTwoBattle = new CF.Battle(CF.enemies.goblin_warband, {});
chapterTwoBattle.state.player.mana = 99;
chapterTwoBattle.state.player.board = CF.emptyBoard();
chapterTwoBattle.state.enemy.board = CF.emptyBoard();
chapterTwoBattle.state.enemy.board.front[0] = combatUnit("orc_grunt", { attack: 6, health: 12, maxHealth: 12 });
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("marsh_venom", { level: 1 }), instanceId: "test-venom" }];
chapterTwoBattle.state.selected = { type: "card", index: 0, cardId: "test-venom" };
chapterTwoBattle.castPlayerSpell("enemy", "front", 0);
assert.deepEqual([chapterTwoBattle.state.enemy.board.front[0].attack, chapterTwoBattle.state.enemy.board.front[0].health], [5, 10], "沼泽毒剂应同时造成伤害并永久削弱攻击");

chapterTwoBattle.state.enemy.board.back[0] = combatUnit("goblin_guard", { health: 8, maxHealth: 8 });
chapterTwoBattle.state.enemy.board.back[1] = combatUnit("goblin_guard", { health: 8, maxHealth: 8 });
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("powder_keg", { level: 1 }), instanceId: "test-keg" }];
chapterTwoBattle.state.selected = { type: "card", index: 0, cardId: "test-keg" };
chapterTwoBattle.castPlayerSpell("enemy", "back", 0);
assert.equal(chapterTwoBattle.state.enemy.board.back.slice(0, 2).map(unit => unit.health).join(","), "5,5", "火药桶应命中选中排的全部随从");

chapterTwoBattle.state.player.board = CF.emptyBoard();
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("green_tide_rally", { level: 1 }), instanceId: "test-tide" }];
chapterTwoBattle.selectCard(0);
const tideUnits = [...chapterTwoBattle.state.player.board.front, ...chapterTwoBattle.state.player.board.back].filter(unit => unit?.name === "绿潮斗士");
assert.equal(tideUnits.length, 3, "绿潮集结应召唤3个独立随从");
assert.equal(tideUnits.map(unit => `${unit.attack}/${unit.health}`).join(","), "1/2,1/2,1/2", "绿潮集结Lv1衍生物数值应正确");

chapterTwoBattle.state.player.hand = [{ ...CF.getCard("venomous_feast", { level: 1 }), instanceId: "test-feast" }];
chapterTwoBattle.selectCard(0);
assert.ok(tideUnits.every(unit => unit.attack === 2 && unit.health === 4 && unit.maxHealth === 4), "毒宴狂欢应永久强化全部友方随从");

chapterTwoBattle.state.enemy.hand = [];
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("shadow_kidnap", { level: 1 }), instanceId: "test-kidnap" }];
chapterTwoBattle.state.selected = { type: "card", index: 0, cardId: "test-kidnap" };
chapterTwoBattle.castPlayerSpell("enemy", "front", 0);
assert.equal(chapterTwoBattle.state.enemy.board.front[0], null, "暗巷绑票应移除选中的敌方随从");
assert.equal(chapterTwoBattle.state.enemy.hand[0].id, "orc_grunt", "暗巷绑票应将随从返回其拥有者手牌");

chapterTwoBattle.state.player.hp = 10;
chapterTwoBattle.state.player.maxHp = 30;
chapterTwoBattle.state.player.deck = [
  { ...CF.getCard("recruit", { level: 1 }), instanceId: "ransom-draw-1" },
  { ...CF.getCard("shield_guard", { level: 1 }), instanceId: "ransom-draw-2" }
];
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("treasury_ransom", { level: 1 }), instanceId: "test-ransom" }];
assert.equal(chapterTwoBattle.effectiveCost(chapterTwoBattle.state.player.hand[0]), 5, "金库赎金应按英雄已损失生命动态减费");
chapterTwoBattle.selectCard(0);
assert.equal(chapterTwoBattle.state.player.hp, 18, "金库赎金Lv1应恢复8点生命");
assert.equal(chapterTwoBattle.state.player.hand.length, 2, "金库赎金应抽2张牌");

chapterTwoBattle.state.cardsPlayed.player = 6;
assert.equal(chapterTwoBattle.effectiveCost(CF.getCard("emerald_drake_commander", { level: 1 })), 7, "翡翠龙骑统领应按本场出牌数减至7费");
chapterTwoBattle.state.enemy.board.front[2] = combatUnit("goblin", { health: 5, maxHealth: 5 });
chapterTwoBattle.state.player.hand = [{ ...CF.getCard("emerald_drake_commander", { level: 1 }), instanceId: "test-drake" }];
chapterTwoBattle.state.player.mana = 7;
assert.equal(chapterTwoBattle.summon("player", 0, "back", 3), true, "7点法力上限下满足条件后应能打出10费翡翠龙骑统领");
assert.equal(chapterTwoBattle.state.enemy.board.front[2].health, 2, "翡翠龙骑统领登场龙息应伤害所有敌方随从");

const chapterThreeBattle = new CF.Battle(CF.enemies.bear_matriarch, {});
chapterThreeBattle.state.player.mana = 99;
chapterThreeBattle.state.player.board = CF.emptyBoard();
chapterThreeBattle.state.enemy.board = CF.emptyBoard();
chapterThreeBattle.state.player.deck = [{ ...CF.getCard("recruit", { level: 1 }), instanceId: "forage-draw" }];
chapterThreeBattle.state.player.hand = [{ ...CF.getCard("wheat_cub", { level: 1 }), instanceId: "test-wheat-cub" }];
assert.equal(chapterThreeBattle.summon("player", 0, "front", 0), true, "麦穗熊崽应能正常登场");
assert.equal(chapterThreeBattle.state.player.hand.length, 1, "麦穗熊崽登场时应抽1张牌");
chapterThreeBattle.state.player.board.front[0].health = 1;
chapterThreeBattle.state.player.board.front[0].maxHealth = 5;
chapterThreeBattle.state.player.hand = [{ ...CF.getCard("honey_salve", { level: 1 }), instanceId: "test-honey-salve" }];
chapterThreeBattle.state.selected = { type: "card", index: 0, cardId: "test-honey-salve" };
chapterThreeBattle.castPlayerSpell("player", "front", 0);
assert.deepEqual([chapterThreeBattle.state.player.board.front[0].attack, chapterThreeBattle.state.player.board.front[0].health], [2, 4], "蜂蜜药膏应治疗并强化友方随从");
chapterThreeBattle.state.enemy.board.front[0] = combatUnit("orc_grunt", { attack: 6, health: 12, maxHealth: 12 });
chapterThreeBattle.state.enemy.board.front[1] = combatUnit("goblin_guard", { attack: 2, health: 8, maxHealth: 8 });
chapterThreeBattle.state.player.hand = [{ ...CF.getCard("bear_paw_shock", { level: 1 }), instanceId: "test-bear-paw" }];
chapterThreeBattle.state.selected = { type: "card", index: 0, cardId: "test-bear-paw" };
chapterThreeBattle.castPlayerSpell("enemy", "front", 0);
assert.deepEqual([chapterThreeBattle.state.enemy.board.front[0].health, chapterThreeBattle.state.enemy.board.front[1].health], [8, 7], "熊掌震击应伤害主目标及同排其他目标");
chapterThreeBattle.state.player.board = CF.emptyBoard();
chapterThreeBattle.state.player.hp = 20;
chapterThreeBattle.state.player.maxHp = 80;
chapterThreeBattle.state.player.hand = [{ ...CF.getCard("bear_god_descent", { level: 1 }), instanceId: "test-bear-god" }];
chapterThreeBattle.selectCard(0);
const bearGodTokens = [...chapterThreeBattle.state.player.board.front, ...chapterThreeBattle.state.player.board.back].filter(unit => unit?.cardId === "bear_god_avatar");
assert.equal(bearGodTokens.length, 4, "熊神降临应召唤4个熊神化身");
assert.equal(chapterThreeBattle.state.player.hp, 27, "熊神降临Lv1应恢复7点英雄生命");

const chapterFourBattle = new CF.Battle({ ...chapterFourNormal, id: "chapter4-rule-test" }, {});
chapterFourBattle.state.player.mana = 99;
chapterFourBattle.state.player.board = CF.emptyBoard();
chapterFourBattle.state.enemy.board = CF.emptyBoard();
chapterFourBattle.state.player.board.front[0] = combatUnit("recruit", { health: 2, maxHealth: 5, keywords: [] });
chapterFourBattle.state.player.hand = [{ ...CF.getCard("gelatin_barrier", { level: 1 }), instanceId: "test-gel-barrier" }];
chapterFourBattle.state.selected = { type: "card", index: 0, cardId: "test-gel-barrier" };
chapterFourBattle.castPlayerSpell("player", "front", 0);
assert.deepEqual([chapterFourBattle.state.player.board.front[0].health, chapterFourBattle.state.player.board.front[0].maxHealth], [6, 9], "凝胶护膜应提高当前与最大生命");
assert.ok(chapterFourBattle.state.player.board.front[0].keywords.includes("再生"), "凝胶护膜应赋予再生关键字");
chapterFourBattle.state.player.board.front[0].health = 3;
chapterFourBattle.startPlayerTurn(true);
assert.equal(chapterFourBattle.state.player.board.front[0].health, 5, "再生随从应在己方回合开始恢复2点生命");
chapterFourBattle.state.enemy.hp = chapterFourBattle.state.enemy.maxHp - 20;
chapterFourBattle.state.enemy.board.front[0] = combatUnit("moss_gel_guard", { health: 2, maxHealth: 12 });
chapterFourBattle.slimeRegeneration();
assert.equal(chapterFourBattle.state.enemy.hp, chapterFourBattle.state.enemy.maxHp - 16, "普通史莱姆Boss每回合应恢复自身生命");
assert.equal(chapterFourBattle.state.enemy.board.front[0].health, 4, "普通史莱姆Boss应同时治疗随从");

const slimeSageBattle = new CF.Battle(CF.enemies.slime_sage, {});
slimeSageBattle.state.enemy.hp = 400;
slimeSageBattle.state.enemy.board = CF.emptyBoard();
slimeSageBattle.state.enemyTurns = 3;
slimeSageBattle.slimeSageRegeneration();
assert.equal(slimeSageBattle.state.enemy.hp, 410, "碧露大贤者每回合应恢复10点生命");
assert.equal(slimeSageBattle.state.enemy.board.front.filter(Boolean).length, 2, "碧露大贤者每3回合应分裂出2名碧露近卫");

const armored = combatUnit("royal_war_machine", { health: 12, maxHealth: 12 });
chapterTwoBattle.state.player.board.front[3] = armored;
chapterTwoBattle.damageUnit("player", "front", 3, 5, "测试攻击", false);
assert.equal(armored.health, 9, "重甲应使每次受到的5点伤害降为3点");
const thorny = combatUnit("thorn_troll", { attack: 4, health: 10, maxHealth: 10 });
const meleeAttacker = combatUnit("kingdom_knight", { attack: 3, health: 12, maxHealth: 12 });
chapterTwoBattle.state.enemy.board.front[3] = thorny;
chapterTwoBattle.state.player.board.front[2] = meleeAttacker;
chapterTwoBattle.performUnitAttack("player", "front", 2, "enemy", "front", 3);
assert.equal(meleeAttacker.health, 6, "近战攻击荆棘随从应承受其攻击力外加2点荆棘反伤");

assert.equal(CF.WEAPON_CARD_IDS.map(id => CF.CARD_LIBRARY[id].cost).join(","), "1,2,3,4,5,6,7", "七张武器应覆盖1至7费");
assert.equal(new Set(CF.WEAPON_CARD_IDS.map(id => CF.CARD_LIBRARY[id].name)).size, 7, "每张武器必须拥有独立名称");
assert.equal(CF.getCard("riftmoon_blade", { level: 5 }).attack, 8, "武器等级应正确提升攻击力");
assert.equal(CF.getCard("riftmoon_blade", { level: 5 }).durability, 4, "高等级武器应提升耐久");

const weaponBattle = new CF.Battle(CF.enemies.goblin_warband, {});
weaponBattle.state.player.mana = 7;
weaponBattle.state.player.hand = [{ ...CF.getCard("mist_dagger", { level: 1 }), instanceId: "test-weapon" }];
assert.equal(weaponBattle.equipWeapon("player", 0), true, "玩家应能装备武器牌");
assert.deepEqual([weaponBattle.state.player.weapon.attack, weaponBattle.state.player.weapon.durability], [1, 2], "装备后的攻击和耐久应正确");
weaponBattle.state.enemy.board.front[0] = combatUnit("goblin", { attack: 2, health: 1, maxHealth: 1 });
weaponBattle.state.player.deck = [{ ...CF.getCard("recruit", { level: 1 }), instanceId: "weapon-draw" }];
const hpBeforeWeapon = weaponBattle.state.player.hp;
weaponBattle.selectWeaponAttack();
weaponBattle.playerWeaponAttack("front", 0);
assert.equal(weaponBattle.state.player.hp, hpBeforeWeapon - 2, "近战武器攻击随从应承受反击");
assert.equal(weaponBattle.state.player.weapon.durability, 1, "每次武器攻击应消耗1点耐久");
assert.equal(weaponBattle.state.player.hand.length, 1, "雾行短匕击杀随从后应抽1张牌");

weaponBattle.state.player.weapon = { ...weaponBattle.state.player.weapon, cardId: "silverfeather_bow", name: "银羽猎弓", attack: 2, durability: 3, maxDurability: 3, combatStyle: "ranged", keywords: ["远程"], effect: "ranged", ready: true };
weaponBattle.state.enemy.board.front[0] = combatUnit("goblin_guard", { attack: 5, health: 5, maxHealth: 5 });
const hpBeforeBow = weaponBattle.state.player.hp;
weaponBattle.state.selected = { type: "weapon", side: "player", cardId: "silverfeather_bow" };
weaponBattle.playerWeaponAttack("front", 0);
assert.equal(weaponBattle.state.player.hp, hpBeforeBow, "远程武器攻击随从不应承受反击");

CF.SaveSystem.reset();
const weaponRun = CF.Adventure.start(1);
weaponRun.activeNode = 1;
weaponRun.stage = 1;
assert.equal(CF.Adventure.encounterFor("normal").id, "goblin_warband", "第一关武器Boss应使用固定敌人");
const firstWeaponReward = CF.Adventure.claimActiveWeaponReward();
assert.equal(firstWeaponReward.cardId, "mist_dagger", "第一个武器Boss应掉落1费雾行短匕");
assert.equal(CF.SaveSystem.data.collection.mist_dagger, 1, "Boss武器应永久加入收藏");
assert.equal(CF.Adventure.claimActiveWeaponReward(), null, "同一Boss武器奖励不可重复领取");
assert.equal(CF.Adventure.mapStages().flat().filter(node => node.weaponBoss).length, 7, "第一关应有七个武器Boss奖励点");

const legacyDuplicatedDeck = CF.STARTER_DECK.slice(0, 12).flatMap(id => [id, id]);
storage.set("rift-expedition-save-v1", JSON.stringify({ deck: legacyDuplicatedDeck }));
CF.SaveSystem.load();
assert.equal(CF.SaveSystem.data.deck.length, 24, "旧版重复牌组应自动补入新卡并恢复为24张");
assert.equal(new Set(CF.SaveSystem.data.deck).size, 24, "旧版牌组迁移后不应保留重复卡");
assert.ok(CF.NEW_CARD_IDS.every(id => CF.SaveSystem.data.deck.includes(id)), "旧版重复牌组应自动加入12张新卡");

CF.SaveSystem.reset();
assert.deepEqual(Array.from(CF.SaveSystem.data.injuredCards), [], "新存档不应存在伤员");
const injuryBattle = new CF.Battle(CF.enemies.goblin_warband, {});
injuryBattle.state.player.board.front[0] = combatUnit("recruit", { health: 0 });
injuryBattle.cleanDead();
assert.ok(CF.SaveSystem.data.injuredCards.includes("recruit"), "真实随从阵亡后应进入跨战斗伤员名单");
assert.ok(CF.SaveSystem.data.deck.includes("recruit"), "负伤随从仍应保留在玩家编辑卡组中");
const nextInjuryBattle = new CF.Battle(CF.enemies.goblin_warband, {});
assert.ok(!nextInjuryBattle.state.player.hand.concat(nextInjuryBattle.state.player.deck).some(card => card.id === "recruit"), "负伤随从不应出现在后续战斗中");
const injuriesBeforeToken = CF.SaveSystem.data.injuredCards.length;
injuryBattle.summonPlayerToken("测试衍生物", 1, 1);
const tokenColumn = injuryBattle.state.player.board.front.findIndex(unit => unit?.cardId === "player_token");
injuryBattle.state.player.board.front[tokenColumn].health = 0;
injuryBattle.cleanDead();
assert.equal(CF.SaveSystem.data.injuredCards.length, injuriesBeforeToken, "衍生随从阵亡不应产生永久伤员");
assert.equal(CF.SaveSystem.injureCard("fire_flask"), false, "法术牌不能进入伤员名单");
assert.deepEqual(Array.from(CF.SaveSystem.rescueInjuredCards()), ["recruit"], "救治应一次清除全部真实伤员");
const rescuedBattle = new CF.Battle(CF.enemies.goblin_warband, {});
assert.ok(rescuedBattle.state.player.hand.concat(rescuedBattle.state.player.deck).some(card => card.id === "recruit"), "救治后随从应恢复后续战斗出场资格");

CF.SaveSystem.reset();
assert.deepEqual(Object.keys(CF.SaveSystem.data.chapterRuns), ["1", "2", "3", "4", "5"], "新存档应为五大关分别建立独立存档槽");
const savedChapterOne = CF.Adventure.start(1);
savedChapterOne.completed = [{ stage: 0, type: "normal" }];
savedChapterOne.stage = 1;
savedChapterOne.hp = 18;
CF.SaveSystem.save();
const savedChapterTwo = CF.Adventure.start(2);
savedChapterTwo.completed = [{ stage: 0, type: "normal" }, { stage: 13, type: "normal" }];
savedChapterTwo.stage = 2;
savedChapterTwo.hp = 24;
CF.SaveSystem.save();
assert.equal(CF.Adventure.current(1).hp, 18, "进入第二关后第一关生命与节点进度应独立保留");
assert.equal(CF.Adventure.current(2).completed.length, 2, "第二关应使用自己的节点记录");
CF.Adventure.activate(1);
assert.deepEqual(Array.from(CF.Adventure.current().completed, entry => entry.stage), [0], "切回第一关应恢复原有已击败节点");
CF.Adventure.current().activeNode = 1;
CF.Adventure.current().attempts[1] = 1;
const defeatedChapterOne = CF.Adventure.recordDefeat();
assert.equal(defeatedChapterOne.completed.length, 1, "Boss战败不应清除本关已击败节点");
assert.equal(defeatedChapterOne.failures[1], 1, "战败应记录在对应Boss节点上");
assert.equal(defeatedChapterOne.hp, defeatedChapterOne.maxHp, "战败返回地图时英雄应恢复至可继续挑战的生命值");
CF.Adventure.restart(1);
assert.equal(CF.Adventure.current(1).completed.length, 0, "重新开始应只清空当前大关");
assert.equal(CF.Adventure.current(2).completed.length, 2, "重开第一关不应影响第二关独立存档");

const legacySave = CF.freshSave();
legacySave.version = 1;
legacySave.completedRuns = 1;
legacySave.run = { chapter: 2, stage: 1, hp: 17, maxHp: 35, completed: [{ stage: 0, type: "normal" }], chosen: {}, earnedCoins: 20, earnedXp: 10, cardsLeveled: 0, activeNode: 1, startedAt: Date.now() };
delete legacySave.chapterRuns;
delete legacySave.activeChapter;
storage.set("rift-expedition-save-v1", JSON.stringify(legacySave));
CF.SaveSystem.load();
assert.equal(CF.SaveSystem.data.version, 2, "旧版单关存档应自动升级为新版格式");
assert.equal(CF.SaveSystem.data.activeChapter, 2, "旧版进行中的章节应成为迁移后的当前章节");
assert.equal(CF.SaveSystem.data.chapterRuns[2].completed[0].stage, 0, "旧版已击败节点应迁移到对应章节存档");
assert.equal(CF.SaveSystem.data.chapterRuns[2].hp, 17, "旧版章节生命值应在迁移时保留");
assert.match(mainSource, /CF\.Adventure\.recordDefeat\(\)/, "普通Boss战败应保存失败记录并返回本关地图");
assert.doesNotMatch(mainSource, /finish-run[\s\S]{0,160}data\.run\s*=\s*null/, "通关后不应删除章节存档");

CF.SaveSystem.reset();
for (const arenaHero of CF.Arena.heroes) {
  const skill = arenaHero.skill;
  CF.SaveSystem.data.hero.skillProgress[skill.id] = { level: 3, xp: 0, unlocked: true };
  CF.SaveSystem.data.hero.equippedSkill = skill.id;
  const skillBattle = new CF.Battle({ ...CF.enemies.goblin_warband, id: `skill-test-${skill.id}`, health: 999, arenaSkill: null }, {});
  skillBattle.state.phase = "player";
  skillBattle.state.busy = false;
  skillBattle.state.player.skillCooldown = 0;
  skillBattle.state.player.maxMana = 99;
  skillBattle.state.player.mana = 20;
  skillBattle.state.player.maxHp = 100;
  skillBattle.state.player.hp = 50;
  skillBattle.state.enemy.maxHp = 999;
  skillBattle.state.enemy.hp = 999;
  skillBattle.state.player.board.front[0] = combatUnit("kingdom_knight", { attack: 4, health: 20, maxHealth: 30, keywords: [] });
  skillBattle.state.enemy.board.front[0] = combatUnit("goblin_guard", { attack: 2, health: 100, maxHealth: 100, keywords: [] });
  skillBattle.state.enemy.board.back[0] = combatUnit("goblin_archer", { attack: 2, health: 100, maxHealth: 100, keywords: [] });
  skillBattle.state.player.weapon = { cardId: "skill-test-weapon", name: "测试武器", attack: 2, durability: 2, maxDurability: 2, combatStyle: "melee", keywords: [], ready: true };
  skillBattle.selectSkill();
  if (skill.target === "enemy-front") skillBattle.castSkill("front", 0);
  if (skill.target === "friendly-unit") skillBattle.castSkill("front", 0);
  assert.equal(skillBattle.state.player.skillCooldown, 1, `${skill.name}应能由玩家正常发动`);
  assert.ok(skillBattle.state.log.some(entry => entry.message.includes(skill.name)), `${skill.name}发动后应写入战斗记录`);

  const enemySkillBattle = new CF.Battle({ ...CF.enemies.goblin_warband, id: `enemy-skill-test-${skill.id}`, health: 999, arenaSkill: skill.id, arenaSkillLevel: 3 }, {});
  enemySkillBattle.state.player.maxHp = 999;
  enemySkillBattle.state.player.hp = 999;
  enemySkillBattle.state.enemy.maxHp = 999;
  enemySkillBattle.state.enemy.hp = 500;
  enemySkillBattle.state.player.board.front[0] = combatUnit("kingdom_knight", { attack: 4, health: 100, maxHealth: 100, keywords: [] });
  enemySkillBattle.state.player.board.back[0] = combatUnit("ranger", { attack: 4, health: 100, maxHealth: 100, keywords: [] });
  enemySkillBattle.state.enemy.board.front[0] = combatUnit("goblin_guard", { attack: 2, health: 20, maxHealth: 30, keywords: [] });
  enemySkillBattle.state.enemy.weapon = { cardId: "enemy-skill-test-weapon", name: "测试武器", attack: 2, durability: 2, maxDurability: 2, combatStyle: "melee", keywords: [], ready: true };
  enemySkillBattle.useArenaEnemySkill();
  assert.ok(enemySkillBattle.state.log.some(entry => entry.message.includes(skill.name)), `${skill.name}应能由竞技场对手正常发动`);
}
assert.match(mainSource, /获得<strong>2点英雄技能经验<\/strong>/, "竞技场胜利界面应显示每场获得2点技能经验");

// —— 选人英雄与15个存档栏位 ——
assert.equal(CF.HEROES.length, 12, "选人界面应展示队长、8名可选英雄与3名成就英雄");
assert.equal(CF.selectableHeroes().length, 9, "除队长外应有8名可选英雄");
assert.equal(CF.HEROES.filter(hero => hero.locked).length, 3, "魅魔、狼人与吸血鬼（原图第6、8、12张）应作为未开放的成就英雄");
assert.ok(CF.HEROES.filter(hero => hero.locked).every(hero => !hero.name && !hero.skill), "成就英雄暂时只保留头像，不含内容");
assert.equal(new Set(CF.selectableHeroes().map(hero => hero.skill)).size, 9, "每名可选英雄都应拥有独特的英雄技能");
CF.HEROES.forEach(hero => assert.ok(fs.existsSync(path.join(root, hero.portrait)), `${hero.id}头像文件应存在`));
assert.equal(CF.heroById("locked_count").id, "captain", "未解锁英雄不能被选用");
assert.match(indexSource, /js\/heroes\.js/, "游戏入口应加载英雄配置");

storage.clear();
CF.SaveSystem.load();
assert.equal(CF.SaveSystem.activeSlot, null, "首次进入游戏时不应占用存档栏位");
assert.equal(CF.SaveSystem.listSlots().length, 15, "应提供15个存档栏位");
assert.ok(CF.SaveSystem.listSlots().every(slot => slot.empty), "首次进入时所有栏位为空");
CF.SaveSystem.newGame(3, "violet_witch");
assert.equal(CF.SaveSystem.activeSlot, 3, "新游戏应绑定所选栏位");
assert.equal(CF.SaveSystem.data.hero.heroId, "violet_witch", "新游戏应记录所选英雄");
assert.equal(CF.SaveSystem.data.hero.equippedSkill, "sig_arcane_missiles", "新游戏应自动装备英雄的独特技能");
assert.equal(CF.currentHero().name, "薇奥菈", "当前英雄应为所选英雄");
CF.SaveSystem.data.coins = 777;
CF.SaveSystem.save();
assert.equal(CF.SaveSystem.slotSummary(3).coins, 777, "进度应自动保存到当前栏位");
assert.equal(CF.SaveSystem.slotSummary(3).heroName, "薇奥菈", "栏位摘要应显示英雄名");
CF.SaveSystem.saveToSlot(7);
assert.equal(CF.SaveSystem.activeSlot, 7, "另存为后应切换到新栏位");
CF.SaveSystem.data.coins = 5;
CF.SaveSystem.save();
assert.equal(CF.SaveSystem.slotSummary(3).coins, 777, "另存为后旧栏位应保持快照");
CF.SaveSystem.loadSlot(3);
assert.equal(CF.SaveSystem.data.coins, 777, "读取栏位应恢复该栏位进度");
assert.equal(CF.SaveSystem.activeSlot, 3, "读取后应以该栏位自动保存");
CF.SaveSystem.load();
assert.equal(CF.SaveSystem.activeSlot, 3, "重新打开游戏后应记住当前栏位");
assert.equal(CF.SaveSystem.data.hero.heroId, "violet_witch", "重新打开游戏后应保留所选英雄");
CF.SaveSystem.deleteSlot(7);
assert.ok(CF.SaveSystem.slotSummary(7).empty, "删除后栏位应为空");
assert.ok(!CF.SaveSystem.loadSlot(7), "空栏位不能读取");

storage.clear();
storage.set("rift-expedition-save-v1", JSON.stringify({ coins: 321, hero: { level: 4, xp: 100, maxHealth: 33, maxMana: 5 } }));
CF.SaveSystem.load();
assert.equal(CF.SaveSystem.activeSlot, 1, "旧版单一存档应自动迁移到1号栏位");
assert.equal(CF.SaveSystem.slotSummary(1).coins, 321, "迁移后的1号栏位应保留旧进度");
assert.equal(CF.SaveSystem.data.hero.heroId, "captain", "旧存档默认为护卫队长");
assert.equal(CF.SaveSystem.data.hero.equippedSkill, "slash", "旧存档保留原技能");

const signatureBattle = (heroId, setup) => {
  CF.SaveSystem.newGame(15, heroId);
  const test = new CF.Battle({ ...CF.enemies.goblin_warband, id: `signature-${heroId}`, health: 999 }, {});
  Object.assign(test.state, { phase: "player", busy: false });
  Object.assign(test.state.player, { skillCooldown: 0, maxMana: 99, mana: 20, maxHp: 60, hp: 30 });
  test.state.player.board = CF.emptyBoard();
  test.state.enemy.board = CF.emptyBoard();
  setup?.(test);
  return test;
};
let sig = signatureBattle("elf_archer", test => {
  test.state.enemy.board.front[0] = combatUnit("goblin_guard", { attack: 2, health: 10, maxHealth: 10, keywords: [] });
  test.state.enemy.board.back[0] = combatUnit("goblin_archer", { attack: 2, health: 2, maxHealth: 2, keywords: [] });
});
assert.equal(sig.state.player.name, "莉瑟尔", "战斗中应显示所选英雄");
const handBefore = sig.state.player.hand.length;
sig.selectSkill(); sig.castSkill("back", 0);
assert.equal(sig.state.enemy.board.back[0], null, "穿林箭应无视前排保护击杀后排");
assert.equal(sig.state.player.hand.length, Math.min(10, handBefore + 1), "穿林箭击杀后应抽1张牌");

sig = signatureBattle("violet_witch");
const witchHp = sig.state.enemy.hp;
sig.selectSkill();
assert.equal(witchHp - sig.state.enemy.hp, 3, "奥术飞弹无随从时应全部命中英雄");

sig = signatureBattle("dawn_priestess", test => { test.state.player.board.front[1] = combatUnit("kingdom_knight", { attack: 2, health: 1, maxHealth: 9, keywords: [] }); });
sig.selectSkill();
assert.equal(sig.state.player.board.front[1].health, 9, "晨曦复苏应使随从恢复满生命");
assert.equal(sig.state.player.hp, 32, "晨曦复苏应治疗英雄");

sig = signatureBattle("horned_berserker", test => { test.state.player.board.front[0] = combatUnit("kingdom_knight", { attack: 3, health: 5, maxHealth: 5, keywords: [], ready: false }); });
sig.selectSkill(); sig.castSkill("front", 0);
assert.equal(sig.currentAttack(sig.state.player.board.front[0]), 5, "血怒狂击应提升本回合攻击");
assert.equal(sig.state.player.board.front[0].ready, true, "血怒狂击后随从可以再次攻击");
assert.equal(sig.state.player.hp, 28, "血怒狂击应消耗英雄生命");

assert.equal(CF.HEROES.map((hero, index) => hero.locked ? index + 1 : 0).filter(Boolean).join(","), "6,8,12", "成就英雄应为原图第6、8、12张");
sig = signatureBattle("crimson_hood", test => {
  test.state.enemy.board.front[0] = combatUnit("goblin_guard", { attack: 2, health: 2, maxHealth: 2, keywords: [] });
  test.state.enemy.board.front[1] = combatUnit("goblin_guard", { attack: 2, health: 9, maxHealth: 9, keywords: [] });
});
sig.selectSkill(); sig.castSkill("front", 0);
assert.equal(sig.state.enemy.board.front[0], null, "猩红连刃应击杀前排目标");
assert.equal(sig.state.player.mana, 20, "猩红连刃击杀后应返还法力");
assert.equal(sig.state.player.skillCooldown, 0, "猩红连刃击杀后本回合可以再次使用");
sig.selectSkill(); sig.castSkill("front", 1);
assert.equal(sig.state.player.skillCooldown, 1, "猩红连刃未击杀时进入冷却");
assert.equal(sig.state.player.mana, 19, "猩红连刃未击杀时正常消耗法力");

sig = signatureBattle("silverleaf_ranger");
sig.selectSkill();
assert.equal(sig.state.player.board.back[0]?.name, "林影弓手", "林间伏兵应在后排召唤弓手");
assert.equal(sig.state.player.board.back[0].ready, true, "林影弓手可以立即攻击");

sig = signatureBattle("aegis_knight");
sig.selectSkill();
assert.equal(sig.state.player.board.front[0]?.health, 4, "前排为空时圣盾壁垒应召唤圣盾卫士");

sig = signatureBattle("grove_dryad");
sig.selectSkill();
const sapling = sig.state.player.board.front[0];
assert.equal(sapling?.name, "古树幼苗", "萌芽古树应召唤古树幼苗");
sig.startPlayerTurn();
assert.equal(sapling.attack, 2, "古树幼苗每回合开始时应成长");
assert.equal(sapling.maxHealth, 3, "古树幼苗每回合开始时应获得生命");
storage.clear();
CF.SaveSystem.load();

console.log("✓ 选人界面、8名英雄独特技能与15个存档栏位测试全部通过");
console.log("✓ 12张独立新卡及6种新法术效果测试全部通过");
console.log("✓ 7张武器牌、攻击耐久、远近程与第一关Boss掉落测试全部通过");
console.log("✓ 四大关独立存档、旧档迁移与战败保留进度测试全部通过");
console.log("✓ 第四关20个史莱姆首领、20张新卡、路线、再生与20级上限测试全部通过");
console.log("✓ 63名竞技场英雄独立技能、双端施放与未收集技能决赛匹配测试全部通过");

{
  const Emotes = CF.Emotes;
  const ids = Emotes.list.map(emote => emote.id);
  assert.equal(ids.join(","), "greet,well_played,thanks,wow,sorry,threaten", "表情菜单应提供问候、称赞、感谢、惊叹、抱歉与嘲讽");
  const sets = [...Object.values(Emotes.CHAPTER_REPLIES), ...Object.values(Emotes.BOSS_REPLIES), ...Object.values(Emotes.HERO_LINES)];
  CF.selectableHeroes().forEach(hero => assert.ok(Emotes.HERO_LINES[hero.id], `${hero.name}应拥有专属表情台词`));
  const heroGreets = CF.selectableHeroes().map(hero => Emotes.HERO_LINES[hero.id].greet.join("|"));
  assert.equal(new Set(heroGreets).size, heroGreets.length, "每名英雄的问候台词应各不相同");
  assert.ok(Emotes.HERO_LINES.crimson_hood.threaten.includes(Emotes.playerLine("threaten", Math.random, "crimson_hood")), "应按当前英雄选择表情台词");
  sets.forEach(set => ids.forEach(id => assert.ok(set[id] && [].concat(set[id]).every(Boolean), `每套表情回应都应包含${id}`)));
  assert.equal(Emotes.replySetFor({ ...CF.enemies.goblin_queen, chapter: 2 }), Emotes.BOSS_REPLIES.goblin_queen, "翠影女王应使用专属表情回应");
  assert.equal(Emotes.replySetFor({ id: "chapter3-2", chapter: 3 }), Emotes.CHAPTER_REPLIES[3], "普通关卡应使用所在章节族群的回应");
  assert.equal(Emotes.replySetFor(CF.Trials.enemy(7)), Emotes.BOSS_REPLIES.queen_iselanda, "女王低语试炼应由伊瑟兰妲回应");
  assert.equal(Emotes.replySetFor(CF.enemies.wolf_king, true), Emotes.BOSS_REPLIES.succubus_officers, "魅魔军官救援时应由军官回应");
  assert.ok(indexSource.indexOf("js/emotes.js") > indexSource.indexOf("js/boss-dialogues.js"), "游戏入口应加载表情配置");

  const emoteBattle = new CF.Battle({ ...CF.enemies.goblin_queen, chapter: 2, dialogue: null });
  emoteBattle.render = () => {};
  emoteBattle.clickPlayerPortrait();
  assert.equal(emoteBattle.state.emoteMenuOpen, true, "点击我方头像应打开表情菜单");
  assert.match(emoteBattle.html(), /data-action="emote" data-emote="threaten"/, "表情菜单应渲染在我方头像旁");
  emoteBattle.playerEmote("greet");
  assert.equal(emoteBattle.state.emoteMenuOpen, false, "发送表情后菜单应关闭");
  assert.ok(Emotes.PLAYER_LINES.greet.includes(emoteBattle.state.playerEmoteNotice.text), "我方应说出问候台词");
  const firstNotice = emoteBattle.state.playerEmoteNotice.id;
  emoteBattle.playerEmote("threaten");
  assert.equal(emoteBattle.state.playerEmoteNotice.id, firstNotice, "表情冷却期间不应连续刷屏");
  emoteBattle.state.ended = true;
}
console.log("✓ 头像表情菜单与各首领对应回应测试全部通过");

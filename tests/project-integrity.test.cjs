// 项目完整性检查：脚本清单、语法、素材路径与翻译词典。新增内容时最容易漏掉的地方都在这里兜底。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { root, indexScripts, createGameContext } = require("./helpers/game-context.cjs");

const read = file => fs.readFileSync(path.join(root, file), "utf8");
const listFiles = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = `${dir}/${entry.name}`;
  return entry.isDirectory() ? listFiles(rel) : [rel];
});

test("index.html 引用的脚本都存在，js/ 下的脚本也都被引用", () => {
  const scripts = indexScripts();
  assert.equal(new Set(scripts).size, scripts.length, "index.html 不应重复引用同一脚本");
  scripts.forEach(file => assert.ok(fs.existsSync(path.join(root, file)), `${file} 不存在`));
  const referenced = new Set(scripts);
  listFiles("js").filter(file => file.endsWith(".js")).forEach(file => {
    assert.ok(referenced.has(file), `${file} 没有在 index.html 中用 <script> 引用，浏览器不会加载它`);
  });
});

test("所有脚本语法正确", () => {
  listFiles("js").filter(file => file.endsWith(".js")).forEach(file => {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }), `${file} 有语法错误`);
  });
});

test("游戏脚本能按 index.html 的顺序在无 DOM 环境中加载", () => {
  const { CF } = createGameContext();
  ["SaveSystem", "Adventure", "Restaurant", "GameClock", "Labor", "NightEvents", "Trials"].forEach(name => {
    assert.ok(CF[name], `CardForge.${name} 应已注册`);
  });
});

test("代码与样式中引用的素材文件都存在", () => {
  const sources = [...listFiles("js").filter(file => file.endsWith(".js") && !file.startsWith("js/i18n/")), ...listFiles("css"), "index.html"];
  const missing = new Set();
  let checked = 0;
  sources.forEach(file => {
    for (const match of read(file).matchAll(/assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|svg|webp|gif|mp3|ogg|wav)/g)) {
      checked += 1;
      if (!fs.existsSync(path.join(root, match[0]))) missing.add(`${match[0]}（${file}）`);
    }
  });
  assert.ok(checked > 50, "应能扫描到素材引用");
  assert.deepEqual([...missing], [], "以下素材文件不存在");
});

test("卡牌库与英雄数据的内部引用有效", () => {
  const { CF } = createGameContext();
  const library = CF.CARD_LIBRARY;
  CF.STARTER_DECK.forEach(id => assert.ok(library[id], `起始卡组中的 ${id} 不在卡牌库中`));
  CF.STARTER_IDS.forEach(id => assert.ok(library[id], `STARTER_IDS 中的 ${id} 不在卡牌库中`));
  Object.entries(library).forEach(([id, card]) => {
    assert.ok(card && typeof card === "object", `${id} 应是对象`);
    assert.ok(["unit", "spell", "weapon"].includes(card.type), `${id} 的类型 ${card.type} 无效`);
    ["image", "portrait"].forEach(field => {
      if (card[field]) assert.ok(fs.existsSync(path.join(root, card[field])), `${id} 的 ${field} 素材 ${card[field]} 不存在`);
    });
  });
  (CF.HEROES || []).forEach(hero => {
    if (hero.portrait) assert.ok(fs.existsSync(path.join(root, hero.portrait)), `英雄 ${hero.id} 的头像 ${hero.portrait} 不存在`);
  });
});

function loadDictionaries() {
  const dictionaries = {};
  const context = vm.createContext({ window: { CardForge: { I18n: { register: (code, dict) => { dictionaries[code] = dict; } } } } });
  listFiles("js/i18n").forEach(file => vm.runInContext(read(file), context, { filename: file }));
  return dictionaries;
}

test("译文与原文的占位符一致", () => {
  const slots = text => (String(text).match(/\{\w+\}/g) || []).sort().join(",");
  Object.entries(loadDictionaries()).forEach(([code, dict]) => {
    const entries = Object.entries(dict.exact || {}).concat(dict.patterns || []);
    entries.forEach(([source, target]) => {
      assert.equal(typeof target, "string", `${code}：「${source}」的译文不是字符串`);
      assert.equal(slots(target), slots(source), `${code}：「${source}」的译文占位符不一致`);
    });
  });
});

// 剧情长文（《源血纪元》残页、好感剧情）只要求英文译文，其他语言显示中文原文。
function englishOnlyStoryTexts() {
  const { CF } = createGameContext();
  const texts = new Set();
  CF.LORE_PAGES.forEach(page => { texts.add(page.title); page.paragraphs.forEach(text => texts.add(text)); });
  Object.values(CF.BOND_PERSONAL_STORIES).forEach(text => texts.add(text));
  Object.entries(CF.BondStories.RACE_CHAPTERS).forEach(([chapter, book]) => {
    texts.add(book.title);
    texts.add(`《${book.title}》`);
    book.chapters.forEach(entry => { texts.add(entry.title); texts.add(entry.text); });
    for (let level = 1; level <= 5; level++) texts.add(CF.BondStories.voice(Number(chapter), level));
  });
  return texts;
}

test("每种非中文语言都覆盖英文词典的绝大部分条目", () => {
  const dictionaries = loadDictionaries();
  const storyTexts = englishOnlyStoryTexts();
  const reference = Object.keys(dictionaries.en.exact).filter(key => !storyTexts.has(key));
  Object.entries(dictionaries).filter(([code]) => !code.startsWith("zh") && code !== "en").forEach(([code, dict]) => {
    const missing = reference.filter(key => !(key in dict.exact));
    // 允许少量差异（个别语言单独合并了句式），大面积缺失说明新文本漏翻了。
    assert.ok(missing.length <= reference.length * 0.02, `${code} 缺少 ${missing.length} 条英文已有的译文，例如：${missing.slice(0, 5).join(" / ")}`);
  });
});

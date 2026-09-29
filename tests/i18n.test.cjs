// 翻译层（js/i18n.js）的句式匹配规则。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { root } = require("./helpers/game-context.cjs");

// 在没有 DOM 的沙箱里加载 i18n.js 与全部词典，返回指定语言的 CF.I18n。
function loadI18n(lang) {
  const context = vm.createContext({
    window: { CardForge: {} },
    localStorage: { getItem: () => lang, setItem() {} },
    navigator: { languages: [] },
    document: { documentElement: {}, title: "" },
    MutationObserver: class { observe() {} },
    Node: {}
  });
  vm.runInContext("var window = this.window;", context);
  vm.runInContext(fs.readFileSync(path.join(root, "js/i18n.js"), "utf8"), context, { filename: "js/i18n.js" });
  const I18n = context.window.CardForge.I18n;
  I18n.translateTree = () => {};
  fs.readdirSync(path.join(root, "js/i18n")).forEach(name => {
    const file = path.join(root, "js/i18n", name);
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  });
  return I18n;
}

test("以空格开头的后缀译文不会和前一个词粘在一起", () => {
  const I18n = loadI18n("en");
  assert.equal(I18n.t("本回合恢复1点法力并抽1张牌。"), "Restore 1 mana this turn and draw 1 cards.");
});

test("营地、监狱与夜晚事件的文字都有译文", () => {
  const I18n = loadI18n("en");
  assert.equal(I18n.t("第3天"), "Day 3");
  assert.equal(I18n.t("每战-14 · 每天-42"), "-14/battle · -42/day");
  assert.equal(I18n.t("探望泥牙斥候长"), "Visit Mudfang Scout Captain");
  assert.equal(I18n.t("⛏️ 哥布林·下矿"), "⛏️ Goblins · Mining");
  assert.equal(I18n.t("拥有 3 件 · +1攻击"), "Owned: 3 · +1 Attack");
});

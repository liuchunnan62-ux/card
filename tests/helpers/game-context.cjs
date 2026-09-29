// 在 Node 的 vm 沙箱里加载游戏脚本，供各测试文件共用。
// 脚本清单直接取自 index.html 的 <script> 顺序（跳过需要真实 DOM 的 i18n 与 main.js），
// 这样新增脚本只需改 index.html 一处，测试会自动跟上。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const DOM_ONLY_SCRIPTS = new Set(["js/main.js"]);

function indexScripts() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
}

function gameScripts() {
  return indexScripts().filter(file => !file.startsWith("js/i18n") && !DOM_ONLY_SCRIPTS.has(file));
}

// 可选参数：math 替换 Math（例如注入可复现的随机数），timers 替换 setTimeout/clearTimeout（例如让战斗动画延时立即结束）。
function createGameContext({ storage = new Map(), scripts = gameScripts(), math = Math, timers = { setTimeout, clearTimeout } } = {}) {
  const events = [];
  const context = vm.createContext({
    console,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    Math: math,
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
  context.dispatchEvent = event => { events.push(event); return true; };
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return { context, CF: context.CardForge, storage, events };
}

module.exports = { root, indexScripts, gameScripts, createGameContext };

(function () {
  "use strict";

  // 多语言翻译层：游戏代码照常输出简体中文，本模块在文字显示到页面前将其替换为所选语言。
  // 每种语言的词典位于 js/i18n/<语言代码>.js，通过 CF.I18n.register() 注册：
  //   exact    —— 完整中文文本 → 译文
  //   patterns —— 含变量的句式，例如 ["对{0}造成{1}点伤害", "Deal {1} damage to {0}"]
  //   chars    —— （可选）逐字替换表，用于繁体中文兜底
  // 变量部分会被递归翻译，因此卡牌名、数字等都能正确显示。

  const CF = window.CardForge = window.CardForge || {};
  const STORAGE_KEY = "rift-expedition-language-v1";
  const SOURCE_LANG = "zh-CN";
  const HAN = /[㐀-鿿]/;
  const LANGUAGES = [
    { code: "zh-CN", label: "简体中文" },
    { code: "zh-TW", label: "繁體中文" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" }
  ];
  const TRANSLATABLE_ATTRIBUTES = ["alt", "title", "aria-label", "placeholder", "data-label"];
  const dictionaries = {};

  function readStoredLanguage() {
    try { return localStorage.getItem(STORAGE_KEY); }
    catch { return null; }
  }

  function detectLanguage() {
    const preferred = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""])
      .map(code => String(code).toLowerCase());
    for (const code of preferred) {
      if (/^zh-(tw|hk|mo|hant)/.test(code)) return "zh-TW";
      if (code.startsWith("zh")) return "zh-CN";
      if (code.startsWith("ja")) return "ja";
      if (code.startsWith("ko")) return "ko";
      if (code.startsWith("en")) return "en";
    }
    return SOURCE_LANG;
  }

  function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function compileDictionary(raw) {
    const exact = new Map(Object.entries(raw.exact || {}));
    const patterns = (raw.patterns || []).map(([source, target]) => {
      const order = [];
      const body = source.split(/(\{\d+\})/).map(part => {
        const slot = part.match(/^\{(\d+)\}$/);
        if (!slot) return escapeRegExp(part);
        order.push(Number(slot[1]));
        return "([\\s\\S]*?)";
      }).join("");
      return { regex: new RegExp(`^${body}$`), order, target, weight: source.replace(/\{\d+\}/g, "").length };
    }).sort((a, b) => b.weight - a.weight);
    return {
      exact,
      patterns,
      chars: raw.chars ? new Map(Object.entries(raw.chars)) : null,
      joiners: raw.joiners || {},
      cache: new Map(),
      outputs: new Set()
    };
  }

  const SPLITTERS = [
    { regex: /(?<=[。！？])/, joinKey: "" },
    { regex: / · /, joinKey: " · " },
    { regex: /、/, joinKey: "、" },
    { regex: /；/, joinKey: "；" },
    { regex: /，/, joinKey: "，" }
  ];

  const I18n = {
    languages: LANGUAGES,
    lang: SOURCE_LANG,
    observer: null,

    register(code, raw) {
      dictionaries[code] = compileDictionary(raw);
      if (code === this.lang) this.translateTree(document.documentElement);
    },

    init() {
      const stored = readStoredLanguage();
      this.lang = LANGUAGES.some(item => item.code === stored) ? stored : detectLanguage();
      document.documentElement.lang = this.lang;
      this.observer = new MutationObserver(records => this.handleMutations(records));
      this.observer.observe(document.documentElement, {
        subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: TRANSLATABLE_ATTRIBUTES
      });
      this.translateTree(document.documentElement);
    },

    setLanguage(code) {
      if (!LANGUAGES.some(item => item.code === code)) return;
      this.lang = code;
      document.documentElement.lang = code;
      try { localStorage.setItem(STORAGE_KEY, code); }
      catch { /* Language preference is optional. */ }
    },

    active() { return this.lang === SOURCE_LANG ? null : dictionaries[this.lang] || null; },

    // 翻译一段文本；找不到译文时尽量保留原文。
    t(text) {
      const dict = this.active();
      if (!dict || typeof text !== "string" || !HAN.test(text)) return text;
      return this.translateWith(dict, text, 0);
    },

    translateWith(dict, text, depth) {
      if (!HAN.test(text) || dict.outputs.has(text)) return text;
      const cached = dict.cache.get(text);
      if (cached !== undefined) return cached;
      const lead = text.match(/^\s*/)[0];
      const tail = text.slice(lead.length).match(/\s*$/)[0];
      const core = text.slice(lead.length, text.length - tail.length).replace(/\s+/g, " ");
      let result = this.translateCore(dict, core, depth);
      if (result === null) result = dict.chars ? this.convertChars(dict, core) : core;
      result = lead + result + tail;
      dict.cache.set(text, result);
      dict.outputs.add(result);
      return result;
    },

    translateCore(dict, text, depth) {
      if (!HAN.test(text)) return text;
      if (dict.exact.has(text)) return dict.exact.get(text);
      if (depth > 6) return null;
      for (const pattern of dict.patterns) {
        const match = pattern.regex.exec(text);
        if (!match) continue;
        const values = {};
        pattern.order.forEach((slot, index) => {
          const value = match[index + 1];
          values[slot] = HAN.test(value) ? this.translateWith(dict, value, depth + 1) : value;
        });
        return pattern.target.replace(/\{(\d+)\}/g, (_, slot) => values[slot] ?? "");
      }
      for (const splitter of SPLITTERS) {
        const parts = text.split(splitter.regex);
        if (parts.length < 2) continue;
        const translated = parts.map(part => {
          const trimmed = part.trim();
          if (!trimmed) return "";
          return this.translateCore(dict, trimmed, depth + 1);
        });
        if (translated.some(part => part === null)) continue;
        const joiner = dict.joiners[splitter.joinKey] ?? splitter.joinKey;
        return translated.filter(part => part !== "").join(joiner);
      }
      return null;
    },

    convertChars(dict, text) {
      let result = "";
      for (const char of text) result += dict.chars.get(char) || char;
      return result;
    },

    shouldSkip(node) {
      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      return Boolean(element?.closest("script, style, [data-no-i18n]"));
    },

    translateTextNode(node) {
      if (!HAN.test(node.data) || this.shouldSkip(node)) return;
      const translated = this.t(node.data);
      if (translated !== node.data) node.data = translated;
    },

    translateAttributes(element) {
      if (this.shouldSkip(element)) return;
      for (const name of TRANSLATABLE_ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (!value || !HAN.test(value)) continue;
        const translated = this.t(value);
        if (translated !== value) element.setAttribute(name, translated);
      }
    },

    translateTree(root) {
      if (!this.active() || !root) return;
      if (root.nodeType === Node.TEXT_NODE) return this.translateTextNode(root);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      if (root === document.documentElement) {
        const title = this.t(document.title);
        if (title !== document.title) document.title = title;
      }
      this.translateAttributes(root);
      root.querySelectorAll("*").forEach(element => this.translateAttributes(element));
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) this.translateTextNode(node);
    },

    handleMutations(records) {
      if (!this.active()) return;
      for (const record of records) {
        if (record.type === "characterData") this.translateTextNode(record.target);
        else if (record.type === "attributes") this.translateAttributes(record.target);
        else record.addedNodes.forEach(node => this.translateTree(node));
      }
    },

    selectorHTML(className = "") {
      const options = LANGUAGES.map(item => `<option value="${item.code}" ${item.code === this.lang ? "selected" : ""}>${item.label}</option>`).join("");
      return `<label class="language-select ${className}" data-no-i18n><span aria-hidden="true">🌐</span><select data-language-select aria-label="Language">${options}</select></label>`;
    }
  };

  CF.I18n = I18n;
  I18n.init();
})();

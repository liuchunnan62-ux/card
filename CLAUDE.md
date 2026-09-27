# 裂隙征途 · 项目速查

原生 HTML/CSS/JS 单机卡牌闯关游戏，无构建、无依赖、无后端。`index.html` 按顺序加载 `js/*.js`，全部挂在 `window.CardForge`（代码里写作 `CF`）上。

## 文件地图（先看这里，再按需 grep，不要整文件通读大文件）
- `js/cards.js` 卡牌库 `CARD_LIBRARY`、`getCard`、`makeDeck`、各关奖励卡 ID 列表
- `js/game.js`（~2300 行）战斗类 `Battle`：出牌 `selectCard`/`castPlayerSpell`、英雄技能 `selectSkill`/`castSkill`/`castSignatureSkill`、回合 `startPlayerTurn`、可选目标 `isTargetable`、提示 `instruction`
- `js/main.js`（~1300 行）界面对象 `UI`：各 `render*` 页面、点击事件在文件末尾的 `data-action` / `data-modal-action` 分发
- `js/save.js` 存档 `SaveSystem`：`freshSave`/`normalize`、15 个栏位（`newGame`/`loadSlot`/`saveToSlot`/`deleteSlot`），进度自动写入当前栏位
- `js/heroes.js` 选人英雄 `HEROES`（顺序与原立绘图一致，第 6/8/12 个是锁定的成就英雄）和 8 个独特技能 `SIGNATURE_SKILLS`
- `js/arena.js` 竞技场与 63 种竞技场技能 `HERO_SKILLS`；`js/trials.js` 七场统领试炼（`configureBattle` 里按试炼 id 设置残局）
- `js/adventure.js` 章节地图与节点；`js/enemies.js`、`js/boss-dialogues.js` 敌人与台词
- `css/style.css` 全部样式；图片在 `assets/`（卡图 `assets/cards/`，英雄头像 `assets/heroes/`）

## 约定
- 代码里的显示文字一律写简体中文；`js/i18n.js` 在显示前替换成所选语言。
- 新增/修改中文文本后，要在 `js/i18n/{en,ja,ko,es,pt,fr,de,ru}.js` 的 `"exact"` 里补译文（键=中文原文，`{0}` 为变量）；繁体中文自动转换，无需补。用户说“先不翻译”时可跳过。
- 修改已有中文句子时，旧译文的键也要一起改，否则那句会显示中文。
- 新增卡图：卡牌只用插画（游戏自己画卡框、费用和文字），存为 webp。
- 试炼专属卡不要放进 `CARD_LIBRARY`（否则会进入奖励、商店），参考 `trials.js` 的 `frontlineStrike`。

## 验证
- 测试：`node tests/game-rules.test.cjs`（改规则时同步更新/新增断言）。
- 需要看界面时：`python3 -m http.server 8765` 后用 Playwright 截图；用户没要求时，小改动不必截图。

## 提交与合并
- 在指定分支开发 → 提交 → 推送 → 开 PR 到 `main` → squash 合并（与之前的 PR 一致）。用户说“合并”时直接执行这一整套。
- 提交信息与 PR 用中文。

# 裂隙征途 · 开发约定

原生 HTML/CSS/JavaScript 单机卡牌冒险。**没有构建步骤、没有运行时依赖**，双击 `index.html` 就能玩，
Windows 离线包（`packaging/windows`）和安卓 WebView 包（`packaging/android`）直接打包项目文件。
下面的约定都是为了守住这一点。

## 代码结构

- 每个 `js/*.js` 是一个立即执行函数，把自己的接口挂到全局 `window.CardForge`（代码里简称 `CF`），
  例如 `CF.SaveSystem`、`CF.Restaurant`。模块之间只通过 `CF` 互相调用。
- **不要改成 ES Modules（`import`/`export`）或引入打包工具**：浏览器在 `file://` 下会拒绝加载模块脚本，
  双击 `index.html` 就会白屏。
- 加载顺序由 `index.html` 里的 `<script defer>` 顺序决定。新增脚本必须加进 `index.html`
  （测试会检查 `js/` 下的每个文件都被引用了）；它依赖的模块要排在前面。
- `js/main.js` 是界面层（需要真实 DOM）；其余脚本应当能在没有 DOM 的 Node 环境里加载，方便测试。
  界面以外的逻辑不要直接碰 `document`。

| 文件 | 内容 |
| --- | --- |
| `data/chapters.js` | **关卡数据表**：每关的节点（首领名、类型、敌人、头像、地图坐标、武器掉落）、路线、首领强度公式、胜利奖励、地图文案与通关总结 |
| `data/economy.js` | **经济数值表**：粮食与面粉、游戏时间、客栈、好感等级、族群口味、餐馆食物、派遣收益 |
| `data/lore.js` `data/road-events.js` | 《源血纪元》残页、冒险地图上的随机事件 |
| `cards.js` `enemies.js` `heroes.js` | 卡牌库、敌人、英雄数据 |
| `boss-dialogues.js` `emotes.js` `bond-stories.js` | 剧情台词与表情 |
| `adventure.js` `trials.js` `arena.js` | 冒险关卡、统领试炼、竞技场 |
| `restaurant.js` `clock.js` `labor.js` `night-events.js` | 营地经营：餐馆/好感/粮食、游戏时间、派遣劳动、夜晚事件 |
| `game.js` | 战斗规则与战斗流程 |
| `save.js` | 存档（栏位、版本迁移、备份、导出/导入） |
| `sound.js` `music.js` | 程序化音效与配乐（Web Audio，无音频文件） |
| `i18n.js` `i18n/*.js` | 翻译层与各语言词典 |
| `main.js` | 所有界面渲染与点击事件 |

## 内容与数值（js/data/）

- 调整首领、关卡数值、地图位置、奖励、食物价格、派遣收益等，**只改 `js/data/` 下的数据表**；逻辑代码只读表，不要在 `adventure.js`、`main.js` 里写死章节数值或按 `chapter === N` 分支取文案。
- 每张表开头的注释说明了各字段含义。改完运行 `npm test`：`tests/content-data.test.cjs` 会检查敌人、卡牌、图片是否存在、路线是否连通、公式参数是否有效，出错时会指出“第几关节点几”。
- 新增整整一关目前仍需要改代码：`save.js` 的各关首杀奖励字段、`cards.js` 的奖励卡、`boss-dialogues.js`、`bond-stories.js`、CSS 地图样式与战场背景，以及 `game.js` 中新的首领被动。

## 平衡模拟（tools/）

```
npm run simulate                              # 每个战斗节点模拟 20 场，输出各关胜率
node tools/simulate.cjs --chapter 2 --runs 50 # 只看第二关，模拟更多场
node tools/simulate.cjs --sweep mana          # 最大法力 3~10 时各关的平均胜率
node tools/simulate.cjs --economy             # 按天推演金币、粮食与结缘进度
node tools/simulate.cjs --help                # 全部参数
```

- `tools/sim/bot.cjs` 是只通过界面点击接口操作的玩家机器人（贪心的“中等水平玩家”），`tools/sim/runner.cjs` 在 Node 沙箱中加载真实游戏脚本并批量对战，`tools/sim/economy.cjs` 用真实的餐馆/粮食/时间/派遣代码按天推演。
- 玩家成长假设（等级、法力、卡牌等级、装备、好感）在 `tools/sim/profiles.cjs`，结果高度依赖这些假设；对比改动前后时保持参数和 `--seed` 不变。
- 改了数据表中的数值，可以先跑一遍模拟看胜率曲线有没有异常的跳变或死角。

## 存档

- 存档数据是 `CF.SaveSystem.data`，修改后调用 `CF.SaveSystem.save()`。
- **给存档加新字段**：在 `save.js` 的 `freshSave()` 里写默认值，并在 `normalize()` 里对旧存档补默认值、清洗非法值。
- **改动已有字段的结构**（改名、搬家、换格式）：把 `SAVE_VERSION` 加 1，在 `MIGRATIONS` 里加一步
  `旧版本号: raw => 新结构`。每一步只需处理上一版本的数据。版本号比当前游戏新的存档会被拒绝读取和导入，避免旧版本游戏把新数据弄丢。
- 每次写入栏位前会（最多每10分钟）把旧内容复制到 `rift-expedition-slot-N-backup`，主存档损坏时自动改用备份。
- 写入失败会派发 `savefailed` 事件，界面会提示玩家导出存档。

## 多语言

- 代码里照常写简体中文；`i18n.js` 在文字显示前按整段文本替换成所选语言。
- 新增或修改界面文字后，要在 `js/i18n/{en,ja,ko,es,pt,fr,de,ru}.js` 的 `exact` 里补上译文，键必须与显示出来的**整段文本**完全一致；
  文本里的变量用 `{0}`、`{1}` 占位（例如 `"导出栏位{0}": "Export Slot {0}"`）。繁体中文会自动逐字转换，一般不用补。
- 不应被翻译的内容（例如存档文本框）加 `data-no-i18n` 属性。
- 测试会检查译文占位符与原文一致，以及各语言没有大面积漏翻。

## 测试

```
npm test            # 等同于 node tests/run-all.cjs，Node 18+，无需 npm install
```

- `tests/helpers/game-context.cjs` 按 `index.html` 的脚本顺序把游戏加载进 Node 的 `vm` 沙箱（跳过 `main.js` 和翻译），新测试直接复用它。
- 新测试文件命名为 `tests/*.test.cjs`，使用 Node 自带的 `node:test` 与 `node:assert/strict`。
- 测试里不要依赖随机结果；需要随机的逻辑请让它可以被确定地触发。
- GitHub Actions（`.github/workflows/tests.yml`）会在推送 main 和每个 Pull Request 上运行 `npm test`。

## 素材

- 图片放在 `assets/` 下，代码与 CSS 里用相对路径引用（`assets/...` 或 CSS 中的 `../assets/...`）。
  测试会扫描所有引用并检查文件存在。
- 新增文件类型时，记得同时在 `start-server.ps1` 和 `packaging/windows/portable-server.mjs` 的 MIME 表里登记。

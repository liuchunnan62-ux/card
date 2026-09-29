// 存档系统：版本迁移、自动备份与损坏恢复、写入失败提示、导出/导入。
const test = require("node:test");
const assert = require("node:assert/strict");
const { createGameContext } = require("./helpers/game-context.cjs");

const MAIN_KEY = "rift-expedition-save-v1";
const ACTIVE_KEY = "rift-expedition-active-slot";
const slotKey = slot => `rift-expedition-slot-${slot}`;
const backupKey = slot => `${slotKey(slot)}-backup`;

function freshGame(storage = new Map()) {
  const game = createGameContext({ storage });
  game.CF.SaveSystem.load();
  return game;
}

test("新存档带有当前结构版本号", () => {
  const { CF } = freshGame();
  assert.equal(CF.freshSave().version, CF.SAVE_VERSION);
  assert.equal(CF.SaveSystem.data.version, CF.SAVE_VERSION);
});

test("没有版本号的旧存档会升级到当前版本", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  const legacy = { hero: { heroId: "captain", level: 3, xp: 60, skillLevel: 2 }, deck: [], coins: 77 };
  storage.set(slotKey(4), JSON.stringify(legacy));
  assert.ok(CF.SaveSystem.loadSlot(4));
  assert.equal(CF.SaveSystem.data.version, CF.SAVE_VERSION);
  assert.equal(CF.SaveSystem.data.coins, 77);
  assert.equal(CF.SaveSystem.data.hero.skillLevel, undefined);
  assert.equal(CF.SaveSystem.data.savedAt, undefined, "栏位时间戳不应混进游戏数据");
});

test("更新版本游戏写入的存档不会被旧版本读取或导入", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  const future = { ...CF.freshSave(), version: CF.SAVE_VERSION + 1 };
  storage.set(slotKey(2), JSON.stringify(future));
  assert.equal(CF.SaveSystem.loadSlot(2), null);
  assert.equal(CF.SaveSystem.slotSummary(2).future, true);
  const parsed = CF.SaveSystem.parseImport(JSON.stringify(future));
  assert.deepEqual({ ...parsed }, { ok: false, error: "future" });
  assert.equal(CF.SaveSystem.importToSlot(3, future), false);
  assert.ok(CF.SaveSystem.slotSummary(3).empty);
});

test("覆盖栏位前会保留一份较旧的备份", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  CF.SaveSystem.newGame(1, "captain");
  CF.SaveSystem.data.coins = 111;
  CF.SaveSystem.save();
  const backup = JSON.parse(storage.get(backupKey(1)));
  assert.equal(backup.coins, 50, "第一次覆盖时备份的是覆盖前的内容");
  CF.SaveSystem.data.coins = 222;
  CF.SaveSystem.save();
  assert.equal(JSON.parse(storage.get(backupKey(1))).coins, 50, "10分钟内不会反复轮换备份");
  assert.equal(JSON.parse(storage.get(slotKey(1))).coins, 222);
});

test("栏位主存档损坏时读取自动备份", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  CF.SaveSystem.newGame(5, "captain");
  CF.SaveSystem.data.coins = 999;
  CF.SaveSystem.save();
  storage.set(slotKey(5), "{\"hero\":{\"level\":");
  const summary = CF.SaveSystem.slotSummary(5);
  assert.equal(summary.empty, false);
  assert.equal(summary.fromBackup, true);
  assert.ok(CF.SaveSystem.loadSlot(5));
  assert.equal(CF.SaveSystem.data.coins, 50, "回退到备份时的进度（新游戏初始金币）");
});

test("自动存档损坏时不会用全新存档覆盖当前栏位", () => {
  const storage = new Map();
  const first = freshGame(storage);
  first.CF.SaveSystem.newGame(2, "captain");
  first.CF.SaveSystem.data.coins = 480;
  first.CF.SaveSystem.save();
  storage.set(MAIN_KEY, "not json");
  const { CF } = freshGame(storage);
  assert.equal(CF.SaveSystem.activeSlot, 2);
  assert.equal(CF.SaveSystem.data.coins, 480);
  assert.equal(JSON.parse(storage.get(slotKey(2))).coins, 480);
});

test("删除栏位时一并删除它的备份", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  CF.SaveSystem.newGame(6, "captain");
  CF.SaveSystem.save();
  assert.ok(storage.has(backupKey(6)));
  CF.SaveSystem.deleteSlot(6);
  assert.ok(!storage.has(slotKey(6)) && !storage.has(backupKey(6)));
  assert.ok(CF.SaveSystem.slotSummary(6).empty);
});

test("写入失败时返回 false 并派发 savefailed 事件", () => {
  const storage = new Map();
  const game = freshGame(storage);
  const { CF, context, events } = game;
  CF.SaveSystem.newGame(1, "captain");
  context.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  events.length = 0;
  assert.equal(CF.SaveSystem.save(), false);
  assert.equal(CF.SaveSystem.lastWriteFailed, true);
  assert.ok(events.some(event => event.type === "savefailed"));
});

test("导出单个栏位后可以原样导入到另一个栏位", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  CF.SaveSystem.newGame(1, "captain");
  CF.SaveSystem.data.coins = 1234;
  CF.SaveSystem.data.rations = 42;
  CF.SaveSystem.save();
  const text = CF.SaveSystem.exportSlot(1);
  const envelope = JSON.parse(text);
  assert.equal(envelope.game, "rift-expedition");
  assert.equal(envelope.kind, "slot");
  assert.equal(envelope.saves[0].slot, 1);

  const parsed = CF.SaveSystem.parseImport(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.saves.length, 1);
  assert.equal(parsed.saves[0].summary.coins, 1234);
  assert.equal(CF.SaveSystem.importToSlot(7, parsed.saves[0].data), true);
  assert.equal(CF.SaveSystem.activeSlot, 1, "导入到其他栏位不改变当前栏位");
  assert.ok(CF.SaveSystem.loadSlot(7));
  assert.equal(CF.SaveSystem.data.coins, 1234);
  assert.equal(CF.SaveSystem.data.rations, 42);
});

test("导入到当前栏位会替换正在进行的进度，并先备份原内容", () => {
  const storage = new Map();
  const { CF } = freshGame(storage);
  CF.SaveSystem.newGame(3, "captain");
  const imported = { ...CF.freshSave(), coins: 5 };
  CF.SaveSystem.data.coins = 800;
  CF.SaveSystem.save();
  assert.equal(CF.SaveSystem.importToSlot(3, imported), true);
  assert.equal(CF.SaveSystem.data.coins, 5);
  assert.equal(JSON.parse(storage.get(backupKey(3))).coins, 800);
});

test("导出全部栏位并在新设备上整体导入", () => {
  const source = freshGame(new Map());
  source.CF.SaveSystem.newGame(2, "captain");
  source.CF.SaveSystem.data.coins = 20;
  source.CF.SaveSystem.save();
  source.CF.SaveSystem.newGame(9, "captain");
  source.CF.SaveSystem.data.coins = 90;
  source.CF.SaveSystem.save();
  const text = source.CF.SaveSystem.exportAll();

  const target = freshGame(new Map());
  const parsed = target.CF.SaveSystem.parseImport(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.kind, "all");
  assert.deepEqual(parsed.saves.map(save => save.slot), [2, 9]);
  parsed.saves.forEach(save => assert.ok(target.CF.SaveSystem.importToSlot(save.slot, save.data)));
  assert.equal(target.CF.SaveSystem.slotSummary(2).coins, 20);
  assert.equal(target.CF.SaveSystem.slotSummary(9).coins, 90);
});

test("没有存档时导出返回 null", () => {
  const { CF } = freshGame(new Map());
  assert.equal(CF.SaveSystem.exportAll(), null);
  assert.equal(CF.SaveSystem.exportSlot(1), null);
});

test("导入接受直接粘贴的存档对象，并拒绝无关内容", () => {
  const { CF } = freshGame(new Map());
  const bare = CF.SaveSystem.parseImport(JSON.stringify(CF.freshSave()));
  assert.equal(bare.ok, true);
  assert.equal(bare.saves[0].slot, null);
  assert.equal(CF.SaveSystem.parseImport("").error, "empty");
  assert.equal(CF.SaveSystem.parseImport("hello").error, "format");
  assert.equal(CF.SaveSystem.parseImport("[1,2]").error, "format");
  assert.equal(CF.SaveSystem.parseImport(JSON.stringify({ foo: 1 })).error, "format");
  assert.equal(CF.SaveSystem.parseImport(JSON.stringify({ game: "rift-expedition", saves: [] })).error, "format");
});

test("旧版单一存档仍迁移到1号栏位", () => {
  const storage = new Map();
  const seed = createGameContext({ storage: new Map() });
  storage.set(MAIN_KEY, JSON.stringify({ ...seed.CF.freshSave(), coins: 66 }));
  const { CF } = freshGame(storage);
  assert.equal(CF.SaveSystem.activeSlot, 1);
  assert.equal(JSON.parse(storage.get(slotKey(1))).coins, 66);
  assert.equal(storage.get(ACTIVE_KEY), "1");
});

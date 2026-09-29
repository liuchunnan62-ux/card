// 运行 tests/ 下全部 *.test.cjs：node tests/run-all.cjs（或 npm test）。
// 显式列出文件再交给 node --test，Windows PowerShell 与各版本 Node 行为一致，无需任何依赖。
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const dir = __dirname;
const files = fs.readdirSync(dir).filter(name => name.endsWith(".test.cjs")).sort().map(name => path.join(dir, name));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);

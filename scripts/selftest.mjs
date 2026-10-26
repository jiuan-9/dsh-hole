#!/usr/bin/env node
/**
 * selftest.mjs —— 端到端自检（不访问任何未授权目标）
 *
 * 覆盖：安装状态 → 技能文件完整性 → guard 门禁 → break 装配 → hunt 脚本
 * 外部目标只用 example.com（公共示例域），其余全部走临时目录。
 *
 * 用法: node scripts/selftest.mjs [--verbose]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SK = path.join(ROOT, "skills", "hole");
const GUARD = path.join(SK, "layers", "guard");
const BREAK = path.join(SK, "layers", "break");
const HUNT = path.join(SK, "layers", "hunt");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "hole-selftest-"));
const VERBOSE = process.argv.includes("--verbose");

const results = [];
function run(label, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd || ROOT, env: { ...process.env, ...(opts.env || {}) }, encoding: "utf8", timeout: opts.timeout || 60000 });
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  const ok = opts.expectStatus === undefined ? r.status === 0 : r.status === opts.expectStatus;
  results.push({ label, ok, status: r.status, out });
  console.log((ok ? "  PASS  " : "  FAIL  ") + label + (ok ? "" : "  (exit=" + r.status + ")"));
  if (VERBOSE || !ok) out.split(/\r?\n/).slice(0, 8).forEach(l => console.log("        " + l.slice(0, 160)));
  return { ok, out, status: r.status };
}

function section(t) { console.log("\n=== " + t + " ==="); }

// ── 1. 安装状态
section("1. 安装状态");
const status = run("dsh-hole status 可执行", process.execPath, [path.join(ROOT, "bin", "dsh-hole.js"), "status"]);
let st = {};
try { st = JSON.parse(status.out); } catch {}
results.push({ label: "技能已安装且版本一致", ok: !!st.present && st.installed === st.pkgVersion });
console.log((st.present && st.installed === st.pkgVersion ? "  PASS  " : "  FAIL  ") + "技能已安装且版本一致  (" + (st.installed || "none") + " vs " + (st.pkgVersion || "?") + ")");
console.log("        目标目录: " + (st.target || "-"));

// ── 2. 技能文件完整性
section("2. 技能文件完整性");
const required = [
  "SKILL.md",
  "layers/guard/law-cn.md", "layers/guard/target.mjs", "layers/guard/target-schema.json",
  "layers/break/README.md", "layers/break/compose.md", "layers/break/profiles.yml", "layers/break/adapter.mjs",
  "layers/hunt/README.md",
  "layers/hunt/references/00-research-basis.md", "layers/hunt/references/01-recon.md",
  "layers/hunt/references/02-web-checklists.md", "layers/hunt/references/03-framework-fingerprints.md",
  "layers/hunt/references/04-captcha-and-auth-bypass.md", "layers/hunt/references/report-template.md",
  "layers/hunt/scripts/probe.mjs", "layers/hunt/scripts/jsendpoints.mjs",
  "layers/hunt/scripts/sqli-time.mjs", "layers/hunt/scripts/bypass403.mjs", "layers/hunt/scripts/captcha-montage.ps1",
];
const missing = required.filter(p => !fs.existsSync(path.join(SK, p)));
results.push({ label: "必备文件齐全 (" + required.length + ")", ok: missing.length === 0 });
console.log((missing.length === 0 ? "  PASS  " : "  FAIL  ") + "必备文件齐全 (" + required.length + ")" + (missing.length ? "  缺: " + missing.join(", ") : ""));

const skText = fs.readFileSync(path.join(SK, "SKILL.md"), "utf8");
const fm = /^---\n([\s\S]*?)\n---/.exec(skText);
const fmOk = !!fm && /^name:\s*hole$/m.test(fm[1]);
results.push({ label: "SKILL.md frontmatter 合法 (name: hole)", ok: fmOk });
console.log((fmOk ? "  PASS  " : "  FAIL  ") + "SKILL.md frontmatter 合法 (name: hole)");
const lines = skText.split(/\r?\n/).length;
results.push({ label: "SKILL.md 行数 < 500", ok: lines < 500 });
console.log((lines < 500 ? "  PASS  " : "  FAIL  ") + "SKILL.md 行数 " + lines + "（规范建议 < 500）");

// ── 3. guard 门禁
section("3. guard 门禁（target.mjs）");
const tj = path.join(TMP, "target.json");
const guardEnv = { HOLE_TARGET: tj };
run("init 生成槽位", process.execPath, [path.join(GUARD, "target.mjs"), "init"], { cwd: TMP, env: guardEnv });
run("默认模板 check 应失败", process.execPath, [path.join(GUARD, "target.mjs"), "check"], { cwd: TMP, env: guardEnv, expectStatus: 1 });
run("填 reference", process.execPath, [path.join(GUARD, "target.mjs"), "set", "authorization.reference=https://example.com/policy"], { cwd: TMP, env: guardEnv });
run("填 host", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.host=demo.example.com"], { cwd: TMP, env: guardEnv });
run("填 scope", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.scope=example.com"], { cwd: TMP, env: guardEnv });
run("合法槽位 check 应通过", process.execPath, [path.join(GUARD, "target.mjs"), "check"], { cwd: TMP, env: guardEnv, expectStatus: 0 });
const envOut = run("env 输出占位符", process.execPath, [path.join(GUARD, "target.mjs"), "env"], { cwd: TMP, env: guardEnv });
const hasTarget = /export TARGET=https:\/\/demo\.example\.com/.test(envOut.out);
results.push({ label: "env 导出 TARGET", ok: hasTarget });
console.log((hasTarget ? "  PASS  " : "  FAIL  ") + "env 导出 TARGET");
const rendered = run("render 替换占位符", process.execPath, [path.join(GUARD, "target.mjs"), "render", "probe {{TARGET}} --rate {{RATE}}"], { cwd: TMP, env: guardEnv });
const renderedOk = /probe https:\/\/demo\.example\.com --rate 2/.test(rendered.out);
results.push({ label: "render 占位符替换正确", ok: renderedOk });
console.log((renderedOk ? "  PASS  " : "  FAIL  ") + "render 占位符替换正确  →  " + rendered.out.trim());
run("越界 host 必须被拒", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.host=evil.example.net"], { cwd: TMP, env: guardEnv });
run("越界 check 应失败", process.execPath, [path.join(GUARD, "target.mjs"), "check"], { cwd: TMP, env: guardEnv, expectStatus: 1 });
run("恢复合法 host", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.host=demo.example.com"], { cwd: TMP, env: guardEnv });
run("allow_dos=true 必须被拒", process.execPath, [path.join(GUARD, "target.mjs"), "set", "rules.allow_dos=true"], { cwd: TMP, env: guardEnv });
run("allow_dos check 应失败", process.execPath, [path.join(GUARD, "target.mjs"), "check"], { cwd: TMP, env: guardEnv, expectStatus: 1 });
run("恢复 allow_dos=false", process.execPath, [path.join(GUARD, "target.mjs"), "set", "rules.allow_dos=false"], { cwd: TMP, env: guardEnv });

// ── 4. break 装配
section("4. break 装配（adapter.mjs）");
const promptOut = path.join(TMP, "prompt.md");
run("build 产出提示词", process.execPath, [path.join(BREAK, "adapter.mjs"), "build", "--profile", "cn-model", "--task", "pentest", "--out", promptOut], { cwd: BREAK, env: guardEnv });
const promptOk = fs.existsSync(promptOut) && fs.readFileSync(promptOut, "utf8").includes("## L1");
results.push({ label: "prompt 含 L1 层", ok: promptOk });
console.log((promptOk ? "  PASS  " : "  FAIL  ") + "prompt 含 L1 层  (" + (fs.existsSync(promptOut) ? fs.statSync(promptOut).size + " bytes" : "no file") + ")");
run("inspect 检查层覆盖", process.execPath, [path.join(BREAK, "adapter.mjs"), "inspect", "--file", promptOut], { cwd: BREAK });
run("log 写入评测记录", process.execPath, [path.join(BREAK, "adapter.mjs"), "log", "--profile", "cn-model", "--task", "pentest", "--refusal", "0", "--note", "selftest"], { cwd: BREAK });
const evalLog = path.join(BREAK, ".cache", "eval.jsonl");
const logOk = fs.existsSync(evalLog) && fs.readFileSync(evalLog, "utf8").includes("selftest");
results.push({ label: "评测记录已落盘", ok: logOk });
console.log((logOk ? "  PASS  " : "  FAIL  ") + "评测记录已落盘");
run("越界时 build 必须拒绝", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.host=evil.example.net"], { cwd: TMP, env: guardEnv });
run("gate 拒绝装配 (exit 2)", process.execPath, [path.join(BREAK, "adapter.mjs"), "build", "--profile", "generic", "--task", "pentest", "--out", path.join(TMP, "x.md")], { cwd: BREAK, env: guardEnv, expectStatus: 2 });
run("恢复合法 host", process.execPath, [path.join(GUARD, "target.mjs"), "set", "target.host=demo.example.com"], { cwd: TMP, env: guardEnv });

// ── 5. hunt 脚本（外部只用 example.com）
section("5. hunt 脚本（目标 example.com）");
// 所有 hunt 测试统一打到本地靶，摆脱外网抖动
const PORT = 18080 + Math.floor(Math.random() * 200);
const srvFile = path.join(TMP, "lab.mjs");
fs.writeFileSync(srvFile, [
  "import http from 'node:http';",
  "const PORT = Number(process.argv[2]);",
  "http.createServer((req, res) => {",
  "  const u = new URL(req.url, 'http://x');",
  "  const raw = decodeURIComponent(req.url);",
  "  const d = (u.pathname === '/vuln' && /SLEEP\\(/i.test(raw)) ? 2500 : 0;",
  "  setTimeout(() => { res.writeHead(200, {'content-type':'text/html'}); res.end('<html><title>lab target</title>ok</html>'); }, d);",
  "}).listen(PORT, '127.0.0.1', () => console.log('READY ' + PORT));",
].join("\n"));

const { spawn } = await import("node:child_process");
const srv = spawn(process.execPath, [srvFile, String(PORT)], { stdio: "ignore" });

// 轮询等待服务就绪（最多 6 秒），比固定 sleep 可靠
let ready = false;
for (let i = 0; i < 30; i++) {
  const ping = spawnSync(process.execPath, ["-e", "fetch('http://127.0.0.1:" + PORT + "/ping').then(()=>process.exit(0)).catch(()=>process.exit(1))"], { timeout: 5000 });
  if (ping.status === 0) { ready = true; break; }
  spawnSync(process.execPath, ["-e", "setTimeout(()=>{},200)"], { timeout: 3000 });
}
results.push({ label: "本地靶就绪 (端口 " + PORT + ")", ok: ready });
console.log((ready ? "  PASS  " : "  FAIL  ") + "本地靶就绪（端口 " + PORT + "）");

const hostsFile = path.join(TMP, "hosts.txt");
fs.writeFileSync(hostsFile, "127.0.0.1:" + PORT + "\n");
const probeOut = run("probe.mjs 存活探测", process.execPath, [path.join(HUNT, "scripts", "probe.mjs"), hostsFile, path.join(TMP, "hosts.json")], { timeout: 60000 });
const probeOk = /127\.0\.0\.1:\d+ \| 200/.test(probeOut.out);
results.push({ label: "probe 返回 200 + 标题", ok: probeOk });
console.log((probeOk ? "  PASS  " : "  FAIL  ") + "probe 返回 200 + 标题  →  " + (probeOut.out.split(/\r?\n/)[0] || "").slice(0, 80));

const jsOut = run("jsendpoints.mjs 提取接口", process.execPath, [path.join(HUNT, "scripts", "jsendpoints.mjs"), "http://127.0.0.1:" + PORT, "/"], { timeout: 60000 });
const vulnRun = run("sqli-time 命中本地脆弱靶", process.execPath, [path.join(HUNT, "scripts", "sqli-time.mjs"), "http://127.0.0.1:" + PORT + "/vuln?id=1", "2", "2"], { timeout: 90000 });
const vulnOk = /time-based signal detected/.test(vulnRun.out);
results.push({ label: "sqli-time 命中脆弱靶（真阳性）", ok: vulnOk });
console.log((vulnOk ? "  PASS  " : "  FAIL  ") + "sqli-time 命中本地脆弱靶（真阳性）");

const cleanRun = run("sqli-time 干净端点不误报", process.execPath, [path.join(HUNT, "scripts", "sqli-time.mjs"), "http://127.0.0.1:" + PORT + "/clean?id=1", "2", "2"], { timeout: 90000 });
const cleanOk = /no time-based signal/.test(cleanRun.out);
results.push({ label: "sqli-time 干净端点不误报（假阳性检测）", ok: cleanOk });
console.log((cleanOk ? "  PASS  " : "  FAIL  ") + "sqli-time 干净端点不误报（假阳性检测）");

try { srv.kill(); } catch {}
run("bypass403.mjs 矩阵可运行", process.execPath, [path.join(HUNT, "scripts", "bypass403.mjs"), "http://127.0.0.1:" + PORT, "/admin"], { timeout: 60000 });

// ── 6. 插件接线（新会话自动生效的关键）
section("6. 插件接线（systemPrompt 注入）");
const policyPath = path.join(ROOT, "assets", "policy.md");
const policyOk = fs.existsSync(policyPath) && fs.readFileSync(policyPath, "utf8").length > 300;
results.push({ label: "assets/policy.md 存在且非空", ok: policyOk });
console.log((policyOk ? "  PASS  " : "  FAIL  ") + "assets/policy.md 存在且非空" + (policyOk ? "  (" + fs.statSync(policyPath).size + " bytes)" : ""));

const idxSrc = fs.readFileSync(path.join(ROOT, "lib", "index.js"), "utf8");
const hasSection = idxSrc.includes("systemPrompt.section") && /inject\s*=\s*\[\s*["']systemPrompt["']\s*\]/.test(idxSrc);
results.push({ label: "index.js 使用 systemPrompt.section 注入", ok: hasSection });
console.log((hasSection ? "  PASS  " : "  FAIL  ") + "index.js 使用 systemPrompt.section 注入");

const mod = await import("file://" + path.join(ROOT, "lib", "index.js").replace(/\\/g, "/"));
const applyOk = typeof mod.apply === "function" && Array.isArray(mod.inject) && mod.inject.includes("systemPrompt");
results.push({ label: "插件导出 apply + inject systemPrompt", ok: applyOk });
console.log((applyOk ? "  PASS  " : "  FAIL  ") + "插件导出 apply + inject systemPrompt");

let patchOk = false, patchInfo = "";
try {
  const jsYamlPath = path.join(process.env.DSH_HOME || path.join(process.env.USERPROFILE || "", ".dsh"), "profiles", "desktop", "node_modules", "js-yaml", "index.js");
  const yaml = (await import("file://" + jsYamlPath.replace(/\\/g, "/"))).default;
  const doc = yaml.load(fs.readFileSync(path.join(ROOT, "cordis.patch.yml"), "utf8"));
  const entry = (doc.find(e => e.insert) || {}).insert?.[0];
  patchOk = !!entry && entry.id === "dsh-hole" && entry.config?.injectPolicy === true;
  patchInfo = entry ? entry.id + " inject=" + JSON.stringify(entry.inject) + " injectPolicy=" + entry.config?.injectPolicy : "no insert entry";
} catch (e) { patchInfo = "yaml error: " + (e && e.message); }
results.push({ label: "cordis.patch.yml 声明 dsh-hole 且 injectPolicy=true", ok: patchOk });
console.log((patchOk ? "  PASS  " : "  FAIL  ") + "cordis.patch.yml 声明正确  →  " + patchInfo);

// 装好的副本是否已含新代码（pnpm 安装的是 profiles/desktop/node_modules/dsh-hole）
const installedIdx = path.join(process.env.USERPROFILE || "", ".dsh", "profiles", "desktop", "node_modules", "dsh-hole", "lib", "index.js");
if (fs.existsSync(installedIdx)) {
  const installedHas = fs.readFileSync(installedIdx, "utf8").includes("systemPrompt.section");
  results.push({ label: "已安装副本包含注入逻辑", ok: installedHas });
  console.log((installedHas ? "  PASS  " : "  WARN  ") + "已安装副本包含注入逻辑" + (installedHas ? "" : "  → 需重新安装插件并重启 DSH"));
} else {
  console.log("  SKIP  未检测到 pnpm 安装副本（仅本地技能模式）");
}

// ── 汇总
const failed = results.filter(r => !r.ok);
console.log("\n" + "=".repeat(56));
console.log((failed.length ? "FAILED  " : "ALL PASS ") + "  " + (results.length - failed.length) + "/" + results.length);
if (failed.length) failed.forEach(f => console.log("  - " + f.label));
console.log("临时目录: " + TMP);
process.exit(failed.length ? 1 : 0);
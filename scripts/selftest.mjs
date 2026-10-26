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
const hostsFile = path.join(TMP, "hosts.txt");
fs.writeFileSync(hostsFile, "example.com\n");
const probeOut = run("probe.mjs 存活探测", process.execPath, [path.join(HUNT, "scripts", "probe.mjs"), hostsFile, path.join(TMP, "hosts.json")], { timeout: 60000 });
const probeOk = /example\.com \| 200/.test(probeOut.out);
results.push({ label: "probe 返回 200 + 标题", ok: probeOk });
console.log((probeOk ? "  PASS  " : "  FAIL  ") + "probe 返回 200 + 标题  →  " + (probeOut.out.split(/\r?\n/)[0] || "").slice(0, 80));
run("jsendpoints.mjs 提取接口", process.execPath, [path.join(HUNT, "scripts", "jsendpoints.mjs"), "https://example.com", "/"], { timeout: 60000 });
const sqliOut = run("sqli-time.mjs 无注入基线", process.execPath, [path.join(HUNT, "scripts", "sqli-time.mjs"), "https://example.com/?id=1", "2", "1"], { timeout: 90000 });
const sqliOk = /no time-based signal/.test(sqliOut.out);
results.push({ label: "sqli-time 正确判定无信号", ok: sqliOk });
console.log((sqliOk ? "  PASS  " : "  FAIL  ") + "sqli-time 正确判定无信号（误报检测）");
run("bypass403.mjs 矩阵可运行", process.execPath, [path.join(HUNT, "scripts", "bypass403.mjs"), "https://example.com", "/admin"], { timeout: 60000 });

// ── 汇总
const failed = results.filter(r => !r.ok);
console.log("\n" + "=".repeat(56));
console.log((failed.length ? "FAILED  " : "ALL PASS ") + "  " + (results.length - failed.length) + "/" + results.length);
if (failed.length) failed.forEach(f => console.log("  - " + f.label));
console.log("临时目录: " + TMP);
process.exit(failed.length ? 1 : 0);

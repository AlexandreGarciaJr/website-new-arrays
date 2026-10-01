import os from 'node:os'; const require_tmp = os.tmpdir() + '/na-leads.json';
// Servidor local de teste: serve /src (ou --dir) com gzip e um endpoint de teste /api/lead
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const args = process.argv.slice(2); const opt=(k,d)=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:d};
const dir = path.resolve(opt('dir','site')); const port = +opt('port', 4600);
const tipos = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.json':'application/json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
let leads = []; let modo = 'ok';
http.createServer((req,res)=>{
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/lead') {
    if (req.method === 'OPTIONS') { res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}); return res.end(); }
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
      leads.push(JSON.parse(b||'{}')); fs.writeFileSync(require_tmp, JSON.stringify(leads,null,2));
      setTimeout(()=>{ if (modo==='erro') { res.writeHead(500); return res.end('{"ok":false}'); } res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"ok":true}'); }, 600);
    }); return;
  }
  if (u.pathname === '/__modo') { const m = u.searchParams.get('m'); if (m === 'reset') { leads = []; fs.writeFileSync(require_tmp,'[]'); } else modo = m; res.end(m); return; }
  let f = path.join(dir, decodeURIComponent(u.pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
  if (!fs.existsSync(f)) { f = path.join(dir,'404.html'); res.statusCode = 404; }
  const ext = path.extname(f); const dados = fs.readFileSync(f);
  const h = {'Content-Type': tipos[ext]||'application/octet-stream', 'Cache-Control': ext==='.html'?'no-cache':'public, max-age=31536000, immutable'};
  if (/text|javascript|svg|json|xml|manifest/.test(h['Content-Type']) && /br/.test(req.headers['accept-encoding']||'')) { h['Content-Encoding']='br'; res.writeHead(res.statusCode||200,h); return res.end(zlib.brotliCompressSync(dados)); }
  res.writeHead(res.statusCode||200,h); res.end(dados);
}).listen(port, ()=>console.log('http://localhost:'+port+' -> '+dir));

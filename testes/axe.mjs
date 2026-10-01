import { chromium } from 'playwright-core'; import fs from 'node:fs';
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:4600/', {waitUntil:'networkidle'});
  const run = async (tag) => { await p.addScriptTag({content: axe}); const r = await p.evaluate(async()=> (await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']})).violations.map(v=>v.id+' ('+v.nodes.length+'): '+v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | ')));
    console.log(vp.width, tag, r.length? r : 'sem violações'); };
  await run('inicial');
  await p.click('.hero__cta'); await p.waitForTimeout(700);
  await run('form etapa 1');
  await p.click('label:has(input[value="site"])'); await p.click('[data-avancar]'); await p.click('label:has(input[value="hoje"])'); await p.click('[data-avancar]'); await p.click('label:has(input[value="1000"])'); await p.click('[data-avancar]'); await p.click('[data-enviar]'); await p.waitForTimeout(300);
  await run('form etapa 4 com erros');
  await p.close();
}
for (const u of ['/politica-de-privacidade/','/nao-existe']) { const p = await b.newPage(); await p.goto('http://localhost:4600'+u); await p.addScriptTag({content: axe}); console.log(u, await p.evaluate(async()=> (await axe.run()).violations.map(v=>v.id))); }
await b.close();

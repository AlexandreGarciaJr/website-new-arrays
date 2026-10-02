import os from 'node:os'; const require_tmp = os.tmpdir() + '/na-leads.json';
// Teste E2E do formulário do Hero: do CTA até a confirmação, em desktop e celular.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = 'http://localhost:4600/';
const OUT = os.tmpdir() + '/na-form';
fs.mkdirSync(OUT, { recursive: true });
const ok = []; const falhas = [];
const check = (cond, msg) => { (cond ? ok : falhas).push(msg); if (!cond) console.log('FALHOU:', msg); };
const leads = () => { try { return JSON.parse(fs.readFileSync(require_tmp, 'utf8')); } catch { return []; } };
const modo = (m) => fetch(BASE + '__modo?m=' + m);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function nova(vp, { endpoint = true } = {}) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 500, isMobile: vp.width < 500 });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  if (endpoint) {
    await p.route(BASE, async route => {
      const r = await route.fetch(); let body = await r.text();
      body = body.replace('leadEndpoint: ""', 'leadEndpoint: "/api/lead"');
      route.fulfill({ response: r, body });
    });
  }
  await p.goto(BASE, { waitUntil: 'networkidle' });
  // espera o loader terminar (ele cobre a página por ~3,5 s)
  await p.waitForFunction(() => !document.getElementById('ld'), null, { timeout: 10000 });
  p._erros = erros;
  return p;
}

async function fluxoCompleto(p, tag) {
  const cta = p.locator('.hero__cta');
  await cta.click();
  await p.waitForSelector('#diagnostico:not([hidden])');
  await p.waitForTimeout(1400);
  check(await p.locator('.hero').getAttribute('data-estado') === 'form', `${tag}: hero muda para estado form`);
  check(await cta.getAttribute('aria-expanded') === 'true', `${tag}: CTA aria-expanded=true`);
  const foco = await p.evaluate(() => document.activeElement.className);
  check(foco.includes('diag__pergunta'), `${tag}: foco vai para a pergunta da etapa 1 (${foco})`);
  await p.screenshot({ path: `${OUT}/${tag}-1-aberto.png` });

  // validação etapa 1
  await p.click('[data-avancar]');
  check((await p.textContent('#p1-erro')).includes('pelo menos uma'), `${tag}: erro ao avançar sem seleção`);
  await p.screenshot({ path: `${OUT}/${tag}-2-erro-etapa1.png` });

  const opc = v => p.locator(`input[name="necessidades"][value="${v}"]`);
  await p.click('label:has(input[value="trafego_pago"])');
  await p.click('label:has(input[value="site"])');
  await p.click('label:has(input[value="duvida"])');
  check(await opc('duvida').isChecked() && !(await opc('trafego_pago').isChecked()) && !(await opc('site').isChecked()), `${tag}: "dúvida" desmarca as demais`);
  check(await p.isVisible('[data-nota-duvida]'), `${tag}: nota da dúvida aparece`);
  await p.click('label:has(input[value="trafego_pago"])');
  await p.click('label:has(input[value="site"])');
  check(!(await opc('duvida').isChecked()) && await opc('trafego_pago').isChecked(), `${tag}: marcar outra opção desmarca "dúvida"`);
  await p.click('[data-avancar]');
  check((await p.textContent('#diag-etapa')).includes('2 de 4'), `${tag}: indicador Etapa 2 de 4`);

  await p.click('[data-avancar]');
  check((await p.textContent('#p2-erro')).length > 5, `${tag}: erro ao avançar etapa 2 sem seleção`);
  await p.click('label:has(input[value="semana_que_vem"])');
  await p.screenshot({ path: `${OUT}/${tag}-3-etapa2.png` });
  await p.click('[data-voltar]');
  check(await opc('trafego_pago').isChecked() && await opc('site').isChecked(), `${tag}: respostas da etapa 1 preservadas ao voltar`);
  await p.click('[data-avancar]');
  check(await p.locator('input[value="semana_que_vem"]').isChecked(), `${tag}: resposta da etapa 2 preservada`);
  await p.click('[data-avancar]');

  await p.click('label:has(input[value="5000_ou_mais"])');
  await p.screenshot({ path: `${OUT}/${tag}-4-etapa3.png` });
  await p.click('[data-avancar]');
  check((await p.textContent('#diag-etapa')).includes('4 de 4'), `${tag}: chega na etapa 4`);
  check(await p.isVisible('[data-enviar]') && !(await p.isVisible('[data-avancar]')), `${tag}: botão Enviar aparece só na etapa 4`);

  // validação de contato
  await p.click('[data-enviar]');
  check((await p.textContent('#f-nome-erro')).length > 3 && (await p.textContent('#f-consent-erro')).length > 3, `${tag}: erros nos campos vazios`);
  check(await p.getAttribute('#f-nome', 'aria-invalid') === 'true', `${tag}: aria-invalid no campo com erro`);
  await p.fill('#f-nome', 'Maria');
  await p.locator('#f-tel').pressSequentially('11987654321');
  check(await p.inputValue('#f-tel') === '(11) 98765-4321', `${tag}: máscara de telefone (${await p.inputValue('#f-tel')})`);
  await p.fill('#f-email', 'maria@empresa');
  await p.click('[data-enviar]');
  check((await p.textContent('#f-nome-erro')).includes('sobrenome'), `${tag}: exige nome completo`);
  check((await p.textContent('#f-email-erro')).includes('Confira'), `${tag}: valida e-mail`);
  await p.screenshot({ path: `${OUT}/${tag}-5-erros-contato.png` });
  await p.fill('#f-nome', 'Maria Oliveira Teste');
  await p.fill('#f-email', 'maria@empresa.com.br');
  await p.check('#f-consent');
  return p;
}

// ---------- Desktop: sucesso + clique duplo ----------
await modo('reset'); await modo('ok');
let p = await nova({ width: 1440, height: 900 });
await fluxoCompleto(p, 'desktop');
const antes = leads().length;
await p.locator('[data-enviar]').click();
const ocupado = await p.getAttribute('[data-enviar]', 'aria-busy');
await p.locator('[data-enviar]').click({ force: true, timeout: 500 }).catch(() => {});
check(ocupado === 'true', 'desktop: estado de carregamento durante o envio');
await p.waitForSelector('[data-sucesso]:not([hidden])', { timeout: 5000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/desktop-6-sucesso.png` });
const L = leads();
check(L.length - antes === 1, `desktop: exatamente 1 lead enviado mesmo com clique duplo (${L.length - antes})`);
const lead = L[L.length - 1];
check(lead && lead.necessidades.map(n => n.valor).join() === 'trafego_pago,site', 'payload: necessidades');
check(lead && lead.prioridade.valor === 'semana_que_vem' && lead.investimento.valor === '5000_ou_mais', 'payload: prioridade e investimento');
check(lead && lead.contato.nome === 'Maria Oliveira Teste' && lead.contato.telefone_e164 === '+5511987654321' && lead.contato.email === 'maria@empresa.com.br', 'payload: contato');
check(lead && lead.submission_id && lead.origem && 'utm_source' in lead.origem, 'payload: submission_id e origem');
const dl = await p.evaluate(() => JSON.stringify(window.dataLayer));
check(dl.includes('generate_lead') && !dl.includes('maria@') && !dl.includes('98765') && !dl.includes('Oliveira'), 'analytics: generate_lead sem dados pessoais');
// reenvio da mesma solicitação na mesma sessão
await p.click('[data-sucesso] [data-fechar-form]');
await p.waitForTimeout(1600);
check(await p.locator('.hero').getAttribute('data-estado') === 'inicial', 'desktop: fechar volta ao Hero');
check(await p.evaluate(() => document.activeElement.classList.contains('hero__cta')), 'desktop: foco retorna ao CTA');
check(!(await p.locator('input[value="trafego_pago"]').isChecked()), 'desktop: após sucesso, formulário reinicia ao fechar');
check(p._erros.length === 0, 'desktop: sem erros de console ' + p._erros.join(' | '));
await p.close();

// ---------- Erro do servidor: respostas preservadas, retry ----------
await modo('erro');
p = await nova({ width: 1440, height: 900 });
await fluxoCompleto(p, 'erro');
await p.click('[data-enviar]');
await p.waitForSelector('[data-falha]:not([hidden])', { timeout: 5000 });
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/erro-1-falha.png` });
check((await p.textContent('[data-falha-msg]')).includes('instabilidade'), 'erro: mensagem compreensível de falha do servidor');
check(decodeURIComponent(await p.getAttribute('[data-wa-fallback]', 'href')).includes('Tráfego pago'), 'erro: WhatsApp de apoio leva as respostas');
await p.click('[data-revisar]');
check(await p.inputValue('#f-nome') === 'Maria Oliveira Teste' && await p.isChecked('#f-consent'), 'erro: dados preservados após falha');
await modo('ok');
await p.click('[data-enviar]');
await p.waitForSelector('[data-sucesso]:not([hidden])', { timeout: 5000 });
check(true, 'erro: novo envio após falha conclui com sucesso');
await p.close();

// ---------- Sem endpoint configurado: nunca simula sucesso ----------
p = await nova({ width: 1440, height: 900 }, { endpoint: false });
await fluxoCompleto(p, 'semendpoint');
await p.click('[data-enviar]');
await p.waitForSelector('[data-falha]:not([hidden])', { timeout: 5000 });
check(await p.isHidden('[data-sucesso]') && (await p.textContent('[data-falha-msg]')).includes('configurado'), 'sem endpoint: mostra falha honesta, sem sucesso simulado');
await p.close();

// ---------- Teclado ----------
p = await nova({ width: 1440, height: 900 });
await p.focus('.hero__cta');
await p.keyboard.press('Enter');
await p.waitForTimeout(1600);
await p.keyboard.press('Tab');
const f1 = await p.evaluate(() => document.activeElement.name);
await p.keyboard.press('Space');
check(f1 === 'necessidades' && await p.locator('input[value="gestao_redes_sociais"]').isChecked(), 'teclado: Tab + Espaço marca opção');
await p.keyboard.press('Escape');
await p.waitForTimeout(1600);
check(await p.locator('.hero').getAttribute('data-estado') === 'inicial' && await p.evaluate(() => document.activeElement.classList.contains('hero__cta')), 'teclado: Esc fecha e devolve foco ao CTA');
await p.click('.hero__cta'); await p.waitForTimeout(1400);
check(await p.locator('input[value="gestao_redes_sociais"]').isChecked(), 'reabrir preserva respostas antes do envio');
await p.close();

// ---------- CTA de serviço pré-seleciona ----------
p = await nova({ width: 1440, height: 900 });
await p.evaluate(() => window.scrollTo(0, document.querySelector('#servicos').offsetTop + innerHeight * 1.2));
await p.waitForTimeout(1600);
await p.click('#servico-trafego [data-abrir-form]');
await p.waitForTimeout(800);
check(await p.locator('input[value="trafego_pago"]').isChecked() && await p.evaluate(() => scrollY < 50), 'CTA de serviço abre o form no Hero com Tráfego pago marcado');
await p.screenshot({ path: `${OUT}/servico-cta.png` });
await p.close();

// ---------- Celular ----------
await modo('reset'); await modo('ok');
p = await nova({ width: 390, height: 844 });
await fluxoCompleto(p, 'celular');
await p.locator('[data-enviar]').tap();
await p.waitForSelector('[data-sucesso]:not([hidden])', { timeout: 5000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/celular-6-sucesso.png` });
check(leads().length === 1, 'celular: lead enviado');
const larg = await p.evaluate(() => document.documentElement.scrollWidth);
check(larg <= 390, 'celular: sem rolagem horizontal (' + larg + ')');
const alvos = await p.evaluate(() => [...document.querySelectorAll('.diag button:not([hidden]), .diag .opcao')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
check(alvos.every(x => x >= 44), 'celular: alvos de toque >= 44px ' + JSON.stringify(alvos));
check(p._erros.length === 0, 'celular: sem erros de console ' + p._erros.join(' | '));
await p.close();

await b.close();
console.log(`\n${ok.length} ok, ${falhas.length} falhas`);
fs.writeFileSync(OUT + '/resultado.json', JSON.stringify({ ok, falhas }, null, 2));

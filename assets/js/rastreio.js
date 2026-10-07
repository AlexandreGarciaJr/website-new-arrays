/* =========================================================
   New Arrays | Medição (Google Analytics, Microsoft Clarity, Meta Pixel)
   + aviso de cookies (LGPD)

   COMO FUNCIONA
   - Nada carrega antes do site abrir: os scripts entram depois do "load"
     (e depois do loader), sem pesar na primeira impressão.
   - Google Analytics roda sempre, mas em "Consent Mode": sem consentimento
     ele não grava cookies, só envia contagens anônimas.
   - Clarity e Meta Pixel só carregam depois que a pessoa clica em "Aceitar".
   - A escolha fica guardada no navegador por 6 meses (chave "na-cookies").
     O link "Preferências de cookies" no rodapé reabre o aviso.
   - Eventos: os eventos do site (início e etapas do formulário, envio, clique no
     WhatsApp, play nos vídeos) vão para o Analytics. O envio do formulário vira
     "Lead" no Pixel e o clique no WhatsApp vira "Contact" (sem dados pessoais).

   IDS (troque aqui se mudarem)
   ========================================================= */
(function () {
  "use strict";
  var ID = { ga: "G-1KB4Y8LZ67", clarity: "n0mo0i9cs0", pixel: "1651943026352024" };
  var CHAVE = "na-cookies", VALIDADE_DIAS = 180;
  var doc = document, w = window;
  var raiz = (doc.currentScript && doc.currentScript.getAttribute("data-raiz")) || "";

  /* ---------- escolha salva ---------- */
  function lerEscolha() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (s && s.v && Date.now() - s.t < VALIDADE_DIAS * 864e5) return s.v; // "sim" | "nao"
    } catch (e) {}
    return null;
  }
  function salvarEscolha(v) { try { localStorage.setItem(CHAVE, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {} }

  /* ---------- Google Analytics (Consent Mode v2) ---------- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  w.gtag = w.gtag || gtag;
  gtag("consent", "default", {
    analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    wait_for_update: 500
  });
  function carregar(src, id) {
    if (id && doc.getElementById(id)) return;
    var s = doc.createElement("script"); s.async = true; s.src = src; if (id) s.id = id;
    doc.head.appendChild(s);
  }
  function iniciarGA() {
    gtag("js", new Date());
    gtag("config", ID.ga);
    carregar("https://www.googletagmanager.com/gtag/js?id=" + ID.ga, "na-ga");
  }

  /* ---------- Clarity e Pixel: só com consentimento ---------- */
  var extrasLigados = false;
  function ligarExtras() {
    if (extrasLigados) return;
    extrasLigados = true;
    gtag("consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    // Microsoft Clarity
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(w, doc, "clarity", "script", ID.clarity);
    // Meta Pixel
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(w, doc, "script", "https://connect.facebook.net/en_US/fbevents.js");
    w.fbq("init", ID.pixel);
    w.fbq("track", "PageView");
  }

  /* ---------- eventos do site → Analytics (e conversão "Lead" no Pixel) ----------
     site.js, dock.js e midia.js publicam eventos (form_start, form_step, generate_lead,
     contact_whatsapp, video_play...) no evento "na:evento"; aqui eles viram eventos do GA4.
     Nunca vão nome, telefone ou e-mail. */
  doc.addEventListener("na:evento", function (e) {
    var d = e.detail || {}, nome = d.event;
    if (!nome) return;
    var p = {};
    for (var k in d) if (k !== "event" && Object.prototype.hasOwnProperty.call(d, k)) p[k] = d[k];
    gtag("event", nome, p);
    if (nome === "generate_lead" && w.fbq) w.fbq("track", "Lead", { content_name: d.service || "" });
    if (nome === "contact_whatsapp" && w.fbq) w.fbq("track", "Contact");
  });

  /* ---------- aviso de cookies ---------- */
  var aviso = null;
  function montarAviso() {
    if (aviso) return aviso;
    aviso = doc.createElement("section");
    aviso.className = "cookies";
    aviso.setAttribute("role", "dialog");
    aviso.setAttribute("aria-live", "polite");
    aviso.setAttribute("aria-label", "Aviso de cookies");
    aviso.innerHTML =
      '<p class="cookies__titulo"><span aria-hidden="true">[</span> cookies <span aria-hidden="true">]</span></p>' +
      '<p class="cookies__txt">Usamos cookies para medir as visitas e melhorar os nossos anúncios. Você escolhe. ' +
      '<a href="' + raiz + 'politica-de-privacidade/#cookies">Saiba mais</a></p>' +
      '<div class="cookies__acoes">' +
      '<button type="button" class="cookies__bt cookies__bt--sim" data-cookies="sim">Aceitar</button>' +
      '<button type="button" class="cookies__bt" data-cookies="nao">Só os essenciais</button>' +
      "</div>";
    aviso.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cookies]");
      if (!b) return;
      var v = b.getAttribute("data-cookies");
      salvarEscolha(v);
      if (v === "sim") ligarExtras();
      fecharAviso();
    });
    doc.body.appendChild(aviso);
    return aviso;
  }
  function abrirAviso() {
    montarAviso();
    aviso.hidden = false;
    requestAnimationFrame(function () { aviso.classList.add("cookies--on"); });
  }
  function fecharAviso() {
    if (!aviso) return;
    aviso.classList.remove("cookies--on");
    setTimeout(function () { if (aviso) aviso.hidden = true; }, 450);
  }
  // link "Preferências de cookies" (rodapé)
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-preferencias-cookies]");
    if (!a) return;
    e.preventDefault();
    abrirAviso();
    var bt = aviso.querySelector(".cookies__bt--sim"); if (bt) bt.focus({ preventScroll: true });
  });

  /* ---------- liga tudo depois que o site abriu ---------- */
  function iniciar() {
    iniciarGA();
    var escolha = lerEscolha();
    if (escolha === "sim") ligarExtras();
    else if (escolha === null) setTimeout(abrirAviso, 1200);
  }
  function depoisDoLoad() {
    // espera o loader (se houver) e um respiro do navegador
    var go = function () { ("requestIdleCallback" in w) ? w.requestIdleCallback(iniciar, { timeout: 2500 }) : setTimeout(iniciar, 600); };
    if (doc.documentElement.classList.contains("carregando")) doc.addEventListener("na:pronto", go, { once: true });
    else go();
  }
  if (doc.readyState === "complete") depoisDoLoad();
  else w.addEventListener("load", depoisDoLoad, { once: true });
})();

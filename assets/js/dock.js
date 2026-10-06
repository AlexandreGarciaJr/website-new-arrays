/* =========================================================
   New Arrays | Atalhos fixos (som + WhatsApp)
   SOM: LIGADO POR PADRÃO. O site tenta tocar assim que o loader abre;
   como os navegadores costumam bloquear áudio antes de um gesto, se for
   bloqueado a música começa na primeira interação da pessoa: clique, toque
   ou tecla. Rolar a página também tenta, mas Chrome, Safari e Firefox não
   contam rolagem como gesto (só liberam onde o site já tem "confiança").
   Quem desligar o som fica sem som até o fim da visita; na próxima, a música volta ligada.
   O arquivo só é baixado depois do carregamento (não pesa no início).
   Liga com fade-in, desliga com fade-out, pausa com a aba oculta.
   Volume e duração dos fades: objeto SOM abaixo.
   ========================================================= */
(function () {
  "use strict";
  var SOM = { VOLUME: 0.32, FADE_IN: 1400, FADE_OUT: 600, CHAVE: "na-som" };

  var dock = document.querySelector(".dock");
  var btn = document.querySelector("[data-som]");
  if (!dock || !btn) return;
  var rotulo = btn.querySelector("[data-som-rotulo]");
  var audio = null, ligado = false, fadeRaf = 0;

  // padrão: ligado; só fica desligado se a pessoa desligou antes
  // a escolha de desligar vale só para esta visita (sessionStorage): na próxima, a música volta ligada.
  // Limpa a preferência antiga, que ficava guardada para sempre (localStorage) e deixava o site mudo.
  try { localStorage.removeItem(SOM.CHAVE); } catch (e) {}
  function lerPref() { try { return sessionStorage.getItem(SOM.CHAVE) !== "0"; } catch (e) { return true; } }
  function salvarPref(v) { try { sessionStorage.setItem(SOM.CHAVE, v ? "1" : "0"); } catch (e) { /* sem armazenamento: tudo bem */ } }
  function track(ev, dados) { if (window.dataLayer) window.dataLayer.push(Object.assign({ event: ev }, dados || {})); }

  function criar() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "none";
    audio.loop = true;
    audio.volume = 0;
    audio.src = btn.getAttribute("data-som");
    return audio;
  }

  function fade(alvo, ms, fim) {
    cancelAnimationFrame(fadeRaf);
    var de = audio.volume, t0 = performance.now();
    (function passo(agora) {
      var p = Math.min(1, (agora - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, de + (alvo - de) * p));
      if (p < 1) fadeRaf = requestAnimationFrame(passo);
      else if (fim) fim();
    })(t0);
  }

  function pintar() {
    btn.setAttribute("aria-pressed", String(ligado));
    dock.classList.toggle("dock--som", ligado);
    if (rotulo) rotulo.textContent = ligado ? "Desligar som" : "Ligar som";
  }

  function ligar(manual) {
    criar();
    var p = audio.play();
    ligado = true; pintar();
    fade(SOM.VOLUME, SOM.FADE_IN);
    if (p && p.catch) p.catch(function () { ligado = false; pintar(); });
    if (manual) { salvarPref(true); track("som_toggle", { estado: "ligado" }); }
  }
  function desligar(manual) {
    ligado = false; pintar();
    if (manual) { salvarPref(false); track("som_toggle", { estado: "desligado" }); }
    if (!audio) return;
    fade(0, SOM.FADE_OUT, function () { if (!ligado) audio.pause(); });
  }

  btn.addEventListener("click", function () { dock.classList.remove("dock--convite"); if (ligado) desligar(true); else ligar(true); });

  // aba oculta: pausa; voltou: continua de onde parou
  var pausadoPorAba = false;
  document.addEventListener("visibilitychange", function () {
    if (!audio) return;
    if (document.hidden && ligado) { pausadoPorAba = true; audio.pause(); }
    else if (!document.hidden && pausadoPorAba) { pausadoPorAba = false; if (ligado) audio.play().catch(function () {}); }
  });

  // um vídeo de cliente com som ligado (assets/js/midia.js): a música dá licença e volta depois
  var pausadoPorVideo = false;
  document.addEventListener("na:video-som", function (e) {
    var videoComSom = e.detail && e.detail.ligado;
    if (videoComSom && ligado && audio && !audio.paused) {
      pausadoPorVideo = true;
      fade(0, SOM.FADE_OUT, function () { if (pausadoPorVideo) audio.pause(); });
    } else if (!videoComSom && pausadoPorVideo) {
      pausadoPorVideo = false;
      if (ligado && audio) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); fade(SOM.VOLUME, SOM.FADE_IN); }
    }
  });

  // som ligado por padrão: tenta tocar quando o site abre; se o navegador bloquear,
  // começa no primeiro gesto da pessoa (clique, toque ou tecla)
  // Navegadores só liberam áudio depois de um gesto "de verdade": clique, toque ou tecla.
  // Rolagem (roda do mouse, barra, deslizar o dedo) NÃO conta para Chrome, Safari e Firefox;
  // mesmo assim tentamos nela também: onde o navegador já confia no site, a música começa ao rolar.
  // As tentativas continuam até a música tocar (uma falha não desarma as próximas).
  // Enquanto o navegador segura o som, um convite aparece ao lado do botão
  function convite(mostrar) {
    dock.classList.toggle("dock--convite", mostrar);
    if (rotulo) rotulo.textContent = mostrar ? (window.matchMedia("(hover: none)").matches ? "Toque na tela para ouvir" : "Clique em qualquer lugar para ouvir") : (ligado ? "Desligar som" : "Ligar som");
  }
  function armarGesto() {
    convite(true);
    var GESTOS = ["pointerdown", "pointerup", "click", "keydown", "touchend"];
    var ROLAGEM = ["wheel", "scroll", "touchmove"];
    var tentandoRolagem = false, ultimaRolagem = 0;
    var desarmar = function () {
      GESTOS.forEach(function (n) { window.removeEventListener(n, porGesto, true); });
      ROLAGEM.forEach(function (n) { window.removeEventListener(n, porRolagem, true); });
    };
    var tocar = function () {
      criar();
      var p = audio.play();
      var ok = function () { if (ligado) return; desarmar(); ligado = true; convite(false); pintar(); fade(SOM.VOLUME, SOM.FADE_IN); };
      if (p && p.then) return p.then(ok); ok(); return Promise.resolve();
    };
    // clique, toque ou tecla: tenta SEMPRE (é o que o navegador aceita como gesto)
    var porGesto = function (e) {
      if (ligado || !lerPref()) { desarmar(); return; }
      if (e.target && e.target.nodeType === 1 && btn.contains(e.target)) return; // o botão de som cuida de si
      tocar().catch(function () {});
    };
    // rolagem: no máximo uma tentativa por segundo (a rolagem suave dispara muitos eventos)
    var porRolagem = function () {
      if (ligado || !lerPref()) { desarmar(); return; }
      var agora = Date.now();
      if (tentandoRolagem || agora - ultimaRolagem < 1000) return;
      ultimaRolagem = agora; tentandoRolagem = true;
      tocar().catch(function () {}).then(function () { tentandoRolagem = false; });
    };
    GESTOS.forEach(function (n) { window.addEventListener(n, porGesto, true); });
    ROLAGEM.forEach(function (n) { window.addEventListener(n, porRolagem, { capture: true, passive: true }); });
  }
  function tentarTocar() {
    if (!lerPref() || ligado) return;
    criar();
    audio.preload = "auto";
    var p = audio.play();
    if (p && p.then) {
      p.then(function () { ligado = true; pintar(); fade(SOM.VOLUME, SOM.FADE_IN); })
       .catch(function () { armarGesto(); });
    } else { armarGesto(); }
  }
  var inicio = function () { setTimeout(tentarTocar, 150); };
  if (document.documentElement.classList.contains("carregando")) document.addEventListener("na:pronto", inicio, { once: true });
  else if (document.readyState === "complete") inicio();
  else window.addEventListener("load", inicio, { once: true });

  // o dock aparece depois que o Hero entrou (não disputa a primeira leitura)
  requestAnimationFrame(function () { dock.classList.add("dock--pronto"); });
})();

/* =========================================================
   New Arrays | Atalhos fixos (som + WhatsApp)
   SOM: começa DESLIGADO (navegadores bloqueiam áudio sem um clique).
   O arquivo só é baixado no primeiro clique (preload="none").
   Liga com fade-in, desliga com fade-out, pausa com a aba oculta.
   A escolha fica salva neste navegador: quem deixou ligado ouve de novo
   a partir da primeira interação na próxima visita.
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

  function lerPref() { try { return localStorage.getItem(SOM.CHAVE) === "1"; } catch (e) { return false; } }
  function salvarPref(v) { try { localStorage.setItem(SOM.CHAVE, v ? "1" : "0"); } catch (e) { /* sem armazenamento: tudo bem */ } }
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

  btn.addEventListener("click", function () { if (ligado) desligar(true); else ligar(true); });

  // aba oculta: pausa; voltou: continua de onde parou
  var pausadoPorAba = false;
  document.addEventListener("visibilitychange", function () {
    if (!audio) return;
    if (document.hidden && ligado) { pausadoPorAba = true; audio.pause(); }
    else if (!document.hidden && pausadoPorAba) { pausadoPorAba = false; if (ligado) audio.play().catch(function () {}); }
  });

  // quem deixou o som ligado na última visita: retoma na primeira interação (o navegador exige um gesto)
  if (lerPref()) {
    var EV = ["pointerdown", "keydown"];
    var retomar = function (e) {
      EV.forEach(function (n) { window.removeEventListener(n, retomar, true); });
      if (!ligado && !btn.contains(e.target)) ligar(false);
    };
    EV.forEach(function (n) { window.addEventListener(n, retomar, true); });
  }

  // o dock aparece depois que o Hero entrou (não disputa a primeira leitura)
  requestAnimationFrame(function () { dock.classList.add("dock--pronto"); });
})();

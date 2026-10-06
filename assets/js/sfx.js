/* =========================================================
   New Arrays | Sons de interface (hover e clique)
   Inspiração: menus de console (tons curtos, limpos, com um eco leve).
   Tudo é sintetizado com Web Audio: nenhum arquivo extra é baixado.
     hover  → "tic" agudo e curto
     clique → "confirmar": duas notas subindo (quinta justa)
     opção  → "seleção": um toque com leve queda de tom (chips, opções do formulário, perguntas)
     voltar → duas notas descendo (fechar formulário, botão Voltar)
   Respeita o botão de som do dock: se a pessoa desligou o som, os efeitos também param.
   O áudio só é criado no primeiro gesto (regra dos navegadores).
   Ajustes: objeto SFX (volume geral, eco, intervalo mínimo entre hovers).
   ========================================================= */
(function () {
  "use strict";
  var SFX = { VOLUME: 0.16, ECO: 0.22, ECO_TEMPO: 0.085, HOVER_MIN_MS: 55, CHAVE: "na-som" };
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  var ctx = null, saida = null, eco = null;
  function ligadoPref() { try { return sessionStorage.getItem(SFX.CHAVE) !== "0"; } catch (e) { return true; } }

  function montar() {
    if (ctx) return ctx;
    ctx = new AC();
    // cadeia: vozes → mestre → compressor → saída; com um eco curto em paralelo (o "ar" de menu de console)
    saida = ctx.createGain(); saida.gain.value = SFX.VOLUME;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    eco = ctx.createDelay(0.5); eco.delayTime.value = SFX.ECO_TEMPO;
    var retorno = ctx.createGain(); retorno.gain.value = SFX.ECO;
    var filtroEco = ctx.createBiquadFilter(); filtroEco.type = "lowpass"; filtroEco.frequency.value = 3800;
    saida.connect(comp); comp.connect(ctx.destination);
    saida.connect(eco); eco.connect(filtroEco); filtroEco.connect(retorno); retorno.connect(eco); retorno.connect(comp);
    return ctx;
  }

  // uma "nota": oscilador com envelope curto, harmônico opcional e queda de tom
  function nota(freq, t0, dur, vol, opt) {
    opt = opt || {};
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.tipo || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (opt.para) o.frequency.exponentialRampToValueAtTime(opt.para, t0 + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.ataque || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(saida);
    o.start(t0); o.stop(t0 + dur + 0.02);
    if (opt.brilho) { // harmônico suave em cima: timbre de "sino" digital
      var o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = "sine"; o2.frequency.setValueAtTime(freq * 2.01, t0);
      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.exponentialRampToValueAtTime(vol * opt.brilho, t0 + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.6);
      o2.connect(g2); g2.connect(saida); o2.start(t0); o2.stop(t0 + dur);
    }
  }

  var SONS = {
    hover: function (t) { nota(2350, t, 0.06, 0.32, { para: 1850, brilho: 0.25 }); },
    clique: function (t) { nota(880, t, 0.16, 0.42, { brilho: 0.35, tipo: "triangle" }); nota(1318.5, t + 0.055, 0.22, 0.38, { brilho: 0.4 }); },
    selecao: function (t) { nota(1480, t, 0.11, 0.4, { para: 1240, brilho: 0.3, tipo: "triangle" }); },
    voltar: function (t) { nota(1318.5, t, 0.12, 0.34, { brilho: 0.3 }); nota(880, t + 0.06, 0.18, 0.32, { tipo: "triangle" }); }
  };
  function tocar(nome) {
    if (!ligadoPref()) return;
    if (!ctx) return; // ainda sem gesto: o navegador não deixa tocar
    if (ctx.state === "suspended") ctx.resume();
    SONS[nome](ctx.currentTime + 0.005);
  }

  /* ---------- o que soa ---------- */
  var INTERATIVO = "a[href], button, summary, label.opcao, .servico-item, .pilar, .fluxo__no.clicavel, .projeto, [role='button']";
  function tipoClique(el) {
    if (el.matches("[data-fechar-form], [data-voltar], .diag__fechar")) return "voltar";
    if (el.matches(".fluxo__chip, label.opcao, summary, .fluxo__no, .dock__som")) return "selecao";
    return "clique";
  }

  // hover: só com mouse; um som por elemento (entrar nos filhos não repete)
  var ultimo = null, tUltimo = 0;
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse") return;
    var el = e.target.closest && e.target.closest(INTERATIVO);
    if (!el || el === ultimo) return;
    ultimo = el;
    var agora = performance.now();
    if (agora - tUltimo < SFX.HOVER_MIN_MS) return;
    tUltimo = agora;
    tocar("hover");
  }, { passive: true });
  document.addEventListener("pointerout", function (e) {
    if (ultimo && (!e.relatedTarget || !ultimo.contains(e.relatedTarget))) ultimo = null;
  }, { passive: true });

  // clique (e toque): o primeiro gesto também destrava o áudio
  document.addEventListener("pointerdown", function (e) {
    montar();
    var el = e.target.closest && e.target.closest(INTERATIVO);
    if (el) tocar(tipoClique(el));
  }, { passive: true, capture: true });
  // se o navegador já permitir áudio (ex.: a música tocou sozinha), os hovers soam desde o início
  function tentarJa() { try { montar(); if (ctx.state === "suspended") ctx.resume().catch(function () {}); } catch (e) {} }
  if (document.documentElement.classList.contains("carregando")) document.addEventListener("na:pronto", tentarJa, { once: true });
  else window.addEventListener("load", tentarJa, { once: true });

  // teclado: Enter/Espaço em algo interativo também soa
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    montar();
    var el = document.activeElement && document.activeElement.closest && document.activeElement.closest(INTERATIVO);
    if (el) tocar(tipoClique(el));
  }, { capture: true });
})();

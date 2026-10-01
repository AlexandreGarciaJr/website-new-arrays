/* =========================================================
   New Arrays | Rolagem suave (Lenis)
   Roda da rodinha e trackpad ganham aceleração e desaceleração.
   O toque no celular continua nativo (melhor para o dedo).
   Movimento reduzido: rolagem nativa, sem suavização.
   ========================================================= */
(function () {
  "use strict";
  if (!window.Lenis || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var lenis = new Lenis({
    autoRaf: true,
    duration: 1.25,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, // desacelera no fim
    smoothWheel: true,
    wheelMultiplier: 0.9,
    anchors: true
  });
  window.NA_lenis = lenis;
  // enquanto o loader está na tela, a rolagem fica parada
  if (document.documentElement.classList.contains("carregando")) {
    lenis.stop();
    document.addEventListener("na:pronto", function () { lenis.start(); }, { once: true });
  }
  // rolar programaticamente (formulário, links internos) sem brigar com a suavização
  window.NA_rolar = function (y, suave) {
    lenis.scrollTo(y, suave ? { duration: 1.1 } : { immediate: true, force: true });
  };
})();

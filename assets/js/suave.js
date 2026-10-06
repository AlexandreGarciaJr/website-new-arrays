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
    anchors: false // os links internos são tratados abaixo (com correção no fim)
  });
  window.NA_lenis = lenis;
  // enquanto o loader está na tela, a rolagem fica parada
  if (document.documentElement.classList.contains("carregando")) {
    lenis.stop();
    document.addEventListener("na:pronto", function () { lenis.start(); }, { once: true });
  }
  // rolar programaticamente (formulário, links internos) sem brigar com a suavização
  // Links do menu ("#resultados", "#projetos"...): a página muda de altura durante a viagem
  // (seções que crescem ao aparecer), então ao chegar o destino é medido de novo e corrigido.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var h = a.getAttribute("href");
    if (h.length < 2 || /^#servico-/.test(h)) return; // os serviços têm a sua própria rolagem (site.js)
    var el = document.getElementById(h.slice(1));
    if (!el) return;
    e.preventDefault();
    var alvo = function () { var m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0; return el.getBoundingClientRect().top + window.scrollY - m; };
    lenis.scrollTo(alvo(), { duration: 1.25, force: true, onComplete: function () {
      if (Math.abs(alvo() - window.scrollY) > 4) lenis.scrollTo(alvo(), { duration: 0.6, force: true });
    } });
    if (history.pushState) history.pushState(null, "", h);
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  });
  window.NA_rolar = function (y, suave) {
    lenis.scrollTo(y, suave ? { duration: 1.1 } : { immediate: true, force: true });
  };
})();

/* =========================================================
   New Arrays | Abertura: Hero → Pilares numa cena presa
   EFEITO (desktop): a tela fica parada enquanto a pessoa rola.
     0.00–0.25  o conteúdo do Hero sai em camadas (palavras sobem e desfocam)
     0.00–0.40  a fumaça se expande e se dissipa (tinta.js lê o mesmo progresso)
     0.10–0.55  os colchetes da caixa de serviços se abrem até envolver os pilares
                e os três títulos viajam até virar os títulos dos pilares
     0.40–0.92  os painéis descem a partir dos títulos e as imagens se revelam
     0.92–1.00  pausa: tudo pronto antes de a página voltar a descer
   Se a pessoa para no meio, a cena completa sozinha na direção em que ela rolava.
   TECNOLOGIA: JS puro (transform/opacity/clip-path) + position: sticky. Não depende
   do GSAP, que carrega depois: a cena funciona desde a primeira rolagem.
   SEM CENA: celular, tablet, telas baixas, movimento reduzido e formulário aberto.
   ========================================================= */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement;
  var ab = doc.querySelector(".abertura");
  if (!ab) return;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  var CENA = {
    SNAP_ESPERA: 220,     // ms parado antes de completar a cena
    SNAP_LIMIAR: 0.06     // rolou menos que isso para baixo? volta ao início
  };

  var mq = {
    tela: window.matchMedia("(min-width: 1024px) and (min-height: 600px)"),
    fino: window.matchMedia("(hover: hover) and (pointer: fine)"),
    reduzido: window.matchMedia("(prefers-reduced-motion: reduce)")
  };
  var formAberto = false;

  var palco = $(".abertura__palco", ab);
  var E = {
    pals: $$(".hero__titulo .pal"),
    rotulo: $(".hero__rotulo"), sub: $(".hero__sub"), acoes: $(".hero__acoes"), fundo: $(".hero__fundo"),
    arr: $(".hero__array"), lista: $(".hero__array .servicos-lista"),
    hIcones: $$(".hero__array .servico-item__icone"), hNomes: $$(".hero__array .servico-item__nome"),
    pilares: $$(".pilar"), cabecas: $$(".pilar__cabeca"), txts: $$(".pilar__txt"),
    midias: $$(".pilar").map(function (p) { return $$(".pilar__midia-item", p); }),
    titulo: $(".pilares__titulo"), lede: $(".pilares__lede"), grade: $(".pilares__grade"),
    col: $$(".ab-col").map(function (c) { return { el: c, barra: $(".ab-col__barra", c), cima: $(".ab-col__ponta--cima", c), baixo: $(".ab-col__ponta--baixo", c) }; })
  };

  /* ---------- utilidades de tempo ---------- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var ease = {
    in: function (t) { return t * t * t; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  };

  /* ---------- medidas (sem transformações, relativas ao palco) ---------- */
  var M = null;
  function rel(el) {
    var r = el.getBoundingClientRect(), pr = palco.getBoundingClientRect();
    return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height };
  }
  function uniao(a, b) {
    var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  }
  function medir() {
    limparEstilos();
    ab.classList.add("ab-medindo");
    var A = rel(E.arr), B = rel(E.grade);
    var cab = E.cabecas.map(function (c, i) {
      var h = uniao(rel(E.hIcones[i]), rel(E.hNomes[i]));
      var p = rel(c);
      var k = parseFloat(getComputedStyle(E.hNomes[i]).fontSize) / parseFloat(getComputedStyle(c).fontSize);
      return { dx: h.x - p.x, dy: h.y - p.y, k: k || 1 };
    });
    ab.classList.remove("ab-medindo");
    M = { A: A, B: B, cab: cab };
  }

  function limparEstilos() {
    [].concat(E.pals, [E.rotulo, E.sub, E.acoes, E.fundo, E.titulo, E.lede], E.cabecas, E.txts,
      E.midias.reduce(function (a, b) { return a.concat(b); }, [])).forEach(function (el) {
      if (!el) return;
      el.style.transform = ""; el.style.opacity = ""; el.style.filter = ""; el.style.clipPath = "";
    });
    E.pilares.forEach(function (p) { p.style.removeProperty("--f"); });
    if (E.lista) E.lista.style.removeProperty("--div-op");
    ab.classList.remove("ab-ativa", "ab-hero-fora", "ab-pilares");
  }

  /* ---------- desenho de um quadro da cena ---------- */
  function op(el, v) { if (el) el.style.opacity = v.toFixed(3); }
  function render(p) {
    if (!M) return;
    ab.classList.toggle("ab-ativa", p > 0.002);
    ab.classList.toggle("ab-hero-fora", p > 0.25);
    ab.classList.toggle("ab-pilares", p > 0.7);

    // 1. Hero sai em camadas: cada palavra sobe e desfoca, em sequência
    E.pals.forEach(function (w, i) {
      var l = ease.in(seg(p, i * 0.022, 0.18 + i * 0.022));
      w.style.transform = l ? "translate3d(0," + (-l * 0.55).toFixed(3) + "em,0)" : "";
      w.style.opacity = (1 - l).toFixed(3);
      w.style.filter = l > 0.01 ? "blur(" + (l * 10).toFixed(1) + "px)" : "";
    });
    var r = seg(p, 0, 0.12); op(E.rotulo, 1 - r); E.rotulo.style.transform = "translate3d(0," + (-r * 16).toFixed(1) + "px,0)";
    var s = ease.in(seg(p, 0.02, 0.2)); op(E.sub, 1 - s); E.sub.style.transform = "translate3d(0," + (-s * 28).toFixed(1) + "px,0)";
    s = ease.in(seg(p, 0.04, 0.22)); op(E.acoes, 1 - s); E.acoes.style.transform = "translate3d(0," + (s * 24).toFixed(1) + "px,0)";
    op(E.fundo, 1 - seg(p, 0, 0.35));
    if (E.lista) E.lista.style.setProperty("--div-op", (1 - seg(p, 0.03, 0.16)).toFixed(3));

    // 2. Colchetes: da caixa de serviços do Hero até envolver os três pilares
    var m = ease.inOut(seg(p, 0.1, 0.52));
    var y = lerp(M.A.y, M.B.y, m), h = lerp(M.A.h, M.B.h, m);
    var xe = lerp(M.A.x, M.B.x, m), xd = lerp(M.A.x + M.A.w, M.B.x + M.B.w, m) - 18;
    [xe, xd].forEach(function (x, i) {
      var c = E.col[i]; if (!c) return;
      c.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      c.barra.style.transform = "scaleY(" + (h / 1000).toFixed(4) + ")";
      c.baixo.style.transform = "translate3d(0," + (h - 3).toFixed(1) + "px,0)";
    });

    // 3. Títulos viajam do Hero até os pilares (FLIP), um depois do outro
    E.cabecas.forEach(function (c, i) {
      var l = ease.inOut(seg(p, 0.1 + i * 0.045, 0.5 + i * 0.045)), d = M.cab[i];
      var k = d.k + (1 - d.k) * l;
      c.style.transform = l >= 1 ? "" : "translate3d(" + (d.dx * (1 - l)).toFixed(1) + "px," + (d.dy * (1 - l)).toFixed(1) + "px,0) scale(" + k.toFixed(4) + ")";
    });

    // 4. Painéis descem a partir do título; texto e imagens se revelam
    E.pilares.forEach(function (pl, i) {
      pl.style.setProperty("--f", ease.out(seg(p, 0.42 + i * 0.05, 0.68 + i * 0.05)).toFixed(4));
      var t = ease.out(seg(p, 0.5 + i * 0.05, 0.7 + i * 0.05));
      op(E.txts[i], t); E.txts[i].style.transform = "translate3d(0," + ((1 - t) * 16).toFixed(1) + "px,0)";
      E.midias[i].forEach(function (it, j) {
        var a = 0.55 + i * 0.05 + j * 0.04;
        var l = ease.expo(seg(p, a, a + 0.24));
        it.style.clipPath = l >= 1 ? "" : "inset(" + ((1 - l) * 100).toFixed(2) + "% 0 0 0 round 12px)";
        it.style.transform = l >= 1 ? "" : "scale(" + (1.08 - 0.08 * l).toFixed(4) + ")";
        op(it, Math.min(1, l * 3));
      });
    });
    var tt = ease.out(seg(p, 0.42, 0.64));
    op(E.titulo, tt); E.titulo.style.transform = "translate3d(0," + ((1 - tt) * 36).toFixed(1) + "px,0)";
    tt = ease.out(seg(p, 0.48, 0.7));
    op(E.lede, tt); E.lede.style.transform = "translate3d(0," + ((1 - tt) * 20).toFixed(1) + "px,0)";
  }

  /* ---------- progresso a partir da rolagem ---------- */
  function progresso() {
    var r = ab.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  }
  var ativo = false, raf = 0, visivel = true, ultimo = -1;
  function quadro() {
    raf = 0;
    if (!ativo) return;
    var p = progresso();
    if (Math.abs(p - ultimo) > 0.0003) { render(p); ultimo = p; }
    if (visivel) raf = requestAnimationFrame(quadro);
  }
  function rodar() { if (!raf && ativo) raf = requestAnimationFrame(quadro); }

  new IntersectionObserver(function (e) {
    visivel = e[0].isIntersecting;
    if (visivel) rodar();
  }).observe(ab);

  /* ---------- completa a cena se a pessoa parar no meio ---------- */
  var direcao = 1, tSnap = 0;
  function inicioY() { return ab.getBoundingClientRect().top + window.scrollY; }
  function completar() {
    if (!ativo || !window.NA_rolar || window.NA_cenaSemSnap) return;
    var p = progresso();
    if (p <= 0.012 || p >= 0.988) return;
    var y0 = inicioY(), y1 = y0 + ab.offsetHeight - window.innerHeight;
    var paraFim = direcao > 0 ? p > CENA.SNAP_LIMIAR : p > 1 - CENA.SNAP_LIMIAR;
    NA_rolar(paraFim ? y1 : y0, true);
  }
  function aoRolar(e) {
    if (e && typeof e.direction === "number" && e.direction) direcao = e.direction;
    clearTimeout(tSnap);
    tSnap = setTimeout(completar, CENA.SNAP_ESPERA);
  }
  function ligarSnap() {
    if (window.NA_lenis) window.NA_lenis.on("scroll", aoRolar);
  }

  /* ---------- liga/desliga a cena ---------- */
  function condicao() { return mq.tela.matches && mq.fino.matches && !mq.reduzido.matches && !formAberto; }
  function aplicar() {
    var c = condicao();
    html.classList.toggle("cena-abertura", c);
    if (c) {
      ativo = true;
      medir();
      ab.classList.add("ab-pronta");
      ultimo = -1; render(progresso()); rodar();
    } else {
      ativo = false;
      limparEstilos();
      ab.classList.remove("ab-pronta");
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  doc.addEventListener("na:form", function (e) { formAberto = !!e.detail.aberto; aplicar(); });
  var tRes;
  window.addEventListener("resize", function () { clearTimeout(tRes); tRes = setTimeout(aplicar, 160); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (ativo) { medir(); ultimo = -1; rodar(); } });
  window.addEventListener("load", function () { if (ativo) { medir(); ultimo = -1; rodar(); } ligarSnap(); });
  aplicar();

  /* ---------- janela de sites: os prints reais se revezam ---------- */
  var tela = $("[data-janela]"), url = $("[data-janela-url]");
  if (tela && !mq.reduzido.matches) {
    var imgs = $$("img", tela), idx = 0, timer = 0;
    var trocar = function () {
      imgs[idx].classList.remove("ativa");
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add("ativa");
      if (url) url.textContent = imgs[idx].getAttribute("data-url") || "";
    };
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !timer) timer = setInterval(trocar, 3200);
      else if (!e[0].isIntersecting && timer) { clearInterval(timer); timer = 0; }
    }).observe(tela);
  }
})();

/* =========================================================
   Pilares: zoom flutuante no hover (desktop com mouse)
   O pilar sob o mouse ganha ~62% da largura da grade e sobe sobre o
   título, sem sair da tela. Calcula as margens negativas (CSS vars)
   a partir do espaço real disponível: funciona em notebooks pequenos.
   ========================================================= */
(function () {
  "use strict";
  var grade = document.querySelector(".pilares__grade");
  if (!grade) return;
  var mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  var pilares = Array.prototype.slice.call(grade.querySelectorAll(".pilar"));
  var ZOOM = { LARGURA: 0.62, LARGURA_MAX: 980, SUBIR_MAX: 140, MARGEM_TELA: 12 };
  var ativo = null, tSai = 0;

  function limpar(p) {
    p.classList.remove("pilar--zoom");
    ["--zl", "--zr", "--zt", "--zb"].forEach(function (v) { p.style.removeProperty(v); });
  }
  function ampliar(p) {
    if (!mq.matches) return;
    clearTimeout(tSai);
    if (ativo && ativo !== p) limpar(ativo);
    ativo = p;
    // mede sem o zoom aplicado
    var r = p.getBoundingClientRect(), g = grade.getBoundingClientRect();
    var cs = getComputedStyle(grade);
    var gl = g.left + parseFloat(cs.paddingLeft), gr = g.right - parseFloat(cs.paddingRight);
    var alvoW = Math.min(ZOOM.LARGURA_MAX, (gr - gl) * ZOOM.LARGURA);
    var extra = Math.max(0, alvoW - r.width);
    var i = pilares.indexOf(p), zl = 0, zr = 0;
    if (i === 0) zr = extra; else if (i === pilares.length - 1) zl = extra; else { zl = extra / 2; zr = extra / 2; }
    // não passa das bordas da grade
    zl = Math.min(zl, r.left - gl); zr = Math.min(zr, gr - r.right);
    // vertical: sobe sobre o título (sem entrar no cabeçalho do site) e desce até perto do fim da tela
    var topoH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topo-h")) || 72;
    var zt = Math.max(0, Math.min(ZOOM.SUBIR_MAX, r.top - topoH - ZOOM.MARGEM_TELA));
    var zb = Math.max(0, Math.min(40, window.innerHeight - r.bottom - ZOOM.MARGEM_TELA));
    p.style.setProperty("--zl", zl.toFixed(1) + "px");
    p.style.setProperty("--zr", zr.toFixed(1) + "px");
    p.style.setProperty("--zt", zt.toFixed(1) + "px");
    p.style.setProperty("--zb", zb.toFixed(1) + "px");
    p.classList.add("pilar--zoom");
    grade.classList.add("tem-zoom");
  }
  function soltar() {
    clearTimeout(tSai);
    // pequena tolerância: passar de um pilar para outro não "pisca"
    tSai = setTimeout(function () {
      if (ativo) limpar(ativo);
      ativo = null;
      grade.classList.remove("tem-zoom");
    }, 80);
  }
  pilares.forEach(function (p) {
    p.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") ampliar(p); });
  });
  grade.addEventListener("pointerleave", soltar);
  // rolou ou redimensionou com um pilar ampliado: desfaz (as medidas mudaram)
  window.addEventListener("resize", soltar);
  window.addEventListener("wheel", function () { if (ativo) soltar(); }, { passive: true });
})();

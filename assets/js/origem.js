/* =========================================================
   New Arrays | Origem (vídeo do notebook controlado pela rolagem)
   Linha do tempo da cena (progresso 0 a 1 enquanto o palco está preso):
     0.00 a 0.50  o vídeo avança quadro a quadro: o notebook abre
     0.50 a 0.62  a câmera avança até a tela do notebook
     0.62 a 0.76  a tela se desfaz em caracteres [ ] { } 0 1
     0.76 a 0.93  os caracteres voam e formam "new Arrays"
     0.93 a 1.00  o texto real assume (H2 no HTML) e a frase aparece
   TECNOLOGIA: Canvas 2D + sequência de WebP (74 quadros).
   Quadros de 1280 px no desktop e 854 px no celular, carregados só quando
   a seção se aproxima. A rolagem é suavizada (inércia) para não dar trancos.
   MOVIMENTO REDUZIDO: sem cena presa; mostra o último quadro e o texto.
   ========================================================= */
(function () {
  "use strict";
  var secao = document.getElementById("origem");
  if (!secao) return;
  var palco = secao.querySelector(".origem__palco");
  var canvas = secao.querySelector(".origem__canvas");
  var texto = secao.querySelector(".origem__texto");
  var ctx = canvas.getContext("2d");
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TOTAL = 74;
  var movel = window.innerWidth < 768;
  var PASTA = "assets/video/notebook/" + (movel ? "720" : "1280") + "/";
  var IW = 1920, IH = 1080;                         // espaço de coordenadas do vídeo original
  var TELA = { x: 783, y: 243, w: 780 };            // centro e largura da tela do notebook no último quadro
  var FOCO_X = 0.42;                                 // centro horizontal do notebook (para o celular)
  var GLIFOS = "[]{}01<>/=";

  var quadros = new Array(TOTAL), carregados = 0, iniciou = false;
  var W = 1, H = 1, dpr = 1;
  var prog = 0, alvo = 0, raf = 0, ativo = false;

  secao.classList.add("origem--js");
  if (reduzido) { secao.classList.add("origem--parada"); palco.querySelector(".origem__poster").src = "assets/video/notebook/720/073.webp"; return; }

  function carregar() {
    if (iniciou) return;
    iniciou = true;
    medir();
    // ordem de carregamento: primeiro, último e depois espalhado (a rolagem rápida sempre acha um quadro perto)
    var ordem = [0, TOTAL - 1], passo = 32;
    while (passo >= 1) { for (var i = 0; i < TOTAL; i += passo) if (ordem.indexOf(i) < 0) ordem.push(i); passo = passo / 2 | 0; }
    ordem.forEach(function (i) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        quadros[i] = img; carregados++;
        if (i === TOTAL - 1) prepararGlifos();
        agendar();
      };
      img.src = PASTA + String(i).padStart(3, "0") + ".webp";
    });
  }

  function quadroPerto(i) {
    for (var d = 0; d < TOTAL; d++) {
      if (quadros[i - d]) return quadros[i - d];
      if (quadros[i + d]) return quadros[i + d];
    }
    return null;
  }

  /* ---------- geometria: onde o vídeo fica na tela ---------- */
  function base() {
    var escala, cx, cy;
    if (W / H < 1) { escala = (W / IW) * 2.15; cx = W / 2 - (FOCO_X * IW - IW / 2) * escala; }
    else { escala = Math.max(W / IW, H / IH); cx = W / 2; }
    cy = H / 2;
    return { s: escala, x: cx - (IW * escala) / 2, y: cy - (IH * escala) / 2 };
  }
  // transformação com zoom z em direção à tela do notebook
  function transf(z) {
    var b = base();
    var tx = b.x + TELA.x * b.s, ty = b.y + TELA.y * b.s;           // tela na posição base
    var alvoS = W / H < 1 ? W / (TELA.w * 0.9) * 1.35 : Math.max(W / (TELA.w * 0.96), H / (TELA.w * 0.33));  // escala em que a tela preenche o quadro
    var s = b.s + (alvoS - b.s) * z;
    var px = tx + (W / 2 - tx) * z, py = ty + (H / 2 - ty) * z;     // a tela desliza para o centro
    return { s: s, x: px - TELA.x * s, y: py - TELA.y * s };
  }

  /* ---------- glifos ---------- */
  var CEL = 12, cols = 0, rows = 0, celulas = null, particulas = null;
  function prepararGlifos() {
    var ult = quadros[TOTAL - 1];
    if (!ult || !W) return;
    CEL = W < 768 ? 9 : 12;
    cols = Math.ceil(W / CEL); rows = Math.ceil(H / CEL);
    // 1) a tela com zoom máximo, amostrada na grade
    var off = document.createElement("canvas"); off.width = cols; off.height = rows;
    var o = off.getContext("2d");
    var t = transf(1);
    o.drawImage(ult, t.x / CEL, t.y / CEL, (IW * t.s) / CEL, (IH * t.s) / CEL);
    var px = o.getImageData(0, 0, cols, rows).data;
    celulas = [];
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var k = (j * cols + i) * 4, v = (px[k] * 0.3 + px[k + 1] * 0.55 + px[k + 2] * 0.15) / 255;
      if (v < 0.1) continue;
      celulas.push({ i: i, j: j, v: v, ch: GLIFOS[(Math.random() * GLIFOS.length) | 0], limiar: Math.random() });
    }
    // 2) o texto "new Arrays" na grade (mesma posição do H2 real)
    var r = texto.querySelector(".origem__marca").getBoundingClientRect(), pr = palco.getBoundingClientRect();
    var estilo = getComputedStyle(texto.querySelector(".origem__marca"));
    var m = document.createElement("canvas"); m.width = W; m.height = H;
    var mc = m.getContext("2d");
    mc.font = estilo.fontWeight + " " + estilo.fontSize + " " + estilo.fontFamily;
    mc.textBaseline = "alphabetic"; mc.fillStyle = "#fff";
    var metr = mc.measureText("new Arrays");
    var xT = r.left - pr.left + (r.width - metr.width) / 2;
    var yT = r.top - pr.top + (r.height + (metr.actualBoundingBoxAscent - metr.actualBoundingBoxDescent)) / 2;
    mc.fillText("new Arrays", xT, yT);
    var md = mc.getImageData(0, 0, W, H).data, alvos = [];
    for (var y = CEL / 2; y < H; y += CEL) for (var x = CEL / 2; x < W; x += CEL) {
      if (md[((y | 0) * W + (x | 0)) * 4 + 3] > 110) alvos.push({ x: x - CEL / 2, y: y - CEL / 2 });
    }
    // 3) cada alvo recebe uma célula de origem (as mais brilhantes primeiro)
    var fontes = celulas.slice().sort(function (a, b) { return b.v - a.v; });
    particulas = alvos.map(function (a, n) {
      var f = fontes[n % Math.max(1, fontes.length)] || { i: cols / 2, j: rows / 2, v: 1 };
      return { x0: f.i * CEL, y0: f.j * CEL, x1: a.x, y1: a.y, atraso: Math.random() * 0.35, ch: GLIFOS[(Math.random() * GLIFOS.length) | 0] };
    });
  }

  /* ---------- desenho ---------- */
  function faixa(p, a, b) { return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a); }
  function suave(x) { return x * x * (3 - 2 * x); }
  function cor(v, a) { // de Blue 700 a Blue 50
    var r = 11 + (231 - 11) * v, g = 108 + (245 - 108) * v, b = 123 + (247 - 123) * v;
    return "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + a + ")";
  }

  function desenhar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, W, H);
    var p = prog;
    var pv = faixa(p, 0, 0.5), pz = suave(faixa(p, 0.5, 0.62)), pg = faixa(p, 0.6, 0.76), pm = faixa(p, 0.76, 0.93), pt = faixa(p, 0.92, 1);

    // vídeo (com zoom) some enquanto os glifos assumem
    var img = quadroPerto(Math.round(pv * (TOTAL - 1)));
    var aVideo = 1 - suave(faixa(p, 0.64, 0.74));
    if (img && aVideo > 0) {
      var t = transf(pz);
      ctx.globalAlpha = aVideo;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, t.x, t.y, IW * t.s, IH * t.s);
      ctx.globalAlpha = 1;
      // vinheta para integrar ao preto da página
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(10,10,10,0)"); g.addColorStop(1, "rgba(10,10,10," + (0.75 * aVideo) + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (!celulas || pg <= 0) { texto.style.setProperty("--t", pt); return; }

    // glifos da tela: aparecem por dissolução, depois somem enquanto os escolhidos voam
    ctx.font = "600 " + (CEL + 1) + "px Inter, Arial, sans-serif";
    ctx.textBaseline = "top";
    var saida = suave(faixa(p, 0.78, 0.9));
    for (var n = 0; n < celulas.length; n++) {
      var c = celulas[n];
      if (c.limiar > pg * 1.15) continue;
      var a = Math.min(1, (pg * 1.15 - c.limiar) * 4) * (1 - saida) * Math.min(1, 0.15 + Math.pow(c.v, 2.2) * 1.1);
      if (a <= 0.02) continue;
      ctx.fillStyle = cor(Math.pow(c.v, 1.6), a.toFixed(3));
      ctx.fillText(c.ch, c.i * CEL, c.j * CEL);
    }
    // partículas formando "new Arrays"
    if (particulas && pm > 0) {
      var aTexto = 1 - suave(faixa(p, 0.95, 1));
      for (var q = 0; q < particulas.length; q++) {
        var P = particulas[q];
        var u = suave(Math.min(1, Math.max(0, (pm - P.atraso) / 0.6)));
        var x = P.x0 + (P.x1 - P.x0) * u, y = P.y0 + (P.y1 - P.y0) * u;
        y += Math.sin(u * Math.PI) * -40 * (1 - P.atraso);
        ctx.fillStyle = cor(0.35 + 0.5 * u, (Math.min(1, pm * 3) * aTexto).toFixed(3));
        ctx.fillText(P.ch, x, y);
      }
    }
    texto.style.setProperty("--t", pt.toFixed(3));
  }

  /* ---------- rolagem com inércia ---------- */
  function medirAlvo() {
    var r = secao.getBoundingClientRect();
    var percurso = secao.offsetHeight - window.innerHeight;
    alvo = percurso > 0 ? Math.min(1, Math.max(0, -r.top / percurso)) : 0;
  }
  function tick() {
    raf = 0;
    medirAlvo();
    var d = alvo - prog;
    prog += Math.abs(d) < 0.0005 ? d : d * 0.22;
    desenhar();
    if (ativo && Math.abs(alvo - prog) > 0.0005) raf = requestAnimationFrame(tick);
  }
  function agendar() { if (!raf) raf = requestAnimationFrame(tick); }

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = palco.clientWidth; H = palco.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (quadros[TOTAL - 1]) prepararGlifos();
    agendar();
  }

  new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) carregar();
  }, { rootMargin: "150% 0px" }).observe(secao);
  new IntersectionObserver(function (e) {
    ativo = e[0].isIntersecting;
    if (ativo && iniciou) { secao.classList.add("origem--viva"); agendar(); }
  }).observe(secao);
  window.addEventListener("scroll", function () { if (ativo && iniciou) agendar(); }, { passive: true });
  var tRes;
  window.addEventListener("resize", function () { if (!iniciou) return; clearTimeout(tRes); tRes = setTimeout(medir, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (quadros[TOTAL - 1]) prepararGlifos(); });
})();

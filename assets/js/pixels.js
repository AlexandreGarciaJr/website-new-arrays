/* =========================================================
   New Arrays | Quem somos: a foto vira o logo
   EFEITO: conforme a pessoa rola, a foto do fundador se pixeliza,
   os pixels se soltam e voam até formar o logo completo
   (new arrays + Experiência Digital). No fim, o canvas dá lugar
   ao SVG real do logo (nítido em qualquer tela).
   A tela TRAVA (cena presa com position: sticky) e o progresso (P, 0 a 1) controla:
     0.00–0.20  foto parada, bem visível
     0.20–0.30  a foto se pixeliza (blocos crescem até o tamanho do pixel)
     0.30–0.76  cada pixel voa até um ponto do logo e ganha a cor da marca
     0.72–1.00  o SVG do logo assume e fica na tela até destravar
   Desktop: foto e texto ficam parados juntos (.sobre__cena, 320vh).
   Celular: só a foto fica parada (.sobre__trilho); o texto vem depois.
   TECNOLOGIA: Canvas 2D (um retângulo por pixel), sem bibliotecas.
   PERFORMANCE: só desenha quando o progresso muda e a foto está na tela;
   menos pixels no celular. MOVIMENTO REDUZIDO: foto parada e logo abaixo.
   Ajustes: objeto PX.
   ========================================================= */
(function () {
  "use strict";
  var fig = document.querySelector("[data-pixels]");
  if (!fig || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var foto = fig.querySelector(".sobre__foto-img");
  var logo = fig.querySelector(".sobre__foto-logo");
  var canvas = fig.querySelector(".sobre__foto-canvas");
  var ctx = canvas.getContext("2d");
  if (!ctx || !foto || !logo) return;

  // liga o modo "mesmo quadro" já no início (a foto ainda está longe da tela: nada salta à vista)
  fig.classList.add("px-on");
  var cena = document.querySelector(".sobre__cena"), trilho = document.querySelector(".sobre__trilho");
  var desktop = window.matchMedia("(min-width: 1024px) and (min-height: 600px)");
  function alturaFoto() { document.documentElement.style.setProperty("--foto-h", fig.offsetHeight + "px"); }
  alturaFoto();
  var celular = window.matchMedia("(max-width: 639px)").matches;
  var PX = {
    PASSO: celular ? 9 : 6,          // tamanho do pixel da foto (px na tela)
    PASSO_LOGO: celular ? 3 : 2.5,   // espaçamento dos pontos do logo
    LOGO_LARGURA: 0.86,              // largura do logo em relação ao quadro
    COR: [7, 64, 73],                // Blue 900 (cor do logo)
    // fases dentro da cena presa (0 = a tela acabou de travar, 1 = vai destravar)
    FOTO_FIM: 0.2,                   // até aqui: foto parada
    PIXEL_FIM: 0.3,                  // até aqui: a foto se pixeliza
    VOO_FIM: 0.76,                   // até aqui: os pixels voam até o logo
    LOGO: [0.72, 0.82]               // o SVG do logo aparece neste trecho e fica até o fim
  };

  var W = 0, H = 0, dpr = 1, parts = null, pronto = false, ultimoP = -1;
  var cols = 0, rows = 0, mini = document.createElement("canvas"), miniCtx = mini.getContext("2d");

  function carregar(img) {
    return new Promise(function (ok, erro) {
      var i = new Image();
      i.decoding = "async";
      i.onload = function () { ok(i); };
      i.onerror = erro;
      i.src = img.currentSrc || img.src;
    });
  }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var imgFoto = null, imgLogo = null;
  function montar() {
    var r = fig.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(W * 644 / 495);
    if (!W || !imgFoto || !imgLogo) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    // 1. cores da foto numa grade de pixels
    cols = Math.round(W / PX.PASSO); rows = Math.round(H / PX.PASSO);
    mini.width = cols; mini.height = rows;
    miniCtx.drawImage(imgFoto, 0, 0, cols, rows);
    var dFoto = miniCtx.getImageData(0, 0, cols, rows).data;
    var sw = W / cols, sh = H / rows;

    // 2. pontos do logo (onde há tinta no SVG)
    var lw = Math.round(W * PX.LOGO_LARGURA), lh = Math.round(lw * 999 / 2428);
    var lx = (W - lw) / 2, ly = (H - lh) / 2;
    var lc = document.createElement("canvas"), lcx = lc.getContext("2d");
    var lcW = Math.round(lw / PX.PASSO_LOGO), lcH = Math.round(lh / PX.PASSO_LOGO);
    lc.width = lcW; lc.height = lcH;
    lcx.drawImage(imgLogo, 0, 0, lcW, lcH);
    var dLogo = lcx.getImageData(0, 0, lcW, lcH).data, pts = [];
    for (var y = 0; y < lcH; y++) for (var x = 0; x < lcW; x++) {
      if (dLogo[(y * lcW + x) * 4 + 3] > 110) pts.push({ x: lx + (x + 0.5) * lw / lcW, y: ly + (y + 0.5) * lh / lcH });
    }
    if (!pts.length) return;

    // 3. cada pixel da foto ganha um destino; a ordem (esquerda → direita) mantém o movimento coerente
    var lista = [];
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var k = (j * cols + i) * 4;
      lista.push({ x0: i * sw, y0: j * sh, r: dFoto[k], g: dFoto[k + 1], b: dFoto[k + 2] });
    }
    var chave = function (o, x, y) { return x + y * 0.35; };
    lista.sort(function (a, b) { return chave(a, a.x0, a.y0) - chave(b, b.x0, b.y0); });
    pts.sort(function (a, b) { return chave(a, a.x, a.y) - chave(b, b.x, b.y); });
    var N = lista.length, M = pts.length;
    parts = lista.map(function (p, n) {
      var alvo = pts[Math.floor(n * M / N)];
      var ordem = n / N;
      return {
        x0: p.x0, y0: p.y0, x1: alvo.x + (Math.random() - 0.5) * PX.PASSO_LOGO * 0.6, y1: alvo.y + (Math.random() - 0.5) * PX.PASSO_LOGO * 0.6,
        r: p.r, g: p.g, b: p.b,
        atraso: ordem * 0.38 + Math.random() * 0.08,
        curva: (Math.random() - 0.5) * 120, sw: sw, sh: sh
      };
    });
    pronto = true;
    ultimoP = -1;
  }

  function desenhar(P) {
    if (!pronto) return;
    var fotoOp = 1, canvasOp = 0, logoOp = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var F = PX.FOTO_FIM, PF = PX.PIXEL_FIM;
    if (P < F) {
      fotoOp = 1; canvasOp = 0;
    } else if (P < PF) {
      // pixelização: a foto é reduzida e ampliada sem suavizar; os blocos crescem
      var t = (P - F) / (PF - F);
      var bloco = 1 + (PX.PASSO - 1) * t * t;
      var cw = Math.max(1, Math.round(W / bloco)), ch = Math.max(1, Math.round(H / bloco));
      if (bloco >= PX.PASSO - 0.01) { cw = cols; ch = rows; }
      mini.width = cw; mini.height = ch;
      miniCtx.drawImage(imgFoto, 0, 0, cw, ch);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.beginPath(); arredondado(ctx, 0, 0, W, H, 16 * (1 - t)); ctx.clip();
      ctx.drawImage(mini, 0, 0, cw, ch, 0, 0, W, H);
      ctx.restore();
      fotoOp = 0; canvasOp = 1;
    } else {
      var q = clamp((P - PF) / (PX.VOO_FIM - PF));
      var C = PX.COR, n = parts.length;
      for (var i = 0; i < n; i++) {
        var p = parts[i];
        var l = inOut(clamp((q - p.atraso) / 0.5));
        var arco = Math.sin(l * Math.PI) * p.curva;
        var x = p.x0 + (p.x1 - p.x0) * l + arco * 0.35;
        var y = p.y0 + (p.y1 - p.y0) * l - arco * 0.25;
        // o pixel se separa dos vizinhos (vira "pixel" de verdade) e encolhe até o ponto do logo
        var solta = Math.min(1, l * 6);
        var s = p.sw * (1 - 0.18 * solta) * (1 - l) + PX.PASSO_LOGO * 1.05 * l;
        var r = p.r + (C[0] - p.r) * l, g = p.g + (C[1] - p.g) * l, b = p.b + (C[2] - p.b) * l;
        ctx.fillStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
        ctx.fillRect(x, y, s, s);
      }
      logoOp = clamp((P - PX.LOGO[0]) / (PX.LOGO[1] - PX.LOGO[0]));
      fotoOp = 0; canvasOp = 1 - clamp((P - PX.LOGO[0] - 0.04) / (PX.LOGO[1] - PX.LOGO[0]));
    }
    fig.style.setProperty("--px-foto", fotoOp.toFixed(3));
    fig.style.setProperty("--px-canvas", canvasOp.toFixed(3));
    fig.style.setProperty("--px-logo", logoOp.toFixed(3));
  }

  function arredondado(c, x, y, w, h, r) {
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function progresso() {
    // progresso da cena presa: desktop usa o bloco .sobre__cena; celular, o trilho da foto
    var vh = window.innerHeight;
    if (desktop.matches) {
      var r = cena.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - vh));
    }
    var t = trilho.getBoundingClientRect(), fh = fig.offsetHeight;
    var topoFixo = vh / 2 - fh / 2 + 20;
    return clamp((topoFixo - t.top) / Math.max(1, t.height - fh));
  }

  var raf = 0, visivel = false;
  function quadro() {
    raf = 0;
    if (!visivel) return;
    var P = progresso();
    if (Math.abs(P - ultimoP) > 0.0005) { desenhar(P); ultimoP = P; }
    raf = requestAnimationFrame(quadro);
  }

  var iniciado = false;
  function iniciar() {
    if (iniciado) return; iniciado = true;
    Promise.all([carregar(foto), carregar(logo)]).then(function (im) {
      imgFoto = im[0]; imgLogo = im[1];
      montar();
      if (visivel && !raf) raf = requestAnimationFrame(quadro);
    }).catch(function () { fig.classList.remove("px-on"); /* sem o efeito: foto e logo, um embaixo do outro */ });
  }

  new IntersectionObserver(function (e) {
    visivel = e[0].isIntersecting;
    if (visivel) { iniciar(); if (pronto && !raf) raf = requestAnimationFrame(quadro); }
  }, { rootMargin: "60% 0px 60% 0px" }).observe(fig);

  var tRes, larguraAntes = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === larguraAntes) return; // barra do navegador no celular: ignora
    larguraAntes = window.innerWidth;
    clearTimeout(tRes);
    tRes = setTimeout(function () { alturaFoto(); montar(); }, 200);
  });
})();

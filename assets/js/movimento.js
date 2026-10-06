/* =========================================================
   New Arrays | Movimento e interações
   Mapa de movimento (motion map):
   | Efeito                         | Gatilho | Tecnologia            |
   |--------------------------------|---------|-----------------------|
   | Botão primário: preenchimento   | hover   | CSS + JS (origem)     |
   |   a partir do ponto de entrada  |         |                       |
   | Botões fantasma: rolagem letra  | hover   | CSS (letras)          |
   | Menu: decodificação [ ]         | hover   | JS leve               |
   | Serviços do Hero: item cresce   | hover   | CSS (grid + :has)     |
  |   e a descrição aparece         |         |                       |
   | CTAs grandes: magnético         | mouse   | JS + CSS transform    |
   | Cards de serviço: luz de tinta  | mouse   | CSS vars              |
   | Projetos: colchetes abrem +     | hover   | CSS + JS (seguidor)   |
   |   etiqueta que segue o cursor   |         |                       |
   | Hero: saída em camadas + tinta  | scroll  | GSAP ScrollTrigger    |
   | Projetos: trilho suave + foco   | scroll  | GSAP scrub + ticker   |
   |   no card do centro             |         |                       |
   | Resultados: vídeos sobem com    | scroll  | GSAP scrub            |
   |   cortina + paralaxe            |         |                       |
   | Bastidores: cena presa, vídeo   | scroll  | GSAP scrub + sticky   |
   |   cresce, etapas, saída p/ Proj.|         |                       |
   | CTA final: título preenche      | scroll  | GSAP scrub            |
   | Cabeçalho some/volta            | scroll  | GSAP ScrollTrigger    |
   GSAP é carregado só depois do load, sem bloquear a primeira pintura.
   Movimento reduzido: nada disso roda; a página fica completa e parada.
   ========================================================= */
(function () {
  "use strict";
  var doc = document;
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------- Botão primário: preenchimento nasce de onde o cursor entrou ---------- */
  $$(".btn--primario").forEach(function (b) {
    function origem(e) {
      var r = b.getBoundingClientRect();
      b.style.setProperty("--fx", (e.clientX - r.left) + "px");
      b.style.setProperty("--fy", (e.clientY - r.top) + "px");
    }
    b.addEventListener("pointerenter", origem);
    b.addEventListener("pointerleave", origem);
  });

  if (reduzido) return;

  /* ---------- Botões fantasma: cada letra rola para cima ---------- */
  function dividirLetras(alvo) {
    var txt = alvo.textContent;
    if (!txt.trim()) return;
    function camada(cls, esconder) {
      var s = doc.createElement("span");
      s.className = cls;
      if (esconder) s.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(txt, function (ch, i) {
        var l = doc.createElement("span");
        l.className = "rolo__l";
        l.style.setProperty("--i", i);
        l.textContent = ch === " " ? " " : ch;
        s.appendChild(l);
      });
      return s;
    }
    var rolo = doc.createElement("span");
    rolo.className = "rolo";
    rolo.setAttribute("aria-hidden", "true");
    rolo.appendChild(camada("rolo__a", false));
    rolo.appendChild(camada("rolo__b", true));
    var leitor = doc.createElement("span");
    leitor.className = "sr-only";
    leitor.textContent = txt;
    alvo.textContent = "";
    alvo.appendChild(leitor);
    alvo.appendChild(rolo);
  }
  $$(".btn--fantasma").forEach(function (b) {
    var span = b.querySelector("span");
    if (span) { dividirLetras(span); return; }
    var alvo = doc.createElement("span");
    alvo.textContent = b.textContent.trim();
    b.textContent = "";
    b.appendChild(alvo);
    dividirLetras(alvo);
  });

  /* ---------- Menu: o texto "decodifica" entre colchetes ---------- */
  var GLIFOS = "[]{}<>/=+01";
  $$(".topo__nav a").forEach(function (a) {
    var original = a.textContent;
    var span = doc.createElement("span");
    span.className = "decod";
    span.textContent = original;
    span.setAttribute("aria-hidden", "true");
    var leitor = doc.createElement("span");
    leitor.className = "sr-only";
    leitor.textContent = original;
    a.textContent = "";
    a.appendChild(leitor);
    a.appendChild(span);
    var rodando = 0;
    function decodificar() {
      if (rodando) return;
      var inicio = performance.now(), dur = 420;
      span.style.minWidth = span.offsetWidth + "px";
      (function passo(agora) {
        var p = Math.min(1, (agora - inicio) / dur);
        var n = original.length, out = "";
        for (var i = 0; i < n; i++) {
          if (original[i] === " " || p > (i + 1) / n) out += original[i];
          else out += GLIFOS[(Math.random() * GLIFOS.length) | 0];
        }
        span.textContent = out;
        if (p < 1) rodando = requestAnimationFrame(passo);
        else { rodando = 0; span.textContent = original; span.style.minWidth = ""; }
      })(inicio);
    }
    a.addEventListener("pointerenter", decodificar);
    a.addEventListener("focus", decodificar);
  });

  /* ---------- Serviços do Hero: o item escolhido cresce (CSS); a fumaça acende junto ---------- */
  $$(".hero__array .servico-item").forEach(function (it) {
    function on() { if (window.NA_tinta) NA_tinta.brilho(1); }
    function off() { if (window.NA_tinta) NA_tinta.brilho(0); }
    it.addEventListener("pointerenter", on);
    it.addEventListener("pointerleave", off);
    it.addEventListener("focus", on);
    it.addEventListener("blur", off);
  });

  if (fino) {
    /* ---------- CTAs grandes: atração magnética ---------- */
    $$(".btn--grande").forEach(function (b) {
      var alvoX = 0, alvoY = 0, x = 0, y = 0, raf = 0, dentro = false;
      function tick() {
        x += (alvoX - x) * 0.18; y += (alvoY - y) * 0.18;
        b.style.setProperty("--mx", x.toFixed(2) + "px");
        b.style.setProperty("--my", y.toFixed(2) + "px");
        if (dentro || Math.abs(x) > 0.1 || Math.abs(y) > 0.1) raf = requestAnimationFrame(tick); else raf = 0;
      }
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        alvoX = (e.clientX - (r.left + r.width / 2)) * 0.22;
        alvoY = (e.clientY - (r.top + r.height / 2)) * 0.32;
        dentro = true;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      b.addEventListener("pointerleave", function () { alvoX = 0; alvoY = 0; dentro = false; if (!raf) raf = requestAnimationFrame(tick); });
    });

    /* ---------- Cards de serviço: luz de tinta segue o cursor ---------- */
    $$(".servico").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--lx", (e.clientX - r.left) + "px");
        c.style.setProperty("--ly", (e.clientY - r.top) + "px");
      });
    });

    /* ---------- Projetos: etiqueta que segue o cursor ---------- */
    $$(".projeto").forEach(function (card) {
      var link = card.querySelector(".projeto__link");
      if (!link) return;
      var et = doc.createElement("span");
      et.className = "projeto__seguidor";
      et.setAttribute("aria-hidden", "true");
      et.innerHTML = 'Visitar site<svg><use href="#i-out"/></svg>';
      card.appendChild(et);
      var ax = 0, ay = 0, x = 0, y = 0, raf = 0, dentro = false;
      function tick() {
        x += (ax - x) * 0.2; y += (ay - y) * 0.2;
        et.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
        if (dentro || Math.abs(ax - x) > 0.3) raf = requestAnimationFrame(tick); else raf = 0;
      }
      card.addEventListener("pointerenter", function (e) {
        var r = card.getBoundingClientRect();
        x = ax = e.clientX - r.left; y = ay = e.clientY - r.top; dentro = true;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        ax = e.clientX - r.left; ay = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      card.addEventListener("pointerleave", function () { dentro = false; });
    });
  }

  /* ---------- Monogramas dos projetos: colchetes separados para abrir no hover ---------- */
  $$(".projeto__monograma").forEach(function (m) {
    var t = m.textContent.trim();
    if (t.charAt(0) !== "[") return;
    m.innerHTML = '<span class="mono__c">[</span><span class="mono__t">' + t.slice(1, -1) + '</span><span class="mono__c">]</span>';
  });

  /* =========================================================
     GSAP: carregado depois do load
     ========================================================= */
  function carregar(src) {
    return new Promise(function (ok, erro) {
      var s = doc.createElement("script");
      s.src = src; s.async = false; s.onload = ok; s.onerror = erro;
      doc.head.appendChild(s);
    });
  }
  var base = (doc.currentScript && doc.currentScript.src) ? doc.currentScript.src.replace(/movimento\.js.*$/, "") : "assets/js/";
  function iniciarGsap() {
    carregar(base + "vendor/gsap.min.js")
      .then(function () { return carregar(base + "vendor/ScrollTrigger.min.js"); })
      .then(montarScroll)
      .catch(function () { /* sem GSAP a página segue completa */ });
  }
  // GSAP só carrega na primeira interação (rolar, tocar, mover o mouse, teclar) ou depois de alguns
  // segundos parado: a primeira pintura e o carregamento inicial ficam livres de trabalho extra.
  var carregado = false;
  var EVENTOS = ["scroll", "wheel", "touchstart", "pointermove", "keydown"];
  function disparar() {
    if (carregado) return;
    carregado = true;
    EVENTOS.forEach(function (ev) { window.removeEventListener(ev, disparar, { passive: true }); });
    iniciarGsap();
  }
  function armar() {
    EVENTOS.forEach(function (ev) { window.addEventListener(ev, disparar, { passive: true }); });
    setTimeout(disparar, 7000);
    if (window.scrollY > 0) disparar();
  }
  if (doc.readyState === "complete") armar();
  else window.addEventListener("load", armar, { once: true });

  function montarScroll() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    if (window.NA_lenis) window.NA_lenis.on("scroll", ST.update);
    raizPronta();

    /* ---- Hero: saída em camadas, colchetes fecham, tinta vira corrente ---- */
    var hero = doc.querySelector(".hero");
    var titulo = doc.querySelector(".hero__titulo");
    // as palavras já vêm separadas no HTML (mexer no texto do H1 depois do load recontaria o LCP)
    var palavras = titulo ? $$(".pal", titulo) : [];
    function linhas() {
      var topo = null, idx = -1;
      palavras.forEach(function (p) {
        if (p.offsetTop !== topo) { topo = p.offsetTop; idx++; }
        p.dataset.linha = idx;
      });
    }
    linhas();
    ST.addEventListener("refreshInit", linhas);

    var arr = doc.querySelector(".hero__array");
    // desktop com a cena de abertura: quem cuida da saída do Hero é o abertura.js
    var emCena = doc.documentElement.classList.contains("cena-abertura");
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero, start: "top top", end: "bottom top", scrub: 0.7, invalidateOnRefresh: true,
        onRefresh: function (st) { if (doc.documentElement.classList.contains("cena-abertura")) { st.animation.progress(0); } },
      }
    });
    // valores positivos = a camada "atrasa" em relação à rolagem (profundidade)
    var hH = function () { return hero.offsetHeight * (window.innerWidth < 1024 ? 0.28 : 1); };
    tl.to(palavras, { y: function (i, el) { return hH() * (0.6 - Number(el.dataset.linha) * 0.2); }, opacity: 0, ease: "power1.in" }, 0)
      .to(".hero__rotulo", { y: function () { return hH() * 0.62; }, opacity: 0 }, 0)
      .to(".hero__sub", { y: function () { return hH() * 0.3; }, opacity: 0, ease: "power1.in" }, 0)
      .to(".hero__acoes", { y: function () { return hH() * 0.2; }, opacity: 0, ease: "power2.in" }, 0)
      .to(arr, { "--fechar": 1, y: function () { return hH() * 0.5; } }, 0)
      .to(".hero__array .servicos-lista", { opacity: 0, scaleX: 0.86 }, 0.05);
    var stHero = tl.scrollTrigger;
    if (emCena) { stHero.disable(true); }
    // com o formulário aberto, o Hero não pode sumir enquanto a pessoa preenche
    doc.addEventListener("na:form", function (e) {
      if (e.detail.aberto) { stHero.disable(true); }
      else if (!doc.documentElement.classList.contains("cena-abertura")) { stHero.enable(); ST.refresh(); }
    });

    /* ---- Cabeçalho: some ao descer, volta ao subir ---- */
    var topo = doc.querySelector(".topo");
    ST.create({
      start: 0, end: "max",
      onUpdate: function (s) {
        var esconder = s.direction === 1 && s.scroll() > window.innerHeight * 0.9 && !topo.contains(doc.activeElement) && !doc.querySelector("#menu.aberto");
        topo.classList.toggle("topo--oculto", esconder);
      }
    });

    /* ---- Três frentes: baralho em 3D (desktop) ----
       Entrada: o título sobe palavra por palavra, os verbos da conexão entram da esquerda
       e o baralho sobe inclinado e assenta. Preso na tela: a carta da frente vira para trás
       (como folha de calendário), a de trás avança, o número gigante gira (01 → 02 → 03)
       e "Comunicar · Atrair · Converter" passa ao fundo. As trocas acontecem perto de 1/3
       e 2/3 da cena, junto com o data-etapa do motor (que acende a conexão à esquerda). */
    var serv = doc.querySelector(".servicos");
    if (serv && window.innerWidth >= 1024 && doc.documentElement.classList.contains("cena-sobre")) {
      doc.documentElement.classList.add("servicos-deck");
      var cartas = $$(".servicos__palco .fx-etapa", serv);
      var titS = serv.querySelector(".servicos__titulo");
      // título em palavras com máscara
      var palavrasS = titS.textContent.trim().split(/\s+/);
      titS.setAttribute("aria-label", titS.textContent.trim());
      titS.innerHTML = palavrasS.map(function (w) { return '<span class="pal-m" aria-hidden="true"><span>' + w + '</span></span>'; }).join(" ");
      var POS = [
        { y: 0, scale: 1, rotationX: 0, autoAlpha: 1, filter: "brightness(1)", zIndex: 3 },
        { y: -46, scale: 0.92, rotationX: 0, autoAlpha: 1, filter: "brightness(0.62)", zIndex: 2 },
        { y: -86, scale: 0.84, rotationX: 0, autoAlpha: 1, filter: "brightness(0.42)", zIndex: 1 }
      ];
      var SAI = { y: -130, scale: 0.97, rotationX: 58, autoAlpha: 0, filter: "brightness(1.1)", zIndex: 4 };
      var conteudo = function (c) { return $$(".servico__icone, .servico__titulo, .servico__lead, .servico__lead + p, .servico__itens li, .btn", c); };
      cartas.forEach(function (c, i) {
        var aba = doc.createElement("span"); aba.className = "servico__aba"; aba.setAttribute("aria-hidden", "true");
        aba.innerHTML = "<b>0" + (i + 1) + "</b>" + c.querySelector(".servico__titulo").textContent;
        c.appendChild(aba);
        gsap.set(c, POS[i]); if (i) gsap.set(conteudo(c), { autoAlpha: 0, y: 24 });
      });

      gsap.timeline({ scrollTrigger: { trigger: serv, start: "top 80%", end: "top top", scrub: 0.8 } })
        .fromTo(serv.querySelectorAll(".pal-m > span"), { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.5, ease: "power3.out" }, 0)
        .fromTo(serv.querySelector(".servicos__intro"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3)
        .fromTo(serv.querySelectorAll(".conexao li"), { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.35 }, 0.4)
        .fromTo(serv.querySelector(".servicos__palco"), { y: 220, rotationX: -24, transformPerspective: 1400, autoAlpha: 0 }, { y: 0, rotationX: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, 0.1)
        .fromTo(serv.querySelector(".servicos__num"), { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.5 }, 0.5);

      var fita = serv.querySelector(".servicos__num-fita");
      var tlS = gsap.timeline({ scrollTrigger: { trigger: serv, start: "top top", end: "bottom bottom", scrub: 0.9 } });
      var troca = function (t, sai, vem, atras) {
        tlS.to(cartas[sai], Object.assign({ duration: 0.2, ease: "power2.in" }, SAI), t)
           .to(cartas[vem], Object.assign({ duration: 0.2, ease: "power3.out" }, POS[0]), t + 0.04);
        if (atras != null) tlS.to(cartas[atras], Object.assign({ duration: 0.2, ease: "power3.out" }, POS[1]), t + 0.06);
        tlS.to(conteudo(cartas[vem]), { autoAlpha: 1, y: 0, stagger: 0.012, duration: 0.1, ease: "power2.out" }, t + 0.12)
           .to(fita, { yPercent: -100 / 3 * vem, duration: 0.18, ease: "power3.inOut" }, t + 0.03);
      };
      tlS.to({}, { duration: 0.14 }, 0);
      troca(0.14, 0, 1, 2);   // termina antes de 1/3: quando o data-etapa vira 2, a carta 2 já está na frente
      troca(0.48, 1, 2, null); // termina antes de 2/3
      tlS.to({}, { duration: 0.2 }, 0.8);
      gsap.fromTo(serv.querySelector(".servicos__eco span"), { xPercent: 5 }, { xPercent: -62, ease: "none",
        scrollTrigger: { trigger: serv, start: "top bottom", end: "bottom top", scrub: 1 } });
    }

    /* ---- Resultados → Bastidores: "quatro vídeos viram um" ----
       Desktop (≥1024 px, html.cena-res): Resultados fica preso na tela. Depois de um tempo
       para assistir, o título sai, as legendas somem e os 4 Reels deslizam, se alinham e
       viram 4 fatias de um único painel 16:9, exatamente no lugar do vídeo dos Bastidores.
       O painel então dissolve no vídeo de bastidores (que também é um mosaico) e a nova
       seção se monta em volta dele. Tudo sem a página descer: Bastidores começa preso
       por baixo (margem -160vh), invisível, e as duas cenas se cruzam por 60vh.
       Tablet (768-1023): cada seção tem a sua cena; celular: rolagem comum. */
    var reels = $$(".reel");
    var res = doc.querySelector(".resultados");
    var bast = doc.querySelector(".bastidores");
    var cenaRes = !!(res && bast && reels.length === 4 && window.innerWidth >= 1024);
    var cenaBast = !!(bast && window.innerWidth >= 768);
    if (cenaRes) doc.documentElement.classList.add("cena-res");
    if (cenaBast) doc.documentElement.classList.add("cena-bast");

    var palcoB = bast && bast.querySelector(".bastidores__palco");
    var tela = bast && bast.querySelector(".bastidores__tela"), moldura = bast && bast.querySelector(".bastidores__moldura");
    var linhas = bast ? $$(".bt__linha > span", bast) : [], lado = bast && bast.querySelector(".bastidores__lado"), kicker = bast && bast.querySelector(".bastidores__kicker");
    var etapas = bast ? $$(".bastidores__etapas li", bast) : [], cantos = bast ? $$(".bastidores__canto", bast) : [], listaEt = bast && bast.querySelector(".bastidores__etapas");

    if (cenaRes) {
      var palcoR = res.querySelector(".secao__in");
      // posição de um elemento dentro do seu palco preso (offsets ignoram transformações)
      var noPalco = function (el, palco) {
        var x = 0, y = 0, e = el;
        while (e && e !== palco) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
        var r = palco.getBoundingClientRect();
        return { x: r.left + x, y: y, w: el.offsetWidth, h: el.offsetHeight };
      };
      // para onde vai cada Reel: uma fatia vertical do retângulo do vídeo dos Bastidores
      var alvo = function (i) {
        var T = noPalco(tela, palcoB), m = reels[i].querySelector(".reel__midia"), R = noPalco(reels[i], palcoR);
        var w = m.offsetWidth, h = m.offsetHeight, sc = T.h / h, fatia = T.w / 4;
        return { x: T.x + (i + 0.5) * fatia - (R.x + w * sc / 2), y: T.y - R.y, s: sc, corte: Math.max(0, (1 - fatia / (w * sc)) / 2 * 100) };
      };
      var cache = [], medir = function () { cache = reels.map(function (_, i) { return alvo(i); }); };
      var A = function (i, k) { if (!cache.length) medir(); return cache[i][k]; };
      ST.addEventListener("refreshInit", function () { cache = []; });

      gsap.set(reels, { transformOrigin: "0 0" });
      var tlFusao = gsap.timeline({ scrollTrigger: { trigger: res, start: "top top", end: "bottom bottom", scrub: 0.9, invalidateOnRefresh: true,
        onUpdate: function (st) {
          // som ligado num Reel? desliga antes de ele virar fatia
          if (st.progress > 0.3) { var b2 = doc.querySelector(".reel.com-som .reel__som"); if (b2) b2.click(); }
        } } });
      tlFusao
        .to({}, { duration: 0.28 }) // tempo para assistir e ligar o som
        .to([res.querySelector(".resultados__titulo"), res.querySelector(".resultados__intro")], { yPercent: -80, autoAlpha: 0, stagger: 0.03, duration: 0.14, ease: "power2.in" }, 0.3)
        .to($$(".reel__legenda, .reel__selo, .reel__som, .reel__progresso", res), { autoAlpha: 0, y: -12, duration: 0.1, stagger: 0.01 }, 0.3);
      reels.forEach(function (r, i) {
        var m = r.querySelector(".reel__midia");
        tlFusao.fromTo(r, { x: 0, y: 0, scale: 1, rotation: 0 }, {
          x: function () { return A(i, "x"); }, y: function () { return A(i, "y"); }, scale: function () { return A(i, "s"); },
          duration: 0.26, ease: "power3.inOut", immediateRender: false }, 0.42 + i * 0.025)
        .fromTo(m, { clipPath: "inset(0% 0% 0% 0% round 16px)" }, {
          clipPath: function () { var c = A(i, "corte").toFixed(2); return "inset(0% " + c + "% 0% " + c + "% round 0px)"; },
          duration: 0.24, ease: "power3.inOut", immediateRender: false }, 0.44 + i * 0.025);
      });
      // o painel dissolve no vídeo dos Bastidores (que aparece por baixo no mesmo lugar)
      tlFusao.to(reels, { autoAlpha: 0, duration: 0.1, ease: "none" }, 0.84);

      // Bastidores começa invisível (está subindo por baixo da cena de Resultados)
      gsap.set([kicker, lado, listaEt].concat(cantos), { autoAlpha: 0 });
      gsap.set(linhas, { yPercent: 110 });
      gsap.set(moldura, { autoAlpha: 0 });
    }

    /* ---- Resultados no celular e no tablet (< 1024 px): carrossel vertical ----
       A seção fica presa na tela com os 4 Reels empilhados no mesmo lugar. Rolar para baixo
       troca o vídeo: o atual sobe, encolhe e some; o próximo nasce de baixo com uma cortina,
       como nos stories. Contador "01 / 04" e pontinhos mostram onde a pessoa está.
       Só o vídeo da frente toca (midia.js ouve "na:reel-ativo"). */
    var pilha = !!(res && reels.length > 1 && window.innerWidth < 1024);
    if (pilha) {
      doc.documentElement.classList.add("reels-pilha");
      var caixa = res.querySelector(".reels");
      var cont = doc.createElement("div");
      cont.className = "reels__contador"; cont.setAttribute("aria-hidden", "true");
      cont.innerHTML = '<span class="reels__num"><b>01</b> / ' + ("0" + reels.length).slice(-2) + '</span><span class="reels__pontos">' + reels.map(function () { return "<i></i>"; }).join("") + "</span>";
      caixa.appendChild(cont);
      var numEl = cont.querySelector("b"), pontos = $$("i", cont), atual = -1;
      var marcar = function (i) {
        if (i === atual) return;
        atual = i;
        reels.forEach(function (r, k) { r.classList.toggle("reel--ativo", k === i); r.setAttribute("aria-hidden", k === i ? "false" : "true"); });
        pontos.forEach(function (p, k) { p.classList.toggle("on", k === i); });
        numEl.textContent = ("0" + (i + 1)).slice(-2);
        doc.dispatchEvent(new CustomEvent("na:reel-ativo"));
      };
      reels.forEach(function (r, i) {
        if (i) {
          gsap.set(r, { yPercent: 70, scale: 0.9, rotation: 5, autoAlpha: 0 });
          gsap.set(r.querySelector(".reel__midia"), { clipPath: "inset(100% 0% 0% 0% round 16px)" });
          gsap.set(r.querySelector(".reel__legenda"), { autoAlpha: 0, y: 14 });
        }
      });
      marcar(0);
      var passos = reels.length - 1;
      var tlP = gsap.timeline({ scrollTrigger: { trigger: res, start: "top top", end: "bottom bottom", scrub: 0.6,
        onUpdate: function (st) { marcar(Math.min(reels.length - 1, Math.round(st.progress * passos))); } } });
      for (var k = 0; k < passos; k++) {
        var t = k + 0.25;
        tlP.to(reels[k], { yPercent: -18, scale: 0.86, rotation: -4, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, t)
           .to(reels[k + 1], { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out" }, t + 0.05)
           .to(reels[k + 1].querySelector(".reel__midia"), { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 0.5, ease: "power3.out" }, t + 0.05)
           // as legendas não se cruzam: a de saída some logo, a de entrada aparece no fim
           .to(reels[k].querySelector(".reel__legenda"), { autoAlpha: 0, y: -10, duration: 0.15 }, t)
           .to(reels[k + 1].querySelector(".reel__legenda"), { autoAlpha: 1, y: 0, duration: 0.2 }, t + 0.38);
      }
      tlP.to({}, { duration: 0.25 });
      // entrada (antes de prender): o primeiro Reel sobe com a cortina
      gsap.timeline({ scrollTrigger: { trigger: res, start: "top 85%", end: "top top", scrub: 0.6 } })
        .fromTo(reels[0], { yPercent: 25, rotation: -3 }, { yPercent: 0, rotation: 0, duration: 1, ease: "power3.out" }, 0)
        .fromTo(reels[0].querySelector(".reel__midia"), { clipPath: "inset(100% 0% 0% 0% round 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 0.8, ease: "power3.inOut" }, 0)
        .fromTo(cont, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.7);
    }

    /* ---- Resultados sem a fusão (tablet): vídeos sobem de baixo, cada coluna no seu ritmo ---- */
    if (reels.length && !pilha) {
      var desloc = [140, 220, 170, 250], giro = [-4, 3, -3, 4];
      var tlR = gsap.timeline({ scrollTrigger: cenaRes
        ? { trigger: res, start: "top 92%", end: "top top", scrub: 0.9 }
        : { trigger: ".reels", start: "top 95%", end: "top 25%", scrub: 0.9 } });
      reels.forEach(function (r, i) {
        var m = r.querySelector(".reel__midia"), v = r.querySelector(".reel__video"), leg = r.querySelector(".reel__legenda");
        var t0 = i * 0.12;
        tlR.fromTo(r, { y: desloc[i % 4], rotation: giro[i % 4] }, { y: 0, rotation: 0, ease: "power3.out", duration: 1 }, t0)
           .fromTo(m, { clipPath: "inset(100% 0% 0% 0% round 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 16px)", ease: "power3.inOut", duration: 0.85 }, t0)
           .fromTo(r, { "--z": 1.35 }, { "--z": 1, ease: "power2.out", duration: 1 }, t0)
           .fromTo(leg, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.5 }, t0 + 0.5);
      });
      if (!cenaRes && window.innerWidth >= 1024) {
        reels.forEach(function (r, i) {
          gsap.to(r, { yPercent: i % 2 ? -6 : 3, ease: "none",
            scrollTrigger: { trigger: ".reels", start: "top 25%", end: "bottom top", scrub: 1 } });
        });
      }
    }

    /* ---- Bastidores: cena presa (tablet e desktop) ----
       Com a fusão (desktop): 0 → 0,27 a seção se monta em volta do vídeo que acabou de nascer
       dos Reels; sem a fusão (tablet): o título sobe e o vídeo cresce de uma janela recortada.
       Depois: as 6 etapas acendem uma a uma; na saída o vídeo fecha numa faixa e some,
       e Projetos entra no mesmo lugar (margem -100vh, ver CSS .cena-bast). */
    if (cenaBast) {
      if (!cenaRes) {
        gsap.timeline({ scrollTrigger: { trigger: bast, start: "top 85%", end: "top top", scrub: 0.8 } })
          .fromTo(kicker, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0)
          .fromTo(linhas, { yPercent: 110 }, { yPercent: 0, stagger: 0.12, duration: 0.6, ease: "power3.out" }, 0.05)
          .fromTo(lado, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.3)
          .fromTo(tela, { scale: 0.62, y: 60 }, { scale: 0.78, y: 0, duration: 1, ease: "none" }, 0)
          .fromTo(moldura, { clipPath: "inset(18% 22% 18% 22% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 1, ease: "power2.out" }, 0)
          .fromTo(cantos, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.7);
      }
      var ini = cenaRes ? 0.3 : 0.12, fimEt = 0.7;
      var tlB = gsap.timeline({ scrollTrigger: { trigger: bast, start: "top top", end: "bottom bottom", scrub: 0.8,
        onUpdate: function (st) {
          var p = st.progress, n = p < ini ? 0 : Math.min(etapas.length, Math.floor((p - ini) / (fimEt - ini) * etapas.length) + 1);
          etapas.forEach(function (li, i) { li.classList.toggle("acesa", i < n); });
        } } });
      if (cenaRes) {
        tlB.to(moldura, { autoAlpha: 1, duration: 0.12, ease: "none" }, 0)
           .fromTo(moldura, { scale: 1.04 }, { scale: 1, duration: 0.2, ease: "power2.out", immediateRender: false }, 0)
           .to(kicker, { autoAlpha: 1, duration: 0.06 }, 0.08)
           .to(linhas, { yPercent: 0, stagger: 0.03, duration: 0.12, ease: "power3.out" }, 0.09)
           .fromTo(lado, { y: 30 }, { autoAlpha: 1, y: 0, duration: 0.1, immediateRender: false }, 0.14)
           .fromTo(cantos[0], { x: 30, y: 30 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.1, immediateRender: false }, 0.16)
           .fromTo(cantos[1], { x: -30, y: -30 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.1, immediateRender: false }, 0.16)
           .fromTo(listaEt, { y: 40 }, { autoAlpha: 1, y: 0, duration: 0.1, immediateRender: false }, 0.18)
           .to({}, { duration: 0.44 }, 0.28);
      } else {
        tlB.to(tela, { scale: 1, duration: 0.3, ease: "power2.inOut" }, 0)
           .to({}, { duration: 0.42 });
      }
      tlB.to(cantos[0], { x: -40, y: -40, autoAlpha: 0, duration: 0.12 }, 0.72)
         .to(cantos[1], { x: 40, y: 40, autoAlpha: 0, duration: 0.12 }, 0.72)
         .to(moldura, { clipPath: "inset(49% 0% 49% 0% round 4px)", duration: 0.16, ease: "power3.in" }, 0.74)
         .to(tela, { scale: 0.9, duration: 0.16, ease: "power2.in" }, 0.74)
         .to(moldura, { clipPath: "inset(49% 50% 49% 50% round 4px)", duration: 0.08, ease: "power2.in" }, 0.9)
         .to([kicker].concat(linhas, [lado]), { yPercent: -60, autoAlpha: 0, stagger: 0.01, duration: 0.14, ease: "power2.in" }, 0.76)
         .to(listaEt, { y: 40, autoAlpha: 0, duration: 0.12, ease: "power2.in" }, 0.8);

      // Projetos: conteúdo escondido enquanto a seção sobe "por baixo" da cena; aparece quando prende
      var proj = doc.querySelector("#projetos");
      if (proj) {
        proj.style.height = "355vh"; // +55vh para a entrada antes do trilho andar
        var pTit = proj.querySelector(".projetos__titulo"), pIntro = proj.querySelector(".projetos__intro"), pCards = $$(".projeto", proj);
        gsap.set([pTit, pIntro], { autoAlpha: 0 });
        gsap.timeline({ scrollTrigger: { trigger: proj, start: "top top", end: "top -55%", scrub: 0.8 } })
          .fromTo(pTit, { autoAlpha: 0, yPercent: 60, clipPath: "inset(0% 0% 100% 0%)" }, { autoAlpha: 1, yPercent: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power3.out" }, 0)
          .fromTo(pIntro, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.25)
          // sem mexer no transform do card: o foco do carrossel usa a propriedade CSS "scale",
          // e animar transform no card faria o GSAP congelar esse scale (o 1º card ficava ampliado para sempre)
          .fromTo(pCards, { autoAlpha: 0, clipPath: "inset(-30px -30px -30px 100% round 16px)" }, { autoAlpha: 1, clipPath: "inset(-30px -30px -30px -30px round 16px)", stagger: 0.07, duration: 0.55, ease: "power3.out" }, 0.15)
          .fromTo($$(".projeto__txt", proj), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 0.45, ease: "power3.out" }, 0.3);
      }
    }

    /* ---- Projetos: trilho horizontal com rolagem suave (scrub) + profundidade nas imagens ---- */
    var trilho = doc.querySelector(".projetos__trilho");
    if (trilho) {
      doc.documentElement.classList.add("trilho-gsap");
      // o trilho anda do primeiro card centralizado até o último card centralizado
      var todos = $$(".projeto", trilho);
      var distancia = function () { return Math.max(0, todos[todos.length - 1].offsetLeft - todos[0].offsetLeft); };
      var comBast = doc.documentElement.classList.contains("cena-bast");
      var cena = { trigger: "#projetos", start: comBast ? "top -55%" : "top top", end: "bottom bottom", scrub: 0.8, invalidateOnRefresh: true };
      gsap.to(trilho, { x: function () { return -distancia(); }, ease: "none", scrollTrigger: cena });
      $$(".projeto__img img").forEach(function (img) {
        gsap.fromTo(img, { xPercent: -3 }, { xPercent: 3, ease: "none", scrollTrigger: { trigger: "#projetos", start: cena.start, end: "bottom bottom", scrub: 0.8 } });
      });

      // foco no centro: o card que passa pelo meio da tela cresce e ganha cor; os das pontas diminuem e ficam em preto e branco
      var cardsFoco = $$(".projeto", trilho);
      var focoAtivo = false;
      function atualizarFoco() {
        var W = window.innerWidth, meio = W / 2, raio = W * (W < 768 ? 0.7 : 0.55);
        for (var i = 0; i < cardsFoco.length; i++) {
          var r = cardsFoco[i].getBoundingClientRect();
          var f = Math.max(0, 1 - Math.abs(r.left + r.width / 2 - meio) / raio);
          f = f * f * (3 - 2 * f);
          cardsFoco[i].style.setProperty("--f", f.toFixed(3));
        }
      }
      doc.documentElement.classList.add("foco-carrossel");
      ST.create({
        trigger: "#projetos", start: "top bottom", end: "bottom top",
        onToggle: function (s) {
          if (s.isActive && !focoAtivo) { focoAtivo = true; gsap.ticker.add(atualizarFoco); }
          else if (!s.isActive && focoAtivo) { focoAtivo = false; gsap.ticker.remove(atualizarFoco); }
        }
      });
      atualizarFoco();
    }

    /* ---- Quem somos: new Arrays() é digitado ---- */
    var codigo = doc.querySelector(".sobre__codigo");
    if (codigo) {
      var chars = [];
      $$("span", codigo).forEach(function (sp) {
        var t = sp.textContent; sp.textContent = "";
        Array.prototype.forEach.call(t, function (ch) {
          var c = doc.createElement("span"); c.className = "cod__c"; c.textContent = ch; sp.appendChild(c); chars.push(c);
        });
      });
      codigo.classList.add("digitando");
      gsap.set(chars, { opacity: 0 });
      gsap.to(chars, {
        opacity: 1, duration: 0.01, stagger: 0.07, ease: "none",
        scrollTrigger: { trigger: codigo, start: "top 80%" },
        onComplete: function () { codigo.classList.add("digitado"); }
      });
    }

    /* ---- Seções que mudam de altura depois de montadas (ex.: o fluxo ao aparecer):
       recalcula todos os gatilhos de rolagem, senão as cenas abaixo disparam no lugar errado ---- */
    if ("ResizeObserver" in window) {
      var alturaDoc = doc.body.scrollHeight, tRef = 0;
      new ResizeObserver(function () {
        var h = doc.body.scrollHeight;
        if (Math.abs(h - alturaDoc) < 2) return;
        alturaDoc = h;
        clearTimeout(tRef);
        tRef = setTimeout(function () { ST.refresh(); }, 150);
      }).observe(doc.body);
    }

    /* ---- CTA final: o título se preenche com a rolagem ---- */
    var finalT = doc.querySelector(".final__titulo");
    if (finalT) {
      finalT.innerHTML = "<span>" + finalT.textContent + "</span>";
      finalT.classList.add("preencher");
      gsap.fromTo(finalT, { "--fill": "0%" }, {
        "--fill": "100%", ease: "none",
        scrollTrigger: { trigger: finalT, start: "bottom 95%", end: "bottom 35%", scrub: 0.6 } // começa só quando o título inteiro já entrou na tela
      });
    }
  }

  function raizPronta() { doc.documentElement.classList.add("gsap-pronto"); }
})();

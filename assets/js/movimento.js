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
   | Resultados: recorte revelando   | scroll  | GSAP batch            |
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

    /* ---- Resultados: vídeos surgem por recorte ---- */
    var midias = $$(".video-card, .bastidores");
    gsap.set(midias, { clipPath: "inset(14% 8% 14% 8% round 16px)" });
    ST.batch(midias, {
      start: "top 88%",
      onEnter: function (lote) {
        gsap.to(lote, { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 1.2, ease: "expo.out", stagger: 0.12,
          onComplete: function () { gsap.set(lote, { clearProps: "clipPath" }); } });
      }
    });

    /* ---- Projetos: trilho horizontal com rolagem suave (scrub) + profundidade nas imagens ---- */
    var trilho = doc.querySelector(".projetos__trilho");
    if (trilho) {
      doc.documentElement.classList.add("trilho-gsap");
      // o trilho anda do primeiro card centralizado até o último card centralizado
      var todos = $$(".projeto", trilho);
      var distancia = function () { return Math.max(0, todos[todos.length - 1].offsetLeft - todos[0].offsetLeft); };
      var cena = { trigger: "#projetos", start: "top top", end: "bottom bottom", scrub: 0.8, invalidateOnRefresh: true };
      gsap.to(trilho, { x: function () { return -distancia(); }, ease: "none", scrollTrigger: cena });
      $$(".projeto__img img").forEach(function (img) {
        gsap.fromTo(img, { xPercent: -3 }, { xPercent: 3, ease: "none", scrollTrigger: { trigger: "#projetos", start: "top top", end: "bottom bottom", scrub: 0.8 } });
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

    /* ---- CTA final: o título se preenche com a rolagem ---- */
    var finalT = doc.querySelector(".final__titulo");
    if (finalT) {
      finalT.innerHTML = "<span>" + finalT.textContent + "</span>";
      finalT.classList.add("preencher");
      gsap.fromTo(finalT, { "--fill": "0%" }, {
        "--fill": "100%", ease: "none",
        scrollTrigger: { trigger: ".final", start: "top 85%", end: "center 55%", scrub: 0.5 }
      });
    }
  }

  function raizPronta() { doc.documentElement.classList.add("gsap-pronto"); }
})();

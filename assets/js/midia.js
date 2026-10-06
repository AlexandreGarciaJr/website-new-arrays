/* =========================================================
   New Arrays | Vídeos e carrosséis de trabalhos reais
   PILARES   vídeo [data-src] e carrossel [data-galeria]: tocam sozinhos,
             sem som, só enquanto aparecem na tela (na cena da abertura,
             só depois que os pilares entram).
   RESULTADOS vídeos .reel: tocam mudos quando aparecem; o botão de alto-falante
             (ou um clique no vídeo) liga o som de UM vídeo por vez, recomeçando
             do início. Enquanto um vídeo tem som, a música do site abaixa
             (evento "na:video-som", ouvido pelo dock.js).
   LEQUE     [data-leque] (pilar Tráfego): as duas peças sobrepostas trocam de
             lugar sozinhas a cada LEQUE_MS e com um clique na peça de trás.
             Para enquanto o mouse está em cima ou o pilar está ampliado.
   Nada é baixado antes de a página terminar de carregar. Com "reduzir movimento"
   ou economia de dados, nada toca sozinho: aparece a capa e o botão dá o play com som.
   Ajustes: objeto MIDIA.
   ========================================================= */
(function () {
  "use strict";
  var MIDIA = { GALERIA_MS: 2600, LEQUE_MS: 3800, MARGEM: "120px 0px" };
  var doc = document;
  var quieto = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ||
    (navigator.connection && navigator.connection.saveData);
  var abertura = doc.querySelector(".abertura");

  // na cena presa (desktop), os pilares ficam por cima do Hero, invisíveis, até a rolagem trazê-los
  function pilaresLiberados(el) {
    if (!abertura || !doc.documentElement.classList.contains("cena-abertura")) return true;
    if (!abertura.contains(el)) return true;
    return abertura.classList.contains("ab-pilares");
  }

  var itens = []; // { el, tipo: "video"|"galeria", visivel, ativo }
  function reavaliar(item) {
    var deve = item.visivel && pilaresLiberados(item.el) && !doc.hidden;
    if (deve === item.ativo) return;
    item.ativo = deve;
    if (item.tipo === "video") {
      if (deve) {
        if (!item.el.src) item.el.src = item.el.getAttribute("data-src");
        var p = item.el.play(); if (p && p.catch) p.catch(function () {});
      } else {
        item.el.pause();
        if (item.reel && !item.el.muted) somDesligar(item.reel);
      }
    } else if (item.tipo === "leque") {
      if (deve) lequeIniciar(item); else clearInterval(item.t);
    } else {
      if (deve) galeriaIniciar(item); else galeriaParar(item);
    }
  }
  function reavaliarTodos() { itens.forEach(reavaliar); }

  /* ---------- carrossel: troca de imagem com fade ---------- */
  function galeriaIniciar(item) {
    var imgs = item.el.querySelectorAll("img");
    if (imgs.length < 2) return;
    item.el.classList.add("rodando");
    if (item.i == null) { item.i = 0; imgs[0].classList.add("ativa"); }
    clearInterval(item.t);
    item.t = setInterval(function () {
      imgs[item.i].classList.remove("ativa");
      item.i = (item.i + 1) % imgs.length;
      imgs[item.i].classList.add("ativa");
    }, MIDIA.GALERIA_MS);
  }
  function galeriaParar(item) { clearInterval(item.t); }

  /* ---------- leque: duas peças sobrepostas que trocam de lugar ---------- */
  function lequeTrocar(leque) {
    var pecas = leque.querySelectorAll(".leque__peca");
    for (var i = 0; i < pecas.length; i++) {
      if (pecas[i].hasAttribute("data-frente")) pecas[i].removeAttribute("data-frente");
      else pecas[i].setAttribute("data-frente", "");
    }
  }
  function lequeIniciar(item) {
    clearInterval(item.t);
    item.t = setInterval(function () {
      var pilar = item.el.closest(".pilar");
      if (item.el.matches(":hover") || (pilar && pilar.classList.contains("pilar--zoom"))) return;
      lequeTrocar(item.el);
    }, MIDIA.LEQUE_MS);
  }
  doc.querySelectorAll("[data-leque]").forEach(function (leque) {
    // clique na peça de trás: ela vem para a frente (e não abre o link); na da frente, o link funciona normal
    leque.addEventListener("click", function (e) {
      var peca = e.target.closest(".leque__peca");
      if (!peca || peca.hasAttribute("data-frente")) return;
      var pilar = leque.closest(".pilar");
      if (pilar && pilar.classList.contains("pilar--zoom")) return; // ampliado: as duas já estão inteiras
      e.preventDefault();
      lequeTrocar(leque);
      if (leque._naItem && leque._naItem.ativo) lequeIniciar(leque._naItem); // recomeça a contagem
    });
  });

  /* ---------- som dos vídeos dos resultados (um por vez) ---------- */
  var comSom = null;
  function avisarMusica(ligado) {
    doc.dispatchEvent(new CustomEvent("na:video-som", { detail: { ligado: ligado } }));
  }
  function somLigar(reel) {
    if (comSom && comSom !== reel) somDesligar(comSom, true);
    var v = reel.querySelector("video");
    if (!v.src) v.src = v.getAttribute("data-src");
    v.muted = false;
    v.currentTime = 0;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
    reel.classList.add("com-som");
    reel.querySelector(".reel__som").setAttribute("aria-pressed", "true");
    comSom = reel;
    avisarMusica(true);
    if (window.dataLayer) window.dataLayer.push({ event: "video_som", video_name: v.getAttribute("aria-label") || "" });
  }
  function somDesligar(reel, trocando) {
    var v = reel.querySelector("video");
    v.muted = true;
    reel.classList.remove("com-som");
    reel.querySelector(".reel__som").setAttribute("aria-pressed", "false");
    if (quieto) v.pause();
    if (comSom === reel) comSom = null;
    if (!trocando) avisarMusica(false);
  }
  doc.querySelectorAll(".reel").forEach(function (reel) {
    var bt = reel.querySelector(".reel__som");
    var v = reel.querySelector("video");
    var alternar = function () { if (reel.classList.contains("com-som")) somDesligar(reel); else somLigar(reel); };
    bt.addEventListener("click", alternar);
    v.addEventListener("click", alternar);
    // barra de progresso fininha
    var barra = reel.querySelector(".reel__progresso i");
    if (barra) v.addEventListener("timeupdate", function () {
      if (v.duration) barra.style.transform = "scaleX(" + (v.currentTime / v.duration) + ")";
    });
  });

  /* ---------- Bastidores: timecode do REC + etiqueta "Ver no YouTube" que segue o cursor ---------- */
  var tela = doc.querySelector(".bastidores__tela");
  if (tela) {
    var vB = tela.querySelector("video"), tc = tela.querySelector("[data-timecode]"), cur = tela.querySelector(".bastidores__cursor");
    var dois = function (n) { return (n < 10 ? "0" : "") + n; };
    if (vB && tc) vB.addEventListener("timeupdate", function () {
      var t = Math.floor(vB.currentTime), f = Math.floor((vB.currentTime % 1) * 30);
      tc.textContent = dois(Math.floor(t / 60)) + ":" + dois(t % 60) + ":" + dois(f);
    });
    if (cur && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      tela.addEventListener("pointermove", function (e) {
        var r = tela.getBoundingClientRect();
        cur.style.left = (e.clientX - r.left) / (r.width / tela.offsetWidth) + "px";
        cur.style.top = (e.clientY - r.top) / (r.height / tela.offsetHeight) + "px";
      });
    }
  }

  /* ---------- Resultados: inclinação 3D e brilho seguindo o mouse ---------- */
  if (!quieto && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    doc.querySelectorAll(".reel__midia").forEach(function (m) {
      m.addEventListener("pointermove", function (e) {
        var r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        m.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
        m.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
        m.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        m.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      m.addEventListener("pointerleave", function () { m.style.setProperty("--rx", "0deg"); m.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ---------- liga tudo depois do carregamento ---------- */
  function iniciar() {
    if (quieto) return; // só a capa; o botão de som dá o play (vídeos dos resultados)
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var item = e.target._naItem;
        item.visivel = e.isIntersecting;
        reavaliar(item);
      });
    }, { rootMargin: MIDIA.MARGEM, threshold: 0.15 }) : null;

    doc.querySelectorAll("video[data-src]").forEach(function (v) {
      var item = { el: v, tipo: "video", visivel: !io, ativo: false, reel: v.closest(".reel") };
      itens.push(item);
      var alvo = v.parentElement; alvo._naItem = item;
      if (io) io.observe(alvo);
    });
    doc.querySelectorAll("[data-galeria]").forEach(function (g) {
      var item = { el: g, tipo: "galeria", visivel: !io, ativo: false };
      itens.push(item);
      g._naItem = item;
      if (io) io.observe(g);
    });
    doc.querySelectorAll("[data-leque]").forEach(function (l) {
      var item = { el: l, tipo: "leque", visivel: !io, ativo: false };
      itens.push(item);
      l._naItem = item;
      if (io) io.observe(l);
    });
    if (abertura && "MutationObserver" in window) {
      new MutationObserver(reavaliarTodos).observe(abertura, { attributes: true, attributeFilter: ["class"] });
    }
    doc.addEventListener("visibilitychange", reavaliarTodos);
    reavaliarTodos();
  }
  if (doc.readyState === "complete") iniciar();
  else window.addEventListener("load", iniciar, { once: true });
})();

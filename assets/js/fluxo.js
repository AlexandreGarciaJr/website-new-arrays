/* =========================================================
   New Arrays | Fluxo de campanhas (interativo)
   O mapa ocupa a seção de ponta a ponta. Abaixo dele, uma fileira de
   botões ("De onde vem o lead?"). Ao ativar um botão, o caminho acende
   no mapa, um ponto (o lead) percorre o trajeto e abre um dropdown com
   a explicação de cada etapa. Clicar de novo no botão ativo fecha o dropdown.
   Autoplay: percorre as origens enquanto a seção está na tela, até a
   primeira interação. Movimento reduzido: sem autoplay e sem ponto.
   CELULAR (<1024px): o mapa fica em tamanho legível dentro de uma faixa
   com arrasto lateral; a "câmera" acompanha o ponto (o lead) pelo caminho
   e para de seguir enquanto a pessoa arrasta.
   Fonte: mapa "Fluxo de Campanhas - Exemplo" enviado pelo Sodré.
   ========================================================= */
(function () {
  "use strict";
  var alvo = document.getElementById("fluxo");
  if (!alvo) return;
  // só monta quando a seção se aproxima da tela (não disputa com o carregamento inicial)
  var io = new IntersectionObserver(function (e) {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    naMontarFluxo(alvo);
  }, { rootMargin: "120% 0px" });
  io.observe(alvo);
})();

function naMontarFluxo(secao) {
  "use strict";
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var celular = window.matchMedia("(max-width: 1023px)");
  var palco = secao.querySelector("[data-palco]");
  var mapa = secao.querySelector("[data-mapa]");
  var svg = secao.querySelector("[data-linhas]");
  var chips = Array.prototype.slice.call(secao.querySelectorAll("[data-rota]"));
  var origens = secao.querySelector("[data-origens]");
  var drop = secao.querySelector("[data-drop]");
  var setaDrop = secao.querySelector("[data-seta-drop]");
  var nomeEl = secao.querySelector("[data-rota-nome]");
  var passosEl = secao.querySelector("[data-passos]");
  var NS = "http://www.w3.org/2000/svg";
  function modo() { return celular.matches ? "celular" : "desktop"; }

  var NOS = {
    meta1: ["Campanha no Meta Ads", "Anúncios no Instagram e no Facebook com criativos A, B e C, levando direto para uma conversa."],
    meta2: ["Campanha no Meta Ads", "Anúncios com criativos A, B e C que abrem um formulário da própria Meta, sem sair do Instagram."],
    meta3: ["Campanha no Meta Ads", "Anúncios com criativos A, B e C que levam para o site."],
    google: ["Google Meu Negócio e Google Maps", "Quem já procura o serviço na região encontra a empresa e vai para o site."],
    bio: ["Link da bio do Instagram", "Quem visita o perfil encontra o link para o site."],
    seguidor: ["Novo seguidor no Instagram", "Quem começa a seguir o perfil recebe uma mensagem automática."],
    wpp: ["WhatsApp", "A conversa começa no WhatsApp."],
    crm: ["CRM com IA", "O contato é registrado no CRM, com apoio de inteligência artificial."],
    fmeta: ["Formulário da Meta", "Formulário nativo, preenchido em poucos toques."],
    perg: ["Perguntas-chave", "O lead responde perguntas que já filtram o interesse."],
    disparo: ["Disparo no WhatsApp", "Com os dados do formulário, o lead também pode receber campanhas pelo WhatsApp."],
    lp: ["Landing Page (Site)", "A página do site feita para explicar a oferta e levar ao formulário. Todos esses caminhos passam por aqui."],
    many: ["ManyChat", "Automação que responde o novo seguidor e envia o link do site."],
    form: ["Formulário", "Registra quem é o lead e o que ele precisa."],
    qual: ["Esquentar e qualificar", "O lead recebe contexto e é filtrado antes do contato comercial."],
    atend: ["Atendimento ou reunião", "Conversa comercial com quem tem interesse real."]
  };
  var ARESTAS = [
    ["meta1", "wpp"], ["wpp", "crm"], ["crm", "qual"], ["qual", "atend"],
    ["meta2", "fmeta"], ["fmeta", "perg"], ["perg", "qual"], ["perg", "disparo", "ramo"],
    ["meta3", "lp"], ["google", "lp"], ["bio", "lp"], ["seguidor", "many"], ["many", "lp"],
    ["lp", "form"], ["form", "qual"]
  ];
  var ROTAS = {
    meta1: { nome: "Meta Ads → WhatsApp", nos: ["meta1", "wpp", "crm", "qual", "atend"] },
    meta2: { nome: "Meta Ads → Formulário da Meta", nos: ["meta2", "fmeta", "perg", "qual", "atend"], ramo: "disparo" },
    meta3: { nome: "Meta Ads → Formulário do site", nos: ["meta3", "lp", "form", "qual", "atend"] },
    google: { nome: "Google Meu Negócio e Maps", nos: ["google", "lp", "form", "qual", "atend"] },
    bio: { nome: "Link da bio do Instagram", nos: ["bio", "lp", "form", "qual", "atend"] },
    seguidor: { nome: "Novo seguidor no Instagram", nos: ["seguidor", "many", "lp", "form", "qual", "atend"] }
  };

  var elNo = {};
  Array.prototype.forEach.call(mapa.querySelectorAll("[data-no]"), function (n) { elNo[n.getAttribute("data-no")] = n; });
  var caminhos = {};
  var ponto = document.createElementNS(NS, "circle");
  ponto.setAttribute("r", "5");
  ponto.setAttribute("class", "fluxo__ponto");
  function chave(a, b) { return a + ">" + b; }

  // geometria pelo layout (offset*), não pela tela: funciona mesmo com o mapa reduzido por transform
  function caixa(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }

  function desenharLinhas() {
    var W = mapa.offsetWidth, H = mapa.offsetHeight;
    if (!W) return;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = "";
    caminhos = {};
    ARESTAS.forEach(function (a) {
      var A = elNo[a[0]], B = elNo[a[1]];
      if (!A.offsetWidth || !B.offsetWidth) return;
      var ra = caixa(A), rb = caixa(B);
      var sx = ra.x + ra.w, sy = ra.y + ra.h / 2, ex = rb.x, ey = rb.y + rb.h / 2, mx = (ex - sx) * 0.5;
      var d = "M" + sx + "," + sy + " C" + (sx + mx) + "," + sy + " " + (ex - mx) + "," + ey + " " + ex + "," + ey;
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "fluxo__linha" + (a[2] ? " fluxo__linha--ramo" : ""));
      svg.appendChild(p);
      caminhos[chave(a[0], a[1])] = p;
    });
    svg.appendChild(ponto);
    marcarLinhas(false);
  }

  var atual = "meta1";
  var viagem = { raf: 0, inicio: 0, trechos: [], total: 0 };

  function marcarLinhas(animar) {
    var rota = ROTAS[atual];
    Object.keys(caminhos).forEach(function (k) { caminhos[k].classList.remove("ativa", "desenha"); caminhos[k].style.removeProperty("--atraso"); });
    viagem.trechos = [];
    for (var i = 0; i < rota.nos.length - 1; i++) {
      var p = caminhos[chave(rota.nos[i], rota.nos[i + 1])];
      if (!p) continue;
      var len = p.getTotalLength();
      p.style.setProperty("--len", len);
      p.style.setProperty("--atraso", (i * 0.22) + "s");
      p.classList.add("ativa");
      if (animar && !reduzido) { void p.getBoundingClientRect(); p.classList.add("desenha"); }
      viagem.trechos.push({ p: p, len: len });
    }
    if (rota.ramo) {
      var pr = caminhos[chave(rota.nos[2], rota.ramo)];
      if (pr) { pr.style.setProperty("--len", pr.getTotalLength()); pr.style.setProperty("--atraso", "0.7s"); pr.classList.add("ativa"); if (animar && !reduzido) pr.classList.add("desenha"); }
    }
    viagem.total = viagem.trechos.reduce(function (s, t) { return s + t.len; }, 0);
    iniciarViagem();
  }

  function aplicar(id, animar) {
    atual = id;
    var rota = ROTAS[id];
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-rota") === id)); });
    mapa.classList.add("tem-rota");
    Object.keys(elNo).forEach(function (k) {
      elNo[k].classList.toggle("ativo", rota.nos.indexOf(k) >= 0 || k === rota.ramo);
    });
    marcarLinhas(animar);

    // dropdown: explicação do caminho
    nomeEl.textContent = rota.nome;
    passosEl.innerHTML = "";
    rota.nos.forEach(function (k, i) {
      var li = document.createElement("li");
      li.setAttribute("data-passo", k);
      var b = document.createElement("strong"); b.textContent = NOS[k][0];
      var s = document.createElement("span"); s.textContent = NOS[k][1];
      li.appendChild(b); li.appendChild(s);
      li.style.setProperty("--i", i);
      passosEl.appendChild(li);
      if (i === 2 && rota.ramo) {
        var lr = document.createElement("li");
        lr.className = "fluxo__passo-ramo";
        lr.setAttribute("data-passo", rota.ramo);
        var br = document.createElement("strong"); br.textContent = "Em paralelo: " + NOS[rota.ramo][0];
        var sr = document.createElement("span"); sr.textContent = NOS[rota.ramo][1];
        lr.appendChild(br); lr.appendChild(sr);
        passosEl.appendChild(lr);
      }
    });
    if (animar) { passosEl.classList.remove("entra"); void passosEl.offsetWidth; passosEl.classList.add("entra"); }
    abrirDrop(true);
  }

  // o dropdown abre embaixo dos botões; a setinha aponta para o botão ativo
  function abrirDrop(aberto) {
    drop.classList.toggle("aberto", aberto);
    chips.forEach(function (c) { c.setAttribute("aria-expanded", String(aberto && c.getAttribute("data-rota") === atual)); });
    posicionarSeta();
  }
  function posicionarSeta() {
    var c = chips.filter(function (x) { return x.getAttribute("data-rota") === atual; })[0];
    if (!c || !setaDrop) return;
    var rp = drop.getBoundingClientRect(), rc = c.getBoundingClientRect();
    var x = Math.max(24, Math.min(rp.width - 24, rc.left + rc.width / 2 - rp.left));
    setaDrop.style.setProperty("--sx", x.toFixed(1) + "px");
    // no celular a fileira rola de lado: traz o botão ativo para a vista
    if (celular.matches && origens.scrollWidth > origens.clientWidth) {
      var alvoX = c.offsetLeft - (origens.clientWidth - c.offsetWidth) / 2;
      origens.scrollTo({ left: Math.max(0, alvoX), behavior: reduzido ? "auto" : "smooth" });
    }
  }
  origens.addEventListener("scroll", function () { if (setaDrop) { var c = chips.filter(function (x) { return x.getAttribute("data-rota") === atual; })[0]; if (c) { var rp = drop.getBoundingClientRect(), rc = c.getBoundingClientRect(); setaDrop.style.setProperty("--sx", Math.max(24, Math.min(rp.width - 24, rc.left + rc.width / 2 - rp.left)).toFixed(1) + "px"); } } }, { passive: true });

  function iniciarViagem() {
    if (reduzido) { ponto.style.display = "none"; return; }
    if (viagem.raf) cancelAnimationFrame(viagem.raf);
    viagem.inicio = performance.now() + 700;
    viagem.raf = requestAnimationFrame(andar);
  }
  // celular: a "câmera" (rolagem lateral do palco) segue o lead, a não ser que a pessoa esteja arrastando
  var arrastando = false, tArraste = 0;
  palco.addEventListener("pointerdown", function () { arrastando = true; clearTimeout(tArraste); }, { passive: true });
  palco.addEventListener("touchstart", function () { arrastando = true; clearTimeout(tArraste); }, { passive: true });
  ["pointerup", "touchend", "pointercancel"].forEach(function (ev) {
    palco.addEventListener(ev, function () { clearTimeout(tArraste); tArraste = setTimeout(function () { arrastando = false; }, 2500); }, { passive: true });
  });
  function seguir(x) {
    if (modo() !== "celular" || arrastando) return;
    var alvoX = x - palco.clientWidth * 0.45;
    palco.scrollLeft += (alvoX - palco.scrollLeft) * 0.08;
  }
  function andar(agora) {
    viagem.raf = 0;
    if (!visivel || !viagem.total) return;
    var dur = modo() === "celular" ? 3600 : 2600, pausa = 900;
    var t = (agora - viagem.inicio) % (dur + pausa);
    if (agora < viagem.inicio || t > dur) { ponto.style.opacity = "0"; if (agora >= viagem.inicio) seguir(0); }
    else {
      var e = t / dur; e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      var d = e * viagem.total;
      for (var i = 0; i < viagem.trechos.length; i++) {
        var tr = viagem.trechos[i];
        if (d <= tr.len || i === viagem.trechos.length - 1) {
          var pt = tr.p.getPointAtLength(Math.min(d, tr.len));
          ponto.setAttribute("cx", pt.x); ponto.setAttribute("cy", pt.y);
          seguir(pt.x);
          break;
        }
        d -= tr.len;
      }
      ponto.style.opacity = "1";
    }
    viagem.raf = requestAnimationFrame(andar);
  }

  // interação
  var tocou = false;
  function parar() { tocou = true; clearInterval(auto); }
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      parar();
      var id = c.getAttribute("data-rota");
      if (id === atual && drop.classList.contains("aberto")) { abrirDrop(false); return; } // clicou de novo: fecha
      aplicar(id, true);
    });
  });
  Object.keys(ROTAS).forEach(function (id) {
    elNo[id].addEventListener("click", function () { parar(); aplicar(id, true); });
    elNo[id].classList.add("clicavel");
  });
  // passar o mouse num nó destaca a etapa correspondente no dropdown
  mapa.addEventListener("pointerover", function (e) {
    var n = e.target.closest("[data-no]");
    Array.prototype.forEach.call(passosEl.children, function (li) { li.classList.toggle("foco", !!n && li.getAttribute("data-passo") === n.getAttribute("data-no")); });
  });
  mapa.addEventListener("pointerleave", function () { Array.prototype.forEach.call(passosEl.children, function (li) { li.classList.remove("foco"); }); });

  // autoplay enquanto visível
  var ordem = Object.keys(ROTAS), auto = 0, visivel = false;
  new IntersectionObserver(function (e) {
    visivel = e[0].isIntersecting;
    clearInterval(auto);
    if (visivel) {
      iniciarViagem();
      if (!tocou && !reduzido) auto = setInterval(function () { aplicar(ordem[(ordem.indexOf(atual) + 1) % ordem.length], true); }, 6200);
    }
  }, { threshold: 0.3 }).observe(secao);
  secao.addEventListener("focusin", parar);

  var tRes;
  new ResizeObserver(function () { clearTimeout(tRes); tRes = setTimeout(function () { desenharLinhas(); posicionarSeta(); }, 120); }).observe(palco);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(desenharLinhas);
  aplicar(atual, false);
  desenharLinhas();
}

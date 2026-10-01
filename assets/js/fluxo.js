/* =========================================================
   New Arrays | Fluxo de campanhas (interativo)
   A pessoa escolhe a origem do lead e vê o caminho acender no mapa:
   as linhas se desenham e um ponto (o lead) percorre o trajeto até
   "Atendimento ou reunião". O painel lista cada etapa com texto,
   então o conteúdo continua acessível por teclado e leitor de tela.
   Autoplay: percorre as origens enquanto a seção está na tela, até a
   primeira interação. Movimento reduzido: sem autoplay e sem ponto.
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
  (function () {
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mapa = secao.querySelector("[data-mapa]");
  var svg = secao.querySelector("[data-linhas]");
  var chips = Array.prototype.slice.call(secao.querySelectorAll("[data-rota]"));
  var nomeEl = secao.querySelector("[data-rota-nome]");
  var passosEl = secao.querySelector("[data-passos]");
  var NS = "http://www.w3.org/2000/svg";

  var NOS = {
    meta1: ["Campanha no Meta Ads", "Anúncios no Instagram e no Facebook com criativos A, B e C, levando direto para uma conversa."],
    meta2: ["Campanha no Meta Ads", "Anúncios com criativos A, B e C que abrem um formulário da própria Meta, sem sair do Instagram."],
    meta3: ["Campanha no Meta Ads", "Anúncios com criativos A, B e C que levam para o formulário do site."],
    google: ["Google Meu Negócio e Google Maps", "Presença para quem já está procurando o serviço na região."],
    bio: ["Link da bio do Instagram", "Quem visita o perfil encontra o caminho para a landing page."],
    seguidor: ["Novo seguidor no Instagram", "Quem começa a seguir o perfil recebe uma mensagem automática."],
    wpp: ["WhatsApp", "A conversa começa no WhatsApp."],
    crm: ["CRM com IA", "O contato é registrado no CRM, com apoio de inteligência artificial."],
    fmeta: ["Formulário da Meta", "Formulário nativo, preenchido em poucos toques."],
    perg: ["Perguntas-chave", "O lead responde perguntas que já filtram o interesse."],
    disparo: ["Disparo no WhatsApp", "Com os dados do formulário, o lead também pode receber campanhas pelo WhatsApp."],
    lp: ["Landing page", "Uma página feita para explicar a oferta e levar ao formulário."],
    many: ["ManyChat", "Automação que responde e direciona o novo seguidor para o formulário."],
    form: ["Formulário", "Registra quem é o lead e o que ele precisa."],
    qual: ["Esquentar e qualificar", "O lead recebe contexto e é filtrado antes do contato comercial."],
    atend: ["Atendimento ou reunião", "Conversa comercial com quem tem interesse real."]
  };
  var ARESTAS = [
    ["meta1", "wpp"], ["wpp", "crm"], ["crm", "qual"], ["qual", "atend"],
    ["meta2", "fmeta"], ["fmeta", "perg"], ["perg", "qual"], ["perg", "disparo", "ramo"],
    ["meta3", "form"], ["form", "qual"], ["google", "form"],
    ["bio", "lp"], ["lp", "form"], ["seguidor", "many"], ["many", "form"]
  ];
  var ROTAS = {
    meta1: { nome: "Meta Ads → WhatsApp", nos: ["meta1", "wpp", "crm", "qual", "atend"] },
    meta2: { nome: "Meta Ads → Formulário da Meta", nos: ["meta2", "fmeta", "perg", "qual", "atend"], ramo: "disparo" },
    meta3: { nome: "Meta Ads → Formulário do site", nos: ["meta3", "form", "qual", "atend"] },
    google: { nome: "Google Meu Negócio e Maps", nos: ["google", "form", "qual", "atend"] },
    bio: { nome: "Link da bio do Instagram", nos: ["bio", "lp", "form", "qual", "atend"] },
    seguidor: { nome: "Novo seguidor no Instagram", nos: ["seguidor", "many", "form", "qual", "atend"] }
  };

  var elNo = {};
  Array.prototype.forEach.call(mapa.querySelectorAll("[data-no]"), function (n) { elNo[n.getAttribute("data-no")] = n; });
  var caminhos = {};
  var ponto = document.createElementNS(NS, "circle");
  ponto.setAttribute("r", "5");
  ponto.setAttribute("class", "fluxo__ponto");

  function chave(a, b) { return a + ">" + b; }

  function desenharLinhas() {
    var r = mapa.getBoundingClientRect();
    if (!r.width) return;
    svg.setAttribute("viewBox", "0 0 " + r.width + " " + r.height);
    svg.innerHTML = "";
    ARESTAS.forEach(function (a) {
      var A = elNo[a[0]].getBoundingClientRect(), B = elNo[a[1]].getBoundingClientRect();
      var x1 = A.right - r.left, y1 = A.top + A.height / 2 - r.top;
      var x2 = B.left - r.left, y2 = B.top + B.height / 2 - r.top;
      var mx = (x2 - x1) * 0.5;
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M" + x1 + "," + y1 + " C" + (x1 + mx) + "," + y1 + " " + (x2 - mx) + "," + y2 + " " + x2 + "," + y2);
      p.setAttribute("class", "fluxo__linha" + (a[2] ? " fluxo__linha--ramo" : ""));
      svg.appendChild(p);
      caminhos[chave(a[0], a[1])] = p;
    });
    svg.appendChild(ponto);
    aplicar(atual, false);
  }

  var atual = "meta1";
  var viagem = { raf: 0, inicio: 0, trechos: [], total: 0 };

  function aplicar(id, animar) {
    atual = id;
    var rota = ROTAS[id];
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-rota") === id)); });
    mapa.classList.add("tem-rota");
    Object.keys(elNo).forEach(function (k) {
      var ativo = rota.nos.indexOf(k) >= 0 || k === rota.ramo;
      elNo[k].classList.toggle("ativo", ativo);
    });
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

    // painel em texto
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
    iniciarViagem();
  }

  function iniciarViagem() {
    if (reduzido) { ponto.style.display = "none"; return; }
    if (viagem.raf) cancelAnimationFrame(viagem.raf);
    viagem.inicio = performance.now() + 700;
    viagem.raf = requestAnimationFrame(andar);
  }
  function andar(agora) {
    viagem.raf = 0;
    if (!visivel || !viagem.total) return;
    var dur = 2600, pausa = 900;
    var t = (agora - viagem.inicio) % (dur + pausa);
    if (agora < viagem.inicio || t > dur) { ponto.style.opacity = "0"; }
    else {
      var e = t / dur; e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      var d = e * viagem.total;
      for (var i = 0; i < viagem.trechos.length; i++) {
        var tr = viagem.trechos[i];
        if (d <= tr.len || i === viagem.trechos.length - 1) {
          var pt = tr.p.getPointAtLength(Math.min(d, tr.len));
          ponto.setAttribute("cx", pt.x); ponto.setAttribute("cy", pt.y);
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
    c.addEventListener("click", function () { parar(); aplicar(c.getAttribute("data-rota"), true); });
  });
  Object.keys(ROTAS).forEach(function (id) {
    elNo[id].addEventListener("click", function () { parar(); aplicar(id, true); });
    elNo[id].classList.add("clicavel");
  });
  // passar o mouse num nó destaca a etapa correspondente no painel
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
      if (!tocou && !reduzido) auto = setInterval(function () { aplicar(ordem[(ordem.indexOf(atual) + 1) % ordem.length], true); }, 5200);
    }
  }, { threshold: 0.35 }).observe(secao);
  secao.addEventListener("focusin", parar);

  var tRes;
  new ResizeObserver(function () { clearTimeout(tRes); tRes = setTimeout(desenharLinhas, 120); }).observe(mapa);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(desenharLinhas);
  desenharLinhas();
})();
}
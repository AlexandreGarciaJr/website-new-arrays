/* =========================================================
   New Arrays | comportamento do site
   1. Utilidades e analytics (dataLayer, sem dados pessoais)
   2. Origem da visita (UTMs)
   3. Cabeçalho e menu
   4. LeadService: camada de envio (endpoint configurável)
   5. Formulário de qualificação no Hero
   6. Navegação das cenas (serviços e projetos)
   7. Vídeos sob demanda (depoimentos e bastidores)
   ========================================================= */
(function () {
  "use strict";

  var doc = document;
  var raiz = doc.documentElement;
  var CFG = window.NA_CONFIG || {};
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Utilidades ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function track(evento, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      var dados = { event: evento, page_path: location.pathname };
      for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) dados[k] = params[k];
      window.dataLayer.push(dados);
    } catch (e) { /* analytics nunca quebra a página */ }
  }

  function sessao(chave, valor) {
    try {
      if (valor === undefined) return window.sessionStorage.getItem(chave);
      window.sessionStorage.setItem(chave, valor);
    } catch (e) { return null; }
    return null;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "na-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- 2. Origem da visita ---------- */
  var origem = (function () {
    var chaves = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
    var salvo = null;
    try { salvo = JSON.parse(sessao("na_origem") || "null"); } catch (e) { salvo = null; }
    var params = new URLSearchParams(location.search);
    var temParams = chaves.some(function (c) { return params.get(c); });
    if (!salvo || temParams) {
      salvo = { landing_page: location.pathname + location.search, referrer: doc.referrer || "" };
      chaves.forEach(function (c) { if (params.get(c)) salvo[c] = params.get(c).slice(0, 200); });
      sessao("na_origem", JSON.stringify(salvo));
    }
    return salvo;
  })();

  /* ---------- 3. Cabeçalho e menu ---------- */
  var topo = $("#topo");
  (function cabecalho() {
    if (!topo) return;
    var sentinela = doc.createElement("div");
    sentinela.setAttribute("aria-hidden", "true");
    sentinela.style.cssText = "position:absolute;top:48px;left:0;width:1px;height:1px;pointer-events:none";
    doc.body.prepend(sentinela);
    new IntersectionObserver(function (e) {
      topo.classList.toggle("topo--solido", !e[0].isIntersecting);
    }).observe(sentinela);

    var botao = $(".topo__menu");
    var menu = $("#menu");
    if (!botao || !menu) return;
    function alternar(abrir) {
      menu.classList.toggle("aberto", abrir);
      botao.setAttribute("aria-expanded", String(abrir));
      botao.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
      if (abrir) topo.classList.add("topo--solido");
    }
    botao.addEventListener("click", function () { alternar(botao.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) alternar(false); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("aberto")) { alternar(false); botao.focus(); }
    });
  })();

  /* ---------- 4. LeadService ----------
     Envia o lead como JSON para CFG.leadEndpoint (POST).
     Sucesso = resposta HTTP 2xx. Qualquer outra situação lança um erro com "codigo".
     Nunca simula sucesso. Para integrar com CRM/planilha, aponte o endpoint para
     o seu backend, webhook (n8n, Make, Zapier) ou função serverless. */
  var LeadService = {
    enviar: function (payload) {
      var url = (CFG.leadEndpoint || "").trim();
      function falha(codigo, status) { var e = new Error(codigo); e.codigo = codigo; e.status = status || 0; return e; }
      if (!url) return Promise.reject(falha("nao_configurado"));
      if (navigator.onLine === false) return Promise.reject(falha("offline"));
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var tempo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
        credentials: "omit"
      }).then(function (res) {
        clearTimeout(tempo);
        if (!res.ok) throw falha(res.status >= 500 ? "servidor" : "recusado", res.status);
        return res;
      }, function (err) {
        clearTimeout(tempo);
        throw falha(err && err.name === "AbortError" ? "tempo_esgotado" : "rede");
      });
    }
  };
  window.NA_LeadService = LeadService;

  /* ---------- 5. Formulário no Hero ---------- */
  var hero = $("#inicio");
  var painel = $("#diagnostico");
  var form = $("#form-diagnostico");
  var ctaHero = $(".hero__cta");

  if (hero && painel && form) iniciarFormulario();

  function iniciarFormulario() {
    var TOTAL = 4;
    var passo = 1;
    var enviando = false;
    var enviado = false;
    var iniciou = false;
    var tentativa = { id: null, assinatura: "" };
    var ultimoGatilho = null;

    var passos = $$(".diag__passo", form);
    var elEtapa = $("[data-etapa-atual]", form);
    var barras = $$(".diag__progresso li", form);
    var btVoltar = $("[data-voltar]", form);
    var btAvancar = $("[data-avancar]", form);
    var btEnviar = $("[data-enviar]", form);
    var txtEnviar = $("[data-enviar-txt]", form);
    var nav = $("[data-nav]", form);
    var status = $("[data-status]", form);
    var blocoOk = $("[data-sucesso]", form);
    var blocoFalha = $("[data-falha]", form);
    var falhaMsg = $("[data-falha-msg]", form);
    var waFallback = $("[data-wa-fallback]", form);
    var notaDuvida = $("[data-nota-duvida]", form);

    var ROTULOS = {
      necessidades: {
        gestao_redes_sociais: "Gestão de redes sociais",
        trafego_pago: "Tráfego pago",
        site: "Criar ou melhorar um site",
        atrair_clientes: "Atrair mais clientes / clientes melhores",
        duvida: "Ainda estou com dúvida"
      },
      prioridade: { hoje: "Hoje", semana_que_vem: "Semana que vem", mes_que_vem: "Mês que vem" },
      investimento: { "1000": "R$ 1.000", "2000": "R$ 2.000", "3000": "R$ 3.000", "4000": "R$ 4.000", "5000_ou_mais": "R$ 5.000 ou mais" }
    };

    function valores() {
      var nec = $$('input[name="necessidades"]:checked', form).map(function (i) { return i.value; });
      var pri = $('input[name="prioridade"]:checked', form);
      var inv = $('input[name="investimento"]:checked', form);
      return {
        necessidades: nec,
        prioridade: pri ? pri.value : "",
        investimento: inv ? inv.value : "",
        nome: form.nome.value.trim().replace(/\s+/g, " "),
        telefone: form.telefone.value.trim(),
        email: form.email.value.trim().toLowerCase(),
        consentimento: form.consentimento.checked,
        isca: form.empresa_site.value
      };
    }

    /* abrir e fechar */
    function aplicarAberto(aberto) {
      hero.setAttribute("data-estado", aberto ? "form" : "inicial");
      painel.hidden = !aberto;
      $$("[data-abrir-form][aria-controls]").forEach(function (b) { b.setAttribute("aria-expanded", String(aberto)); });
      doc.dispatchEvent(new CustomEvent("na:form", { detail: { aberto: aberto } }));
    }

    function comTransicao(mudar, depois) {
      if (!reduzido && doc.startViewTransition) {
        var vt = doc.startViewTransition(mudar);
        vt.finished.then(depois, depois);
      } else {
        mudar();
        if (!reduzido) { painel.classList.remove("entrando"); void painel.offsetWidth; painel.classList.add("entrando"); }
        depois();
      }
    }

    function abrir(gatilho) {
      ultimoGatilho = gatilho || ctaHero;
      var servico = gatilho && gatilho.getAttribute("data-servico");
      if (servico && !enviado) {
        var alvo = $('input[name="necessidades"][value="' + servico + '"]', form);
        if (alvo && !alvo.checked) { alvo.checked = true; aoMudarNecessidade(alvo); }
      }
      track("cta_click", { cta_text: (gatilho && gatilho.textContent.trim()) || "", cta_position: (gatilho && gatilho.getAttribute("data-cta-pos")) || "hero" });

      var jaAberto = hero.getAttribute("data-estado") === "form";
      var precisaSubir = window.scrollY > 8;
      if (precisaSubir) { if (window.NA_rolar) NA_rolar(0, false); else window.scrollTo({ top: 0, behavior: "instant" }); }
      if (jaAberto) { focarPasso(); return; }
      comTransicao(function () { aplicarAberto(true); }, function () { focarPasso(); });
    }

    function fechar() {
      comTransicao(function () { aplicarAberto(false); }, function () {
        if (enviado) reiniciar();
        var voltarPara = ctaHero || ultimoGatilho;
        if (voltarPara) voltarPara.focus({ preventScroll: false });
      });
    }

    function focarPasso() {
      var alvo = !status.hidden ? status : $('.diag__passo[data-passo="' + passo + '"] .diag__pergunta', form);
      if (alvo) alvo.focus({ preventScroll: true });
      garantirVisivel();
    }

    function garantirVisivel() {
      var r = painel.getBoundingClientRect();
      var margem = 88;
      var delta = 0;
      if (r.top < 64 || r.top > window.innerHeight * 0.6) delta = r.top - margem;
      else if (r.bottom > window.innerHeight) delta = Math.min(r.top - margem, r.bottom - window.innerHeight + 24);
      if (Math.abs(delta) > 4) {
        if (window.NA_rolar) NA_rolar(Math.max(0, window.scrollY + delta), !reduzido); else window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: reduzido ? "auto" : "smooth" });
      }
    }

    $$("[data-abrir-form]").forEach(function (b) {
      b.addEventListener("click", function () { abrir(b); });
    });
    $$("[data-fechar-form]", form).forEach(function (b) { b.addEventListener("click", fechar); });
    painel.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); fechar(); } });

    /* navegação entre etapas */
    function irPara(n, direcao) {
      passo = Math.max(1, Math.min(TOTAL, n));
      passos.forEach(function (fs) {
        var ativo = Number(fs.getAttribute("data-passo")) === passo;
        fs.hidden = !ativo;
        fs.classList.remove("entrando", "entrando-volta");
        if (ativo && !reduzido) { void fs.offsetWidth; fs.classList.add(direcao < 0 ? "entrando-volta" : "entrando"); }
      });
      elEtapa.textContent = String(passo);
      barras.forEach(function (li, i) {
        li.classList.toggle("feito", i + 1 < passo);
        li.classList.toggle("atual", i + 1 === passo);
      });
      btVoltar.hidden = passo === 1;
      btAvancar.hidden = passo === TOTAL;
      btEnviar.hidden = passo !== TOTAL;
      track("form_step", { form_name: CFG.formName, step: passo });
      focarPasso();
    }

    function validarPasso(n) {
      var v = valores();
      var erro = "";
      if (n === 1 && !v.necessidades.length) erro = "Escolha pelo menos uma opção para continuar.";
      if (n === 2 && !v.prioridade) erro = "Escolha o nível de prioridade para continuar.";
      if (n === 3 && !v.investimento) erro = "Escolha uma faixa de investimento para continuar.";
      var alvoErro = $("#p" + n + "-erro", form);
      if (alvoErro) alvoErro.textContent = erro;
      if (erro) {
        track("form_error", { form_name: CFG.formName, field_group: "etapa_" + n, error_type: "obrigatorio" });
        var primeiro = $('.diag__passo[data-passo="' + n + '"] input', form);
        if (primeiro) primeiro.focus();
        return false;
      }
      return true;
    }

    btAvancar.addEventListener("click", function () { if (validarPasso(passo)) irPara(passo + 1, 1); });
    btVoltar.addEventListener("click", function () { irPara(passo - 1, -1); });

    /* início do preenchimento (sem dados pessoais) */
    form.addEventListener("change", function () {
      if (!iniciou) { iniciou = true; track("form_start", { form_name: CFG.formName }); }
    });

    /* "Ainda estou com dúvida" é exclusiva */
    function aoMudarNecessidade(input) {
      var duvida = $('input[name="necessidades"][data-exclusiva]', form);
      if (input === duvida && duvida.checked) {
        $$('input[name="necessidades"]:not([data-exclusiva])', form).forEach(function (i) { i.checked = false; });
      } else if (input !== duvida && input.checked) {
        duvida.checked = false;
      }
      notaDuvida.hidden = !duvida.checked;
      $("#p1-erro", form).textContent = "";
    }
    $$('input[name="necessidades"]', form).forEach(function (i) {
      i.addEventListener("change", function () { aoMudarNecessidade(i); });
    });
    $$('input[name="prioridade"]', form).forEach(function (i) { i.addEventListener("change", function () { $("#p2-erro", form).textContent = ""; }); });
    $$('input[name="investimento"]', form).forEach(function (i) { i.addEventListener("change", function () { $("#p3-erro", form).textContent = ""; }); });

    /* máscara de telefone: BR por padrão, internacional quando começa com + */
    function mascararTelefone(valor) {
      var v = valor.trim();
      if (v.charAt(0) === "+") return "+" + v.slice(1).replace(/[^\d ]/g, "").replace(/\s{2,}/g, " ").slice(0, 19);
      var d = v.replace(/\D/g, "").slice(0, 11);
      if (d.length <= 2) return d.length ? "(" + d : "";
      if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
      return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    }
    form.telefone.addEventListener("input", function (e) {
      if (e.inputType && e.inputType.indexOf("delete") === 0) return;
      var novo = mascararTelefone(form.telefone.value);
      if (novo !== form.telefone.value) form.telefone.value = novo;
    });

    function telefoneE164(tel) {
      var d = tel.replace(/\D/g, "");
      if (tel.trim().charAt(0) === "+") return "+" + d;
      return "+55" + d;
    }

    var REGRAS = {
      nome: function (v) {
        if (!v) return "Informe seu nome completo.";
        if (v.split(" ").filter(function (p) { return p.length > 0; }).length < 2 || v.length < 5) return "Informe nome e sobrenome.";
        return "";
      },
      telefone: function (v) {
        if (!v) return "Informe um telefone ou WhatsApp.";
        var d = v.replace(/\D/g, "");
        if (v.charAt(0) === "+") return d.length >= 8 && d.length <= 15 ? "" : "Confira o número com o código do país.";
        if (d.length < 10) return "Inclua o DDD e o número completo.";
        if (d.length === 11 && d.charAt(2) !== "9") return "Confira o número de celular.";
        if (Number(d.slice(0, 2)) < 11) return "Confira o DDD.";
        return d.length === 10 || d.length === 11 ? "" : "Confira o número informado.";
      },
      email: function (v) {
        if (!v) return "Informe seu e-mail.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Confira o e-mail. Exemplo: nome@empresa.com.br";
      },
      consentimento: function (v) { return v ? "" : "Precisamos da sua autorização para entrar em contato."; }
    };
    var CAMPOS = { nome: "f-nome", telefone: "f-tel", email: "f-email", consentimento: "f-consent" };

    function validarCampo(nome, mostrar) {
      var v = valores();
      var msg = REGRAS[nome](v[nome]);
      var input = doc.getElementById(CAMPOS[nome]);
      var saida = doc.getElementById(CAMPOS[nome] + "-erro");
      if (mostrar) {
        saida.textContent = msg;
        if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      }
      return msg;
    }
    Object.keys(CAMPOS).forEach(function (nome) {
      var input = doc.getElementById(CAMPOS[nome]);
      input.addEventListener("blur", function () { if (input.value || input.getAttribute("aria-invalid")) validarCampo(nome, true); });
      input.addEventListener(nome === "consentimento" ? "change" : "input", function () {
        if (input.getAttribute("aria-invalid")) validarCampo(nome, true);
      });
    });

    function validarContato() {
      var primeiroInvalido = null;
      Object.keys(CAMPOS).forEach(function (nome) {
        if (validarCampo(nome, true) && !primeiroInvalido) primeiroInvalido = nome;
      });
      if (primeiroInvalido) {
        track("form_error", { form_name: CFG.formName, field_group: "contato", error_type: "validacao_" + primeiroInvalido });
        doc.getElementById(CAMPOS[primeiroInvalido]).focus();
        return false;
      }
      return true;
    }

    /* envio */
    function montarPayload(v) {
      return {
        form_name: CFG.formName || "diagnostico_hero",
        submission_id: tentativa.id,
        submitted_at: new Date().toISOString(),
        necessidades: v.necessidades.map(function (n) { return { valor: n, rotulo: ROTULOS.necessidades[n] }; }),
        prioridade: { valor: v.prioridade, rotulo: ROTULOS.prioridade[v.prioridade] },
        investimento: { valor: v.investimento, rotulo: ROTULOS.investimento[v.investimento] },
        contato: {
          nome: v.nome,
          telefone: v.telefone,
          telefone_e164: telefoneE164(v.telefone),
          email: v.email
        },
        consentimento: { aceito: true, texto: "Autorizo a New Arrays a entrar em contato sobre esta solicitação.", politica: location.origin + "/politica-de-privacidade/" },
        origem: {
          page_path: location.pathname,
          page_url: location.origin + location.pathname,
          landing_page: origem.landing_page || "",
          referrer: origem.referrer || "",
          utm_source: origem.utm_source || "",
          utm_medium: origem.utm_medium || "",
          utm_campaign: origem.utm_campaign || "",
          utm_term: origem.utm_term || "",
          utm_content: origem.utm_content || "",
          gclid: origem.gclid || "",
          fbclid: origem.fbclid || ""
        }
      };
    }

    function assinaturaDe(v) {
      return [v.necessidades.join(","), v.prioridade, v.investimento, v.nome, v.telefone.replace(/\D/g, ""), v.email].join("|");
    }

    function textoWhatsApp(v) {
      var linhas = ["Olá, vim pelo site da New Arrays e quero falar sobre meu projeto."];
      if (v.necessidades.length) linhas.push("Necessidade: " + v.necessidades.map(function (n) { return ROTULOS.necessidades[n]; }).join(", "));
      if (v.prioridade) linhas.push("Prioridade: " + ROTULOS.prioridade[v.prioridade]);
      if (v.investimento) linhas.push("Investimento: " + ROTULOS.investimento[v.investimento]);
      if (v.nome) linhas.push("Nome: " + v.nome);
      return "https://wa.me/" + (CFG.whatsapp || "5511995572722") + "?text=" + encodeURIComponent(linhas.join("\n"));
    }

    function mostrarStatus(tipo) {
      passos.forEach(function (fs) { fs.hidden = true; });
      nav.hidden = true;
      status.hidden = false;
      blocoOk.hidden = tipo !== "ok";
      blocoFalha.hidden = tipo !== "falha";
      status.classList.remove("entrando");
      if (!reduzido) { void status.offsetWidth; status.classList.add("entrando"); }
      status.focus({ preventScroll: true });
      garantirVisivel();
    }

    function esconderStatus() {
      status.hidden = true;
      nav.hidden = false;
    }

    var MENSAGENS = {
      nao_configurado: "O envio online ainda está sendo configurado. Suas respostas continuam aqui: envie pelo WhatsApp com um toque, já com tudo preenchido.",
      offline: "Parece que você está sem internet. Suas respostas continuam aqui. Verifique a conexão e tente de novo.",
      rede: "Não conseguimos conectar ao servidor. Suas respostas continuam aqui. Tente de novo ou envie pelo WhatsApp.",
      tempo_esgotado: "O servidor demorou para responder. Suas respostas continuam aqui. Tente de novo em instantes.",
      servidor: "Nosso sistema teve uma instabilidade. Suas respostas continuam aqui. Tente de novo ou envie pelo WhatsApp.",
      recusado: "Não foi possível registrar a solicitação. Revise seus dados ou envie pelo WhatsApp."
    };

    function enviar() {
      if (enviando || enviado) return;
      if (!validarContato()) return;
      var v = valores();
      if (v.isca) { falhar({ codigo: "recusado" }, v); return; }

      var assinatura = assinaturaDe(v);
      if (sessao("na_lead_enviado") === assinatura) {
        enviado = true;
        preencherSucesso(v, true);
        return;
      }
      if (tentativa.assinatura !== assinatura) tentativa = { id: uuid(), assinatura: assinatura };

      enviando = true;
      btEnviar.disabled = true;
      btEnviar.setAttribute("aria-busy", "true");
      txtEnviar.textContent = "Enviando";
      btVoltar.disabled = true;

      LeadService.enviar(montarPayload(v)).then(function () {
        enviando = false;
        enviado = true;
        sessao("na_lead_enviado", assinatura);
        track("generate_lead", {
          form_name: CFG.formName,
          service: v.necessidades.join(","),
          priority: v.prioridade,
          budget: v.investimento,
          source: origem.utm_source || "",
          medium: origem.utm_medium || "",
          campaign: origem.utm_campaign || ""
        });
        preencherSucesso(v, false);
      }, function (err) {
        enviando = false;
        falhar(err, v);
      }).then(function () {
        btEnviar.disabled = false;
        btEnviar.removeAttribute("aria-busy");
        txtEnviar.textContent = "Enviar minha solicitação";
        btVoltar.disabled = false;
      });
    }

    function preencherSucesso(v, repetido) {
      $("[data-primeiro-nome]", form).textContent = v.nome.split(" ")[0];
      var resumo = $("[data-resumo]", form);
      resumo.innerHTML = "";
      [
        ["Necessidade", v.necessidades.map(function (n) { return ROTULOS.necessidades[n]; }).join(", ")],
        ["Prioridade", ROTULOS.prioridade[v.prioridade]],
        ["Investimento", ROTULOS.investimento[v.investimento]],
        ["Contato", v.telefone + " | " + v.email]
      ].forEach(function (par) {
        var li = doc.createElement("li");
        var b = doc.createElement("strong"); b.textContent = par[0];
        var s = doc.createElement("span"); s.textContent = par[1];
        li.appendChild(b); li.appendChild(s); resumo.appendChild(li);
      });
      var titulo = $("h3", blocoOk);
      titulo.textContent = repetido ? "Já recebemos esta solicitação." : "Solicitação recebida.";
      mostrarStatus("ok");
    }

    function falhar(err, v) {
      var codigo = (err && err.codigo) || "rede";
      falhaMsg.textContent = MENSAGENS[codigo] || MENSAGENS.rede;
      waFallback.href = textoWhatsApp(v);
      track("form_error", { form_name: CFG.formName, field_group: "envio", error_type: codigo });
      mostrarStatus("falha");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (passo < TOTAL) { if (validarPasso(passo)) irPara(passo + 1, 1); return; }
      enviar();
    });
    $("[data-tentar]", form).addEventListener("click", function () {
      esconderStatus();
      irPara(TOTAL, 1);
      enviar();
    });
    $("[data-revisar]", form).addEventListener("click", function () {
      esconderStatus();
      irPara(TOTAL, -1);
    });

    function reiniciar() {
      form.reset();
      enviado = false;
      iniciou = false;
      tentativa = { id: null, assinatura: "" };
      notaDuvida.hidden = true;
      $$("[aria-invalid]", form).forEach(function (i) { i.removeAttribute("aria-invalid"); });
      $$(".diag__erro, .campo__erro", form).forEach(function (p) { p.textContent = ""; });
      esconderStatus();
      blocoOk.hidden = true;
      blocoFalha.hidden = true;
      passo = 1;
      passos.forEach(function (fs) { fs.hidden = Number(fs.getAttribute("data-passo")) !== 1; });
      elEtapa.textContent = "1";
      barras.forEach(function (li, i) { li.classList.toggle("feito", false); li.classList.toggle("atual", i === 0); });
      btVoltar.hidden = true; btAvancar.hidden = false; btEnviar.hidden = true;
    }

    barras[0].classList.add("atual");
  }

  /* ---------- 6. Navegação das cenas ---------- */
  function topoAbsoluto(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function cenaPresa(secao) { return !reduzido && secao && secao.offsetHeight > window.innerHeight * 1.5; }

  var servicos = $("#servicos");
  var MAPA_SERVICOS = { "#servico-redes": 1, "#servico-trafego": 2, "#servico-sites": 3 };
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#servico-"]');
    if (!a || !servicos || !cenaPresa(servicos)) return;
    var etapa = MAPA_SERVICOS[a.getAttribute("href")];
    if (!etapa) return;
    e.preventDefault();
    var percurso = servicos.offsetHeight - window.innerHeight;
    var alvo = topoAbsoluto(servicos) + percurso * ((etapa - 1) / 3 + 0.1);
    if (window.NA_rolar) NA_rolar(alvo, true); else window.scrollTo({ top: alvo, behavior: "smooth" });
    var artigo = $(a.getAttribute("href"));
    setTimeout(function () { if (artigo) { var bt = $("button, a", artigo); if (bt && e.detail === 0) bt.focus({ preventScroll: true }); } }, 700);
  });

  var projetos = $("#projetos");
  if (projetos) {
    var cards = $$(".projeto", projetos);
    projetos.addEventListener("focusin", function (e) {
      if (!cenaPresa(projetos)) return;
      var card = e.target.closest(".projeto");
      var i = cards.indexOf(card);
      if (i < 0) return;
      var percurso = projetos.offsetHeight - window.innerHeight;
      var yp = topoAbsoluto(projetos) + percurso * (cards.length > 1 ? i / (cards.length - 1) : 0); if (window.NA_rolar) NA_rolar(yp, false); else window.scrollTo({ top: yp, behavior: "auto" });
    });
  }

  /* ---------- 7. Vídeos sob demanda ---------- */
  $$("[data-video]").forEach(function (fig) {
    var src = (fig.getAttribute("data-video") || "").trim();
    if (!src) return;
    var poster = (fig.getAttribute("data-poster") || "").trim();
    var nome = fig.getAttribute("data-nome") || "cliente";
    var midia = $(".video-card__midia", fig);
    var bt = doc.createElement("button");
    bt.type = "button";
    bt.className = "video-card__play";
    bt.setAttribute("aria-label", "Assistir vídeo: " + nome);
    bt.innerHTML = (poster ? '<img src="' + poster + '" alt="" loading="lazy" decoding="async">' : "") +
      '<span><svg aria-hidden="true"><use href="#i-play"/></svg></span>';
    midia.innerHTML = "";
    midia.appendChild(bt);
    bt.addEventListener("click", function () {
      var v = doc.createElement("video");
      v.src = src;
      v.controls = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      if (poster) v.poster = poster;
      v.setAttribute("aria-label", "Vídeo: " + nome);
      midia.innerHTML = "";
      midia.appendChild(v);
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.focus();
      track("video_play", { video_name: nome });
    });
  });

  /* ---------- Cliques de contato ---------- */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    if (a.hasAttribute("data-wa-pos")) track("contact_whatsapp", { cta_position: a.getAttribute("data-wa-pos"), destination: "whatsapp" });
    else if (a.href && a.href.indexOf("mailto:") === 0) track("click_email", { cta_position: a.getAttribute("data-email-pos") || "" });
  });
})();

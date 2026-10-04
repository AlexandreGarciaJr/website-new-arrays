/* =========================================================
   New Arrays | Validação dos dados do formulário (navegador)
   window.NA_validar = { nome, telefone, email, emailDominio }
   Cada função devolve { ok, msg, sugestao? }.

   NOME      nome e sobrenome, só letras (com acentos), espaço, hífen,
             apóstrofo e ponto; sem números; sem letras repetidas em série.
   TELEFONE  Brasil: DDD que existe (lista da Anatel) + celular com 9
             dígitos começando com 9, ou fixo com 8 dígitos começando
             com 2 a 5; rejeita sequências como 99999-9999.
             Fora do Brasil: começa com + e o código do país, 8 a 15 dígitos.
   E-MAIL    formato válido (usuário, domínio e extensão), erros comuns de
             digitação com sugestão ("gmial.com" → "gmail.com", ".con" →
             ".com") e e-mails descartáveis (mailinator, yopmail...).
             "O e-mail existe?" de verdade só o servidor responde: o
             api/verificar-email.php confere se o domínio recebe e-mail
             (registro MX). Nenhum site consegue confirmar a caixa de
             entrada sem mandar um e-mail.
   O servidor (api/lead.php) repete todas essas regras: a validação do
   navegador é para ajudar a pessoa, a do servidor é a que protege.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- telefone ---------- */
  // DDDs válidos no Brasil (Anatel)
  var DDD = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];

  function telefone(valor) {
    var v = String(valor || "").trim();
    if (!v) return { ok: false, msg: "Informe um telefone ou WhatsApp." };
    var d = v.replace(/\D/g, "");
    var internacional = v.charAt(0) === "+";
    if (internacional && d.indexOf("55") === 0) { d = d.slice(2); internacional = false; } // +55 vale como Brasil
    if (internacional) {
      if (d.length < 8 || d.length > 15) return { ok: false, msg: "Confira o número com o código do país (ex.: +1 305 555 0100)." };
      if (/^(\d)\1+$/.test(d)) return { ok: false, msg: "Confira o número informado." };
      return { ok: true, msg: "", e164: "+" + d };
    }
    if (d.length < 10) return { ok: false, msg: "Inclua o DDD e o número completo." };
    if (d.length > 11) return { ok: false, msg: "O número tem dígitos a mais. Confira." };
    if (DDD.indexOf(Number(d.slice(0, 2))) < 0) return { ok: false, msg: "Esse DDD não existe. Confira os dois primeiros números." };
    var numero = d.slice(2);
    if (/^(\d)\1+$/.test(numero)) return { ok: false, msg: "Confira o número informado." };
    if (numero.length === 9 && numero.charAt(0) !== "9") return { ok: false, msg: "Celular com 9 dígitos começa com 9. Confira." };
    if (numero.length === 8 && !/^[2-5]/.test(numero)) {
      // 8 dígitos começando com 6 a 9 é um celular sem o 9 da frente
      return { ok: false, msg: "Parece um celular sem o 9 na frente. Confira o número." };
    }
    return { ok: true, msg: "", e164: "+55" + d };
  }

  /* ---------- nome ---------- */
  function nome(valor) {
    var v = String(valor || "").trim().replace(/\s+/g, " ");
    if (!v) return { ok: false, msg: "Informe seu nome completo." };
    if (/\d/.test(v)) return { ok: false, msg: "O nome não pode ter números." };
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' .\-]+$/.test(v)) return { ok: false, msg: "Use só letras no nome." };
    var partes = v.split(" ").filter(function (p) { return p.replace(/[.'\-]/g, "").length > 0; });
    if (partes.length < 2 || v.length < 5) return { ok: false, msg: "Informe nome e sobrenome." };
    if (/(.)\1\1/i.test(v.replace(/\s/g, ""))) return { ok: false, msg: "Confira o nome informado." };
    if (v.length > 120) return { ok: false, msg: "Nome muito longo." };
    return { ok: true, msg: "" };
  }

  /* ---------- e-mail ---------- */
  var COMUNS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com",
    "hotmail.com.br", "outlook.com.br", "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br", "globo.com", "msn.com", "me.com", "proton.me"];
  var DESCARTAVEIS = ["mailinator.com", "yopmail.com", "10minutemail.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
    "temp-mail.org", "tempmail.com", "tempmail.net", "trashmail.com", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
    "mintemail.com", "throwawaymail.com", "fakeinbox.com", "emailondeck.com", "mohmal.com", "tempr.email", "moakt.com", "inboxkitten.com"];
  // erros de extensão muito comuns
  var TLD = { "con": "com", "cmo": "com", "ocm": "com", "comm": "com", "cm": "com", "co": "com", "om": "com", "vom": "com", "xom": "com",
    "com.bt": "com.br", "com.vr": "com.br", "com.be": "com.br", "com.brr": "com.br", "combr": "com.br", "br.com": "com.br" };

  function distancia(a, b) {
    var m = a.length, n = b.length, i, j, d = [];
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }

  function sugerirDominio(dominio) {
    if (COMUNS.indexOf(dominio) >= 0) return "";
    // extensão errada: "gmail.con" → "gmail.com"
    var p = dominio.indexOf(".");
    if (p > 0) {
      var base = dominio.slice(0, p), ext = dominio.slice(p + 1);
      if (TLD[ext]) {
        var corrigido = base + "." + TLD[ext];
        return corrigido !== dominio ? (sugerirDominio(corrigido) || corrigido) : "";
      }
    }
    // nome do provedor digitado errado: "gmial.com", "hotmial.com", "outlok.com"
    var melhor = "", menor = 3;
    COMUNS.forEach(function (c) {
      var dist = distancia(dominio, c);
      if (dist > 0 && dist < menor) { menor = dist; melhor = c; }
    });
    return melhor;
  }

  function email(valor) {
    var v = String(valor || "").trim().toLowerCase();
    if (!v) return { ok: false, msg: "Informe seu e-mail." };
    if (/\s/.test(v)) return { ok: false, msg: "O e-mail não pode ter espaços." };
    var partes = v.split("@");
    if (partes.length !== 2 || !partes[0] || !partes[1]) return { ok: false, msg: "Confira o e-mail. Exemplo: nome@empresa.com.br" };
    var usuario = partes[0], dominio = partes[1];
    if (usuario.length > 64 || v.length > 254) return { ok: false, msg: "E-mail longo demais. Confira." };
    if (!/^[a-z0-9!#$%&'*+\/=?^_`{|}~.\-]+$/.test(usuario) || /^\.|\.$|\.\./.test(usuario)) return { ok: false, msg: "Confira a parte antes do @." };
    if (!/^([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(dominio)) {
      var s0 = sugerirDominio(dominio);
      return { ok: false, msg: "Confira a parte depois do @.", sugestao: s0 ? usuario + "@" + s0 : "" };
    }
    if (DESCARTAVEIS.indexOf(dominio) >= 0) return { ok: false, msg: "Use um e-mail permanente, que você acessa no dia a dia." };
    var s = sugerirDominio(dominio);
    // com sugestão o e-mail não é bloqueado (pode ser um domínio real parecido), só perguntamos
    return { ok: true, msg: "", sugestao: s ? usuario + "@" + s : "" };
  }

  /* ---------- confirmação no servidor: o domínio recebe e-mail? (registro MX) ---------- */
  var cache = {};
  function emailDominio(valor, url) {
    var v = String(valor || "").trim().toLowerCase();
    var dominio = v.split("@")[1] || "";
    if (!url || !dominio) return Promise.resolve({ ok: true, msg: "" });
    if (cache[dominio]) return cache[dominio];
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var tempo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    cache[dominio] = fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "dominio=" + encodeURIComponent(dominio), { signal: ctrl ? ctrl.signal : undefined, credentials: "omit" })
      .then(function (r) { clearTimeout(tempo); return r.ok ? r.json() : { existe: true }; })
      .then(function (j) { return j && j.existe === false ? { ok: false, msg: "Esse domínio de e-mail não existe ou não recebe mensagens. Confira o que vem depois do @." } : { ok: true, msg: "" }; })
      .catch(function () { clearTimeout(tempo); delete cache[dominio]; return { ok: true, msg: "" }; }); // sem resposta: não trava a pessoa (o servidor confere no envio)
    return cache[dominio];
  }

  window.NA_validar = { nome: nome, telefone: telefone, email: email, emailDominio: emailDominio, _sugerirDominio: sugerirDominio };
})();

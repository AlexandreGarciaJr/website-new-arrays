/* =========================================================
   New Arrays | Recebe os leads do site e grava na planilha
   Cole este código em: planilha > Extensões > Apps Script > Código.gs
   Depois: Configurações do projeto (engrenagem) > Propriedades do script >
   adicione TOKEN com o mesmo valor de 'planilha_token' do na-config.php.
   Implantar > Nova implantação > Tipo: App da Web
     Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa
   Copie a URL que termina em /exec para 'planilha_url' do na-config.php.
   ========================================================= */
const ABA = "Leads - Site";   // nome exato da aba na planilha (criada sozinha se não existir)
const COLUNAS = [
  ["Data", "data"], ["Nome", "nome"], ["WhatsApp", "telefone"], ["Telefone (E.164)", "telefone_e164"], ["E-mail", "email"],
  ["Precisa de", "necessidades"], ["Prioridade", "prioridade"], ["Investimento mensal", "investimento"],
  ["Página", "page_url"], ["Primeira página", "landing_page"], ["Veio de", "referrer"],
  ["utm_source", "utm_source"], ["utm_medium", "utm_medium"], ["utm_campaign", "utm_campaign"], ["utm_term", "utm_term"], ["utm_content", "utm_content"],
  ["gclid", "gclid"], ["fbclid", "fbclid"], ["Link WhatsApp", "whatsapp_link"], ["ID", "id"]
];

function doPost(e) {
  const resposta = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  let dados;
  try { dados = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return resposta({ ok: false, erro: "json" }); }

  const token = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!token || dados.token !== token) return resposta({ ok: false, erro: "token" });

  const lead = dados.lead || {};
  const trava = LockService.getScriptLock();   // dois envios ao mesmo tempo não se atropelam
  trava.waitLock(10000);
  try {
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    let aba = planilha.getSheetByName(ABA);
    if (!aba) aba = planilha.insertSheet(ABA);
    if (aba.getLastRow() === 0) {   // aba vazia: escreve os títulos das colunas
      aba.appendRow(COLUNAS.map(c => c[0]));
      aba.setFrozenRows(1);
      aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold").setBackground("#074049").setFontColor("#ffffff");
    }
    // não grava o mesmo envio duas vezes (procura o ID na última coluna)
    const ultima = aba.getLastRow();
    if (ultima > 1 && lead.id) {
      const ids = aba.getRange(2, COLUNAS.length, ultima - 1, 1).getValues().flat();
      if (ids.indexOf(lead.id) >= 0) return resposta({ ok: true, repetido: true });
    }
    // texto puro: impede que algo digitado como "=FÓRMULA" vire fórmula na planilha
    const seguro = (v) => { v = (v === undefined || v === null) ? "" : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; };
    aba.appendRow(COLUNAS.map(c => seguro(lead[c[1]])));
    return resposta({ ok: true });
  } finally {
    trava.releaseLock();
  }
}

// Abrir a URL /exec no navegador mostra se a implantação está no ar
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, servico: "leads New Arrays" })).setMimeType(ContentService.MimeType.JSON);
}
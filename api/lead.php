<?php
/* =========================================================
   New Arrays | Recebe o formulário do site (POST JSON)
   1. valida tudo de novo no servidor (nome, telefone, e-mail + domínio MX)
   2. envia o e-mail do lead para a New Arrays (PHPMailer, SMTP do Gmail)
   3. grava uma linha na planilha do Google (Apps Script, servidor → servidor)
   Respostas:
     200 { ok: true, email: bool, planilha: bool }   pelo menos um dos dois funcionou
     422 { ok: false, erros: { campo: mensagem } }   algum campo inválido
     429 muitas tentativas · 400 dados malformados · 405 método · 502 e-mail e planilha falharam
   O mesmo submission_id não é processado duas vezes (clique duplo, reenvio).
   ========================================================= */
require __DIR__ . '/_comum.php';
require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';
use PHPMailer\PHPMailer\PHPMailer;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); na_json(405, ['ok' => false]); }
$cfg = na_config();
if (!$cfg) { na_log('config ausente'); na_json(500, ['ok' => false, 'erro' => 'config']); }

$bruto = file_get_contents('php://input', false, null, 0, 20000);
$d = json_decode((string)$bruto, true);
if (!is_array($d) || empty($d['contato']) || !is_array($d['contato'])) na_json(400, ['ok' => false]);

if (!na_limite_ok((int)($cfg['limite_envios'] ?? 5), (int)($cfg['limite_janela'] ?? 600))) na_json(429, ['ok' => false]);

/* ---------- limpeza ---------- */
function txt($v, int $max = 200): string { return mb_substr(trim(strip_tags((string)$v)), 0, $max); }
$c = $d['contato'];
$lead = [
  'id'           => preg_replace('/[^a-zA-Z0-9\-]/', '', (string)($d['submission_id'] ?? '')) ?: bin2hex(random_bytes(8)),
  'nome'         => txt($c['nome'] ?? '', 120),
  'telefone'     => txt($c['telefone'] ?? '', 25),
  'email'        => strtolower(txt($c['email'] ?? '', 160)),
  'necessidades' => implode(', ', array_map(fn($n) => txt($n['rotulo'] ?? $n['valor'] ?? '', 60), array_slice((array)($d['necessidades'] ?? []), 0, 6))),
  'prioridade'   => txt($d['prioridade']['rotulo'] ?? '', 40),
  'investimento' => txt($d['investimento']['rotulo'] ?? '', 40),
  'consentimento'=> !empty($d['consentimento']['aceito']),
];
$o = (array)($d['origem'] ?? []);
foreach (['page_url','landing_page','referrer','utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'] as $k) $lead[$k] = txt($o[$k] ?? '', 300);

/* ---------- validação ---------- */
$erros = [];
if ($m = na_validar_nome($lead['nome'])) $erros['nome'] = $m;
[$mt, $e164] = na_validar_telefone($lead['telefone']);
if ($mt) $erros['telefone'] = $mt;
if ($m = na_validar_email($lead['email'], (bool)($cfg['verificar_mx'] ?? true))) $erros['email'] = $m;
if (!$lead['consentimento']) $erros['consentimento'] = 'Precisamos da sua autorização para entrar em contato.';
if ($lead['necessidades'] === '' || $lead['prioridade'] === '' || $lead['investimento'] === '') $erros['geral'] = 'Responda todas as etapas.';
if ($erros) na_json(422, ['ok' => false, 'erros' => $erros]);
$lead['telefone_e164'] = $e164;
$lead['whatsapp_link'] = 'https://wa.me/' . ltrim($e164, '+');
$lead['data'] = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i:s');

/* ---------- já processado? (idempotência) ---------- */
$arqIds = __DIR__ . '/dados/ids.json';
$ids = is_file($arqIds) ? (json_decode((string)@file_get_contents($arqIds), true) ?: []) : [];
if (in_array($lead['id'], $ids, true)) na_json(200, ['ok' => true, 'repetido' => true]);

/* ---------- 1) e-mail ---------- */
function enviar_email(array $cfg, array $l): bool {
  $h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
  $linhas = [
    'Nome' => $l['nome'], 'WhatsApp' => $l['telefone'] . ' (' . $l['telefone_e164'] . ')', 'E-mail' => $l['email'],
    'Precisa de' => $l['necessidades'], 'Prioridade' => $l['prioridade'], 'Investimento mensal' => $l['investimento'],
    'Página' => $l['page_url'], 'Origem (UTM)' => trim($l['utm_source'] . ' / ' . $l['utm_medium'] . ' / ' . $l['utm_campaign'], ' /'),
    'Veio de' => $l['referrer'], 'Recebido em' => $l['data'], 'ID' => $l['id'],
  ];
  $tabela = '';
  foreach ($linhas as $k => $v) if ($v !== '') $tabela .= '<tr><td style="padding:8px 14px;color:#5b6b6e;white-space:nowrap;vertical-align:top">' . $h($k) . '</td><td style="padding:8px 14px;color:#0a0a0a;font-weight:600">' . $h($v) . '</td></tr>';
  $html = '<div style="font-family:Arial,sans-serif;background:#e7f5f7;padding:24px">'
    . '<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">'
    . '<div style="background:#074049;color:#fff;padding:18px 20px;font-size:18px;font-weight:700">Novo lead pelo site</div>'
    . '<table style="width:100%;border-collapse:collapse;font-size:14px">' . $tabela . '</table>'
    . '<div style="padding:18px 20px"><a href="' . $h($l['whatsapp_link']) . '" style="background:#1098AD;color:#0a0a0a;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px;display:inline-block">Chamar no WhatsApp</a></div>'
    . '</div></div>';
  $texto = '';
  foreach ($linhas as $k => $v) if ($v !== '') $texto .= "$k: $v\n";

  $m = new PHPMailer(true);
  try {
    $m->isSMTP();
    $m->Host = $cfg['smtp_host'] ?? 'smtp.gmail.com';
    $m->Port = (int)($cfg['smtp_porta'] ?? 587);
    $seg = $cfg['smtp_seguranca'] ?? 'tls';
    if ($seg) { $m->SMTPSecure = $seg === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS; } else { $m->SMTPAutoTLS = false; }
    $m->SMTPAuth = !empty($cfg['smtp_usuario']);
    $m->Username = $cfg['smtp_usuario'] ?? '';
    $m->Password = $cfg['smtp_senha'] ?? '';
    $m->Timeout = 12;
    $m->CharSet = 'UTF-8';
    $m->setFrom($cfg['smtp_usuario'] ?: 'site@newarrays.com', $cfg['remetente_nome'] ?? 'Site New Arrays');
    foreach ((array)($cfg['destino'] ?? []) as $dest) $m->addAddress($dest);
    $m->addReplyTo($l['email'], $l['nome']); // "Responder" já vai para o lead
    $m->Subject = 'Novo lead: ' . $l['nome'] . ' · ' . $l['necessidades'];
    $m->isHTML(true);
    $m->Body = $html;
    $m->AltBody = $texto;
    $m->send();
    return true;
  } catch (\Throwable $e) {
    na_log('email falhou (' . $l['id'] . '): ' . $m->ErrorInfo);
    return false;
  }
}

/* ---------- 2) planilha (Apps Script) ---------- */
function enviar_planilha(array $cfg, array $l): bool {
  $url = $cfg['planilha_url'] ?? '';
  if (!$url || str_contains($url, 'COLE_AQUI')) return false;
  $corpo = json_encode(['token' => $cfg['planilha_token'] ?? '', 'lead' => $l], JSON_UNESCAPED_UNICODE);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_POSTFIELDS => $corpo,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, // o Apps Script responde com um redirecionamento
    CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6,
  ]);
  $resp = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $erro = curl_error($ch);
  curl_close($ch);
  $j = json_decode((string)$resp, true);
  if ($status >= 200 && $status < 300 && is_array($j) && !empty($j['ok'])) return true;
  na_log('planilha falhou (' . $l['id'] . '): http ' . $status . ' ' . $erro . ' ' . mb_substr((string)$resp, 0, 200));
  return false;
}

$okEmail = enviar_email($cfg, $lead);
$okPlanilha = enviar_planilha($cfg, $lead);

if (!$okEmail && !$okPlanilha) na_json(502, ['ok' => false]);

$ids[] = $lead['id'];
@file_put_contents($arqIds, json_encode(array_slice($ids, -500)), LOCK_EX);
na_json(200, ['ok' => true, 'email' => $okEmail, 'planilha' => $okPlanilha]);

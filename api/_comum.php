<?php
/* =========================================================
   New Arrays | Funções comuns da API do formulário
   (validação no servidor: repete as regras de assets/js/validacao.js)
   ========================================================= */
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

// Erros do PHP nunca vão para a tela (vazariam caminhos do servidor e quebrariam o JSON):
// viram uma resposta 500 e uma linha em dados/erros.log
ini_set('display_errors', '0');
register_shutdown_function(function () {
  $e = error_get_last();
  if (!$e || !in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) return;
  na_log('erro do PHP: ' . $e['message'] . ' (' . basename($e['file']) . ':' . $e['line'] . ')');
  if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); }
  echo '{"ok":false,"erro":"servidor"}';
});

// Alguns PHPs (ex.: o do Windows sem configurar) vêm sem a extensão mbstring: equivalentes simples em UTF-8
if (!function_exists('mb_strlen')) {
  function mb_strlen($s, $enc = null) { return preg_match_all('/./us', (string)$s); }
}
if (!function_exists('mb_substr')) {
  function mb_substr($s, $inicio, $tam = null, $enc = null) {
    $c = preg_split('//u', (string)$s, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    return implode('', array_slice($c, $inicio, $tam));
  }
}

function na_config(): array {
  $locais = [dirname(__DIR__, 2) . '/na-config.php', dirname(__DIR__) . '/../na-config.php', __DIR__ . '/config.php'];
  foreach ($locais as $arq) { if (is_file($arq)) { $c = require $arq; if (is_array($c)) return $c; } }
  return [];
}

function na_json(int $status, array $dados): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($dados, JSON_UNESCAPED_UNICODE);
  exit;
}

function na_log(string $msg): void {
  $dir = __DIR__ . '/dados';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  @file_put_contents($dir . '/erros.log', '[' . date('c') . '] ' . $msg . PHP_EOL, FILE_APPEND | LOCK_EX);
}

/* ---------- validação ---------- */
const NA_DDD = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,
  61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];
const NA_DESCARTAVEIS = ['mailinator.com','yopmail.com','10minutemail.com','guerrillamail.com','guerrillamail.net','sharklasers.com',
  'temp-mail.org','tempmail.com','tempmail.net','trashmail.com','getnada.com','nada.email','dispostable.com','maildrop.cc',
  'mintemail.com','throwawaymail.com','fakeinbox.com','emailondeck.com','mohmal.com','tempr.email','moakt.com','inboxkitten.com'];

function na_validar_nome(string $v): string {
  $v = trim(preg_replace('/\s+/u', ' ', $v));
  if ($v === '') return 'Informe seu nome completo.';
  if (preg_match('/\d/', $v)) return 'O nome não pode ter números.';
  if (!preg_match("/^[\\p{L}' .\\-]+$/u", $v)) return 'Use só letras no nome.';
  $partes = array_filter(explode(' ', $v), fn($p) => preg_replace("/[.'\\-]/u", '', $p) !== '');
  if (count($partes) < 2 || mb_strlen($v) < 5) return 'Informe nome e sobrenome.';
  if (mb_strlen($v) > 120) return 'Nome muito longo.';
  return '';
}

/** devolve [mensagem_de_erro, e164] */
function na_validar_telefone(string $v): array {
  $v = trim($v);
  if ($v === '') return ['Informe um telefone ou WhatsApp.', ''];
  $d = preg_replace('/\D/', '', $v);
  $inter = str_starts_with($v, '+');
  if ($inter && str_starts_with($d, '55')) { $d = substr($d, 2); $inter = false; }
  if ($inter) {
    if (strlen($d) < 8 || strlen($d) > 15 || preg_match('/^(\d)\1+$/', $d)) return ['Confira o número com o código do país.', ''];
    return ['', '+' . $d];
  }
  if (strlen($d) < 10 || strlen($d) > 11) return ['Inclua o DDD e o número completo.', ''];
  if (!in_array((int)substr($d, 0, 2), NA_DDD, true)) return ['Esse DDD não existe.', ''];
  $num = substr($d, 2);
  if (preg_match('/^(\d)\1+$/', $num)) return ['Confira o número informado.', ''];
  if (strlen($num) === 9 && $num[0] !== '9') return ['Celular com 9 dígitos começa com 9.', ''];
  if (strlen($num) === 8 && !preg_match('/^[2-5]/', $num)) return ['Parece um celular sem o 9 na frente.', ''];
  return ['', '+55' . $d];
}

function na_dominio_recebe_email(string $dominio): bool {
  $dominio = rtrim(strtolower($dominio), '.');
  if ($dominio === '' ) return false;
  // MX; se não houver MX, um registro A também pode receber e-mail (regra do SMTP)
  return checkdnsrr($dominio . '.', 'MX') || checkdnsrr($dominio . '.', 'A');
}

function na_validar_email(string $v, bool $mx): string {
  $v = strtolower(trim($v));
  if ($v === '') return 'Informe seu e-mail.';
  if (strlen($v) > 254 || !filter_var($v, FILTER_VALIDATE_EMAIL)) return 'Confira o e-mail. Exemplo: nome@empresa.com.br';
  $dom = substr(strrchr($v, '@'), 1);
  if (!preg_match('/^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/', $dom)) return 'Confira a parte depois do @.';
  if (in_array($dom, NA_DESCARTAVEIS, true)) return 'Use um e-mail permanente, que você acessa no dia a dia.';
  if ($mx && !na_dominio_recebe_email($dom)) return 'Esse domínio de e-mail não existe ou não recebe mensagens. Confira o que vem depois do @.';
  return '';
}

/* ---------- limite de envios por IP (arquivo, sem banco de dados) ---------- */
function na_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }
function na_limite_ok(int $max, int $janela): bool {
  $dir = __DIR__ . '/dados';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  $arq = $dir . '/limite-' . hash('sha256', na_ip() . 'na') . '.json';
  $agora = time();
  $lista = is_file($arq) ? (json_decode((string)@file_get_contents($arq), true) ?: []) : [];
  $lista = array_values(array_filter($lista, fn($t) => $t > $agora - $janela));
  if (count($lista) >= $max) return false;
  $lista[] = $agora;
  @file_put_contents($arq, json_encode($lista), LOCK_EX);
  return true;
}

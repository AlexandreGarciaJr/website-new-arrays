<?php
/* New Arrays | O domínio do e-mail recebe mensagens? (GET ?dominio=gmail.com)
   Responde { "existe": true|false }. Usado pelo formulário quando a pessoa sai do campo de e-mail. */
require __DIR__ . '/_comum.php';
$dom = strtolower(trim((string)($_GET['dominio'] ?? '')));
if ($dom === '' || strlen($dom) > 253 || !preg_match('/^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/', $dom)) na_json(200, ['existe' => false]);
na_json(200, ['existe' => na_dominio_recebe_email($dom)]);

<?php
/* =========================================================
   New Arrays | Configuração do formulário (MODELO)
   1. Copie este arquivo como "na-config.php" e coloque-o FORA da pasta
      pública, um nível acima do public_html (ex.: /home/SEU_USUARIO/na-config.php).
      Se não for possível, salve como "api/config.php" (o .htaccess bloqueia o acesso).
   2. Preencha os valores abaixo. Nunca suba o arquivo preenchido para o GitHub.
   ========================================================= */
return [
  // ---- e-mail (PHPMailer pelo SMTP do Gmail) ----
  // Na conta Google: ative a verificação em duas etapas e crie uma "Senha de app"
  // (myaccount.google.com > Segurança > Senhas de app). Use essa senha de 16 letras abaixo.
  'smtp_host'     => 'smtp.gmail.com',
  'smtp_porta'    => 587,                 // 587 com STARTTLS (ou 465 com SSL)
  'smtp_seguranca'=> 'tls',               // 'tls' para 587, 'ssl' para 465
  'smtp_usuario'  => 'SEU_GMAIL@gmail.com',
  'smtp_senha'    => 'xxxx xxxx xxxx xxxx', // senha de app (não é a senha normal da conta)
  'remetente_nome'=> 'Site New Arrays',
  'destino'       => ['contato@newarrays.com'], // quem recebe os leads (pode ter mais de um)

  // ---- planilha (Google Apps Script) ----
  // URL da implantação "App da Web" (termina em /exec) e o mesmo TOKEN salvo no Apps Script.
  'planilha_url'  => 'https://script.google.com/macros/s/COLE_AQUI_O_ID/exec',
  'planilha_token'=> 'troque-por-um-texto-longo-e-aleatorio',

  // ---- proteção ----
  'limite_envios' => 5,     // envios por IP...
  'limite_janela' => 600,   // ...a cada 10 minutos
  'verificar_mx'  => true,  // recusa e-mails de domínios que não recebem mensagens
];

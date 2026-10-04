# Formulário New Arrays: e-mail + planilha

## Como funciona

```
Navegador (validacao.js + site.js)
   │  POST JSON
   ▼
api/lead.php  (HostGator)
   ├─ valida tudo de novo (nome, telefone, e-mail + MX, limite por IP, envio repetido)
   ├─ PHPMailer → SMTP do Gmail → caixa da New Arrays
   └─ cURL → Google Apps Script (/exec) → nova linha na planilha
```

- **Por que a planilha passa pelo PHP:** o navegador nunca fala direto com o Google. Assim a URL do Apps Script e o token ficam escondidos no servidor, e ninguém consegue encher a planilha de lixo chamando a URL direto.
- **Resposta ao visitante:** ele vê "enviado" se pelo menos um dos dois caminhos (e-mail ou planilha) funcionar. Se os dois falharem, aparece a tela de falha com o botão do WhatsApp, e o erro fica registrado em `api/dados/erros.log`.
- **Envio repetido:** se a pessoa clicar duas vezes ou a internet cair no meio, o lead não é duplicado. Cada envio tem um ID e o PHP e a planilha ignoram IDs repetidos.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `assets/js/validacao.js` | Valida os dados no navegador: nome e sobrenome, DDD real, celular com 9, formato do e-mail, sugestão para erros de digitação ("gmial.com" → "gmail.com") e bloqueio de e-mail descartável |
| `api/lead.php` | Recebe o formulário, valida de novo e envia o e-mail e a planilha |
| `api/verificar-email.php` | Responde se o domínio do e-mail recebe mensagens (registro MX). O formulário consulta ao sair do campo |
| `api/_comum.php` | Funções compartilhadas: configuração, validação, limite de envios e log |
| `api/config.exemplo.php` | Modelo da configuração com as senhas |
| `api/lib/PHPMailer/` | Biblioteca PHPMailer 6.9.3, já incluída (não precisa do Composer) |
| `api/.htaccess` e `api/dados/.htaccess` | Bloqueiam o acesso direto a tudo, exceto `lead.php` e `verificar-email.php` |
| `integracao/apps-script-Codigo.gs` | Código que vai na planilha. **Não sobe para a hospedagem** |

## Passo a passo

### 1. Planilha + Apps Script (na conta Google do Sodré)

1. Crie uma planilha nova no Google Planilhas, por exemplo "Leads | Site New Arrays".
2. Vá em **Extensões > Apps Script**.
3. Apague o conteúdo do `Código.gs` e cole todo o `integracao/apps-script-Codigo.gs`. Salve.
4. Crie o token:
   1. Clique na engrenagem **Configurações do projeto**.
   2. Em **Propriedades do script**, clique em **Adicionar propriedade**.
   3. Use a propriedade `TOKEN`. O valor deve ser um texto longo e aleatório, por exemplo gerado em <https://www.random.org/strings/> ou com `openssl rand -hex 24`. Guarde esse valor.
5. Implante:
   1. Clique em **Implantar > Nova implantação**.
   2. Em **Tipo**, escolha **App da Web**.
   3. Em **Executar como**, escolha **Eu**.
   4. Em **Quem pode acessar**, escolha **Qualquer pessoa**.
   5. Clique em **Implantar** e autorize o acesso. Na tela "O Google não verificou este app", clique em **Avançado > Acessar (não seguro)**. Isso é normal porque o script é do próprio Sodré.
6. Copie a URL que termina em `/exec`.
7. Teste a URL abrindo-a no navegador. Ela deve responder `{"ok":true,...}` (é o doGet de teste). A aba "Leads Site" é criada sozinha no primeiro lead.

> Toda vez que alterar o código, use **Implantar > Gerenciar implantações > editar (lápis) > Versão: Nova versão**. Isso mantém a mesma URL. Se criar uma "Nova implantação", a URL muda e é preciso atualizar o `na-config.php`.

### 2. Senha de app do Gmail (na conta que vai **enviar** os e-mails)

1. Acesse myaccount.google.com > **Segurança**. Ative a **Verificação em duas etapas**, que é obrigatória para o passo seguinte.
2. Acesse <https://myaccount.google.com/apppasswords> e crie uma senha com o nome "Site New Arrays".
3. Copie a senha de 16 letras. Essa senha só serve para o site e pode ser revogada a qualquer momento sem mexer na senha normal.

O remetente e o destinatário podem ser o mesmo Gmail: o site "manda para si mesmo". O e-mail chega com **Responder** já apontando para o lead.

### 3. Configuração no servidor (HostGator)

1. Copie `api/config.exemplo.php` com o nome `na-config.php`.
2. Preencha os campos:
   - `smtp_usuario` e `smtp_senha`: o Gmail e a senha de app;
   - `destino`: quem recebe os leads;
   - `planilha_url`: a URL `/exec`;
   - `planilha_token`: o mesmo TOKEN do Apps Script.
3. No **Gerenciador de Arquivos** do cPanel, envie o `na-config.php` para **fora** do `public_html`, isto é, para a pasta acima dele (ex.: `/home/USUARIO/na-config.php`). Lá ele não pode ser acessado pela internet.
   - Se o site ficar em um subdomínio ou subpasta, o PHP também procura um nível acima.
   - Último recurso: `api/config.php` (o `.htaccess` bloqueia o acesso).
4. Nunca coloque o `na-config.php` preenchido no zip, no GitHub ou no Drive.

### 4. Subir o site

1. Envie o conteúdo do zip para `public_html`. As pastas `testes/`, `verificacao/` e `integracao/` não precisam subir.
2. Em **cPanel > Selecionar versão do PHP**, use PHP 8.0 ou mais novo. As extensões `curl`, `openssl` e `mbstring` precisam estar ligadas; costumam vir ligadas.
3. Confirme que a pasta `api/dados/` tem permissão de escrita (755 normalmente basta). Ela guarda o log, os IDs dos envios e o limite por IP.
4. Se ainda houver o `.htaccess` da página de contagem regressiva no `public_html`, troque-o no dia do lançamento.

### 5. Testar

1. Abra `https://newarrays.com/api/verificar-email.php?dominio=gmail.com`. Deve responder `{"existe":true}`.
2. Abra `https://newarrays.com/api/lead.php` no navegador. Deve responder **405**, o que está certo porque só aceita POST.
3. Abra `https://newarrays.com/api/config.exemplo.php`. Deve dar **403 (bloqueado)**.
4. Preencha o formulário de verdade e confira o e-mail na caixa de entrada (e no spam, no primeiro envio) e a linha nova na planilha.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Planilha preenche, e-mail não chega | Porta 587 bloqueada na HostGator | Mude para `'smtp_porta' => 465, 'smtp_seguranca' => 'ssl'` |
| `erros.log` com "Username and Password not accepted" | Usou a senha normal, ou a verificação em duas etapas está desligada | Gere uma senha de app (passo 2) |
| E-mail chega, planilha não | TOKEN diferente nos dois lados, ou a URL não é a `/exec` | Confira o TOKEN e reimplante como "Qualquer pessoa" |
| Planilha não atualiza depois de mexer no código | Implantação antiga | Gerenciar implantações > Nova versão |
| Formulário mostra a tela de falha e o log diz "config ausente" | O PHP não achou o `na-config.php` | Confira o local do arquivo (passo 3) |
| Visitante recebe "muitas tentativas" | Limite por IP (5 a cada 10 min) | Ajuste `limite_envios` / `limite_janela` |

Para ver o que aconteceu em cada envio, baixe `api/dados/erros.log` pelo Gerenciador de Arquivos. O log só é gravado quando algo falha.

**Volume:** o Gmail pessoal envia cerca de 500 e-mails por dia, folga de sobra para leads. Se um dia a HostGator bloquear o SMTP externo, troque `smtp_*` pelos dados de uma conta de e-mail criada no próprio cPanel. O resto continua igual.

## "Verificar se o e-mail existe": o que dá e o que não dá

- **Dá:**
  - conferir o formato;
  - pegar erros de digitação (com sugestão);
  - bloquear e-mails descartáveis;
  - confirmar no servidor que o **domínio** recebe e-mails (registro MX). Por exemplo, `maria@gmial.co` ou `joao@empresainventada.com.br` são recusados.
- **Não dá:** confirmar que a **caixa** `maria@gmail.com` existe. Os provedores escondem essa informação de propósito, contra spam, e a única prova real é mandar um e-mail e a pessoa clicar.
- **Na prática:** o telefone/WhatsApp é o contato principal, e o e-mail errado deixa de ser um problema grave.

## Validações (navegador e servidor fazem as mesmas)

- **Nome:** nome e sobrenome, só letras (com acento), sem números, sem "aaa".
- **Telefone:**
  - DDD que existe;
  - celular com 9 dígitos começando com 9;
  - fixo com 8 dígitos começando com 2 a 5;
  - avisa "parece um celular sem o 9";
  - recusa 99999-9999;
  - internacional começando com `+`.
- **E-mail:** formato, sugestão de correção (não bloqueia), descartáveis (bloqueia) e MX (bloqueia).
- Se alguém pular o JavaScript, o servidor devolve os erros por campo (422) e eles aparecem embaixo de cada campo, como na validação normal.

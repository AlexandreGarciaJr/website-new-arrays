# New Arrays | Guia técnico

HTML, CSS e JavaScript puro, sem build. A raiz do repositório é a raiz pública: basta publicá-la (GitHub Pages: branch main, pasta raiz) em qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages, Hostinger, cPanel).

```
site/
├── index.html                    Home completa
├── 404.html                      Página não encontrada (configure o host para servi-la no 404)
├── politica-de-privacidade/      MINUTA, precisa de revisão jurídica antes de publicar
├── robots.txt, sitemap.xml, site.webmanifest
├── favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192/512.png
└── assets/
    ├── css/site.css              Tokens do Manual NA 2026 + layout
    ├── css/sites-incriveis.css   Motor de animação de rolagem (não editar)
    ├── js/site.js                Formulário, LeadService, cabeçalho, vídeos
    ├── js/sites-incriveis.js     Motor de animação de rolagem (não editar)
    ├── fonts/inter-var-latin.woff2
    └── img/                      Logos em SVG (branco, azul, com e sem slogan, símbolo) + imagem de compartilhamento
```

## Rodar localmente

Os caminhos de CSS, JS, fontes e imagens são relativos, então funciona de três jeitos:

1. **Duplo clique** em `site/index.html`: abre com visual completo. Limitação do navegador em `file://`: o link da política de privacidade abre a listagem da pasta.
2. **Servidor local (recomendado, igual ao site publicado):** dentro da pasta `site/`, rode um destes:
   - `npx serve .` (Node) e acesse o endereço mostrado
   - `python -m http.server 8080` e acesse http://localhost:8080
   - VS Code: extensão Live Server, clique direito em `index.html` > "Open with Live Server"
3. **Com o endpoint de teste do formulário:** na pasta raiz do projeto, `node testes/server.mjs --dir . --port 4600` e acesse http://localhost:4600 (o endpoint `/api/lead` só existe nesse servidor de teste).

A `404.html` usa caminhos absolutos de propósito (o host a serve em qualquer URL); ela só aparece estilizada quando publicada ou via servidor.

## 1. Conectar o formulário ao backend / CRM

No `<head>` do `index.html`:

```js
window.NA_CONFIG = {
  leadEndpoint: "",          // <- URL que recebe POST JSON
  whatsapp: "5511995572722",
  email: "contato@newarrays.com",
  formName: "diagnostico_hero"
};
```

Enquanto `leadEndpoint` estiver vazio, o formulário **não simula sucesso**: mostra uma mensagem honesta e oferece o WhatsApp com as respostas já preenchidas.

Sucesso = resposta HTTP 2xx do endpoint. Qualquer outra resposta, erro de rede ou tempo acima de 15 s mostra a tela de falha, preservando todas as respostas. O endpoint precisa aceitar CORS (`Access-Control-Allow-Origin` do domínio do site) e deve **validar e sanitizar no servidor** (nome, e-mail, telefone) e usar o `submission_id` para descartar duplicados.

Payload enviado:

```json
{
  "form_name": "diagnostico_hero",
  "submission_id": "uuid",
  "submitted_at": "2026-09-28T19:40:12.345Z",
  "necessidades": [{ "valor": "trafego_pago", "rotulo": "Tráfego pago" }, { "valor": "site", "rotulo": "Criar ou melhorar um site" }],
  "prioridade": { "valor": "semana_que_vem", "rotulo": "Semana que vem" },
  "investimento": { "valor": "5000_ou_mais", "rotulo": "R$ 5.000 ou mais" },
  "contato": { "nome": "...", "telefone": "(11) 98765-4321", "telefone_e164": "+5511987654321", "email": "..." },
  "consentimento": { "aceito": true, "texto": "...", "politica": "https://newarrays.com/politica-de-privacidade/" },
  "origem": { "page_path": "/", "page_url": "...", "landing_page": "...", "referrer": "...", "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_term": "", "utm_content": "", "gclid": "", "fbclid": "" }
}
```

Valores internos (para automações): necessidades `gestao_redes_sociais | trafego_pago | site | atrair_clientes | duvida`; prioridade `hoje | semana_que_vem | mes_que_vem`; investimento `1000 | 2000 | 3000 | 4000 | 5000_ou_mais`.

Proteções já no front: validação por etapa e por campo, máscara de telefone (BR e internacional com +), campo isca anti-spam, botão bloqueado durante o envio, mesma solicitação não é reenviada na mesma sessão.

## 2. Analytics (GTM / GA4)

O site só empurra eventos para `window.dataLayer`, **sem nome, telefone ou e-mail**. Basta instalar o GTM e criar os gatilhos:

| Evento | Quando |
|---|---|
| `cta_click` | Clique em qualquer "Quero falar sobre meu projeto" ou CTA de serviço (`cta_position`) |
| `form_start` | Primeira interação com o formulário |
| `form_step` | Mudança de etapa (`step`) |
| `form_error` | Erro de validação ou de envio (`field_group`, `error_type`) |
| `generate_lead` | Somente após resposta 2xx do servidor (`service`, `priority`, `budget`, `source`, `medium`, `campaign`) |
| `contact_whatsapp` / `click_email` | Cliques nos contatos |
| `video_play` | Play em um depoimento |

## 3. Publicar vídeos de clientes e bastidores

Em `#resultados`, cada card tem `data-video`, `data-poster`, `data-nome`, `data-cargo`. Preencha o MP4 (H.264, vertical, até ~8 MB) e o poster (WebP 720x1280) e troque a legenda "Cliente 1" pelo nome e segmento **autorizados**. O vídeo só é baixado quando a pessoa clica em play.

## 4. Adicionar prints dos projetos

Em `#projetos`, dentro de cada `.projeto__img`, troque o monograma por:

```html
<img src="/assets/img/projetos/sorojet.webp" width="1200" height="750" alt="Página inicial do site da Sorojet" loading="lazy" decoding="async">
```

e remova `aria-hidden="true"` do `.projeto__img`.

## 5. Logos

Os SVGs em `assets/img/` foram vetorizados a partir do logo oficial contido no Manual NA 2026 (sem remontar com outra fonte). Quando os arquivos mestres da pasta "Logos + IDV" do Drive estiverem disponíveis, substitua mantendo os mesmos nomes de arquivo.

## 6. Testes incluídos (`testes/`)

```bash
npm i playwright-core lighthouse axe-core
node testes/server.mjs --dir . --port 4600      # servidor local com endpoint de teste /api/lead
node testes/teste-form.mjs                         # 96 verificações E2E (desktop, celular, erro, teclado)
node testes/axe.mjs                                # acessibilidade (WCAG 2.2 AA) em vários estados
```

## 7. Movimento e efeitos

| Arquivo | O que faz |
|---|---|
| `assets/js/tinta.js` | Fumaça do Hero: simulação de fluido em WebGL (sem bibliotecas). Plumas sobem do lado direito; o cursor sopra e dispersa a fumaça, que gira e volta a preencher. A fumaça fica no Hero; na cena de abertura ela se expande, se quebra em fiapos e some (`DISPERSAO_FIM` define em que ponto da cena ela termina de sumir). Ajustes rápidos no objeto `CFG` do topo do arquivo: `SUBIDA` (velocidade das plumas), `TURBULENCIA` (quanto se espalha), `DISSIP_DENS` (quanto some), `RAIO_CURSOR`/`FORCA_CURSOR`/`RAJADA` (dispersão do cursor) e `TEMPO` (velocidade geral). |
| `assets/js/fluxo.js` | Fluxo de campanhas interativo (seção `#fluxo`). O mapa ocupa a seção de ponta a ponta; os botões de origem ficam numa fileira abaixo dele e o botão ativo abre um dropdown com as etapas (clicar de novo fecha). Caminhos e textos nos objetos `NOS`, `ARESTAS` e `ROTAS`. No celular, o mapa fica em tamanho legível numa faixa com arrasto lateral, e a rolagem acompanha o ponto (o lead) pelo caminho; enquanto a pessoa arrasta, ela assume o controle. |
| `assets/js/movimento.js` | Hovers (botões, menu, serviços, projetos) e a coreografia de rolagem com GSAP + ScrollTrigger. |
| `assets/js/vendor/` | GSAP 3.15 e ScrollTrigger (licença gratuita da GSAP), carregados na primeira interação (rolar, tocar, mover o mouse) ou após 7 s. Sem eles, o trilho de projetos vira rolagem lateral nativa. |

Proteções de desempenho da tinta: começa depois do carregamento, resolução reduzida, pausa fora da tela ou com a aba oculta, reduz a resolução sozinha se a GPU não acompanhar e **não roda em GPU por software** (SwiftShader/llvmpipe). Por isso ela não aparece no Lighthouse/PageSpeed, que simulam sem placa de vídeo: a nota mede o site sem a tinta. Para vê-la num ambiente assim, abra com `?tinta=forcar`.

Com "reduzir movimento" ativado no sistema, nada disso roda: a tinta vira um quadro parado e a página fica completa.

## 8. Prints dos projetos

Ficam em `assets/img/projetos/<nome>-960.webp` e `-480.webp` (16:9). Para trocar, gere as duas larguras com o mesmo nome.

## 9. Cena do notebook (seção `#origem`)

`assets/js/origem.js` desenha num canvas a sequência de quadros de `assets/video/notebook/` (74 WebP, 1280 px no desktop e 854 px no celular, cerca de 3 MB e 1,6 MB). A seção fica presa por cerca de 3 telas: o notebook abre, a câmera entra na tela, a tela vira caracteres e eles formam "new Arrays" (o H2 real da seção). Os quadros só carregam quando a seção se aproxima. Para trocar o vídeo, gere os quadros com os mesmos nomes (000 a 073) e ajuste `TELA` no topo do arquivo (posição da tela do notebook no último quadro, em pixels do vídeo 1920x1080).

## 10. Rolagem suave

`assets/js/suave.js` usa o Lenis (`assets/js/vendor/lenis.min.js`, 5 KB) para dar aceleração e desaceleração à rodinha do mouse e ao trackpad. No celular o toque continua nativo e, com "reduzir movimento", a rolagem fica sem suavização. Ajuste a sensação em `duration` (tempo da desaceleração) e `wheelMultiplier` (distância por clique). Para rolar por código, use `NA_rolar(y, suave)`.

## 8. Abertura em cena presa (Hero → Pilares)

`assets/js/abertura.js` + bloco "ABERTURA EM CENA PRESA" no fim do `site.css`.

- **Quando roda:** desktop com mouse, tela de pelo menos 1024 × 600, sem movimento reduzido e com o formulário fechado. A decisão é feita por um script inline no `<head>` (classe `html.cena-abertura`) para não haver salto de layout. Sem essas condições, Hero e Pilares ficam um embaixo do outro.
- **Como funciona:** `.abertura` tem 290vh de altura e o `.abertura__palco` fica preso (`position: sticky`). O progresso da rolagem (0 a 1) vira transformações em JS puro, sem GSAP: o Hero sai em camadas, os colchetes se abrem até envolver os pilares, os três títulos viajam até os pilares (FLIP) e os painéis e imagens se revelam. O mapa de tempos está no comentário do topo do arquivo.
- **Completar a cena:** se a pessoa para no meio, a cena completa sozinha na direção em que ela rolava (`CENA.SNAP_ESPERA`, `CENA.SNAP_LIMIAR`). Para testes: `window.NA_cenaSemSnap = true`.
- **Altura da cena:** `.cena-abertura .abertura { height: 290vh }`. Mais alto = transição mais lenta.

### Imagens dos pilares (provisórias)

Na seção `#pilares`, cada `<span class="pilar__midia-item pilar__slot" data-slot="...">` é um espaço reservado (borda tracejada de propósito). Para trocar, substitua o `<span>` por:

```html
<img class="pilar__midia-item" src="assets/img/pilares/reels-1.webp" width="540" height="960" alt="Descrição real da imagem" loading="lazy" decoding="async" style="object-fit: cover">
```

Proporções: Reels 9:16, post 4:5, prints de conversas e de gráfico livres (ficam recortados). O pilar "Criação de sites" já usa os prints reais dos projetos, que se revezam na janela da frente.

## 9. Atalhos fixos: som e WhatsApp

`assets/js/dock.js` + bloco "ATALHOS FIXOS" no `site.css`. A trilha fica em `assets/audio/trilha.mp3` (112 kbps, 2,4 MB) e vem **ligada por padrão**: o site tenta tocar assim que o loader abre (o arquivo só é baixado nesse momento). Como os navegadores costumam bloquear som antes de um gesto, se houver bloqueio a música começa no primeiro clique, toque ou tecla. Quem desliga o som fica com ele desligado nas próximas visitas (`localStorage` `na-som`). Volume e fades no objeto `SOM`. A escolha fica salva no navegador. Eventos: `som_toggle` (`estado`) e `contact_whatsapp` com `cta_position: "dock"`.

Licença da trilha: "Synthwave" (arpmedia, Pixabay). Confirme a licença antes de publicar.

## 10. Quem somos: a foto vira o logo

`assets/js/pixels.js` + bloco "QUEM SOMOS: foto do fundador" no `site.css`. A tela **trava** em Quem somos (cena presa com `position: sticky`) enquanto a foto se pixeliza, os pixels voam até os pontos do logo completo (`logo-full-blue.svg`) e ganham a cor Blue 900; no fim, o SVG real assume e fica na tela até destravar.

- **Desktop** (a partir de 1024 × 600): foto e texto ficam parados juntos. Duração: `.cena-sobre .sobre__cena { height: 320vh }`.
- **Celular e telas baixas:** só a foto fica parada; o texto vem depois. Duração: `.cena-sobre .sobre__trilho { height: calc(var(--foto-h) + 170vh) }`.
- **Fases** (objeto `PX`): foto parada até `FOTO_FIM` (0,20), pixelização até `PIXEL_FIM` (0,30), voo até `VOO_FIM` (0,76), logo entra em `LOGO` (0,72 a 0,82) e fica até o fim. Para a foto ou o logo ficarem mais tempo, aumente a altura da cena ou mexa nessas fases.
- **Foto:** `assets/img/sodre-copo.webp` (495 × 644 px). Para mais nitidez, troque por uma versão de cerca de 1000 × 1300 px com o mesmo nome e a mesma proporção.
- **Movimento reduzido ou sem JS:** sem trava; a foto fica parada e o logo aparece logo abaixo dela.

## 11. Loader

Fica no começo do `<body>` do `index.html` (marcação, SVG do logo e script inline) + bloco "LOADER" no `site.css`. Não depende de nenhum arquivo externo, então aparece na primeira pintura.

- **O que faz (≈3,5 s, em toda visita e também ao atualizar a página):** o logo completo é montado peça por peça. O contorno dos colchetes e do "n" se desenha e depois se preenche, enquanto os colchetes nascem juntos e se afastam (a "alocação" da marca). "new" e "arrays" sobem letra por letra de dentro de uma máscara e "Experiência Digital" entra em seguida. Uma falha cromática rápida chama a atenção. Na saída, as letras recuam, os colchetes se fecham no centro e viram uma linha de luz que cresce até quase a altura da tela. As duas metades do fundo se abrem como `[ ]` e revelam o site, e a entrada do Hero começa nesse instante.
- **Espera:** o HTML e as fontes, com teto de 2,6 s. As imagens não entram nessa espera.
- **Enquanto carrega:** `html.carregando` trava a rolagem (Lenis parado) e pausa as animações de entrada do Hero. O evento `na:pronto` é disparado quando o site é revelado.
- **Segurança:** se algo travar, o loader some sozinho em 6 s.
- **Movimento reduzido ou sem JS:** sem loader.
- **SVG do logo:** o `logo-full` foi separado em peças (colchete esquerdo, n, colchete direito, 3 letras de "new", 6 de "arrays" e 18 de "Experiência Digital"). Se o logo oficial mudar, gere as peças de novo a partir do novo SVG.
- **Tempos:** no script inline, `VEL` multiplica as durações (`intro` 1,3 e `saida` 1,15; maior = mais lento) e `T.pausa` é o tempo com o logo pronto na tela antes da abertura (380 ms).

## 12. Pilares: zoom no hover (desktop com mouse)

O título da seção fica em uma linha no desktop. Ao passar o mouse sobre um pilar, ele cresce até cerca de 62% da largura da grade, sobe um pouco sobre o título e flutua à frente; os outros dois escurecem e recuam. O conteúdo se reorganiza no tamanho maior (não é escala), então imagens e textos ficam nítidos. As margens do zoom são calculadas pelo espaço real da tela, no fim de `assets/js/abertura.js` (objeto `ZOOM`: `LARGURA`, `LARGURA_MAX`, `SUBIR_MAX`, `MARGEM_TELA`). Testado em 1280 × 720, 1366 × 768 e 1440 × 900. Celular e tablet: sem zoom (os pilares já ficam empilhados e grandes).

## 13. Sons de interface (hover e clique)

`assets/js/sfx.js`. Sons curtos no estilo de menu de console, sintetizados com Web Audio (nenhum arquivo extra): **hover** (tic agudo), **clique** (duas notas subindo), **seleção** (chips do fluxo, opções do formulário, perguntas frequentes, botão de som) e **voltar** (fechar o formulário, botão Voltar). O hover só soa com mouse; no celular soam os toques. O botão de som do dock desliga também os efeitos. O áudio só é liberado depois do primeiro gesto da pessoa (regra dos navegadores), a não ser que o navegador já permita som. Ajustes no objeto `SFX`: `VOLUME` (0,16), `ECO`, `ECO_TEMPO` e `HOVER_MIN_MS`. Os timbres ficam no objeto `SONS`.

## 14. Pilar "Criação de sites": vitrine

O pilar mostra uma vitrine de sites reais (lista `.vitrine` no `index.html`). No card normal do desktop aparecem 3 sites empilhados (Silas Ferreira, GHM Finanças e danielsodre.com). Ao ampliar o pilar (hover), o primeiro site cresce em cima e os outros entram numa grade embaixo, com o atalho "Ver todos os projetos". No celular e no tablet, a vitrine já aparece nesse formato ampliado. Cada site abre em nova aba. Para trocar a ordem ou incluir um site, edite os itens `<li class="vitrine__item">` (os 3 primeiros são os do card normal).

## 15. Formulário: e-mail (PHPMailer + Gmail) e planilha (Apps Script)

O formulário envia para `api/lead.php` (configurado em `NA_CONFIG.leadEndpoint`). O PHP valida tudo de novo e depois faz duas coisas: manda o e-mail pelo SMTP do Gmail (PHPMailer, com senha de app) e grava a linha na planilha chamando o Apps Script pelo servidor. Envios repetidos são ignorados pelo ID, e há um limite de 5 envios por IP a cada 10 minutos. As senhas ficam em `na-config.php`, fora do `public_html` (modelo em `api/config.exemplo.php`). A validação do navegador fica em `assets/js/validacao.js` (`window.NA_validar`), e a verificação de domínio (MX) em `api/verificar-email.php`. Passo a passo completo (planilha, implantação, senha de app, HostGator, testes e problemas comuns) em `integracao/INTEGRACAO-FORMULARIO.md`.

## 16. Trabalhos reais: vídeos e posts do Instagram

Arquivos em `assets/midia/`: vídeos MP4 H.264 verticais de 420 × 746, cada um com uma capa `.webp` do mesmo nome, mais as imagens dos carrosséis. Os vídeos são gravações de tela recortadas; o ícone de som do Instagram foi apagado.

**Pilares ("Investir no digital precisa dar retorno.")**

| Pilar | Peças |
|---|---|
| Redes sociais | Reels da Dra. Andréia, carrossel Sorriso em Dobro da Clin Quality e carrossel da Bruna Basilio (3 mil views) |
| Tráfego pago | Print de conversas no WhatsApp, anônimo (nomes, telefones e a marca do cliente borrados), e Reels da Clin Quality que rodou no orgânico + anúncio, em **leque** |

- Cada peça abre o post no Instagram, exceto o print, que fica sem link para manter o cliente anônimo.
- Os vídeos dos pilares são mudos e cortados em 20 s.
- Os carrosséis trocam de imagem a cada 2,6 s.
- No leque do Tráfego, as duas peças ficam sobrepostas e inclinadas e trocam de lugar a cada 3,8 s (`MIDIA.LEQUE_MS` em `midia.js`). Um clique na peça de trás a traz para a frente. A troca automática para com o mouse em cima e no zoom, quando o leque abre e as duas peças ficam lado a lado.
- No zoom (hover), a largura do pilar acompanha a altura, para as peças verticais aparecerem inteiras (`data-zoom-proporcao` no `<article>`).

**Resultados**

- São 4 vídeos com som, em grade de 4 colunas no desktop e trilho deslizante no tablet e no celular: Silas 400 mil views, Clin Quality +100 curtidas, Silas com filmmaker e o perfil da New Arrays.
- Cada vídeo tem selo, legenda e o link "Ver no Instagram".
- O alto-falante liga o som de um vídeo por vez, e o vídeo recomeça do início.
- Enquanto um vídeo tem som, a música do site faz fade e pausa, e volta quando o som é desligado ou o vídeo sai da tela (evento `na:video-som`, ouvido pelo `dock.js`).
- O card "Como o trabalho acontece" continua aguardando material.

**Carregamento** (`assets/js/midia.js`)

- Nada é baixado antes do fim do carregamento.
- Cada vídeo só baixa e toca quando aparece na tela e pausa quando sai.
- Na cena da abertura, os vídeos só tocam depois que os pilares entram.
- Com "reduzir movimento" ou economia de dados, nada toca sozinho: aparece só a capa, e o alto-falante dá o play.

**Para trocar um vídeo:** substitua o `.mp4` e o `.webp` de mesmo nome. Comando usado (o `delogo` apaga o ícone de som da gravação):

```
ffmpeg -i entrada.mp4 -vf "delogo=x=W-51:y=H-50:w=38:h=38,scale=420:746" -c:v libx264 -crf 25 -preset slow -movflags +faststart -c:a aac -b:a 96k saida.mp4
```

Troque W e H pela largura e altura do vídeo original.

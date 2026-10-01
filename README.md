# New Arrays | Experiência Digital

Site institucional e de captação da **New Arrays**, agência de Experiência Digital de Embu das Artes (SP), com atendimento remoto. Os três serviços da agência são gestão de redes sociais, tráfego pago e criação de sites.

O site foi pensado como **ferramenta comercial**. A pessoa entende o que a agência faz em poucos segundos, conversa com a equipe por um formulário de qualificação que abre no próprio topo da página e encontra provas reais do trabalho. Tudo isso numa experiência digital com personalidade própria.

> Stack: HTML, CSS e JavaScript puro, sem build. Publicável em GitHub Pages (branch `main`, pasta raiz) ou em qualquer hospedagem estática.
> Detalhes de manutenção, integração do formulário e ajustes finos: [TECNICO.md](TECNICO.md).

---

## Identidade visual (Manual NA 2026)

| Token | Cor | Uso |
|---|---|---|
| BW 900 | `#0A0A0A` | Fundo principal |
| Blue 900 | `#074049` | Cor de marca: gradiente de fundo, fumaça, cards |
| Blue 500 | `#1098AD` | Ação: botões principais (texto preto sobre ele) |
| Blue 400 | `#40ADBD` | Acentos, colchetes, linhas de conexão |
| Blue 200 / 100 | `#91D0D9` / `#B5DFE6` | Destaques em texto sobre escuro |
| Blue 50 | `#E7F5F7` | Única área clara ("Quem somos") e preenchimento de hover |
| Branco | `#FFFFFF` | Texto principal |

- **Fundo:** gradiente fixo do preto para o azul petróleo, como na capa do Manual.
- **Tipografia:** Inter variável (400 a 900), hospedada no próprio site. Títulos de impacto em caixa alta com peso Black, como o Manual pede.
- **Linguagem gráfica:** os **colchetes `[ ]`** do símbolo da marca aparecem nos serviços, nos botões, no menu, no progresso do formulário e nos projetos.
- **Cantos:** botões em pílula, cards com 16 px e campos com 12 px.
- **Ícones:** Phosphor, traço simples.

---

## Estrutura da página

1. **Hero:** proposta de valor, os 3 serviços e o formulário de qualificação, que abre ali mesmo.
2. **Serviços:** cena fixa em três etapas (Comunicar, Atrair e Converter), com uma linha que conecta os pilares.
3. **Fluxo de campanhas:** mapa interativo do caminho do lead, do anúncio até a reunião.
4. **Resultados reais:** vídeos de clientes e bastidores. A estrutura está pronta; os vídeos ainda vão ser enviados.
5. **Projetos entregues:** carrossel com prints reais e links para os sites.
6. **Origem:** vídeo do notebook controlado pela rolagem, que termina formando "new Arrays".
7. **Quem somos:** origem do nome, fundador, localização e método em 6 etapas.
8. **Perguntas frequentes e chamada final.**
9. **Rodapé** com contatos e dados da empresa.

---

## Funcionalidades

### Formulário de qualificação no Hero
- **Abertura:** o botão "Quero falar sobre meu projeto" se transforma no painel do formulário, com uma transição de interface (View Transition). Não há pop-up nem mudança de página.
- **Quatro etapas:** necessidade (várias opções), prioridade, investimento e contato. Os dados pessoais só são pedidos no fim.
- **Progresso como array:** o andamento aparece como `[ ■ ■ □ □ ]`.
- **Validação:** por etapa e por campo, com máscara de telefone brasileiro ou internacional.
- **Respostas preservadas** ao voltar, fechar e reabrir.
- **Envio:** o botão fica bloqueado durante o envio para evitar duplicados, e há proteção contra spam.
- **Erros:** mensagens claras e o atalho do WhatsApp com as respostas já preenchidas.
- **Sem sucesso falso:** sem o endereço de envio configurado, o formulário mostra um aviso honesto em vez de simular sucesso.
- **Botões dos serviços:** abrem o formulário com o serviço já marcado.
- **Dados enviados:** o envio inclui a origem da visita (UTMs, página de entrada e referrer).
- **Analytics:** os eventos vão para o GTM/GA4 sem nenhum dado pessoal.

### Efeitos e interações
| Onde | O que acontece | Tecnologia |
|---|---|---|
| Hero | Fumaça azul petróleo que sobe devagar; o cursor sopra e dispersa a fumaça; na rolagem ela é sugada para o primeiro ponto da seção de serviços | Simulação de fluido em WebGL, feita do zero |
| Hero | Título, linhas e serviços saem em camadas com profundidade | GSAP + ScrollTrigger |
| Serviços | Cena presa na tela, um serviço por vez, com a linha de conexão acompanhando a rolagem | Motor de cenas por rolagem |
| Fluxo | Escolher a origem do lead acende o caminho no mapa e um ponto percorre o trajeto | SVG + JS |
| Projetos | Trilho horizontal suave; o card do centro cresce e ganha cor, e os das pontas ficam em preto e branco | GSAP |
| Origem | O notebook abre com a rolagem, a tela vira caracteres `[ ] { } 0 1` e eles formam "new Arrays" | Canvas 2D + 74 quadros WebP |
| Quem somos | `new Arrays()` é digitado | GSAP |
| Final | O título se preenche de branco com a rolagem | GSAP |
| Página toda | Rolagem suave com aceleração e desaceleração | Lenis |

### Hovers diferentes por contexto
- **Menu:** o texto "decodifica" com símbolos de código e ganha colchetes.
- **Botão principal:** é magnético, ganha colchetes e a seta gira.
- **Botões com fundo:** o preenchimento nasce do ponto por onde o cursor entrou.
- **Botões com contorno:** as letras rolam uma a uma.
- **Serviços do Hero:** um par de colchetes desliza até o item selecionado.
- **Cards de serviço:** uma luz de tinta segue o cursor.
- **Projetos:** o card inteiro é clicável, com uma etiqueta "Visitar site" que segue o cursor.
- **Perguntas frequentes:** uma linha atravessa a pergunta e a abertura é suave.
- **Rodapé:** o sublinhado entra pela esquerda e sai pela direita.

---

## Decisões de UX

- **Serviços antes da história:** o briefing pede que o visitante entenda *o que* a agência faz antes de *quem* ela é. Por isso "Quem somos" vem depois da prova social.
- **Conversão sem sair do contexto:** o formulário abre no Hero, sem modal nem redirecionamento, e começa pelas perguntas de negócio, deixando os dados pessoais para o fim. Isso reduz o atrito e já qualifica o lead.
- **Uma intenção, um rótulo:** todos os botões de contato dizem "Quero falar sobre meu projeto". Os botões dos serviços usam verbos específicos ("Planejar minhas campanhas", "Organizar meu conteúdo").
- **Honestidade:** nenhum número, depoimento ou métrica foi inventado. Onde falta material real há espaços identificados, e o formulário nunca finge que enviou.
- **O fluxo de campanhas como ponte:** fica entre os serviços e as provas. Os serviços explicam o que a agência faz, e o fluxo mostra como isso vira reunião.
- **Movimento com propósito:** cada animação conta algo. A fumaça que vira ponto conduz aos serviços, o notebook que vira "new Arrays" conta a origem do nome e o carrossel com foco mostra um projeto por vez.
- **Nada bloqueia a navegação:** o conteúdo existe no HTML sem depender de animação, e as cenas presas podem ser atravessadas normalmente.

## Decisões de UI

- **Tema escuro único**, com uma só área clara ("Quem somos"), como o Manual pede: "visual dark com áreas claras pontuais".
- **Os colchetes da marca como sistema:** substituem ícones genéricos e dão identidade a botões, menu, seleção e progresso.
- **Um acento só:** o azul petróleo, em escala do Blue 900 ao Blue 50, sem cores paralelas.
- **Composição assimétrica:** as seções variam de estrutura (grade dividida, cena presa, mapa, trilho horizontal, tela cheia) para não virar template.
- **Prints reais dos projetos**, sem imagens geradas por IA, como o briefing exige. O vídeo do notebook foi usado só como cena de marca, sem pessoas fingindo ser clientes.

---

## Desempenho e acessibilidade

- **Lighthouse (celular):** Desempenho 97 a 99; Acessibilidade, Boas práticas e SEO em 100. No computador, 100 nas quatro categorias.
- **Carregamento em etapas:** a fumaça só começa depois do carregamento e a GSAP só na primeira interação. O fluxo e a cena do notebook carregam só quando a pessoa se aproxima deles.
- **Proteção da fumaça:** ela pausa fora da tela e reduz a própria resolução se o aparelho não acompanhar. Em computadores sem placa de vídeo, ela é desativada.
- **Acessibilidade:** WCAG 2.2 AA verificado com axe, navegação completa por teclado, foco visível, rótulos e erros associados aos campos e alvos de toque de 44 px.
- **Movimento reduzido:** respeitado em todo o site. Nada anima e todo o conteúdo continua visível.
- **SEO:** HTML semântico, dados estruturados verdadeiros (Organization e ProfessionalService), Open Graph, sitemap, robots.txt e página 404.
- **Testes incluídos:** 96 verificações de ponta a ponta do formulário em `testes/`.

---

## Pendências antes de publicar

- [ ] Configurar `leadEndpoint` (webhook, CRM ou API) e o GTM/GA4.
- [ ] Vídeos e depoimentos reais dos clientes, com autorização.
- [ ] Revisão dos textos das etapas do fluxo de campanhas pelo Sodré.
- [ ] Revisão jurídica da política de privacidade.
- [ ] Logos oficiais em SVG da pasta "Logos + IDV" (hoje são vetores extraídos do Manual).

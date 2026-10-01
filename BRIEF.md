# BRIEF · New Arrays (Home)

Fonte: briefing do Alexandre (chat), "Briefing estratégico e técnico do site da New Arrays.docx" e "Manual NA 2026.pdf".
A entrevista da skill foi respondida pelos próprios documentos; decisões em aberto foram perguntadas no chat.

## Respostas da entrevista
1. **Vibe:** experiência digital premium, tecnológica e sóbria. Marca tipográfica, intensa e controlada (Manual p.3). Nada de gamer, neon ou futurismo vazio.
2. **Jornada:** entender o que a agência faz (5 s) > ver os 3 serviços > abrir a conversa (formulário no Hero) > confiar (prova real) > conhecer quem faz > converter.
3. **Emoção desejada:** clareza e confiança ("eles sabem o que estão fazendo e mostram de verdade").
4. **Pico:** a conexão entre os três pilares (Redes comunicam > Tráfego atrai > Site converte). É a tese da marca: "Experiência digital que conecta e converte".
5. **Assets reais:** logo oficial (extraído do Manual e vetorizado), paleta e tipografia do Manual, nomes e links reais de projetos (briefing, seção 8), contatos do site atual. Sem fotos nem vídeos por enquanto: estrutura preparada com placeholders identificados.
6. **Ação única:** "Quero falar sobre meu projeto" (abre o formulário de qualificação no Hero).
7. **Restrições:** Lighthouse alto, Core Web Vitals, SEO, WCAG 2.2 AA, sem números/depoimentos inventados, sem imagens de IA.

## Decisões do chat (28/09/2026)
- Stack: HTML/CSS/JS puro, sem build.
- Escopo: Home completa + páginas técnicas (404, política de privacidade, sitemap, robots).
- Envio de leads: endpoint configurável (`NA_CONFIG.leadEndpoint`). Sem endpoint, o formulário mostra erro real.
- Contatos: WhatsApp +55 11 99557-2722, contato@newarrays.com, @newarrays.

## Jornada em cenas
| Cena | Vê | Sente | Passa a acreditar | Energia | Efeito |
|---|---|---|---|---|---|
| 1 Hero | Headline + os 3 serviços dentro de colchetes | Clareza imediata | "Eles fazem redes, tráfego e sites" | Alta, nítida | Colchetes se abrem no load (assinatura) |
| 2 Serviços (PICO) | Linha que conecta os 3 pilares enquanto cada serviço entra | Entendimento | "Os três trabalham juntos pelo meu negócio" | Crescente, a mais longa | Cena fixa com etapas (4 telas) |
| 3 Resultados reais | Vídeos de clientes e bastidores | Confiança | "É gente de verdade" | Calma | Revelações |
| 4 Projetos | Trilho de sites entregues com links reais | Prova | "Já fizeram para empresas como a minha" | Média | Trilho horizontal fixo |
| 5 Quem somos | Origem do nome, fundador, método | Proximidade | "Primeiro diagnosticam, depois executam" | Calma (fundo claro) | Fundo que viaja (única troca de tema) |
| 6 Perguntas + CTA final | Objeções respondidas e um único convite | Decisão | "Vale a conversa" | Alta | Tipografia grande, CTA reabre o Hero |

**Movimento-assinatura:** "alocação". Em programação, `new Array()` reserva espaço para uma estrutura existir. No site, os colchetes da marca se abrem para reservar espaço: no load eles se afastam e enquadram os serviços; ao clicar no CTA, o botão se expande (View Transition) e vira o painel do formulário, enquadrado pelos mesmos colchetes. O progresso do formulário é um array `[ ■ ■ □ □ ]`.

## Tokens (Manual NA 2026)
- Cores: BW 900 #0A0A0A (fundo), BW 500 #181818 / BW 700 #111111 (superfícies), Blue 900 #074049 (marca), Blue 500 #1098AD (ação, texto BW 900 sobre ele), Blue 400 #40ADBD (acento em texto sobre escuro), Blue 50 #E7F5F7 (respiro claro), Branco.
- Tipografia: Inter variável 400 a 900, self-hosted, font-display swap, fallback Arial.
- Escala: Display 72/76 Black, H1 48/52 ExtraBold, H2 32/38 Bold, H3 22/28 SemiBold, Body 16/24, Label 12/16 SemiBold.
- Grade 8 px; separação entre blocos 48 a 96 px (mais no desktop).
- Cantos: botões em pílula; painéis e cards 16 px; campos 12 px.
- Ícones: Phosphor regular (linha simples).

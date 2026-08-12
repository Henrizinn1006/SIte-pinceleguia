# 10 — Decisões Pendentes

Nada nesta lista foi inventado nem assumido silenciosamente. Cada item bloqueia ou condiciona alguma parte do desenvolvimento.

## 🔴 Bloqueiam a Fase 4 (checkout e pagamento)

| # | Decisão | Quem decide | Por quê |
|---|---|---|---|
| 1 | **Conta Mercado Pago do cliente** — CNPJ ou CPF, credenciais de sandbox e de produção | Cliente | Sem isso não há como integrar nem testar pagamento |
| 2 | **Meios de pagamento aceitos** — PIX apenas, ou PIX + cartão? Parcelamento em quantas vezes? Com ou sem juros? | Cliente | Muda o checkout e o cálculo do total |
| 3 | **CEP e endereço de origem do envio** | Cliente | Necessário para cotar frete |
| 4 | **Estratégia de frete inicial** — taxa fixa, tabela por região ou Melhor Envio desde o início | Você + Cliente | Define qual adapter entra na Fase 4 |
| 5 | **Frete grátis** — existe? A partir de qual valor? | Cliente | Regra de cálculo |
| 6 | **Peso e dimensões médias das peças** | Cliente | Sem isso não há cotação real de frete |
| 7 | **Prazo de produção** — peças são feitas sob encomenda ou saem do estoque? | Cliente | Muda a comunicação de prazo e a semântica de "estoque" |

## 🟠 Bloqueiam a Fase 7 (go-live)

| # | Decisão | Quem decide |
|---|---|---|
| 8 | **Domínio definitivo** e quem faz o registro | Você + Cliente |
| 9 | **Dados oficiais da loja** — razão social, CNPJ/CPF, endereço, telefone, e-mail de contato | Cliente |
| 10 | **Textos jurídicos** — política de privacidade, termos de uso, trocas e devoluções, política de entrega | Cliente (idealmente com apoio jurídico) |
| 11 | **Redes sociais oficiais** — Instagram, WhatsApp | Cliente |
| 12 | **Fotografias definitivas** dos produtos, em alta resolução | Cliente |
| 13 | **Catálogo real** — nomes, descrições, preços e estoque | Cliente |
| 14 | **Política de trocas** — prazo e condições (peça artesanal tem particularidades) | Cliente |
| 15 | **E-mail transacional** — qual endereço remetente e quem controla o DNS do domínio | Cliente |

> ⚠️ Enquanto os itens 9 a 14 não chegarem, o sistema usará **dados de demonstração explicitamente identificados** como tal. Nenhum CNPJ, telefone, prazo ou texto jurídico será inventado.

## 🟡 Decisões de produto (podem esperar, mas mudam escopo)

| # | Decisão | Recomendação |
|---|---|---|
| 16 | **Checkout como visitante** | **Sim.** Reduz abandono; oferecer criação de conta ao final |
| 17 | **Login social (Google)** | Opcional. Baixo custo de implementação, ganho moderado |
| 18 | **Variações de produto** — as peças têm tamanho/modelo diferentes? | O banco já suporta; saber se o admin precisa expor isso na Fase 5 |
| 19 | **Boleto** | Recomendo **não** na v1 — prazo de compensação complica a reserva de estoque |
| 20 | **Cupons no lançamento** | Estrutura fica pronta na Fase 4; usar quando o cliente quiser |
| 21 | **Blog / conteúdo editorial** | Bom para SEO no segmento, mas fica no pós-lançamento |
| 22 | **Idioma/moeda adicional** | Assumindo **apenas pt-BR e BRL** — confirmar |
| 23 | **Nota fiscal** | Emissão manual pelo cliente ou integração com emissor? Fora do escopo atual |
| 24 | **Analytics** | GA4? Pixel do Meta? Impacta o banner de cookies e a LGPD |

## 🔵 Decisões técnicas que dependem de você (VORTEXIS)

| # | Decisão | Recomendação |
|---|---|---|
| 25 | **Prisma vs. Drizzle** | Prisma, salvo se a VORTEXIS já tiver padrão interno |
| 26 | **Vercel vs. VPS** | Vercel para começar; a arquitetura roda nas duas |
| 27 | **Plano Vercel Pro** — obrigatório para uso comercial (US$ 20/mês) | Quem assume: você ou o cliente? |
| 28 | **Repositório** — onde fica e quem tem acesso | GitHub privado |
| 29 | **Este código vira template da VORTEXIS?** | Se sim, vale isolar ainda mais os módulos desde a Fase 1 e manter nomes de domínio genéricos |
| 30 | **Manutenção pós-entrega** — há contrato de suporte? | Define quem responde a incidente e quem paga a infraestrutura |

## Como usar este documento

Responda pelo menos os itens **🔴 1 a 7** antes da Fase 4 e os **🔵 25 a 30** antes da Fase 1. O resto pode ser respondido em paralelo ao desenvolvimento, desde que chegue antes da Fase 7.

Conforme as respostas chegarem, este arquivo é atualizado e a decisão migra para o documento correspondente.

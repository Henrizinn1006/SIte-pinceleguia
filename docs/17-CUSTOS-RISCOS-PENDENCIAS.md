# 17 — Custos adicionais, riscos e decisões pendentes

---

## 1. Custos

### 1.1 O que a expansão NÃO acrescenta

Boa notícia primeiro, porque é contraintuitiva:

| Item | Antes | Depois | Por quê |
|---|---|---|---|
| Vercel Pro | US$ 20/mês | **US$ 20/mês** | Cobrança por assento, não por projeto. Dois projetos, mesma conta |
| Neon | US$ 0–19/mês | **igual** | Mesmo banco, ~34 tabelas em vez de 23 |
| Cloudflare R2 | US$ 0 | **US$ 0** | 10 GB grátis; catálogo artesanal não chega perto |
| Resend | US$ 0 | **US$ 0** | 3.000 e-mails/mês grátis |
| Domínio | ~R$ 40/ano | **igual** | Subdomínio não custa nada |

**Infraestrutura continua em ~US$ 20/mês.** A arquitetura de monorepo com dois
deploys foi escolhida, entre outras razões, justamente por não mudar isso.

### 1.2 O que pode acrescentar

| Item | Quando dispara | Custo |
|---|---|---|
| Vercel Image Optimization | Acima de 5.000 imagens originais/mês | Incluído até lá; depois, cota extra |
| Cloudflare Images (alternativa) | Se a cota da Vercel apertar | US$ 5/mês por 100 mil imagens |
| Upstash Redis | Rate limiting fora do free tier | US$ 0 → ~US$ 10/mês |
| Neon Scale | Se precisar de branch por PR e PITR maior | US$ 19 → US$ 69/mês |
| Sentry | Acima do free tier | US$ 0 → US$ 26/mês |

Nenhum dispara no cenário previsto para o primeiro ano.

### 1.3 O custo que importa: tempo

Este é o número honesto, e é o que muda de verdade.

| | Dias úteis |
|---|---|
| Planejado antes (FASES 1–7) | 32–42 |
| **Já concluído** (fundação + catálogo) | **~10** |
| Restante do plano antigo | 22–32 |
| **Acrescentado pelo CMS + Admin PWA** | **+38–48** |
| **Novo total restante** | **60–80** |

O painel administrativo **mais que dobra o escopo**. Isso não é
sobredimensionamento: um CMS com Section Builder, biblioteca de mídia,
versionamento e PWA é, sozinho, um produto maior que a loja.

Vale dizer com todas as letras porque afeta prazo e orçamento com o cliente:
**~13 a 17 semanas de desenvolvimento**, contra as 7–9 estimadas antes.

---

## 2. Riscos técnicos

Ordenados por probabilidade × dano.

### 🔴 R1 — Service worker servindo versão velha durante operação crítica

**Cenário:** ela abre o painel salvo na tela de início, o service worker serve
o bundle de duas semanas atrás, e o formulário envia dados num formato que o
servidor já não aceita. Ou pior: mostra estoque em cache e ela decide com base
nele.

**Por que é o risco número um:** é a falha mais comum de PWA e a mais difícil
de diagnosticar — funciona no navegador do desenvolvedor e falha no celular
dela.

**Mitigação:** nenhum dado passa pelo cache (NetworkOnly em tudo que não é
asset estático). Header de versão em toda resposta; divergência força
atualização com aviso. Atualização normal é sempre voluntária, nunca
`skipWaiting` automático.

### 🔴 R2 — Section Builder virando construtor livre

**Cenário:** "seria bom se ela pudesse mudar a cor de fundo dessa seção". Seis
meses depois, a home tem seis fontes, quatro tons de dourado e um botão roxo.

**Por que é grave:** destrói o valor que a VORTEXIS entrega, e é irreversível
sem retrabalho. Além disso, cada campo novo é permanente — tirar depois quebra
conteúdo publicado.

**Mitigação:** catálogo fechado de tipos, `config` validado por Zod (campo não
previsto é rejeitado), zero CSS/HTML livre. O teste do §1 de
[14-CMS-SECTION-BUILDER](14-CMS-SECTION-BUILDER.md) aplicado a todo pedido novo.

### 🟠 R3 — JSONB virando depósito sem forma

**Cenário:** o `config` das seções vai acumulando campo, ninguém migra o que
já existe, e depois de um ano há cinco formatos diferentes convivendo.

**Mitigação:** `configVersion` em cada seção, schema Zod versionado, e migração
explícita ao ler configuração antiga. Regra dura: **id de entidade nunca vai
para o JSONB** — vira `section_item` com FK.

### 🟠 R4 — Revalidação cross-app falhando em silêncio

**Cenário:** ela publica, vê "sucesso", abre a loja e nada mudou. Conclui que o
sistema está quebrado.

**Mitigação:** a resposta do endpoint é verificada e o resultado aparece na
interface — "Publicado ✓" ou "Publicado, cache pendente" com botão de reenviar.
TTL curto garante que o conteúdo apareça sozinho em no máximo 60s mesmo com a
chamada falhando.

### 🟠 R5 — Migração de `categoryId` para N:N

**Cenário:** a migração roda com o storefront no ar e alguma consulta ainda
espera `products.categoryId`.

**Mitigação:** migração em duas etapas — primeiro cria `product_categories` e
popula, mantendo a coluna antiga; depois de todo o código migrado e testado,
uma segunda migration remove a coluna. Nunca as duas coisas no mesmo deploy.
Isso vale para toda remoção de coluna daqui em diante.

### 🟡 R6 — Monorepo com dependência circular entre pacotes

**Cenário:** `commerce` precisa de algo do `cms`, alguém importa, e o grafo
vira ciclo. Build fica lento e imprevisível.

**Mitigação:** direção de dependência verificada no CI (§6 de
[16-VORTEXIS-CORE](16-VORTEXIS-CORE.md)). Se `commerce` parecer precisar do
`cms`, o desenho está errado — o app é quem combina os dois.

### 🟡 R7 — Upload de foto de celular travando no 4G

**Cenário:** foto de 12MP, 5 MB, 4G ruim de ateliê. Cadastro de 8 produtos vira
meia hora de espera.

**Mitigação:** compressão no navegador antes do upload (2000px, WebP q82,
~400 KB). Upload direto para o R2, sem passar pelo nosso servidor. Indicador de
progresso por foto, e envio em paralelo.

### 🟡 R8 — Publicação de conteúdo quebrado

**Cenário:** ela publica uma seção de coleção vazia, ou apaga a categoria que
o menu aponta. A home fica com um buraco.

**Mitigação:** validação antes de publicar (seção sem conteúdo obrigatório
bloqueia); renderizador ignora seção inválida em vez de derrubar a página;
categoria referenciada por menu não pode ser excluída, só desativada; rollback
em um clique.

### 🟡 R9 — Escopo do EDITOR mal calibrado

**Cenário:** o papel EDITOR é criado, ninguém usa, e a complexidade de RBAC
fica no projeto sem retorno.

**Mitigação:** a estrutura de permissões é barata (quatro tabelas e um guard).
O risco real não é o custo — é assumir que existe uma equipe quando talvez seja
só a proprietária. Ver decisão pendente D2.

---

## 3. Decisões pendentes

### 🔵 Suas (VORTEXIS)

| # | Decisão | Recomendação |
|---|---|---|
| **D1** | Monorepo agora ou depois? | **Agora.** Migrar com dois apps prontos custa muito mais |
| **D2** | EDITOR na v1 ou só ADMIN? | Construir o RBAC; criar só o ADMIN. EDITOR nasce quando existir alguém |
| **D3** | `admin.pinceleguia.com.br` ou `/admin`? | **Subdomínio.** É o que isola o service worker e a sessão |
| **D4** | Vercel Image ou Cloudflare Images? | Vercel agora; migrar se a cota apertar |
| **D5** | 2FA na v1? | Preparar o schema; ativar quando houver segundo usuário |
| **D6** | Preview compartilhável com terceiros? | Não na v1 — exige sessão. Se o cliente pedir, muda o desenho do token |
| **D7** | Vender antes ou publicar antes? | Ver §4 — é a decisão de ordem mais importante |
| **D8** | Contrato de manutenção pós-entrega? | Um CMS gera dúvida de uso. Vale prever suporte |

### 🟠 Do cliente

| # | Decisão |
|---|---|
| **D9** | Quantas pessoas vão usar o painel? Só a proprietária? |
| **D10** | Categorias iniciais reais (as atuais no seed são demonstração) |
| **D11** | Já existe parceria fechada, ou o módulo é preparação? |
| **D12** | Ela quer reorganizar a home sozinha, ou prefere pedir? Isso calibra quanto investir no Section Builder |
| **D13** | Retenção de auditoria — há exigência contábil? (perguntar ao contador) |

Continuam pendentes as decisões de [10-DECISOES-PENDENTES](10-DECISOES-PENDENTES.md):
conta Mercado Pago, CEP de origem, peso das peças, textos jurídicos, domínio,
fotos reais.

---

## 4. A decisão de ordem — D7

Duas sequências defensáveis, e a escolha é de negócio, não técnica.

**Opção A — vender primeiro**
```
monorepo → auth → mídia → catálogo admin → carrinho → checkout
→ admin de pedidos → CMS → Section Builder → storefront dinâmico
```
A loja começa a faturar por volta da semana 9. O Section Builder chega no fim.
Até lá, a home tem composição fixa e a proprietária já cadastra produtos.

**Opção B — autonomia primeiro**
```
monorepo → auth → mídia → catálogo admin → CMS → Section Builder
→ storefront dinâmico → carrinho → checkout → admin de pedidos
```
Autonomia editorial completa por volta da semana 10, mas a primeira venda só
acontece perto da semana 15.

**Recomendação: Opção A.** O requisito 40 descreve autonomia editorial como
resultado final, não como pré-condição. Uma loja que vende com home fixa é
melhor negócio do que uma home totalmente editável sem checkout. E o dinheiro
que entra financia o resto.

O roadmap em [09-ROADMAP](09-ROADMAP.md) assume a Opção A. Se preferir a B, a
troca é reordenar as fases — nenhum trabalho é perdido.

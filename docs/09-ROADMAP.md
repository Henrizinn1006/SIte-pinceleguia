# 09 — Roadmap v2

Reescrito após a expansão para CMS + Admin PWA. Assume a **Opção A** (vender
antes de dar autonomia editorial completa) — ver
[17-CUSTOS-RISCOS](17-CUSTOS-RISCOS-PENDENCIAS.md) §4.

Estimativas em dias úteis, um desenvolvedor. Ordens de grandeza, não
compromisso contratual.

---

## Concluído

### FASE 0 — Planejamento ✅
Requisitos, stack, arquitetura, modelo de dados, fluxos, decisões pendentes.

### FASE 1 — Fundação ✅
Next.js + TypeScript `strict` + Tailwind com tokens · Prisma com schema de 23
tabelas · validação de ambiente com Zod · erros de domínio tipados · ESLint,
Prettier, Vitest · deploy na Vercel.

### FASE 2 — Catálogo público ✅
Home, `/loja` com filtros e paginação, página de produto com galeria e JSON-LD,
categoria, busca, institucionais, sitemap, robots, header responsivo · 23 testes
unitários · build limpo · 111 kB de JS na home.

> Duas lições incorporadas como padrão obrigatório: **fronteira client/server
> explícita** (`env.client`, `catalog/client`) e **`server-only` em tudo que
> toca banco ou segredo**. As duas falhas custaram horas de depuração.

---

## FASE 3 — Monorepo e pacotes (4–5 dias) ← PRÓXIMA

Reestruturação. Nenhuma funcionalidade nova, e é justamente por isso que precisa
vir agora: quanto mais código existir, mais cara fica.

- pnpm workspaces + Turborepo
- Mover a loja atual para `apps/storefront`
- Extrair `packages/db`, `packages/commerce`, `packages/ui`, `packages/config`
- Criar `apps/admin` vazio, com deploy próprio
- Configurar os dois projetos na Vercel + subdomínio `admin.`
- Checagens de fronteira no CI (nome específico, import invertido, HEX em `ui`)
- Migração em duas etapas: `product_categories` criada e populada, coluna antiga
  ainda existindo

**Entregável:** dois apps rodando, loja idêntica ao que já está no ar, pacotes
com fronteira verificada automaticamente.

---

## FASE 4 — Autenticação, RBAC e casca do Admin (6–7 dias)

- Better Auth com sessão de 8h no subdomínio do admin
- Tabelas `roles`, `permissions`, `role_permissions`, `user_roles` + seed
- `requirePermission()` e o padrão obrigatório de toda action administrativa
- Convite por token; **nenhuma rota pública de cadastro**
- Casca do painel: navegação desktop (sidebar) e mobile (barra inferior)
- PWA: manifest, ícones, service worker conservador, atualização voluntária
- Auditoria funcionando desde o primeiro dia — inclusive de tentativa negada
- Rate limiting, CSP restritiva, `noindex` no subdomínio

**Entregável:** ela instala o painel no celular, entra, e vê uma casca vazia
mas segura.

---

## FASE 5 — Biblioteca de mídia (4–5 dias)

Fundação do CMS: tudo depois disso referencia imagem.

- `StorageProvider` com adapter Cloudflare R2
- Upload por URL pré-assinada, direto do navegador para o R2
- **Compressão no cliente** antes do envio (2000px, WebP)
- Validação: extensão, MIME, **magic bytes**, tamanho, dimensões
- Biblioteca: grade, busca, seleção múltipla
- Texto alternativo editável — acessibilidade é conteúdo
- "Onde esta imagem é usada" antes de permitir exclusão

**Entregável:** ela fotografa uma peça no celular e a imagem entra na
biblioteca em segundos.

---

## FASE 6 — Catálogo administrável (9–11 dias)

O maior módulo. É o que tira o cadastro de produtos das nossas mãos.

- Produtos: criar, editar, duplicar, ativar, arquivar, destacar
- Formulário mobile-first — **foto primeiro**, resto recolhido em "Mais opções"
- Múltiplas imagens com reordenação
- Variações com SKU, preço e estoque próprios
- Categorias com hierarquia (`path` materializado), reordenação, imagem, SEO
- Vínculo N:N produto ↔ categoria, com primária definindo canônica
- Coleções, com curadoria de ordem e janela de exibição
- Parceiros, com página pública opcional
- Tags
- Segunda etapa da migração: remoção de `products.categoryId`

**Entregável:** ela cadastra a linha inteira de produtos reais pelo celular.

---

## FASE 7 — Carrinho e contas (4–5 dias)

- Carrinho persistente em servidor, visitante e logado, com merge no login
- Drawer no desktop, página no mobile
- Cadastro, login, verificação de e-mail, recuperação de senha
- "Minha conta": dados, endereços, pedidos

**Entregável:** o cliente monta um carrinho e tem conta.

---

## FASE 8 — Checkout e pagamento (8–10 dias) ← fase mais crítica

- `ShippingProvider` + `FlatRateProvider` + consulta de CEP
- `calculateTotals` como função pura, com testes desde o primeiro commit
- Cupons
- Checkout em etapas, com opção de visitante
- `createOrder` transacional, com baixa atômica de estoque e reserva
- `PaymentGateway` + adapter Mercado Pago (PIX e cartão)
- Webhook com assinatura verificada, idempotência e consulta ao gateway
- Job de liberação de reserva expirada e reconciliação
- E-mails transacionais
- Acompanhamento por token para visitante

**Entregável:** a loja vende de verdade. Validar em sandbox e depois com uma
compra real de valor baixo.

---

## FASE 9 — Operação no painel (7–8 dias)

- Pedidos: lista com filtros, detalhe, máquina de estados, rastreio, notas
- **Pagamento manual claramente distinguido de confirmado pelo gateway**
- Estoque: visão consolidada, ajuste com justificativa, histórico de movimentação
- Cupons: CRUD
- Clientes: consulta e histórico, com dados pessoais protegidos
- Configurações: marca, contato, redes, frete, SEO padrão
- Integrações: mostrar estado, **nunca o segredo**

**Entregável:** ela opera a loja inteira sozinha.

---

## FASE 10 — CMS: páginas, menu e banners (6–7 dias)

- Páginas com editor rico Tiptap → **JSON estruturado, nunca HTML**
- Renderização por árvore de nós, sem `dangerouslySetInnerHTML`
- Menu Manager com alvos tipados e validação de URL externa
- Banners com janela de exibição
- Revisões com rascunho e publicação
- Endpoint de revalidação cross-app + retorno visível de sucesso ou falha

**Entregável:** ela edita textos institucionais e o menu sem pedir nada.

---

## FASE 11 — Section Builder (8–10 dias)

O módulo que entrega o requisito 40.

- Registro de tipos de seção com schema, editor e renderizador
- Os 13 tipos iniciais
- Editor com drag-and-drop (`dnd-kit`) **e** botões ↑ ↓ acessíveis
- Conteúdo automático (por regra) e curadoria (por `section_items`)
- Fluxo rascunho → preview → publicação, transacional
- Preview protegido, com banner fixo e `noindex`
- Rollback pelas últimas 10 revisões
- Autosave de rascunho, com "Salvo" nitidamente diferente de "Publicado"

**Entregável:** o cenário do requisito 40, ponta a ponta.

---

## FASE 12 — Storefront dinâmico (4–5 dias)

- Home renderizada a partir da revisão publicada
- `SectionRenderer` com fallback silencioso para tipo desconhecido
- Menu, rodapé e categorias vindo do banco — fim do último hardcode
- Páginas de coleção e de parceiro
- Consulta única com `include` aninhado, sem N+1
- Tags de cache por entidade

**Entregável:** publicar no painel muda o site em segundos.

---

## FASE 13 — Dashboard e auditoria (3–4 dias)

- Métricas reais: faturamento, pedidos por status, estoque baixo, mais vendidos
- Atalhos: novo produto, nova categoria, nova coleção, nova seção, novo parceiro
- Consulta de auditoria com filtro por usuário, entidade e período

**Entregável:** ela abre o painel e entende a loja em cinco segundos.

---

## FASE 14 — Testes e blindagem (6–7 dias)

Unitários nas regras críticas:
- `calculateTotals` — cupom, frete, frete grátis, teto de desconto
- Validação de cupom — expirado, mínimo, limite, por cliente
- Máquina de estados do pedido — transição inválida precisa falhar
- **Estoque concorrente — duas compras simultâneas da última peça**
- Autorização — EDITOR não publica; cliente A não vê pedido de B
- Hierarquia de categoria — mover subárvore mantém `path` correto
- Schema de seção — config inválido é rejeitado

Integração:
- `createOrder` completo com rollback
- Webhook: aprovado, rejeitado, **duplicado**, assinatura inválida
- Publicação: transação, revalidação, rollback

E2E (Playwright): compra completa · cadastro de produto pelo celular ·
publicação de seção.

Mais: Lighthouse nos dois apps, auditoria de acessibilidade, `npm audit`,
headers, teste real de restauração de backup, revisão dos limites de upload.

---

## FASE 15 — Conteúdo real e go-live (3–4 dias)

- Produtos, fotos e preços reais
- Textos jurídicos do cliente
- Domínio, HTTPS, SPF/DKIM/DMARC
- Credenciais de produção e compra real de teste
- Search Console
- **Treinamento da proprietária no painel** + manual em vídeo curto
- Instalação do PWA no celular dela, feita junto

**Entregável:** loja no ar, vendendo, administrada por ela.

---

## Estimativa

| Fase | Dias |
|---|---|
| 3 — Monorepo | 4–5 |
| 4 — Auth, RBAC, casca do admin | 6–7 |
| 5 — Mídia | 4–5 |
| 6 — Catálogo administrável | 9–11 |
| 7 — Carrinho e contas | 4–5 |
| 8 — Checkout e pagamento | 8–10 |
| 9 — Operação no painel | 7–8 |
| 10 — CMS: páginas, menu, banners | 6–7 |
| 11 — Section Builder | 8–10 |
| 12 — Storefront dinâmico | 4–5 |
| 13 — Dashboard e auditoria | 3–4 |
| 14 — Testes | 6–7 |
| 15 — Go-live | 3–4 |
| **Total restante** | **72–88 dias úteis** |

**~15 a 18 semanas.** Contra as 7–9 estimadas antes da expansão.

Não inclui: resposta do cliente às decisões pendentes, produção das
fotografias, redação dos textos jurídicos e rodadas de ajuste visual.

### Marcos

| Marco | Aproximadamente |
|---|---|
| Painel instalável, ela entra | fim da semana 4 |
| Ela cadastra produtos reais sozinha | fim da semana 7 |
| **A loja vende** | fim da semana 11 |
| Ela opera pedidos e estoque | fim da semana 13 |
| **Ela reorganiza a home sozinha** | fim da semana 17 |

---

## Pós-lançamento (backlog)

Melhor Envio com etiqueta e rastreio · 2FA · segundo usuário e papel EDITOR ·
avaliações de produto · lista de desejos · recuperação de carrinho abandonado ·
frete na página do produto · relatórios de venda · Instagram Shopping · pixel
de Meta/Google · A/B de seções · agendamento de publicação · extração dos
pacotes para o Cliente B.

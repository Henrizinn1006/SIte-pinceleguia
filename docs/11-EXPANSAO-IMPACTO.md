# 11 — Expansão CMS + Admin PWA: impacto e arquitetura v2

Este documento revisa o planejamento das FASES 0–2 diante do novo requisito:
um painel administrativo completo, instalável como PWA, que permita à
proprietária operar catálogo, conteúdo e vendas sem pedir código.

---

## 1. O que muda de verdade

A pergunta certa não é "quanto código a mais". É: **qual decisão anterior deixa
de ser correta quando existe um segundo aplicativo com outro perfil de risco,
outro ciclo de vida e outro público?**

Cinco decisões mudam. As demais permanecem.

### 1.1 Repositório: de aplicação única para monorepo com pacotes ⚠️ MUDANÇA

**O que estava decidido:** um único app Next.js, com `/admin` como grupo de
rotas dentro do mesmo projeto ([docs/01-STACK](01-STACK.md), Decisão 1).

**Por que muda.** Três motivos, em ordem de peso:

**a) Service worker tem escopo de origem.** Um PWA instalado em
`pinceleguia.com.br/admin` registra um service worker que passa a interceptar
requisições de *toda* a origem — inclusive as páginas da loja. Um cache
malconfigurado no admin pode servir HTML velho para um cliente no meio de uma
compra. Não é um risco teórico: é o modo de falha mais comum de PWA. Separar
por origem (`admin.pinceleguia.com.br`) elimina a classe inteira do problema.

**b) Superfície de ataque.** O painel controla estoque, preço e pedidos. Em
domínio próprio ele ganha cookie de sessão com escopo isolado, CSP mais
restritiva, e as rotas administrativas deixam de existir na mesma origem que
recebe tráfego anônimo da internet.

**c) O requisito 37 pede reuso.** "Estruturar os módulos para que a VORTEXIS
reutilize em outros e-commerces" só é verificável se existir uma fronteira real.
Pasta não é fronteira — pacote é. Com `packages/`, o dia em que o Cliente B
aparecer, você importa; não copia.

**Custo honesto da mudança:** ferramental a mais (workspaces + Turborepo),
build um pouco mais lento, e disciplina para não vazar dependência entre
pacotes. É complexidade real, assumida conscientemente porque o problema (a)
não tem contorno bom dentro de uma origem só.

**Não muda o custo de hospedagem:** a Vercel cobra por assento, não por
projeto. Dois projetos, mesma fatura.

### 1.2 Produto ↔ Categoria: de 1:N para N:N ⚠️ MUDANÇA

**O que estava decidido:** `products.categoryId` — uma categoria por produto.

**Por que muda.** O próprio briefing descreve o caso que quebra isso: a loja
trabalha com "Cerâmicas, Orixás, Entidades". Um prato de Iemanjá é *cerâmica*
**e** é *Orixá*. Com 1:N, a proprietária é forçada a escolher, e a peça
desaparece de uma das navegações.

**Como fica:** tabela `product_categories` com `isPrimary`. A categoria primária
define breadcrumb e URL canônica — sem isso o SEO gera conteúdo duplicado.

Migração pequena: os dados atuais viram uma linha primária cada.

### 1.3 Conteúdo da home: de `settings` para Section Builder versionado ⚠️ MUDANÇA

**O que estava decidido:** hero e destaques em `settings` (JSON chave-valor).

**Por que muda.** `settings` resolve "trocar o texto do hero". Não resolve
"adicionar uma seção de parceiro entre a terceira e a quarta". A tabela
`settings` continua existindo para configuração de loja (contato, frete,
SEO padrão) — some apenas como fonte da composição da home.

### 1.4 Papéis: de enum para RBAC em tabela ⚠️ MUDANÇA

**O que estava decidido:** `enum Role { CUSTOMER, ADMIN }`.

**Por que muda.** O requisito pede `EDITOR` agora e "outras permissões
futuramente". Enum obriga migration a cada papel novo, e não expressa
"EDITOR pode criar produto mas não publicar seção". Permissões viram dados.

### 1.5 Storage de imagens: de FASE 5 para pré-requisito ⚠️ MUDANÇA DE ORDEM

**O que estava decidido:** Cloudflare R2 na FASE 5, junto do admin.

**Por que muda.** A biblioteca de mídia é fundação do CMS: produto, categoria,
coleção, parceiro, banner e seção todos referenciam imagem. Sobe para logo
depois da autenticação.

---

## 2. O que permanece — e por quê

Nada aqui muda. Registrado para evitar refatoração por refatoração.

| Decisão | Continua correta porque |
|---|---|
| Next.js + TypeScript `strict` | Serve igualmente bem SSR de loja e SPA-like de painel |
| PostgreSQL + Prisma | O modelo ficou *mais* relacional, não menos |
| Dinheiro em `Int` centavos | Invariante do domínio, independe de interface |
| Pedido como snapshot imutável | Requisito 20 reforça: "produtos, snapshots, quantidades" |
| Baixa de estoque atômica e transacional | Requisito 21 pede exatamente isso |
| `PaymentGateway` / `ShippingProvider` / `StorageProvider` | O admin consome as mesmas interfaces |
| Design tokens centralizados | Requisito 26 e 27 dependem disso para existir |
| `domain` / `application` / `infrastructure` por módulo | É o que permite dois apps usarem a mesma regra |
| Separação client/server explícita (`env.client`, `catalog/client`) | Custou caro para aprender hoje. Vira padrão obrigatório |
| Better Auth | Tem plugin de organização, roles e TOTP — cobre o que vem |
| Vercel + Neon | Suporta dois projetos sem mudança de plano |

---

## 3. Arquitetura v2

```
                    ┌──────────────────────────┐
                    │   PostgreSQL (Neon)      │
                    │   banco único            │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  packages/db  (Prisma)   │
                    │  schema + client         │
                    └────────────┬─────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
┌──────▼───────┐        ┌────────▼────────┐       ┌────────▼────────┐
│ packages/    │        │  packages/cms   │       │  packages/      │
│ commerce     │        │  páginas, seções│       │  integrations   │
│ catálogo,    │        │  menus, mídia,  │       │  pagamento,     │
│ carrinho,    │        │  revisões       │       │  frete, storage,│
│ pedidos,     │        │                 │       │  e-mail         │
│ estoque,     │        └────────┬────────┘       └────────┬────────┘
│ cupons       │                 │                         │
└──────┬───────┘                 │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
    ┌─────────▼──────────┐              ┌───────────▼─────────┐
    │  apps/storefront   │              │   apps/admin        │
    │  pinceleguia.com.br│◄─────────────┤ admin.pincel...     │
    │  público, SSR/ISR  │  revalidate  │ PWA, autenticado    │
    │  read-only         │   por tag    │ leitura e escrita   │
    └────────────────────┘              └─────────────────────┘
              ▲                                     ▲
              └───────── packages/ui ───────────────┘
                    design tokens + primitivos
```

**Direção das dependências:** os apps dependem dos pacotes. Os pacotes nunca
dependem dos apps. `commerce` e `cms` não dependem um do outro — quem os
combina é o app.

### 3.1 Estrutura de pastas

```
pincel-e-guia/
├── apps/
│   ├── storefront/          # loja pública
│   │   └── src/app/…
│   └── admin/               # painel PWA
│       ├── public/manifest.webmanifest
│       ├── public/icons/
│       └── src/app/…
│
├── packages/
│   ├── db/                  # schema Prisma + client singleton + migrations
│   ├── commerce/            # CORE genérico de e-commerce
│   │   ├── catalog/         # produtos, categorias, coleções, parceiros
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── inventory/
│   │   └── coupons/
│   ├── cms/                 # CORE genérico de conteúdo
│   │   ├── pages/
│   │   ├── sections/
│   │   ├── menus/
│   │   ├── media/
│   │   └── revisions/
│   ├── auth/                # sessão, RBAC, guards
│   ├── integrations/        # adapters: mercadopago, melhor-envio, r2, resend
│   ├── ui/                  # tokens + primitivos sem opinião de marca
│   └── config/              # tsconfig, eslint, tailwind preset
│
├── turbo.json
└── pnpm-workspace.yaml
```

O que é da Pincel & Guia — paleta, logo, tipografia, textos, tipos de seção
habilitados — vive em `apps/*`, nunca em `packages/*`. Detalhado em
[16-VORTEXIS-CORE](16-VORTEXIS-CORE.md).

### 3.2 Backend separado? Ainda não.

Cada app expõe suas próprias Server Actions e Route Handlers, e ambos importam
a mesma regra de `packages/commerce`. Não há servidor de API intermediário.

**Por quê:** um terceiro serviço adicionaria deploy, latência e superfície sem
resolver problema que exista hoje. A regra de negócio já está isolada em
pacotes — se um dia surgir um app nativo ou integração com ERP, extrair uma
API é escrever Route Handlers sobre os mesmos use-cases, não reescrever.

**Regra que sustenta isso:** nenhum app pode conter lógica de negócio. Se um
`page.tsx` calcula preço ou decide status, está no lugar errado.

### 3.3 Como o admin avisa a loja de uma publicação

Os dois apps são deploys distintos. Publicar no admin precisa invalidar o
cache da loja.

```
Admin: publicar revisão da Home
   │
   ├─ transação: marca revisão como PUBLISHED
   │
   └─ POST https://pinceleguia.com.br/api/revalidate
      headers: x-revalidate-secret: ***
      body:    { "tags": ["home", "menu:principal"] }
           │
           └─ Storefront: revalidateTag(...) → próximo acesso reconstrói
```

Segredo compartilhado em variável de ambiente dos dois projetos. A chamada é
registrada; falha gera alerta e permite reenvio manual pelo painel — publicar
não pode falhar em silêncio. Detalhes em [15-PWA-CACHE](15-PWA-CACHE.md).

---

## 4. Stack final

Sem novidades estruturais além do ferramental de monorepo. Isso é bom sinal.

| Camada | Escolha | Novo? |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | ✅ novo |
| Framework (ambos apps) | Next.js 15 App Router | mantido |
| Linguagem | TypeScript `strict` | mantido |
| Banco / ORM | PostgreSQL (Neon) / Prisma | mantido |
| Auth | Better Auth + RBAC próprio | estendido |
| PWA | Serwist (service worker) | ✅ novo |
| UI do storefront | Tailwind + tokens da marca | mantido |
| UI do admin | Tailwind + mesmos tokens, densidade própria | estendido |
| Tabelas do admin | TanStack Table | ✅ novo |
| Formulários | React Hook Form + Zod | mantido |
| Drag-and-drop | dnd-kit | ✅ novo |
| Rich text | Tiptap + sanitização server-side | ✅ novo |
| Storage | Cloudflare R2 via `StorageProvider` | antecipado |
| Pagamento / Frete | Mercado Pago / Melhor Envio via adapters | mantido |
| Testes | Vitest + Playwright | mantido |

**Sobre `dnd-kit` e `Tiptap`:** são as duas dependências que mais pesam no
bundle do admin. Ambas ficam só em `apps/admin` e entram por import dinâmico —
não afetam a loja, que é onde performance vira dinheiro.

---

## 5. Onde cada requisito foi respondido

| Requisito | Documento |
|---|---|
| 1–4 Princípio, arquitetura, PWA, acesso | este documento e [15](15-PWA-CACHE.md) |
| 5 Dashboard | [12-MODELO-DADOS-V2](12-MODELO-DADOS-V2.md), [09-ROADMAP](09-ROADMAP.md) |
| 6–10 Produtos, variações, categorias, coleções, parceiros | [12-MODELO-DADOS-V2](12-MODELO-DADOS-V2.md) |
| 11–15 Section Builder, ordenação, draft, preview | [14-CMS-SECTION-BUILDER](14-CMS-SECTION-BUILDER.md) |
| 16–19 Banners, menu, páginas, mídia | [14-CMS-SECTION-BUILDER](14-CMS-SECTION-BUILDER.md) |
| 20–24 Pedidos, estoque, pagamentos, cupons, clientes | [03-MODELO-DADOS](03-MODELO-DADOS.md) + [12](12-MODELO-DADOS-V2.md) |
| 25–27 Configurações, personalização, design system | [07-DESIGN-SYSTEM](07-DESIGN-SYSTEM.md) |
| 28–30 Auditoria, confirmação, autosave | [13-AUTH-RBAC-SEGURANCA](13-AUTH-RBAC-SEGURANCA.md) |
| 31–33 Mobile-first, upload, segurança | [13](13-AUTH-RBAC-SEGURANCA.md) e [15](15-PWA-CACHE.md) |
| 34–36 Modelagem, seções, performance | [12](12-MODELO-DADOS-V2.md) e [15](15-PWA-CACHE.md) |
| 37 Reutilização | [16-VORTEXIS-CORE](16-VORTEXIS-CORE.md) |
| 22–24 Custos, riscos, pendências | [17-CUSTOS-RISCOS](17-CUSTOS-RISCOS-PENDENCIAS.md) |
| 25 Plano em fases | [09-ROADMAP](09-ROADMAP.md) |

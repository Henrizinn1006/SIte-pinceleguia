# Pincel & Guia

Projeto desenvolvido pela **VORTEXIS**.

Loja online de porcelana autoral feita à mão, com peças ligadas a Orixás,
Guias & Entidades e itens decorativos.

**Status:** FASE 3 concluída — monorepo com dois apps. Loja pública funcionando;
painel administrativo é uma casca vazia até a FASE 4.
Ver [docs/09-ROADMAP.md](docs/09-ROADMAP.md).

---

## Como rodar

Requisitos: Node.js 20+ e Docker Desktop.

```bash
npm install            # instala tudo e gera o client do Prisma
docker compose up -d   # sobe o PostgreSQL local
npm run db:setup       # cria as tabelas e popula com dados de demonstração
npm run dev            # loja  → http://localhost:3000
```

Painel administrativo, em outro terminal:

```bash
npm run dev:admin      # admin → http://localhost:3001
```

O `.env` fica **na raiz** e serve os dois apps e o Prisma. Já vem preenchido
para desenvolvimento local.

**Sem Docker?** Qualquer PostgreSQL serve — ajuste `DATABASE_URL` e
`DIRECT_URL` no `.env`. Em produção usaremos [Neon](https://neon.tech).

**Porta 5432 ocupada?** Troque para `5433` no `docker-compose.yml` e nas duas
URLs do `.env`.

---

## Estrutura

Monorepo com npm workspaces. A fronteira entre o que é genérico e o que é
desta marca é verificada automaticamente — ver
[docs/16-VORTEXIS-CORE.md](docs/16-VORTEXIS-CORE.md).

```
apps/
├── storefront/     loja pública      · pinceleguia.com.br      · porta 3000
└── admin/          painel PWA        · admin.pinceleguia.com.br · porta 3001

packages/           genéricos, reutilizáveis pela VORTEXIS
├── db/             schema Prisma, migrations, client
├── commerce/       catálogo, preços, filtros, erros de domínio
├── ui/             primitivos sem opinião de marca
└── config/         tsconfig e ESLint compartilhados

seed/               dados de demonstração (identidade do cliente)
scripts/            checagens de fronteira
docs/               planejamento e decisões
```

### Três regras que o CI verifica

1. **Nada específico do cliente em `packages/`.** "Orixás", "porcelana" e
   "Pincel & Guia" são conteúdo — linhas no banco, não identificadores.
2. **Pacote nunca importa de app.** As dependências só apontam para baixo.
3. **Client Component nunca importa superfície de servidor.** Use
   `@vortexis/commerce/client` e `@/lib/env.client`.

```bash
npm run check:boundaries
```

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Loja em desenvolvimento (3000) |
| `npm run dev:admin` | Painel em desenvolvimento (3001) |
| `npm run build` | Build da loja |
| `npm run build:admin` | Build do painel |
| `npm run check` | Fronteiras + tipos + testes |
| `npm run typecheck` | Verificação de tipos dos dois apps |
| `npm run test` | Testes unitários (Vitest) |
| `npm run db:setup` | Primeira execução: cria tabelas + popula |
| `npm run db:reset` | Apaga tudo e recria |
| `npm run db:studio` | Inspeção visual do banco |

---

## O que já existe

**Loja pública** — home, `/loja` com filtros e paginação, página de produto com
galeria e JSON-LD, categoria, busca, institucionais, sitemap, robots, header
responsivo com menu mobile acessível.

**Fundação** — Next.js 15 + TypeScript `strict` · Prisma com 23 tabelas ·
validação de ambiente com Zod · erros de domínio tipados · 23 testes unitários
nas regras de preço e filtros · paleta oficial com contraste WCAG AA verificado.

**Painel** — casca que compila e roda em domínio próprio, consumindo os pacotes
compartilhados. Sem funcionalidade ainda.

## O que ainda não existe

Autenticação · PWA · biblioteca de mídia · catálogo administrável · carrinho ·
checkout · pagamento · CMS · Section Builder.
Ver [docs/09-ROADMAP.md](docs/09-ROADMAP.md).

---

## Duas convenções que sustentam o projeto

**Dinheiro é `Int` em centavos.** `R$ 157,00` → `15700`. Nunca `float`.

**Fronteira client/server é explícita.** Client Components importam de
`@vortexis/commerce/client` e `@/lib/env.client`. O que toca banco ou segredo
é marcado com `server-only` e quebra o build se vazar. Essa regra nasceu de
duas falhas reais em desenvolvimento — está no CI para não haver uma terceira.

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [00-VISAO-GERAL](docs/00-VISAO-GERAL.md) | Escopo e resumo das decisões |
| [01-STACK](docs/01-STACK.md) | Análise e recomendação da stack |
| [02-ARQUITETURA](docs/02-ARQUITETURA.md) | Camadas, pastas e interfaces |
| [03-MODELO-DADOS](docs/03-MODELO-DADOS.md) | Modelo relacional e concorrência de estoque |
| [04-PAGINAS-E-API](docs/04-PAGINAS-E-API.md) | Páginas, endpoints e server actions |
| [05-FLUXOS](docs/05-FLUXOS.md) | Compra, pagamento, estoque e frete |
| [06-SEGURANCA](docs/06-SEGURANCA.md) | Autenticação, autorização e controles |
| [07-DESIGN-SYSTEM](docs/07-DESIGN-SYSTEM.md) | Paleta, contraste medido, acessibilidade |
| [08-DEPLOY-E-CUSTOS](docs/08-DEPLOY-E-CUSTOS.md) | Ambientes, deploy e custos |
| [09-ROADMAP](docs/09-ROADMAP.md) | Fases de desenvolvimento |
| [10-DECISOES-PENDENTES](docs/10-DECISOES-PENDENTES.md) | O que depende de você ou do cliente |

### Expansão CMS + Admin PWA

| Documento | Conteúdo |
|---|---|
| [11-EXPANSAO-IMPACTO](docs/11-EXPANSAO-IMPACTO.md) | O que mudou nas decisões e arquitetura v2 |
| [12-MODELO-DADOS-V2](docs/12-MODELO-DADOS-V2.md) | Categorias hierárquicas, coleções, parceiros, seções, RBAC |
| [13-AUTH-RBAC-SEGURANCA](docs/13-AUTH-RBAC-SEGURANCA.md) | Permissões, upload seguro, XSS, auditoria |
| [14-CMS-SECTION-BUILDER](docs/14-CMS-SECTION-BUILDER.md) | Section Builder, draft/preview/publish, admin mobile |
| [15-PWA-CACHE](docs/15-PWA-CACHE.md) | Service worker, revalidação cross-app |
| [16-VORTEXIS-CORE](docs/16-VORTEXIS-CORE.md) | O que é reutilizável e o que é da marca |
| [17-CUSTOS-RISCOS](docs/17-CUSTOS-RISCOS-PENDENCIAS.md) | Custos, riscos técnicos, decisões abertas |

---

## Segurança

Nunca versione `.env`. Nunca coloque credencial real em `.env.example`.
Antes de qualquer deploy de produção, siga o checklist em
[docs/06-SEGURANCA.md](docs/06-SEGURANCA.md).

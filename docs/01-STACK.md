# 01 — Análise e Recomendação de Stack

## Critérios usados na avaliação

Peso alto: segurança, manutenibilidade por uma equipe pequena, custo operacional baixo, reaproveitamento pela VORTEXIS.
Peso médio: velocidade de desenvolvimento, ecossistema, qualidade de SEO.
Peso baixo: escala extrema (o catálogo é artesanal, o volume é de dezenas a centenas de pedidos/mês, não milhares por hora).

---

## Decisão 1 — Next.js full-stack vs. backend separado

Esta é a decisão mais estruturante do projeto, então vale explicar antes de implementar.

### Opção A — Next.js full-stack (Route Handlers + Server Actions)

| Prós | Contras |
|---|---|
| Um repositório, um deploy, um pipeline de CI | Acoplamento ao ecossistema Vercel/Next se mal isolado |
| SSR/SSG nativo → SEO forte em páginas de produto | Funções serverless têm cold start e limite de execução |
| Server Actions eliminam boa parte da camada de API manual | Menos natural expor uma API pública para app mobile futuro |
| Menor custo (um serviço em vez de dois) | Times grandes se atropelam num monólito |
| TypeScript ponta a ponta com tipos compartilhados | |

### Opção B — Next.js (front) + API separada (NestJS/Fastify)

| Prós | Contras |
|---|---|
| Fronteira de responsabilidade explícita | Dois deploys, dois ambientes, duas configs de segurança |
| API reutilizável por outros clientes (app, ERP) | Custo de hospedagem maior |
| Escala independente de front e back | Duplicação de tipos e validações se não houver contrato compartilhado |
| | Mais lento para chegar à primeira versão |

### Recomendação: **Opção A — Next.js full-stack**

Justificativa objetiva:

- O volume esperado não justifica o custo operacional de dois serviços.
- SEO é requisito explícito (seção 17 do briefing) e o SSR do Next entrega isso sem esforço extra.
- Uma equipe pequena mantém melhor um monólito bem modularizado do que dois serviços mal integrados.
- **O risco de acoplamento é mitigado pela arquitetura, não pela stack**: toda a regra de negócio vive em `src/modules/*`, sem importar nada de `next/*`. Se um dia for preciso extrair uma API separada, esses módulos migram sem alteração. Isso está detalhado em [02-ARQUITETURA](02-ARQUITETURA.md) e é a condição para essa escolha ser segura.

**Regra de fronteira:** Server Actions para mutações originadas na UI da própria aplicação (adicionar ao carrinho, salvar produto no admin). Route Handlers (`/api/*`) apenas para o que precisa ser um endpoint HTTP de verdade: webhooks do gateway, upload de imagem, sitemap, health check.

---

## Decisão 2 — Banco e ORM

**PostgreSQL.** O domínio é intensamente relacional (pedido → itens → variação → produto → categoria) e exige transações reais para o controle de estoque. Um banco documental seria a escolha errada aqui.

**Prisma** como ORM:

- Migrations versionadas e determinísticas (`prisma migrate`), requisito da seção 15.
- Tipos gerados a partir do schema — elimina a classe de bug "campo renomeado no banco, esquecido no código".
- Transações interativas (`$transaction`) com nível de isolamento configurável — necessário para a reserva de estoque.
- Escape de parâmetros por padrão → proteção contra SQL Injection sem esforço.

Alternativa considerada: **Drizzle ORM**. É mais leve, gera SQL mais previsível e tem menos overhead em serverless. Perde em maturidade de ferramental de migration e em legibilidade para quem for dar manutenção depois. Como manutenibilidade tem peso alto aqui, ficamos com Prisma. *(Se a VORTEXIS já tiver padronizado Drizzle internamente, é uma troca razoável — marcar como decisão sua.)*

**Provedor:** Neon (Postgres serverless, branching por PR, free tier generoso). Alternativa: Supabase, se quisermos aproveitar também storage e auth no mesmo fornecedor.

---

## Decisão 3 — Autenticação

**Better Auth.**

- Suporte nativo a e-mail/senha com hash Argon2/scrypt, verificação de e-mail e recuperação de senha — que é exatamente o escopo da seção 11.
- Sessões em banco (revogáveis) em vez de JWT stateless. Para e-commerce isso importa: conseguimos derrubar a sessão de um admin comprometido imediatamente.
- Plugin de roles/permissões (`CUSTOMER` / `ADMIN`) e rate limiting embutido.
- Adapter Prisma oficial, TypeScript de primeira classe.

Alternativa considerada: **Auth.js (NextAuth v5)** — mais popular, mas o fluxo de credenciais próprias exige bastante código manual e a v5 passou muito tempo em beta. **Lucia** foi descartada: o projeto foi descontinuado como biblioteca.

> DECISÃO PENDENTE: se será oferecido login social (Google). Tecnicamente trivial nas duas opções; é uma escolha de produto.

---

## Decisão 4 — Pagamento

**Mercado Pago** como primeiro adapter, conforme sua preferência. Cobre PIX e cartão, é dominante no Brasil e tem SDK Node oficial.

Implementado **atrás da interface `PaymentGateway`** (ver [02-ARQUITETURA](02-ARQUITETURA.md)). Nenhum componente React, nenhum use-case de pedido importa `mercadopago` diretamente. Trocar por Pagar.me, Stripe ou Asaas = escrever um novo adapter.

Modalidade recomendada: **Checkout Transparente / Payment Brick**, para o cliente não sair do site. Os dados de cartão são tokenizados no navegador pelo SDK do Mercado Pago e **nunca trafegam pelo nosso servidor nem tocam nosso banco** — isso nos mantém fora do escopo pesado de PCI-DSS.

---

## Stack final proposta

| Camada | Escolha | Motivo em uma linha |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR para SEO + full-stack num deploy |
| Linguagem | TypeScript (`strict: true`) | Contrato de tipos ponta a ponta |
| UI | Tailwind CSS + tokens próprios | Rápido, sem CSS morto, sem cara de template |
| Componentes | shadcn/ui (código copiado, não dependência) | Acessibilidade pronta, estilo 100% nosso |
| Banco | PostgreSQL (Neon) | Relacional + transações reais |
| ORM | Prisma | Migrations + tipos gerados |
| Auth | Better Auth | Sessões revogáveis + roles + rate limit |
| Validação | Zod | Um schema serve a form, action e API |
| Formulários | React Hook Form + resolver Zod | Menos re-render, validação compartilhada |
| Pagamento | Mercado Pago (via adapter) | PIX + cartão, padrão do mercado BR |
| Frete | Melhor Envio ou taxa fixa (via adapter) | Múltiplas transportadoras numa API |
| Imagens | Cloudflare R2 + `next/image` | S3-compatível, **egress zero** |
| E-mail | Resend + React Email | Transacional confiável, templates em JSX |
| Testes | Vitest + Testing Library + Playwright | Unitário/integração + e2e do fluxo de compra |
| Qualidade | ESLint + Prettier + Husky + lint-staged | Padrão travado no commit |
| Erros | Sentry | Rastreio de erro em produção |
| Hospedagem | Vercel | Deploy por push, preview por PR |

## O que deliberadamente NÃO vamos usar

- **Redux / Zustand global** — o estado do carrinho vive no servidor; estado de UI local resolve o resto.
- **Bibliotecas de UI pesadas** (MUI, Chakra) — impõem estética própria, exatamente o que queremos evitar.
- **GraphQL** — camada extra sem ganho num cliente único.
- **Docker no desenvolvimento inicial** — Postgres gerenciado com branch de dev é mais simples. Entra depois, se migrarmos para VPS.
- **CMS headless (Strapi, Sanity)** — o painel admin próprio já cobre o conteúdo dinâmico; um CMS seria um segundo sistema para o cliente aprender.

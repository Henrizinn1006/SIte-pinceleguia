# Relatório — Migração para Hostinger, Fase 1

## Contexto

O projeto original (`apps/`, `packages/`, raiz do repo) é um monorepo
Next.js 15 + React 19 + Prisma + PostgreSQL, pensado para Vercel + Neon.
Este relatório documenta a Fase 1 de uma migração para rodar 100% numa
hospedagem compartilhada da Hostinger (PHP + MariaDB + frontend
estático, sem Node/Docker/Prisma/Postgres em produção).

**Nada do código original foi apagado ou modificado.** A nova stack foi
construída ao lado, em `backend/`, `frontend/` e `deploy/`, seguindo a
estratégia de migração segura pedida: provar equivalência antes de
remover qualquer coisa.

## Escopo entregue nesta fase

- Estrutura nova (`backend/`, `frontend/storefront/`, `deploy/`).
- Migrations MariaDB/MySQL para as tabelas necessárias ao catálogo
  público, geradas a partir do `schema.prisma` **atual** (não da
  migration Prisma existente, que estava desatualizada — ver seção
  "Achado importante" abaixo).
- API PHP somente leitura: categorias, produtos (com filtros, busca,
  ordenação, paginação), páginas institucionais, configurações
  públicas (hero, contato), sitemap, robots.
- SPA em Vite + React + TypeScript consumindo essa API, com as mesmas
  rotas e a mesma aparência visual do storefront Next.js atual.
- Testes PHPUnit portados 1:1 dos testes Vitest de `pricing.ts` e
  `product-filters.ts`.
- Documentação de deploy (`deploy/README-HOSTINGER.md`), `.env.example`
  sem segredos, e checklist de publicação.

## O que foi reaproveitado

- **Aparência e identidade visual**: paleta de cores, tipografia,
  espaçamento, tokens Tailwind — copiados quase literalmente de
  `apps/storefront/src/app/globals.css` para `frontend/storefront/src/index.css`.
- **Componentes de UI**: `Container`, `Badge`, `Button`/`ButtonLink`,
  ícones SVG inline, `Header`, `Footer`, `Logo`, `MobileMenu`, `NavLink`,
  `Hero`, `SectionHeading`, `ProductCard`, `ProductGrid`, `CategoryCard`,
  `ProductGallery`, `CatalogFilters`, `Pagination`, `SortSelect` — todos
  portados com a mesma marcação e classes, só trocando `next/link`/
  `next/image`/`next/navigation` por `react-router-dom` e `<img>` puro.
- **Lógica de domínio pura** (a parte mais valiosa de portar, porque é
  auditável 1:1 contra o original):
  - `packages/commerce/src/catalog/domain/pricing.ts` →
    `backend/src/Catalog/Pricing.php` (regra de promoção/desconto).
  - `packages/commerce/src/catalog/domain/product-filters.ts` →
    `backend/src/Catalog/ProductFilters.php` (PHP) e
    `frontend/storefront/src/lib/filters.ts` (TS, para montar URLs no
    cliente).
  - `packages/commerce/src/shared/errors.ts` →
    `backend/src/Http/{DomainException,NotFoundException,ValidationException,MethodNotAllowedException}.php`.
  - `packages/commerce/src/shared/money.ts` →
    `frontend/storefront/src/lib/money.ts` (formatação; o backend só
    manipula centavos como inteiro, nunca formata string).
- **Dados de demonstração**: `seed/demo.ts` → `backend/seeds/demo.php`,
  mesmo catálogo fictício (mesmos textos, mesma ressalva de que são
  dados de demonstração), restrito às tabelas que existem nesta fase.
- **Contrato de filtros da URL**: mesmos nomes de parâmetro em
  português (`categoria`, `q`, `precoMin`, `precoMax`, `disponibilidade`,
  `ordem`, `pagina`) e o mesmo comportamento tolerante a valor inválido
  (cai no default em vez de quebrar).

## O que foi reescrito

- **Camada de dados**: Prisma (`db.product.findMany(...)`) → PDO com
  prepared statements (`backend/src/Catalog/ProductRepository.php`,
  `CategoryRepository.php`). A busca case-insensitive que dependia de
  `mode: "insensitive"` (recurso específico do conector Postgres do
  Prisma) foi substituída pela collation `utf8mb4_unicode_ci` definida
  nas migrations — não existe equivalente direto no MySQL/MariaDB por
  query.
- **Busca de dados no frontend**: Server Components assíncronos
  (`await findProducts(...)` direto no componente) → `fetch('/api/...')`
  via `frontend/storefront/src/lib/api.ts`, com um hook `useAsync`
  simples (sem biblioteca externa) para o ciclo carregando/erro/dado.
- **Roteamento**: App Router do Next.js (pastas `app/(loja)/...`) →
  `react-router-dom` (`src/App.tsx`), com o catch-all de página
  institucional na última posição, replicando a prioridade de rotas do
  original.
- **SEO por rota**: `generateMetadata`/`revalidate`/ISR (recursos de
  servidor do Next.js) → um "SSR-lite" em `backend/public/index.php`:
  quando o PHP serve o HTML da SPA (ver Opção A no README-HOSTINGER),
  ele injeta `<title>`, meta description e JSON-LD de produto por rota,
  usando os mesmos repositórios da API. Em desenvolvimento (`npm run
  dev`, sem passar pelo PHP) ou na Opção B de deploy (SPA 100%
  estática), esses valores só são ajustados no cliente via
  `useDocumentHead` — pior para robôs que não executam JavaScript, mas
  documentado explicitamente como limitação, não escondido.
- **Hash de senha / autenticação**: nada foi portado nesta fase —
  não há login em PHP ainda (ver "Adiado"). Quando a Fase 2 chegar, a
  decisão registrada é usar `password_hash()`/`password_verify()`
  nativo do PHP (Argon2id) em vez de replicar o scrypt customizado de
  `packages/auth/src/password.ts`, porque o usuário confirmou que não
  existem usuários administradores reais hoje — não há hash existente
  para preservar.

## O que foi adiado (Fase 2, 3 ou 4 — não implementado, não fingido)

- Login administrativo, sessão, RBAC, auditoria em PHP.
- CRUD de categorias/produtos/variações/imagens/estoque no painel.
- Upload de imagens (armazenamento local protegido, validação de
  assinatura de arquivo, redimensionamento).
- Carrinho, checkout como visitante, frete.
- Integração Mercado Pago (preferências, webhook, idempotência).
- Fila de e-mail via SMTP da Hostinger.
- Cron jobs (limpeza de sessão, liberação de reserva de estoque,
  reconciliação de pagamento).
- Cupons.
- CMS/Section Builder.

Nenhum desses itens tem código nesta fase — só as tabelas do
`schema.prisma` original os antecipam. **Não foram criadas migrations
para essas tabelas ainda** (users, roles, permissions, sessions,
carts, orders, payments, coupons, etc.) — ver "Classificação de
tabelas" abaixo.

## O que foi removido

**Nada.** `apps/`, `packages/`, `docker-compose.yml`, `seed/*.ts` e o
Prisma/Postgres continuam intactos no repositório, exatamente como
estavam. A remoção só deve acontecer depois que a Opção A/B do novo
stack for validada em produção com paridade comprovada contra o
storefront atual (passo 7 da estratégia de migração segura pedida).

## Classificação de tabelas do `schema.prisma` (28 modelos)

**Necessárias para esta fase (7 tabelas, migradas):**
`categories`, `products`, `product_images`, `product_variants`,
`content_pages`, `settings`, mais `schema_migrations` (controle).

**Necessárias depois, mas não migradas ainda** (aguardam a fase que as
usa; enumeradas aqui só para rastreabilidade — o schema completo
continua em `packages/db/prisma/schema.prisma` como referência):
`users`, `roles`, `permissions`, `role_permissions`, `user_roles`,
`invites`, `sessions`, `accounts`, `verifications`, `addresses`,
`media` (Fase 2 — painel/auth); `carts`, `cart_items` (Fase 3);
`coupons`, `coupon_redemptions` (Fase 4); `orders`, `order_items`,
`order_status_history`, `payments`, `payment_events`, `shipments`,
`inventory_movements`, `stock_reservations` (Fase 3/4);
`audit_logs` (Fase 2, junto do painel).

Nenhuma foi "convertida cegamente" — cada uma entra só na migration
numerada da fase que efetivamente a usa.

## Achado importante: migration Prisma desatualizada

A única migration existente em
`packages/db/prisma/migrations/20260812035639_init` **não reflete** o
`schema.prisma` atual: ela cria um enum `Role` simples (`CUSTOMER`,
`ADMIN`) e uma tabela `admin_audit_log`, enquanto o schema atual usa o
modelo RBAC completo (`Role`/`Permission`/`RolePermission`/`UserRole`/
`Invite`) e nomeia a tabela `audit_logs`. As migrations MariaDB desta
fase foram geradas a partir do `schema.prisma`, que é a fonte da
verdade — **não** a partir dessa migration Prisma. Vale avisar quem
mantém o projeto original: o histórico de migrations do Prisma está
dessincronizado do schema (indício de uso de `prisma db push` sem gerar
migration nova).

## Limitações do plano Hostinger — a validar

O usuário confirmou não saber os detalhes exatos do plano contratado.
As suposições abaixo foram assumidas e precisam ser confirmadas antes
do deploy real (ver `deploy/README-HOSTINGER.md`):

- PHP ≥ 8.1 disponível (o backend usa `readonly` properties e `match`,
  recursos de PHP 8.1+/8.0+). Se o plano só oferecer PHP 7.x, é preciso
  rebaixar a sintaxe.
- MySQL/MariaDB com suporte a tipo `JSON` (MariaDB ≥ 10.2.7 / MySQL ≥
  5.7 — praticamente qualquer versão atual da Hostinger atende isso).
- Acesso ao phpMyAdmin para importar as migrations manualmente (SSH não
  garantido).
- Possibilidade de colocar uma pasta fora de `public_html` (para a
  Opção A do layout de produção). Se o plano não permitir, use a Opção
  B (documentada) ou proteja `private/` dentro de `public_html/` via
  `.htaccess` de negação total.
- Cron Jobs do hPanel, GD/Imagick, acesso SSH/Composer: **ainda não
  necessários nesta fase** (sem upload, sem fila de e-mail, sem cron) —
  precisam ser confirmados antes da Fase 2/3.

## Verificação executada

O ambiente de desenvolvimento não tinha PHP, Composer nem
MySQL/MariaDB instalados originalmente — foram instalados via
`winget` (PHP 8.4 NTS extraído em `AppData\Local\php`, MariaDB Server
12.3) só para viabilizar a verificação local; nenhum dos dois faz
parte do que é enviado à Hostinger. Com isso, foi possível validar de
verdade, não só por inspeção:

- `php -l` em **todos** os arquivos de `backend/` — sem erro de
  sintaxe.
- As 7 migrations da Fase 1 aplicadas contra um MariaDB real (mesma
  engine/coleção da produção) — sem erro, tabelas criadas conforme
  esperado.
- `backend/seeds/demo.php` rodado contra esse banco — populou
  categorias, produtos, imagens e configurações sem erro.
- Backend subido com `php -S` e testado via `curl`: catálogo,
  filtros, busca, produto por slug (200 e 404), páginas
  institucionais, configurações públicas, `sitemap.xml`, `robots.txt`
  — todos responderam como esperado.
- SSR-lite testado de ponta a ponta: `<title>`/meta description/
  JSON-LD injetados corretamente no HTML servido para `/produto/*` e
  `/categoria/*`. **Um bug real foi encontrado e corrigido nesse
  teste**: o título saía duplicado (`"Nome | Pincel & Guia | Pincel &
  Guia"`) porque o `metaTitle` do seed já vem com o sufixo, e o código
  reanexava de novo — corrigido em `backend/public/index.php` e nas
  páginas React equivalentes (`produto.tsx`, `categoria.tsx`).
- `frontend/storefront`: `npm install && npm run build` — TypeScript e
  build do Vite sem erro.
- `backend/tests/` rodado com PHPUnit 10 (baixado como `.phar`,
  standalone) — **18 testes, 33 assertions, todos passando**
  (`Pricing` e `ProductFilters`, porta 1:1 dos testes Vitest
  originais).

Não foi testado nesta sessão (fica para quando o deploy real
acontecer): comportamento sob Apache/LiteSpeed de verdade (o teste
usou o servidor embutido do PHP, que não processa `.htaccess`), TLS,
e o ambiente real da Hostinger em si.

## Próximos passos antes de considerar a Fase 1 pronta para produção

1. Rodar `php -l` em todo arquivo de `backend/` num ambiente com PHP
   ≥ 8.1 instalado.
2. Rodar `composer install` (dev) + `vendor/bin/phpunit` em
   `backend/tests`.
3. Subir MariaDB local (ou usar um banco de teste na própria
   Hostinger), aplicar as 7 migrations, rodar `backend/seeds/demo.php`,
   e testar os endpoints com `curl` ou Postman.
4. Rodar o backend com `php -S localhost:8080 -t backend/public` e o
   frontend com `npm run dev` (proxy já configurado em
   `vite.config.ts`), navegar pelas rotas principais e comparar
   visualmente com `npm run dev` do `apps/storefront` atual.
5. Só então seguir para o deploy real na Hostinger, seguindo
   `deploy/README-HOSTINGER.md`.

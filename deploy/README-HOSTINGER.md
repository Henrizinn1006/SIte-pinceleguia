# Deploy na Hostinger — Fases 1 a 4

Este documento cobre o que as Fases 1 a 4 entregam: catálogo público,
painel administrativo (login, CRUD de categorias/produtos/imagens,
controle de estoque, configurações), carrinho, checkout como
visitante, frete por taxa fixa, pagamento via PIX (Mercado Pago), fila
de e-mail, Cron Jobs, operação de pedidos no painel (mudar status),
cupons, visão de clientes e auditoria — tudo servido por uma API PHP +
MariaDB e dois frontends estáticos (Vite/React). Cartão/boleto,
cadastro de cliente com login, e recursos de CMS avançado ainda **não
existem em código** — não confunda com o que já está implementado.

**Suposição assumida** (o usuário confirmou não saber os detalhes
exatos do plano contratado): plano compartilhado típico da Hostinger —
PHP 8.x recente via hPanel, MySQL/MariaDB via hPanel, Cron Jobs do
hPanel, acesso SSH **não garantido**. Valide cada suposição abaixo
contra o seu plano real antes de seguir; se algo não existir no seu
plano, pare e ajuste antes de continuar (ex.: se a versão de PHP
disponível for < 8.1, os tipos `readonly` usados no backend não vão
funcionar).

## Layout de produção

Duas opções — escolha uma. A diferença é só se o `<title>`/meta
description/JSON-LD de cada produto são montados no servidor (Opção A)
ou só no navegador, depois do JS carregar (Opção B).

### Opção A — PHP como document root (com SSR-lite de SEO) — recomendada

```
/home/usuario/
  private/                     <- FORA do document root
    .env
    src/            (= backend/src)
    migrations/     (= backend/migrations)
    seeds/          (= backend/seeds)
    storage/        (= backend/storage — logs; uploads fica em public_html, ver abaixo)
    frontend-dist/
      index.html            (= frontend/storefront/dist/index.html — TEMPLATE, não é servido direto)
      admin-index.html      (= frontend/admin/dist/index.html — idem, para o painel)
  public_html/                 <- document root do domínio
    index.php       (= backend/public/index.php)
    .htaccess       (= backend/public/.htaccess)
    assets/         (= frontend/storefront/dist/assets/*)
    demo/           (= frontend/storefront/dist/demo/*)
    favicon.svg     (= frontend/storefront/dist/favicon.svg)
    admin/
      assets/       (= frontend/admin/dist/assets/*)
    uploads/
      produtos/      (= backend/public/uploads/produtos — gerado pelo próprio painel; envie vazio)
      .htaccess     (= backend/public/uploads/.htaccess — nega execução de PHP aqui)
```

`index.php` decide sozinho, por prefixo de rota: `/api/*` vira JSON;
`/admin` e `/admin/*` servem o shell do painel (lido de
`private/frontend-dist/admin-index.html`, sempre com `noindex` e CSP
restritiva); qualquer outra rota lê `private/frontend-dist/index.html`
(o storefront), injeta `<title>`/meta description/JSON-LD via
`resolveMetaForPath()` e serve o HTML resultante. Arquivos estáticos
(`assets/*.js`, `assets/*.css`, `demo/*.svg`, `admin/assets/*`) nunca
passam pelo PHP — o `.htaccess` os serve direto. Uploads de imagem de
produto (feitos pelo painel, Fase 2) ficam em `public_html/uploads/`
— dentro do document root para o Apache servir a imagem sem passar
pelo PHP, mas com um `.htaccess` que desliga execução de PHP ali
mesmo se um arquivo malicioso for enviado por engano.

Se a sua conta Hostinger não permitir uma pasta fora de `public_html`
(alguns planos restringem isso), coloque `private/` dentro de
`public_html/private/` e proteja com o `.htaccess` de
`backend/storage/logs/.htaccess` (nega tudo) copiado para lá.

### Opção B — SPA estática + API em subpasta (mais simples, sem SSR-lite)

```
public_html/
  index.html      (= frontend/storefront/dist/index.html, servido direto)
  assets/         (= frontend/storefront/dist/assets/*)
  demo/           (= frontend/storefront/dist/demo/*)
  .htaccess       (= deploy/public_html/.htaccess-opcao-b-spa-estatica, renomeado)
  api/
    index.php     (= backend/public/index.php)
    .htaccess     (= backend/public/.htaccess)
    src/          (= backend/src — OU ajuste o autoloader se preferir manter fora de public_html/api)
    migrations/
    seeds/
    storage/
    .env
```

Mais simples de configurar via FTP puro, mas `<title>`/meta description
não mudam por produto no HTML inicial (só depois do JS rodar) — pior
para SEO de robôs que não executam JavaScript. Se isso importa para
você, use a Opção A.

Este guia segue a **Opção A**. Os passos da Opção B são os mesmos,
adaptando os caminhos.

## 1. Criar banco de dados MariaDB no hPanel

1. hPanel → **Bancos de dados** → **Bancos de dados MySQL**.
2. Crie um banco (ex.: `u123456789_pincelguia`) e um usuário dedicado
   com senha forte — nunca reutilize a senha de outro serviço.
3. Vincule o usuário ao banco com todas as permissões.
4. Anote host (normalmente `localhost` ou `127.0.0.1` na Hostinger),
   nome do banco, usuário e senha — vão para o `.env`.

## 2. Configurar variáveis de ambiente sem deixá-las públicas

1. Copie `deploy/.env.example` para `.env` **fora do document root**
   (`private/.env` na Opção A).
2. Preencha `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` com os dados
   do passo 1, `PUBLIC_SITE_URL` com o domínio final (com `https://`),
   `FRONTEND_DIST_INDEX` com o caminho absoluto de
   `private/frontend-dist/index.html` e `ADMIN_DIST_INDEX` com o de
   `private/frontend-dist/admin-index.html` no servidor.
3. Mantenha `COOKIE_SECURE=true` (padrão) — o cookie de sessão do
   painel só é aceito pelo navegador em HTTPS. Isso exige que o passo 8
   (SSL) já esteja ativo antes de testar o login em produção.
4. Defina `UPLOAD_DIR` com o caminho absoluto de `public_html/uploads/produtos`
   no servidor (o painel precisa saber onde salvar as imagens enviadas).
5. Confirme que `public_html/` não contém nenhum arquivo `.env` — o
   `.htaccess` de `backend/public/` não protege arquivos fora dele.

## 3. Importar migrations e seed

Sem SSH garantido, use o **phpMyAdmin** do hPanel:

1. Selecione o banco criado no passo 1.
2. Aba **SQL** → cole e execute, **nesta ordem**, o conteúdo de cada
   arquivo em `backend/migrations/`:
   `0001_schema_migrations.sql`, `0002_categories.sql`,
   `0003_products.sql`, `0004_product_images.sql`,
   `0005_product_variants.sql`, `0006_content_pages.sql`,
   `0007_settings.sql`, `0008_users.sql`, `0009_sessions.sql`,
   `0010_login_attempts.sql`, `0011_audit_logs.sql`, `0012_carts.sql`,
   `0013_cart_items.sql`, `0014_orders.sql`, `0015_order_items.sql`,
   `0016_order_status_history.sql`, `0017_payments.sql`,
   `0018_payment_events.sql`, `0019_email_queue.sql`,
   `0020_coupons.sql`, `0021_coupon_redemptions.sql`.
   Todas são idempotentes (`CREATE TABLE IF NOT EXISTS` + registro em
   `schema_migrations`) — rodar de novo por engano não duplica nada.
3. Para popular com o catálogo de demonstração (mesmos dados fictícios
   do `seed/demo.ts` original — **substitua pelo catálogo real antes
   de divulgar o site**), rode `backend/seeds/demo.php` via CLI SSH se
   disponível (`php backend/seeds/demo.php`), ou peça ao suporte
   Hostinger para habilitar CLI temporariamente, ou rode localmente
   apontando `DB_HOST` para o host externo do banco (hPanel costuma
   expor um host remoto para bancos MySQL — verifique em **Bancos de
   dados MySQL → Acesso remoto**).

Se você tiver dados reais de um Postgres já em uso (não é o caso deste
projeto ainda — confirmado sem dados reais), o procedimento é:
`pg_dump --data-only --table=products --table=categories ...` →
converter para `INSERT` compatível com MySQL (tipos já são
portáveis, ver `docs/migracao/00-relatorio-fase1.md`) → importar via
phpMyAdmin. Não é necessário nesta Fase 1.

## 4. Compilar os frontends localmente

Isso roda na sua máquina de desenvolvimento, **não** no servidor
Hostinger (que não mantém Node em produção):

```bash
cd frontend/storefront
npm install
npm run build

cd ../admin
npm install
npm run build
```

Gera `frontend/storefront/dist/` (`index.html`, `assets/`, `demo/`,
`favicon.svg`) e `frontend/admin/dist/` (`index.html`, `assets/`).

## 5. Enviar somente os artefatos necessários

Via FTP/SFTP ou o Gerenciador de Arquivos do hPanel, envie:

- `backend/public/index.php` → `public_html/index.php`
- `backend/public/.htaccess` → `public_html/.htaccess`
- `backend/public/uploads/.htaccess` → `public_html/uploads/.htaccess`
  (crie `public_html/uploads/produtos/` vazio — é onde o painel salva
  as imagens enviadas)
- `frontend/storefront/dist/assets/` → `public_html/assets/`
- `frontend/storefront/dist/demo/` → `public_html/demo/`
- `frontend/admin/dist/assets/` → `public_html/admin/assets/`
- `frontend/admin/dist/index.html` → `private/frontend-dist/admin-index.html`
- `frontend/storefront/dist/favicon.svg` → `public_html/favicon.svg`
- `frontend/storefront/dist/index.html` → `private/frontend-dist/index.html`
- `backend/src/` → `private/src/`
- `backend/migrations/` → `private/migrations/` (só para referência —
  já foram aplicadas via phpMyAdmin no passo 3)
- `backend/seeds/` → `private/seeds/`
- `backend/bin/` → `private/bin/` (script de criação de administrador)
- `backend/cron/` → `private/cron/` (scripts de Cron Job — ver passo 9)
- `backend/storage/` (com os `.htaccess` de proteção) → `private/storage/`
- `.env` → `private/.env`

**Nunca envie**: `node_modules/`, `.git/`, `docker-compose.yml`,
`packages/`, `apps/` (o Next.js/Prisma atual não faz parte do que vai
para a Hostinger nesta fase), `backend/tests/`, `backend/composer.json`
(dependência só de dev), `phpunit.xml`.

## 6. Configurar .htaccess

Já enviado no passo 5 (`backend/public/.htaccess` → `public_html/.htaccess`).
Ele: nega listagem de diretório, aplica os headers de segurança
básicos (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`) e roteia tudo que não é arquivo real para
`index.php`.

## 7. Configurar domínio, subdomínio ou pasta

O painel já é servido em `/admin` (mesmo domínio, mesmo `index.php`) —
é o fallback documentado no pedido original para quando o plano não
permite subdomínio dedicado. Se preferir um subdomínio separado (ex.
`admin.seudominio.com.br`), crie-o no hPanel apontando para o mesmo
`public_html/` (o roteamento por `/admin` continua funcionando, só
fica redundante no caminho da URL) — não é necessário para esta fase,
é só uma opção.

## 8. Habilitar HTTPS

hPanel → **SSL** → ative o certificado gratuito (Let's Encrypt) para o
domínio. Depois de ativo, force HTTPS (opção no próprio painel de SSL,
ou adicione uma regra de redirect no `.htaccess` se o painel não
oferecer isso diretamente).

## 9. Configurar Cron Jobs

hPanel → **Avançado** → **Cron Jobs**. Crie três jobs (caminhos
absolutos — ajuste `/home/usuario/private` para o seu):

| Frequência | Comando |
|---|---|
| A cada hora | `php /home/usuario/private/cron/limpar-sessoes-expiradas.php` |
| A cada 5 minutos | `php /home/usuario/private/cron/processar-fila-email.php` |
| A cada 20 minutos | `php /home/usuario/private/cron/reconciliar-pagamentos-pendentes.php` |

Os três usam lock de arquivo (`flock`) — se uma execução atrasar e a
próxima disparar antes de terminar, a segunda sai sem fazer nada, em
vez de rodar em paralelo. Envie `backend/cron/` para `private/cron/`
(mesmo tratamento de `backend/src/` — fora do document root).

## 10. Configurar SMTP

hPanel → **E-mails** → crie uma conta (ex. `naoresponda@seudominio.com.br`).
Preencha no `.env`: `SMTP_HOST` (geralmente `smtp.hostinger.com`),
`SMTP_PORT=587`, `SMTP_USER`/`SMTP_PASSWORD` (credenciais da conta de
e-mail criada), `SMTP_FROM_EMAIL`. Sem essas variáveis, o cron de
e-mail simplesmente não faz nada (não quebra) — ver
`backend/src/Email/SmtpMailer.php`.

⚠️ Não testado contra o SMTP real da Hostinger nesta sessão — validar
o envio de um e-mail de teste antes de divulgar o site.

## 11. Configurar webhook do Mercado Pago

1. No painel do Mercado Pago (Suas integrações → sua aplicação →
   Webhooks), configure a URL `https://seudominio.com.br/api/webhooks/mercadopago`.
2. Copie o "Webhook secret" gerado lá para `MP_WEBHOOK_SECRET` no `.env`.
3. Copie o Access Token (produção ou sandbox, conforme
   `MP_ENVIRONMENT`) para `MP_ACCESS_TOKEN`.

⚠️ Não testado contra a API real do Mercado Pago nesta sessão — sem
credenciais disponíveis. O checkout já funciona sem essas variáveis
(cria o pedido, só sem PIX disponível) — mas **valide com uma conta
sandbox antes de aceitar pagamento real**: crie um pedido de teste,
confirme que o QR code é gerado, pague com uma conta de teste do
Mercado Pago, e confirme que o webhook marca o pedido como pago.

## 12. Criar primeiro administrador

Não existe cadastro público no painel (formulário de registro em área
administrativa é convite a força bruta). O primeiro (e qualquer outro)
administrador é criado via CLI:

```bash
php backend/bin/criar-admin.php --email=voce@exemplo.com --nome="Seu Nome"
```

Precisa de acesso SSH para rodar isso diretamente na Hostinger. Sem
SSH, rode localmente apontando `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/
`DB_PASSWORD` do `.env` para o host remoto do banco (mesmo caminho do
passo 3 para o seed). O script mostra a senha gerada **uma única vez**
no terminal — guarde-a num gerenciador de senhas imediatamente.

## 13. Remover/desabilitar o instalador

Não há instalador nesta fase (sem wizard de setup).

## 14. Testar permissões de arquivos

- `private/.env` e `private/storage/logs/` não devem ser acessíveis
  via URL — teste abrindo `https://seudominio.com/../private/.env` e
  variações; deve dar 403/404, nunca mostrar o conteúdo.
- `public_html/` não deve ter listagem de diretório habilitada (teste
  acessando uma pasta sem `index.html`, ex. `https://seudominio.com/assets/`).
- Permissões recomendadas: diretórios `755`, arquivos `644` (ajuste via
  Gerenciador de Arquivos do hPanel ou `chmod` por SSH se disponível).

## 15. Backup e restauração

- **Banco**: phpMyAdmin → **Exportar** (formato SQL) periodicamente, ou
  configure o backup automático do hPanel se o plano incluir.
- **Arquivos**: `private/` e `public_html/` via backup do hPanel ou
  download manual por FTP.
- **Teste de restauração**: importe o dump SQL exportado num banco de
  teste separado e confirme que `SELECT COUNT(*) FROM products` bate
  com o esperado, antes de confiar no backup como válido.

## Checklist de validação desta fase

Ver `deploy/checklist-producao.md`.

# Relatório — Migração para Hostinger, Fase 2

## Contexto

Continuação da Fase 1 (`docs/migracao/00-relatorio-fase1.md`). Escopo
combinado: login administrativo, CRUD de categorias/produtos/imagens,
controle simples de estoque e configurações básicas da loja — o mesmo
recorte descrito como "Fase 2" no pedido original. Carrinho, checkout,
pagamento, cupons e e-mail continuam fora do escopo.

## O que foi entregue

- **Migrations** `0008_users.sql` a `0011_audit_logs.sql`.
- **Backend PHP**: `App\Auth` (senha, sessão, rate limit, CSRF),
  `App\Audit` (auditoria), `App\Admin` (CRUD de categorias, produtos,
  imagens, configurações), script CLI `backend/bin/criar-admin.php`.
- **Endpoints** sob `/api/admin/*` (login, logout, sessão atual, CRUD
  de categorias/produtos, estoque por variação, upload/remoção de
  imagem, leitura/escrita de configurações).
- **Frontend admin** (`frontend/admin/`): SPA Vite separada da loja,
  servida em `/admin`, com login, shell autenticado e telas de
  categorias, produtos (com estoque e upload de imagem) e
  configurações.

## Decisões de segurança e por quê

- **Hash de senha**: `password_hash()`/`password_verify()` nativo do
  PHP (Argon2id quando disponível, senão bcrypt) — decisão já
  registrada na Fase 1, mantida aqui: sem usuário real a preservar,
  não há motivo para replicar o scrypt customizado do TypeScript
  original.
- **Sessão DB-backed**, não JWT: permite revogar todas as sessões de
  um usuário instantaneamente (`Session::destroyAllForUser`), mesmo
  padrão do `packages/auth/src/session.ts` original. Cookie
  `HttpOnly` + `Secure` (obrigatório, só desliga com
  `COOKIE_SECURE=false` explícito em dev) + `SameSite=Lax`.
- **RBAC simplificado**: só existe `users.is_admin` (booleano), não o
  RBAC completo do `schema.prisma` original (`Role`/`Permission`/
  `RolePermission`/`UserRole`). Decisão explícita do pedido original:
  "adiar múltiplos papéis se apenas uma pessoa usar o painel". Migrar
  para RBAC completo depois significa: criar as tabelas que faltam,
  adicionar uma coluna de papel (ou tabela de associação) e trocar
  `AuthGuard::requireAdmin()` por uma checagem de permissão granular —
  não deveria exigir tocar nas rotas em si.
- **CSRF**: token por sessão, comparado via `hash_equals` contra o
  header `X-CSRF-Token` em toda mutação. Isso preenche uma lacuna que
  o próprio inventário da Fase 1 já tinha identificado:
  `packages/auth` original **não tinha** proteção CSRF nenhuma — foi
  escrita do zero aqui, não portada.
- **Rate limit de login persistente** (tabela `login_attempts`, não
  memória de processo) — 5 tentativas falhas por e-mail OU por IP em
  15 minutos.
- **Mensagem de login uniforme**: "e-mail ou senha inválidos" tanto
  para e-mail inexistente quanto para senha errada, com uma verificação
  de hash "de mentira" quando o e-mail não existe, para igualar o
  tempo de resposta — mesma técnica do `packages/auth/src/password.ts`
  original (`gastarTempoDeVerificacao`), reimplementada em PHP.
- **Validação de origem**: mutações administrativas conferem
  `Origin`/`Referer` contra `PUBLIC_SITE_URL` como camada extra além
  do CSRF (só ativa quando `PUBLIC_SITE_URL` está configurado — em dev
  local sem essa variável, não bloqueia).
- **Upload de imagem**: assinatura real do arquivo via `getimagesize()`
  + `finfo` (não confia em extensão nem `Content-Type` do navegador),
  nome do arquivo sempre gerado aleatoriamente, limite de 5 MB, pasta
  de destino com PHP desligado via `.htaccess`.

## O que foi adiado dentro da própria Fase 2

- **Redimensionamento/compressão de imagem via GD/Imagick**: o upload
  salva o arquivo original sem gerar miniatura nem comprimir. O código
  já isola a validação num repositório dedicado
  (`ProductImageAdminRepository`), então adicionar isso depois é
  incremental — mas não foi feito agora porque a disponibilidade de
  GD/Imagick no plano Hostinger do cliente **ainda não foi confirmada**
  (mesma pendência já registrada no relatório da Fase 1).
- **Reset de senha / troca de senha pelo próprio usuário**: não existe
  tela nem endpoint para isso ainda — só o CLI `criar-admin.php`
  cria contas. Se uma senha precisar ser redefinida hoje, é manual via
  phpMyAdmin (gerar um novo hash e substituir `password_hash` — **não
  fazer isso sem necessidade real**, é um procedimento de emergência).
- **Movimentação de estoque auditável em tabela própria**
  (`inventory_movements`, do schema original): o ajuste de estoque
  desta fase só grava o antes/depois no `audit_logs.changes`, não cria
  uma linha por movimento. Suficiente para "controle simples de
  estoque" (escopo da Fase 2); a tabela `inventory_movements` fica
  classificada como "necessária depois" (reserva de estoque no
  checkout, Fase 3, é quando ela realmente importa).
- **Formulário de configurações com campos reais**: a tela de
  `/admin/configuracoes` edita cada chave como um textarea de JSON —
  funcional, mas menos amigável que um formulário dedicado por chave
  (campo de texto para o título do hero, campo de URL para a imagem,
  etc). Fica registrado como melhoria de UX natural para quando o
  cliente for usar essa tela no dia a dia.

## Verificação executada

PHP e MariaDB foram instalados localmente (via `winget`, só para
viabilizar este teste — nenhum dos dois vai para a Hostinger) e o
fluxo completo do painel foi testado fim-a-fim contra um banco real,
via `curl`, com o backend rodando em `php -S`:

- `php -l` em todos os arquivos novos de `backend/src/Auth`,
  `backend/src/Admin`, `backend/src/Audit` — sem erro.
- Migrations `0008`–`0011` aplicadas sem erro (11 tabelas no total,
  incluindo as da Fase 1).
- `backend/bin/criar-admin.php` — criou o usuário e imprimiu a senha
  gerada corretamente.
- **Login**: senha errada devolve mensagem genérica ("e-mail ou senha
  inválidos") tanto para e-mail inexistente quanto para senha errada;
  login correto devolve `csrfToken` e grava cookie de sessão.
- **CSRF**: mutação sem o header `X-CSRF-Token` → 403; com o token
  certo → funciona.
- **Sessão**: `/api/admin/eu` sem cookie → 401; logout invalida a
  sessão no banco (chamada seguinte também vira 401).
- **Rate limit**: 5 tentativas de login com senha errada bloqueiam a
  próxima (mesmo com senha certa) com 429; todas as tentativas ficam
  em `audit_logs`.
- **Exclusão de categoria com produtos ativos**: bloqueada com 422 e
  mensagem clara, testado contra uma categoria com 5 produtos de
  verdade no seed.
- **Upload de imagem**: um arquivo de texto disfarçado de `.jpg` foi
  rejeitado ("não é uma imagem válida" — a assinatura real do arquivo
  não bate); um PNG real de verdade foi aceito, salvo com nome
  aleatório e a `product_images` correspondente criada.
  - **Um bug real foi encontrado e corrigido nesse teste**: o
    `UPLOAD_DIR` do `.env.example` fica vazio de propósito
    (`UPLOAD_DIR=`), e `Env::get()` tratava string vazia como "valor
    definido" em vez de cair no default — o upload falhava com
    `mkdir(): Invalid path`. Corrigido em
    `backend/src/Config/Env.php` (agora `""` é tratado como ausente,
    mesma convenção já usada em `apps/storefront/src/lib/env.ts`).
- **Estoque**: valor negativo rejeitado (422); valor válido aplicado e
  registrado em auditoria com antes/depois.
- `npm install && npm run build` em `frontend/admin` e
  `frontend/storefront` (rebuild após as correções acima) — TypeScript
  e build do Vite sem erro nos dois.
- `backend/tests/` via PHPUnit — 18 testes, 33 assertions, todos
  passando (inclui os testes portados na Fase 1, que continuam
  válidos).

Não testado nesta sessão: comportamento sob Apache/LiteSpeed real (só
o servidor embutido do PHP foi usado — ele não processa `.htaccess`,
então a proteção "PHP não executa em `/uploads`" não foi validada em
runtime, só por inspeção do arquivo), TLS, GD/Imagick (a extensão
`gd` carregou localmente, mas a disponibilidade no plano Hostinger
real continua não confirmada), e o ambiente real da Hostinger em si.

## Próximos passos antes de considerar a Fase 2 pronta para produção

1. Testar o `.htaccess` de `backend/public/uploads/` sob Apache de
   verdade (local com XAMPP/WAMP, ou já na Hostinger) — o servidor
   embutido do PHP usado nesta sessão não valida isso.
2. Repetir o fluxo de login → CRUD → upload → logout já testado aqui,
   mas contra o ambiente real da Hostinger, seguindo
   `deploy/checklist-producao.md` (seção "Painel administrativo").
3. Confirmar com o cliente/Hostinger se GD ou Imagick estão
   disponíveis, para decidir se vale investir em redimensionamento de
   imagem antes do lançamento ou deixar para depois.

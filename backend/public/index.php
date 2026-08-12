<?php

declare(strict_types=1);

/**
 * Front controller único do backend.
 *
 * Duas responsabilidades, separadas por prefixo de rota:
 *   - /api/*                 -> API REST em JSON (catálogo, somente leitura na Fase 1)
 *   - qualquer outra rota    -> serve o shell da SPA (frontend/storefront/dist/index.html),
 *                               injetando <title>/meta description/JSON-LD por rota
 *                               ("SSR-lite"), sem precisar de Node em produção.
 *
 * Arquivos estáticos (JS/CSS/imagens) NÃO passam por aqui — o .htaccess
 * os serve direto do disco antes de chegar neste script.
 */

// --- Autoloader manual (App\Foo\Bar -> backend/src/Foo/Bar.php) --------
// Sem Composer: a Hostinger compartilhada não garante SSH, e o núcleo
// deste backend não tem nenhuma dependência de terceiros.
spl_autoload_register(function (string $class): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $relative = substr($class, strlen('App\\'));
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

use App\Admin\AuditLogAdminRepository;
use App\Admin\CategoryAdminRepository;
use App\Admin\CouponAdminRepository;
use App\Admin\CustomerAdminRepository;
use App\Admin\OrderAdminRepository;
use App\Admin\ProductAdminRepository;
use App\Admin\ProductImageAdminRepository;
use App\Admin\SettingsAdminRepository;
use App\Audit\AuditLogger;
use App\Auth\AuthGuard;
use App\Auth\PasswordHasher;
use App\Auth\RateLimiter;
use App\Auth\Session;
use App\Auth\UserRepository;
use App\Cart\CartRepository;
use App\Catalog\CategoryRepository;
use App\Catalog\ProductFilters;
use App\Catalog\ProductRepository;
use App\Checkout\CheckoutService;
use App\Config\Env;
use App\Content\ContentPageRepository;
use App\Coupons\CouponRepository;
use App\Content\SettingsRepository;
use App\Database\Connection;
use App\Email\EmailQueue;
use App\Http\DomainException;
use App\Http\NotFoundException;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;
use App\Http\TooManyRequestsException;
use App\Http\ValidationException;
use App\Orders\OrderRepository;
use App\Payments\MercadoPagoWebhookHandler;
use App\Payments\PaymentRepository;

Env::load(__DIR__ . '/../../.env');

// Nunca vazar detalhe técnico numa resposta de produção.
$isDebug = Env::bool('APP_DEBUG', false);
error_reporting($isDebug ? E_ALL : 0);
ini_set('display_errors', $isDebug ? '1' : '0');

// --- Segurança básica de resposta ---------------------------------------
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

$requestPath = '/' . ltrim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (str_starts_with($requestPath, '/api/')) {
    handleApi($method, $requestPath);
    exit;
}

if ($requestPath === '/sitemap.xml') {
    handleSitemap();
    exit;
}

if ($requestPath === '/robots.txt') {
    handleRobots();
    exit;
}

// /admin é servido pelo shell da SPA administrativa (frontend/admin) —
// nunca pelo do storefront. Sem SSR-lite aqui: não há SEO a otimizar
// numa área que já é noindex por definição.
if ($requestPath === '/admin' || str_starts_with($requestPath, '/admin/')) {
    handleAdminShell();
    exit;
}

handleSpaShell($requestPath);
exit;

// =========================================================================
// API
// =========================================================================

function handleApi(string $method, string $path): void
{
    try {
        $db = Connection::get();
    } catch (\Throwable $e) {
        Response::error('SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.', 503);
        return;
    }

    $router = new Router();

    $router->get('/api/saude', function () use ($db): void {
        Response::json(['status' => 'ok']);
    });

    $router->get('/api/categorias', function () use ($db): void {
        $repo = new CategoryRepository($db);
        $data = isset($_GET['home']) ? $repo->findHomeCategories() : $repo->findAllCategories();
        Response::json(['data' => $data]);
    });

    $router->get('/api/categorias/{slug}', function (array $params) use ($db): void {
        $repo = new CategoryRepository($db);
        $category = $repo->findBySlug($params['slug']);
        if ($category === null) {
            throw new NotFoundException('Categoria não encontrada.');
        }
        Response::json(['data' => $category]);
    });

    $router->get('/api/produtos', function () use ($db): void {
        $filters = ProductFilters::fromQuery($_GET);
        $repo = new ProductRepository($db);
        $categories = new CategoryRepository($db);

        Response::json([
            'data' => $repo->findProducts($filters),
            'meta' => [
                'categories' => $categories->findAllCategories(),
                'priceRange' => $repo->getPriceRange(),
            ],
        ]);
    });

    $router->get('/api/produtos/destaque', function () use ($db): void {
        $repo = new ProductRepository($db);
        $limit = isset($_GET['limite']) ? max(1, min(24, (int) $_GET['limite'])) : 6;
        Response::json(['data' => $repo->findFeaturedProducts($limit)]);
    });

    $router->get('/api/produtos/{slug}', function (array $params) use ($db): void {
        $repo = new ProductRepository($db);
        $product = $repo->findBySlug($params['slug']);
        if ($product === null) {
            throw new NotFoundException('Peça não encontrada.');
        }
        Response::json(['data' => $product]);
    });

    $router->get('/api/produtos/{slug}/relacionados', function (array $params) use ($db): void {
        $repo = new ProductRepository($db);
        $product = $repo->findBySlug($params['slug']);
        if ($product === null) {
            throw new NotFoundException('Peça não encontrada.');
        }
        Response::json(['data' => $repo->findRelatedProducts($product['id'], $product['categorySlug'])]);
    });

    $router->get('/api/conteudo/{slug}', function (array $params) use ($db): void {
        $repo = new ContentPageRepository($db);
        $page = $repo->findBySlug($params['slug']);
        if ($page === null) {
            throw new NotFoundException('Página não encontrada.');
        }
        Response::json(['data' => $page]);
    });

    $router->get('/api/configuracoes/publicas', function () use ($db): void {
        $repo = new SettingsRepository($db);
        Response::json(['data' => $repo->getPublicSettings()]);
    });

    registerAdminRoutes($router, $db);
    registerCommerceRoutes($router, $db);

    try {
        $router->dispatch($method, $path);
    } catch (DomainException $e) {
        Response::fromException($e);
    } catch (\Throwable $e) {
        error_log('[api] erro não tratado: ' . $e->getMessage());
        Response::error('INTERNAL_ERROR', 'Algo deu errado. Tente novamente em instantes.', 500);
    }
}

// =========================================================================
// Admin — login/sessão/RBAC-lite + CRUD de catálogo (Fase 2)
// =========================================================================

/**
 * Confere que a requisição de mutação partiu do próprio site (defesa
 * adicional ao CSRF por token, contra alguns cenários de CSRF que o
 * token sozinho não cobre) — ver checklist "validação de origem nos
 * endpoints sensíveis".
 */
function assertTrustedOrigin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? null;
    $siteUrl = Env::get('PUBLIC_SITE_URL');
    if ($origin === null || $siteUrl === null || $siteUrl === '') {
        return; // sem PUBLIC_SITE_URL configurado (dev local), não bloqueia
    }
    if (!str_starts_with($origin, rtrim($siteUrl, '/'))) {
        throw new \App\Http\ForbiddenException('Origem da requisição não confiável.');
    }
}

function registerAdminRoutes(Router $router, \PDO $db): void
{
    $session = new Session($db);
    $audit = new AuditLogger($db);

    $router->post('/api/admin/entrar', function () use ($db, $session, $audit): void {
        $body = Request::jsonBody();
        $email = mb_strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $ip = AuthGuard::clientIp() ?? '0.0.0.0';
        $userAgent = AuthGuard::userAgent();

        if ($email === '' || $password === '') {
            throw new ValidationException('Informe e-mail e senha.');
        }

        $limiter = new RateLimiter($db);
        if ($limiter->tooManyAttempts($email, $ip)) {
            throw new TooManyRequestsException('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        }

        $users = new UserRepository($db);
        $user = $users->findByEmail($email);

        // Mensagem idêntica para "não existe" e "senha errada" — não
        // revelar se o e-mail está cadastrado (ver checklist).
        $credenciaisInvalidas = fn () => throw new ValidationException('E-mail ou senha inválidos.');

        if ($user === null) {
            // Ainda gasta tempo verificando um hash "de mentira", para que
            // "usuário não existe" e "senha errada" levem o mesmo tempo.
            PasswordHasher::verify($password, '$2y$10$C6UzMDM.H6dfI/f/IKcEeO0eZuqXQnJujzlCq7GmLA9F2G6z8xIT.');
            $limiter->recordAttempt($email, $ip, false);
            $audit->registrarLoginFalho($email, 'usuário não encontrado', $ip, $userAgent);
            $credenciaisInvalidas();
        }

        if (!PasswordHasher::verify($password, $user['password_hash'])) {
            $limiter->recordAttempt($email, $ip, false);
            $audit->registrarLoginFalho($email, 'senha incorreta', $ip, $userAgent);
            $credenciaisInvalidas();
        }

        if (!(bool) $user['is_active']) {
            $limiter->recordAttempt($email, $ip, false);
            $audit->registrarLoginFalho($email, 'usuário inativo', $ip, $userAgent);
            $credenciaisInvalidas();
        }

        $limiter->recordAttempt($email, $ip, true);
        $users->touchLastLogin($user['id']);
        $created = $session->create($user['id'], $ip, $userAgent);

        $audit->registrar(['id' => $user['id'], 'email' => $user['email']], 'auth.login', 'session', $user['id'], $user['name'], null, $ip, $userAgent);

        Response::json(['data' => [
            'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'isAdmin' => (bool) $user['is_admin']],
            'csrfToken' => $created['csrfToken'],
        ]]);
    });

    // Sem exigir CSRF aqui de propósito: o pior que um CSRF de logout
    // consegue é deslogar a vítima — irritante, não perigoso — e exigir
    // token bloquearia o botão "Sair" justo quando a sessão já expirou.
    $router->post('/api/admin/sair', function () use ($db, $session, $audit): void {
        $current = $session->resolveCurrent();
        $session->destroyCurrent();
        if ($current !== null) {
            $audit->registrar($current['user'], 'auth.logout', 'session', $current['user']['id'], $current['user']['name'], null, AuthGuard::clientIp(), AuthGuard::userAgent());
        }
        Response::json(['data' => ['ok' => true]]);
    });

    $router->get('/api/admin/eu', function () use ($session): void {
        $current = AuthGuard::requireSession($session);
        Response::json(['data' => ['user' => $current['user'], 'csrfToken' => $current['csrfToken']]]);
    });

    // --- Categorias ---------------------------------------------------

    $router->get('/api/admin/categorias', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new CategoryAdminRepository($db))->listAll()]);
    });

    $router->post('/api/admin/categorias', function () use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        validateCategoryPayload($body);

        $repo = new CategoryAdminRepository($db);
        $id = $repo->create($body);
        $audit->registrar($current['user'], 'category.create', 'category', $id, $body['name'] ?? null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => $repo->findById($id)], 201);
    });

    $router->put('/api/admin/categorias/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();

        $repo = new CategoryAdminRepository($db);
        $changes = $repo->update($params['id'], $body);
        if ($changes !== []) {
            $audit->registrar($current['user'], 'category.update', 'category', $params['id'], $body['name'] ?? null, $changes, AuthGuard::clientIp(), AuthGuard::userAgent());
        }
        Response::json(['data' => $repo->findById($params['id'])]);
    });

    $router->delete('/api/admin/categorias/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        (new CategoryAdminRepository($db))->softDelete($params['id']);
        $audit->registrar($current['user'], 'category.delete', 'category', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    // --- Produtos -------------------------------------------------------

    $router->get('/api/admin/produtos', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new ProductAdminRepository($db))->listAll()]);
    });

    $router->get('/api/admin/produtos/{id}', function (array $params) use ($db, $session): void {
        AuthGuard::requireSession($session);
        $product = (new ProductAdminRepository($db))->findById($params['id']);
        if ($product === null) {
            throw new NotFoundException('Produto não encontrado.');
        }
        Response::json(['data' => $product]);
    });

    $router->post('/api/admin/produtos', function () use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        validateProductPayload($body);

        $repo = new ProductAdminRepository($db);
        $id = $repo->create($body);
        $audit->registrar($current['user'], 'product.create', 'product', $id, $body['name'] ?? null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => $repo->findById($id)], 201);
    });

    $router->put('/api/admin/produtos/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();

        $repo = new ProductAdminRepository($db);
        $changes = $repo->update($params['id'], $body);
        if ($changes !== []) {
            $audit->registrar($current['user'], 'product.update', 'product', $params['id'], $body['name'] ?? null, $changes, AuthGuard::clientIp(), AuthGuard::userAgent());
        }
        Response::json(['data' => $repo->findById($params['id'])]);
    });

    $router->delete('/api/admin/produtos/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        (new ProductAdminRepository($db))->softDelete($params['id']);
        $audit->registrar($current['user'], 'product.delete', 'product', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    $router->put('/api/admin/variantes/{id}/estoque', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        if (!isset($body['stock']) || !is_int($body['stock'])) {
            throw new ValidationException('Informe "stock" como número inteiro.');
        }

        $change = (new ProductAdminRepository($db))->updateVariantStock($params['id'], $body['stock']);
        if ($change !== null) {
            $audit->registrar($current['user'], 'product.stock.update', 'product_variant', $params['id'], null, ['stock' => $change], AuthGuard::clientIp(), AuthGuard::userAgent());
        }
        Response::json(['data' => ['ok' => true]]);
    });

    $router->post('/api/admin/produtos/{id}/imagens', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);

        $file = $_FILES['imagem'] ?? null;
        if ($file === null) {
            throw new ValidationException('Envie o arquivo no campo "imagem" (multipart/form-data).');
        }

        $alt = (string) ($_POST['alt'] ?? '');
        $isPrimary = ($_POST['isPrimary'] ?? '') === '1';

        $uploadDir = Env::get('UPLOAD_DIR', __DIR__ . '/uploads/produtos');
        $publicUrlPrefix = Env::get('UPLOAD_PUBLIC_URL', '/uploads/produtos');

        $repo = new ProductImageAdminRepository($db, $uploadDir, $publicUrlPrefix);
        $imageId = $repo->upload($params['id'], $file, $alt, $isPrimary);

        $audit->registrar($current['user'], 'product.image.add', 'product', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['id' => $imageId]], 201);
    });

    $router->delete('/api/admin/imagens/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);

        $uploadDir = Env::get('UPLOAD_DIR', __DIR__ . '/uploads/produtos');
        $publicUrlPrefix = Env::get('UPLOAD_PUBLIC_URL', '/uploads/produtos');

        (new ProductImageAdminRepository($db, $uploadDir, $publicUrlPrefix))->delete($params['id']);
        $audit->registrar($current['user'], 'product.image.delete', 'product_image', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    // --- Configurações ---------------------------------------------------

    $router->get('/api/admin/configuracoes', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new SettingsAdminRepository($db))->listAll()]);
    });

    $router->put('/api/admin/configuracoes/{key}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        if (!array_key_exists('value', $body)) {
            throw new ValidationException('Informe "value".');
        }

        (new SettingsAdminRepository($db))->upsert($params['key'], $body['value'], (string) ($body['group'] ?? 'geral'));
        $audit->registrar($current['user'], 'settings.update', 'setting', $params['key'], $params['key'], null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    // --- Pedidos (Fase 4) -------------------------------------------------

    $router->get('/api/admin/pedidos', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        $status = isset($_GET['status']) ? (string) $_GET['status'] : null;
        Response::json(['data' => (new OrderAdminRepository($db, new OrderRepository($db)))->listAll($status)]);
    });

    $router->get('/api/admin/pedidos/{id}', function (array $params) use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new OrderAdminRepository($db, new OrderRepository($db)))->findById($params['id'])]);
    });

    $router->put('/api/admin/pedidos/{id}/status', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        if (!isset($body['status'])) {
            throw new ValidationException('Informe "status".');
        }

        $repo = new OrderAdminRepository($db, new OrderRepository($db));
        $repo->transition($params['id'], (string) $body['status'], $body['note'] ?? null, $current['user']['email']);
        $audit->registrar($current['user'], 'order.status.update', 'order', $params['id'], (string) $body['status'], ['status' => ['de' => null, 'para' => $body['status']]], AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => $repo->findById($params['id'])]);
    });

    $router->put('/api/admin/pedidos/{id}/nota-interna', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        (new OrderAdminRepository($db, new OrderRepository($db)))->setInternalNote($params['id'], (string) ($body['note'] ?? ''));
        $audit->registrar($current['user'], 'order.note.update', 'order', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    // --- Cupons (Fase 4) ---------------------------------------------------

    $router->get('/api/admin/cupons', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new CouponAdminRepository($db))->listAll()]);
    });

    $router->post('/api/admin/cupons', function () use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();
        if (trim((string) ($body['code'] ?? '')) === '' || !isset($body['discountType'], $body['discountValue'])) {
            throw new ValidationException('Informe código, tipo e valor de desconto.');
        }

        $repo = new CouponAdminRepository($db);
        $id = $repo->create($body);
        $audit->registrar($current['user'], 'coupon.create', 'coupon', $id, $body['code'], null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => $repo->findById($id)], 201);
    });

    $router->put('/api/admin/cupons/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        $body = Request::jsonBody();

        $repo = new CouponAdminRepository($db);
        $repo->update($params['id'], $body);
        $audit->registrar($current['user'], 'coupon.update', 'coupon', $params['id'], $body['code'] ?? null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => $repo->findById($params['id'])]);
    });

    $router->delete('/api/admin/cupons/{id}', function (array $params) use ($db, $session, $audit): void {
        $current = requireAuthenticatedMutation($session);
        (new CouponAdminRepository($db))->delete($params['id']);
        $audit->registrar($current['user'], 'coupon.delete', 'coupon', $params['id'], null, null, AuthGuard::clientIp(), AuthGuard::userAgent());
        Response::json(['data' => ['ok' => true]]);
    });

    // --- Clientes (Fase 4) --------------------------------------------------

    $router->get('/api/admin/clientes', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new CustomerAdminRepository($db))->listAll()]);
    });

    $router->get('/api/admin/clientes/{email}/pedidos', function (array $params) use ($db, $session): void {
        AuthGuard::requireSession($session);
        Response::json(['data' => (new CustomerAdminRepository($db))->findOrdersByEmail(urldecode($params['email']))]);
    });

    // --- Auditoria (Fase 4) --------------------------------------------------

    $router->get('/api/admin/auditoria', function () use ($db, $session): void {
        AuthGuard::requireSession($session);
        $action = isset($_GET['acao']) ? (string) $_GET['acao'] : null;
        $entityType = isset($_GET['tipo']) ? (string) $_GET['tipo'] : null;
        Response::json(['data' => (new AuditLogAdminRepository())->listRecent($db, $action, $entityType)]);
    });
}

/**
 * Toda rota de mutação do painel passa por aqui: sessão válida +
 * origem confiável + CSRF batendo. A checagem de permissão em si
 * (`isAdmin`) é feita depois, por quem chamar — hoje só existe o papel
 * único "admin" (RBAC completo fica para quando houver mais de uma
 * pessoa usando o painel).
 *
 * @return array{sessionId: string, csrfToken: string, user: array<string, mixed>}
 */
function requireAuthenticatedMutation(Session $session): array
{
    $current = AuthGuard::requireSession($session);
    AuthGuard::requireAdmin($current);
    assertTrustedOrigin();
    AuthGuard::requireCsrf($current);
    return $current;
}

/** @param array<string, mixed> $body */
function validateCategoryPayload(array $body): void
{
    if (trim((string) ($body['name'] ?? '')) === '') {
        throw new ValidationException('Informe o nome da categoria.');
    }
    if (trim((string) ($body['slug'] ?? '')) === '') {
        throw new ValidationException('Informe o slug da categoria.');
    }
}

/** @param array<string, mixed> $body */
function validateProductPayload(array $body): void
{
    if (trim((string) ($body['name'] ?? '')) === '') {
        throw new ValidationException('Informe o nome do produto.');
    }
    if (trim((string) ($body['slug'] ?? '')) === '') {
        throw new ValidationException('Informe o slug do produto.');
    }
    if (trim((string) ($body['description'] ?? '')) === '') {
        throw new ValidationException('Informe a descrição do produto.');
    }
    if (trim((string) ($body['categoryId'] ?? '')) === '') {
        throw new ValidationException('Selecione uma categoria.');
    }
    if (!isset($body['basePriceInCents']) || !is_int($body['basePriceInCents']) || $body['basePriceInCents'] <= 0) {
        throw new ValidationException('Informe um preço válido, em centavos.');
    }
}

// =========================================================================
// Carrinho, checkout, pedidos e webhook do Mercado Pago (Fase 3)
// =========================================================================

function registerCommerceRoutes(Router $router, \PDO $db): void
{
    $carts = new CartRepository($db);

    $router->get('/api/carrinho', function () use ($db, $carts): void {
        $cartId = $carts->getOrCreateCurrent();
        Response::json(['data' => $carts->getView($cartId)]);
    });

    $router->post('/api/carrinho/itens', function () use ($carts): void {
        $body = Request::jsonBody();
        if (!isset($body['variantId'])) {
            throw new ValidationException('Informe "variantId".');
        }
        $cartId = $carts->getOrCreateCurrent();
        $carts->addItem($cartId, (string) $body['variantId'], (int) ($body['quantity'] ?? 1));
        Response::json(['data' => $carts->getView($cartId)], 201);
    });

    $router->put('/api/carrinho/itens/{id}', function (array $params) use ($carts): void {
        $body = Request::jsonBody();
        if (!isset($body['quantity'])) {
            throw new ValidationException('Informe "quantity".');
        }
        $cartId = $carts->getOrCreateCurrent();
        $carts->updateItemQuantity($cartId, $params['id'], (int) $body['quantity']);
        Response::json(['data' => $carts->getView($cartId)]);
    });

    $router->delete('/api/carrinho/itens/{id}', function (array $params) use ($carts): void {
        $cartId = $carts->getOrCreateCurrent();
        $carts->removeItem($cartId, $params['id']);
        Response::json(['data' => $carts->getView($cartId)]);
    });

    $router->post('/api/checkout', function () use ($db, $carts): void {
        $body = Request::jsonBody();
        $cartId = $carts->getOrCreateCurrent();

        $service = new CheckoutService(
            $db,
            $carts,
            new OrderRepository($db),
            new PaymentRepository($db),
            new EmailQueue($db),
            new CouponRepository($db),
        );

        $result = $service->checkout($cartId, $body);
        Response::json(['data' => $result], 201);
    });

    $router->get('/api/pedidos/{token}', function (array $params) use ($db): void {
        $order = (new OrderRepository($db))->findByTrackingToken($params['token']);
        Response::json(['data' => $order]);
    });

    $router->post('/api/webhooks/mercadopago', function () use ($db): void {
        $handler = new MercadoPagoWebhookHandler($db, new PaymentRepository($db), new OrderRepository($db));

        $headers = [];
        foreach (function_exists('getallheaders') ? getallheaders() : [] as $name => $value) {
            $headers[strtolower($name)] = $value;
        }

        $handler->handle($_GET, Request::jsonBody(), $headers);
        Response::json(['received' => true]);
    });
}

// =========================================================================
// Sitemap / robots
// =========================================================================

function handleSitemap(): void
{
    header('Content-Type: application/xml; charset=utf-8');

    $siteUrl = rtrim(Env::get('PUBLIC_SITE_URL', ''), '/');
    $urls = [['loc' => $siteUrl . '/', 'priority' => '1.0'], ['loc' => $siteUrl . '/loja', 'priority' => '0.9']];

    try {
        $db = Connection::get();

        foreach ((new ProductRepository($db))->findAllSlugs() as $slug) {
            $urls[] = ['loc' => "{$siteUrl}/produto/{$slug}", 'priority' => '0.8'];
        }
        foreach ((new CategoryRepository($db))->findAllSlugs() as $slug) {
            $urls[] = ['loc' => "{$siteUrl}/categoria/{$slug}", 'priority' => '0.7'];
        }
        foreach ((new ContentPageRepository($db))->findAllSlugs() as $slug) {
            $urls[] = ['loc' => "{$siteUrl}/{$slug}", 'priority' => '0.3'];
        }
    } catch (\Throwable $e) {
        // Banco indisponível: devolve ao menos as rotas estáticas, igual
        // ao fallback de apps/storefront/src/app/sitemap.ts.
        error_log('[sitemap] banco indisponível: ' . $e->getMessage());
    }

    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($urls as $url) {
        echo '<url><loc>' . htmlspecialchars($url['loc'], ENT_XML1) . '</loc><priority>' . $url['priority'] . '</priority></url>';
    }
    echo '</urlset>';
}

function handleRobots(): void
{
    header('Content-Type: text/plain; charset=utf-8');
    $siteUrl = rtrim(Env::get('PUBLIC_SITE_URL', ''), '/');

    $disallow = ['/admin', '/api/', '/carrinho', '/checkout', '/minha-conta', '/pedido/', '/busca', '/entrar', '/cadastro', '/recuperar-senha'];

    echo "User-agent: *\n";
    foreach ($disallow as $path) {
        echo "Disallow: {$path}\n";
    }
    echo "\nSitemap: {$siteUrl}/sitemap.xml\n";
}

// =========================================================================
// Shell da SPA + SSR-lite de <title>/meta description/JSON-LD
// =========================================================================

function handleSpaShell(string $path): void
{
    $distIndex = Env::get('FRONTEND_DIST_INDEX', __DIR__ . '/../../frontend/storefront/dist/index.html');

    if (!is_file($distIndex)) {
        // Frontend ainda não foi compilado neste ambiente (ex.: dev local
        // rodando só `npm run dev` do Vite, sem build) — não é um erro do
        // backend, só não há o que servir por aqui.
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Backend OK. Rode `npm run build` em frontend/storefront para gerar dist/index.html.\n";
        return;
    }

    $html = file_get_contents($distIndex);
    if ($html === false) {
        http_response_code(500);
        return;
    }

    $meta = resolveMetaForPath($path);

    $html = preg_replace(
        '#<title>.*?</title>#s',
        '<title>' . htmlspecialchars($meta['title'], ENT_QUOTES) . '</title>',
        $html,
        1,
    ) ?? $html;

    $html = preg_replace(
        '#<meta name="description"[^>]*>#',
        '<meta name="description" content="' . htmlspecialchars($meta['description'], ENT_QUOTES) . '">',
        $html,
        1,
    ) ?? $html;

    $extraHead = ($meta['noindex'] ? '<meta name="robots" content="noindex,follow">' : '')
        . ($meta['jsonLd'] !== null
            ? '<script type="application/ld+json">' . json_encode($meta['jsonLd'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>'
            : '');
    $html = str_replace('<!--__EXTRA_HEAD__-->', $extraHead, $html);

    header('Content-Type: text/html; charset=utf-8');
    echo $html;
}

/**
 * Shell da SPA administrativa (frontend/admin). Sempre noindex e com
 * CSP restritiva — é a área mais sensível do site.
 */
function handleAdminShell(): void
{
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'");

    $distIndex = Env::get('ADMIN_DIST_INDEX', __DIR__ . '/../../frontend/admin/dist/index.html');

    if (!is_file($distIndex)) {
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Painel administrativo ainda não compilado. Rode `npm run build` em frontend/admin.\n";
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    readfile($distIndex);
}

/** @return array{title: string, description: string, noindex: bool, jsonLd: ?array} */
function resolveMetaForPath(string $path): array
{
    $siteUrl = rtrim(Env::get('PUBLIC_SITE_URL', ''), '/');
    $default = [
        'title' => 'Pincel & Guia — Porcelana autoral feita à mão',
        'description' => 'Porcelana autoral pintada à mão. Peças dedicadas aos Orixás, Guias e Entidades.',
        'noindex' => false,
        'jsonLd' => null,
    ];

    try {
        $db = Connection::get();
    } catch (\Throwable) {
        return $default;
    }

    $segments = array_values(array_filter(explode('/', $path)));

    try {
        if ($segments === [] ) {
            return $default;
        }

        if ($segments[0] === 'loja') {
            return [...$default, 'title' => 'Loja | Pincel & Guia', 'description' => 'Todas as peças em porcelana autoral pintadas à mão.'];
        }

        if ($segments[0] === 'busca') {
            return [...$default, 'title' => 'Busca | Pincel & Guia', 'noindex' => true];
        }

        if (in_array($segments[0], ['carrinho', 'checkout', 'pedido'], true)) {
            return [...$default, 'title' => 'Sua compra | Pincel & Guia', 'noindex' => true];
        }

        if ($segments[0] === 'categoria' && isset($segments[1])) {
            $category = (new CategoryRepository($db))->findBySlug($segments[1]);
            if ($category === null) {
                return $default;
            }
            // metaTitle já vem com o sufixo " | Pincel & Guia" quando existe
            // (ver seed) — só o fallback pelo nome puro precisa do sufixo.
            return [
                ...$default,
                'title' => $category['metaTitle'] ?? ($category['name'] . ' | Pincel & Guia'),
                'description' => $category['metaDescription'] ?? $category['description'] ?? $default['description'],
            ];
        }

        if ($segments[0] === 'produto' && isset($segments[1])) {
            $product = (new ProductRepository($db))->findBySlug($segments[1]);
            if ($product === null) {
                return $default;
            }
            $description = $product['metaDescription'] ?? $product['shortDescription'] ?? mb_substr($product['description'], 0, 155);
            return [
                'title' => $product['metaTitle'] ?? ($product['name'] . ' | Pincel & Guia'),
                'description' => $description,
                'noindex' => false,
                'jsonLd' => [
                    '@context' => 'https://schema.org',
                    '@type' => 'Product',
                    'name' => $product['name'],
                    'description' => $description,
                    'image' => $product['image'] !== null ? [$siteUrl . $product['image']['url']] : [],
                    'category' => $product['categoryName'],
                    'offers' => [
                        '@type' => 'Offer',
                        'url' => "{$siteUrl}/produto/{$product['slug']}",
                        'priceCurrency' => 'BRL',
                        'price' => number_format($product['effectivePriceInCents'] / 100, 2, '.', ''),
                        'availability' => $product['isAvailable'] ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        'itemCondition' => 'https://schema.org/NewCondition',
                    ],
                ],
            ];
        }

        // Catch-all: página institucional.
        $page = (new ContentPageRepository($db))->findBySlug($segments[0]);
        if ($page !== null) {
            return [
                ...$default,
                'title' => ($page['metaTitle'] ?? $page['title']) . ' | Pincel & Guia',
                'description' => $page['metaDescription'] ?? $default['description'],
                'noindex' => (bool) $page['isPlaceholder'],
            ];
        }
    } catch (\Throwable $e) {
        error_log('[ssr-lite] falha ao resolver meta: ' . $e->getMessage());
    }

    return $default;
}

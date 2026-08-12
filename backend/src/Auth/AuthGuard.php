<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\ForbiddenException;
use App\Http\UnauthorizedException;

/**
 * Porta de guarda de sessão/autorização (equivalente a
 * `requireSession()`/`requirePermission()` do apps/admin original).
 * A checagem AQUI é a defesa real — qualquer ocultação de botão no
 * frontend é só conveniência de UX, nunca segurança.
 */
final class AuthGuard
{
    /** @return array{sessionId: string, csrfToken: string, user: array<string, mixed>} */
    public static function requireSession(Session $session): array
    {
        $current = $session->resolveCurrent();
        if ($current === null) {
            throw new UnauthorizedException('É preciso entrar para continuar.');
        }
        return $current;
    }

    /** @param array{sessionId: string, csrfToken: string, user: array<string, mixed>} $current */
    public static function requireAdmin(array $current): void
    {
        if (!($current['user']['isAdmin'] ?? false)) {
            throw new ForbiddenException('Você não tem permissão para esta ação.');
        }
    }

    /**
     * Toda mutação (POST/PUT/PATCH/DELETE) exige o header X-CSRF-Token
     * batendo com o token da sessão atual — ver backend/src/Auth/Csrf.php.
     *
     * @param array{sessionId: string, csrfToken: string, user: array<string, mixed>} $current
     */
    public static function requireCsrf(array $current): void
    {
        if (!Csrf::verify($current['csrfToken'], Csrf::fromRequestHeader())) {
            throw new ForbiddenException('Token de segurança inválido ou ausente. Recarregue a página e tente novamente.');
        }
    }

    public static function clientIp(): ?string
    {
        return $_SERVER['REMOTE_ADDR'] ?? null;
    }

    public static function userAgent(): ?string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
}

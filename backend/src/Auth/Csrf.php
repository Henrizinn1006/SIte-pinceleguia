<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Proteção CSRF por token double-submit: o token vive na sessão
 * (banco) e o cliente precisa devolvê-lo no header `X-CSRF-Token` em
 * toda mutação (POST/PUT/PATCH/DELETE). Um site de terceiros não
 * consegue ler esse header do cookie — só JavaScript rodando na
 * própria origem consegue, e o navegador barra fetch cross-origin sem
 * CORS explícito.
 */
final class Csrf
{
    public static function verify(string $sessionCsrfToken, ?string $providedToken): bool
    {
        if ($providedToken === null || $providedToken === '') {
            return false;
        }
        return hash_equals($sessionCsrfToken, $providedToken);
    }

    public static function fromRequestHeader(): ?string
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        foreach ($headers as $name => $value) {
            if (strcasecmp($name, 'X-CSRF-Token') === 0) {
                return $value;
            }
        }
        return $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    }
}

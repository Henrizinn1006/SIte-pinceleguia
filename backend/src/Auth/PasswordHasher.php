<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Hash de senha nativo do PHP (Argon2id quando a extensão está
 * disponível — praticamente garantido em PHP 7.3+; cai para bcrypt
 * caso contrário, o que ainda cobre qualquer host PHP 8.x da
 * Hostinger). Decisão registrada: não portar o scrypt customizado de
 * packages/auth/src/password.ts porque não existe usuário real com
 * hash a preservar (confirmado sem dados reais) — usar o que é
 * idiomático em PHP em vez de replicar o formato do TypeScript.
 */
final class PasswordHasher
{
    private static function algorithm(): string
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    }

    public static function hash(string $plain): string
    {
        return password_hash($plain, self::algorithm());
    }

    public static function verify(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }

    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, self::algorithm());
    }
}

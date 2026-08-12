<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Leitor de .env minimalista — sem dependência externa (vlucas/phpdotenv
 * exigiria vendor/ em produção só para isso). Hostinger compartilhada
 * não garante SSH/Composer, então o núcleo do backend não depende de
 * nenhum pacote de terceiros.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $values = [];

    private static bool $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) {
            return;
        }
        self::$loaded = true;

        if (!is_file($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            [$key, $value] = $parts;
            $key = trim($key);
            $value = trim($value);

            if (strlen($value) >= 2 && (
                ($value[0] === '"' && str_ends_with($value, '"')) ||
                ($value[0] === "'" && str_ends_with($value, "'"))
            )) {
                $value = substr($value, 1, -1);
            }

            self::$values[$key] = $value;
        }
    }

    /**
     * "" no .env é comum para chave opcional ainda não preenchida
     * (ex.: `UPLOAD_DIR=` no .env.example) — tratamos como "ausente"
     * para o valor default de fato ser usado, em vez de sobrepor o
     * default com uma string vazia. Mesma convenção do `normalize()`
     * em apps/storefront/src/lib/env.ts.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        if (array_key_exists($key, self::$values) && self::$values[$key] !== '') {
            return self::$values[$key];
        }

        $fromEnv = getenv($key);
        if ($fromEnv !== false && $fromEnv !== '') {
            return $fromEnv;
        }

        return $default;
    }

    public static function required(string $key): string
    {
        $value = self::get($key);
        if ($value === null || $value === '') {
            throw new \RuntimeException("Variável de ambiente obrigatória ausente: {$key}");
        }
        return $value;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);
        if ($value === null) {
            return $default;
        }
        return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
    }
}

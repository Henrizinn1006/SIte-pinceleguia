<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Respostas JSON padronizadas.
 *
 * Erro sempre no formato { "error": { "code", "message" } } — nunca
 * stack trace, nunca SQL, nunca credencial. Ver checklist de produção.
 */
final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $code, string $message, int $status): never
    {
        self::json(['error' => ['code' => $code, 'message' => $message]], $status);
    }

    public static function fromException(DomainException $e): never
    {
        self::error($e->code(), $e->getMessage(), $e->httpStatus());
    }
}

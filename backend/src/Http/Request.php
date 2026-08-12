<?php

declare(strict_types=1);

namespace App\Http;

final class Request
{
    /** Lê e decodifica o corpo JSON da requisição. Nunca lança — corpo ausente/malformado vira array vazio. */
    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}

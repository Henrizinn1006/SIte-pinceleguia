<?php

declare(strict_types=1);

namespace App\Payments;

/**
 * Verifica a assinatura do webhook do Mercado Pago (header
 * `x-signature`, formato `ts=...,v1=...`), conforme a documentação
 * oficial: HMAC-SHA256 sobre o manifesto
 * "id:{data.id};request-id:{x-request-id};ts:{ts};" usando o
 * "Webhook secret" configurado no painel do Mercado Pago
 * (`MP_WEBHOOK_SECRET`).
 *
 * ⚠️ Não testado contra um webhook real do Mercado Pago nesta sessão —
 * sem credenciais/segredo de sandbox disponíveis. Implementado
 * conforme a documentação; validar com um webhook real antes de
 * confiar nisso em produção.
 */
final class MercadoPagoWebhookVerifier
{
    public static function verify(string $signatureHeader, string $requestId, string $dataId, string $secret): bool
    {
        $parts = [];
        foreach (explode(',', $signatureHeader) as $chunk) {
            [$key, $value] = array_pad(explode('=', trim($chunk), 2), 2, null);
            if ($key !== null && $value !== null) {
                $parts[trim($key)] = trim($value);
            }
        }

        $ts = $parts['ts'] ?? null;
        $v1 = $parts['v1'] ?? null;
        if ($ts === null || $v1 === null) {
            return false;
        }

        $manifest = "id:{$dataId};request-id:{$requestId};ts:{$ts};";
        $expected = hash_hmac('sha256', $manifest, $secret);

        return hash_equals($expected, $v1);
    }
}

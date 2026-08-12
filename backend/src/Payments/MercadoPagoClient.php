<?php

declare(strict_types=1);

namespace App\Payments;

use App\Config\Env;

/**
 * Cliente HTTP mínimo para a API do Mercado Pago — via cURL puro, sem
 * o SDK oficial (evita depender de Composer/vendor em produção só por
 * isso). Cobre só o necessário desta fase: criar um pagamento PIX e
 * consultar o status de um pagamento pelo id.
 *
 * ⚠️ Não foi testado contra a API real do Mercado Pago nesta sessão —
 * não há credenciais de sandbox disponíveis. A implementação segue a
 * documentação oficial (POST /v1/payments com payment_method_id=pix),
 * mas precisa ser validada com credenciais reais antes de ir para
 * produção — ver docs/migracao/02-relatorio-fase3.md.
 */
final class MercadoPagoClient
{
    public function __construct(
        private readonly string $accessToken,
        private readonly bool $sandbox = true,
    ) {
    }

    public static function fromEnv(): ?self
    {
        $token = Env::get('MP_ACCESS_TOKEN');
        if ($token === null || $token === '') {
            return null;
        }
        return new self($token, Env::get('MP_ENVIRONMENT', 'sandbox') !== 'production');
    }

    public function isSandbox(): bool
    {
        return $this->sandbox;
    }

    /**
     * Cria um pagamento PIX. `idempotencyKey` deve ser estável por
     * pedido (ex.: o id do pedido) — o Mercado Pago usa o header
     * `X-Idempotency-Key` para não duplicar cobrança em caso de retry
     * de rede do nosso lado.
     *
     * @return array{id: string, status: string, qrCode: ?string, qrCodeBase64: ?string, expiresAt: ?string, raw: array}
     */
    public function createPixPayment(
        int $amountInCents,
        string $description,
        string $payerEmail,
        string $payerName,
        ?string $payerDocument,
        string $idempotencyKey,
    ): array {
        $payload = [
            'transaction_amount' => round($amountInCents / 100, 2),
            'description' => $description,
            'payment_method_id' => 'pix',
            'payer' => array_filter([
                'email' => $payerEmail,
                'first_name' => explode(' ', trim($payerName))[0] ?? $payerName,
                'identification' => $payerDocument !== null ? ['type' => 'CPF', 'number' => preg_replace('/\D/', '', $payerDocument)] : null,
            ]),
        ];

        $response = $this->request('POST', '/v1/payments', $payload, $idempotencyKey);

        return [
            'id' => (string) $response['id'],
            'status' => $response['status'] ?? 'pending',
            'qrCode' => $response['point_of_interaction']['transaction_data']['qr_code'] ?? null,
            'qrCodeBase64' => $response['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null,
            'expiresAt' => $response['date_of_expiration'] ?? null,
            'raw' => $response,
        ];
    }

    /** @return array<string, mixed> payload bruto da API — inclui `status`, `status_detail`, etc. */
    public function getPayment(string $paymentId): array
    {
        return $this->request('GET', "/v1/payments/{$paymentId}");
    }

    /** @param array<string, mixed>|null $payload @return array<string, mixed> */
    private function request(string $method, string $path, ?array $payload = null, ?string $idempotencyKey = null): array
    {
        $ch = curl_init("https://api.mercadopago.com{$path}");

        $headers = [
            'Authorization: Bearer ' . $this->accessToken,
            'Content-Type: application/json',
        ];
        if ($idempotencyKey !== null) {
            $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_POSTFIELDS => $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
        ]);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            throw new \RuntimeException("Falha de rede ao chamar o Mercado Pago: {$error}");
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Resposta inválida do Mercado Pago.');
        }

        if ($status >= 400) {
            $message = $decoded['message'] ?? 'Erro desconhecido';
            throw new \RuntimeException("Mercado Pago retornou erro ({$status}): {$message}");
        }

        return $decoded;
    }
}

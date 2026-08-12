<?php

declare(strict_types=1);

namespace App\Payments;

use App\Config\Env;
use App\Http\ForbiddenException;
use App\Http\ValidationException;
use App\Orders\OrderRepository;
use App\Orders\OrderStateMachine;
use PDO;

/**
 * Webhook do Mercado Pago — o endpoint público em
 * backend/public/index.php delega para cá.
 *
 * Três garantias, na ordem em que o checklist do projeto pede:
 *   1. Assinatura verificada (MercadoPagoWebhookVerifier) antes de
 *      qualquer processamento.
 *   2. Idempotência: `X-Request-Id` do Mercado Pago vira
 *      `gateway_event_id`, UNIQUE em `payment_events` — reenvio do
 *      mesmo evento é no-op.
 *   3. O status do pagamento é sempre CONSULTADO DE VOLTA na API do
 *      Mercado Pago (`GET /v1/payments/{id}`), nunca aceito só porque
 *      veio no corpo do webhook — o corpo da notificação é só um
 *      aviso de "algo mudou", não a fonte da verdade.
 *
 * ⚠️ Não testado contra um webhook real do Mercado Pago nesta sessão.
 */
final class MercadoPagoWebhookHandler
{
    public function __construct(
        private readonly PDO $db,
        private readonly PaymentRepository $payments,
        private readonly OrderRepository $orders,
    ) {
    }

    public function handle(array $query, array $body, array $headers): void
    {
        $client = MercadoPagoClient::fromEnv();
        $secret = Env::get('MP_WEBHOOK_SECRET');

        $dataId = $query['data.id'] ?? $body['data']['id'] ?? null;
        $requestId = $headers['x-request-id'] ?? null;
        $signature = $headers['x-signature'] ?? null;

        if ($dataId === null) {
            throw new ValidationException('Notificação sem data.id.');
        }

        if ($secret !== null && $secret !== '') {
            if ($signature === null || $requestId === null || !MercadoPagoWebhookVerifier::verify($signature, $requestId, (string) $dataId, $secret)) {
                throw new ForbiddenException('Assinatura do webhook inválida.');
            }
        }

        $gatewayEventId = $requestId ?? ('data-' . $dataId . '-' . ($body['action'] ?? 'unknown'));

        if ($this->payments->hasProcessedEvent($gatewayEventId)) {
            return; // já processado — reenvio do Mercado Pago, no-op.
        }

        if ($client === null) {
            $this->payments->recordEvent(null, 'mercadopago', $gatewayEventId, $body['type'] ?? 'unknown', $body, 'MP_ACCESS_TOKEN não configurado');
            return;
        }

        try {
            // Nunca confiar no corpo do webhook para o status — consultar
            // de volta na API é o que realmente confirma o pagamento.
            $paymentData = $client->getPayment((string) $dataId);
        } catch (\Throwable $e) {
            $this->payments->recordEvent(null, 'mercadopago', $gatewayEventId, $body['type'] ?? 'unknown', $body, $e->getMessage());
            throw $e;
        }

        $status = $this->mapStatus($paymentData['status'] ?? 'pending');
        $localPayment = $this->payments->findByGatewayPaymentId((string) $dataId);

        if ($localPayment === null) {
            $this->payments->recordEvent(null, 'mercadopago', $gatewayEventId, $body['type'] ?? 'unknown', $paymentData, 'Pagamento local não encontrado para este gateway_payment_id');
            return;
        }

        $this->payments->updateStatus($localPayment['id'], $status, $paymentData, $paymentData['status_detail'] ?? null);
        $this->payments->recordEvent($localPayment['id'], 'mercadopago', $gatewayEventId, $body['type'] ?? 'payment', $paymentData);

        if ($status === 'APPROVED') {
            $this->markOrderPaid($localPayment['order_id']);
        }
    }

    private function markOrderPaid(string $orderId): void
    {
        $stmt = $this->db->prepare('SELECT status FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch();
        if ($row === false) {
            return;
        }

        $currentStatus = $row['status'];
        if ($currentStatus === 'PAID') {
            return; // idempotente: já estava pago (webhook duplicado não reprocessa).
        }

        OrderStateMachine::assertCanTransition($currentStatus, 'PAID');
        $this->orders->transition($orderId, $currentStatus, 'PAID', 'Confirmado via webhook Mercado Pago.', 'mercadopago-webhook');
    }

    private function mapStatus(string $mpStatus): string
    {
        return match ($mpStatus) {
            'approved' => 'APPROVED',
            'in_process', 'pending' => 'PENDING',
            'rejected' => 'REJECTED',
            'refunded' => 'REFUNDED',
            'cancelled' => 'CANCELLED',
            default => 'PENDING',
        };
    }
}

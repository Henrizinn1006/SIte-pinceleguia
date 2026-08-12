<?php

declare(strict_types=1);

namespace App\Payments;

use PDO;

final class PaymentRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @param array<string, mixed> $data */
    public function insert(array $data): string
    {
        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO payments (id, order_id, gateway, gateway_payment_id, method, status, amount_in_cents, pix_qr_code, pix_qr_code_base64, pix_expires_at, raw_response)
             VALUES (:id, :orderId, :gateway, :gatewayPaymentId, :method, :status, :amount, :pixQrCode, :pixQrCodeBase64, :pixExpiresAt, :rawResponse)',
        );
        $stmt->execute([
            'id' => $id, 'orderId' => $data['orderId'], 'gateway' => $data['gateway'] ?? 'mercadopago',
            'gatewayPaymentId' => $data['gatewayPaymentId'] ?? null, 'method' => $data['method'],
            'status' => $data['status'] ?? 'PENDING', 'amount' => $data['amountInCents'],
            'pixQrCode' => $data['pixQrCode'] ?? null, 'pixQrCodeBase64' => $data['pixQrCodeBase64'] ?? null,
            'pixExpiresAt' => $data['pixExpiresAt'] ?? null,
            'rawResponse' => isset($data['rawResponse']) ? json_encode($data['rawResponse'], JSON_UNESCAPED_UNICODE) : null,
        ]);
        return $id;
    }

    public function findByGatewayPaymentId(string $gatewayPaymentId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM payments WHERE gateway_payment_id = :id LIMIT 1');
        $stmt->execute(['id' => $gatewayPaymentId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findLatestForOrder(string $orderId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM payments WHERE order_id = :orderId ORDER BY created_at DESC LIMIT 1');
        $stmt->execute(['orderId' => $orderId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string, mixed>|null $rawResponse */
    public function updateStatus(string $paymentId, string $status, ?array $rawResponse = null, ?string $rejectionReason = null): void
    {
        $paidAt = $status === 'APPROVED' ? (new \DateTimeImmutable())->format('Y-m-d H:i:s.v') : null;

        $stmt = $this->db->prepare(
            'UPDATE payments SET status = :status, raw_response = COALESCE(:rawResponse, raw_response),
                 rejection_reason = COALESCE(:rejectionReason, rejection_reason),
                 paid_at = COALESCE(:paidAt, paid_at)
             WHERE id = :id',
        );
        $stmt->execute([
            'status' => $status, 'id' => $paymentId,
            'rawResponse' => $rawResponse !== null ? json_encode($rawResponse, JSON_UNESCAPED_UNICODE) : null,
            'rejectionReason' => $rejectionReason, 'paidAt' => $paidAt,
        ]);
    }

    public function hasProcessedEvent(string $gatewayEventId): bool
    {
        $stmt = $this->db->prepare('SELECT id FROM payment_events WHERE gateway_event_id = :id LIMIT 1');
        $stmt->execute(['id' => $gatewayEventId]);
        return $stmt->fetch() !== false;
    }

    /** @param array<string, mixed> $payload */
    public function recordEvent(?string $paymentId, string $gateway, string $gatewayEventId, string $eventType, array $payload, ?string $error = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO payment_events (id, payment_id, gateway, gateway_event_id, event_type, payload, processed_at, error)
             VALUES (:id, :paymentId, :gateway, :gatewayEventId, :eventType, :payload, :processedAt, :error)',
        );
        $stmt->execute([
            'id' => 'c' . bin2hex(random_bytes(12)), 'paymentId' => $paymentId, 'gateway' => $gateway,
            'gatewayEventId' => $gatewayEventId, 'eventType' => $eventType,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'processedAt' => $error === null ? (new \DateTimeImmutable())->format('Y-m-d H:i:s.v') : null,
            'error' => $error,
        ]);
    }
}

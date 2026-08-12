<?php

declare(strict_types=1);

namespace App\Orders;

use App\Http\NotFoundException;
use PDO;

final class OrderRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function generateOrderNumber(): string
    {
        return 'PG' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
    }

    public function generateTrackingToken(): string
    {
        return bin2hex(random_bytes(24));
    }

    /** @param array<string, mixed> $data @return string id do pedido criado */
    public function insertOrder(array $data): string
    {
        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO orders (
                id, order_number, status,
                customer_name, customer_email, customer_phone, customer_document,
                shipping_zip_code, shipping_street, shipping_number, shipping_complement,
                shipping_district, shipping_city, shipping_state,
                subtotal_in_cents, shipping_in_cents, discount_in_cents, total_in_cents,
                shipping_method, coupon_code, customer_note, tracking_token
            ) VALUES (
                :id, :orderNumber, :status,
                :customerName, :customerEmail, :customerPhone, :customerDocument,
                :zipCode, :street, :number, :complement,
                :district, :city, :state,
                :subtotal, :shipping, :discount, :total,
                :shippingMethod, :couponCode, :customerNote, :trackingToken
            )',
        );
        $stmt->execute([
            'id' => $id, 'orderNumber' => $data['orderNumber'], 'status' => 'PENDING_PAYMENT',
            'customerName' => $data['customerName'], 'customerEmail' => $data['customerEmail'],
            'customerPhone' => $data['customerPhone'], 'customerDocument' => $data['customerDocument'] ?? null,
            'zipCode' => $data['shippingZipCode'], 'street' => $data['shippingStreet'], 'number' => $data['shippingNumber'],
            'complement' => $data['shippingComplement'] ?? null, 'district' => $data['shippingDistrict'],
            'city' => $data['shippingCity'], 'state' => $data['shippingState'],
            'subtotal' => $data['subtotalInCents'], 'shipping' => $data['shippingInCents'],
            'discount' => $data['discountInCents'] ?? 0,
            'total' => $data['totalInCents'], 'shippingMethod' => $data['shippingMethod'] ?? null,
            'couponCode' => $data['couponCode'] ?? null,
            'customerNote' => $data['customerNote'] ?? null, 'trackingToken' => $data['trackingToken'],
        ]);

        $this->insertStatusHistory($id, null, 'PENDING_PAYMENT', 'Pedido criado no checkout.', null);

        return $id;
    }

    /** @param array<string, mixed> $item */
    public function insertOrderItem(string $orderId, array $item): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, sku, image_url, unit_price_in_cents, quantity, subtotal_in_cents)
             VALUES (:id, :orderId, :productId, :variantId, :productName, :variantName, :sku, :imageUrl, :unitPrice, :quantity, :subtotal)',
        );
        $stmt->execute([
            'id' => 'c' . bin2hex(random_bytes(12)), 'orderId' => $orderId,
            'productId' => $item['productId'], 'variantId' => $item['variantId'],
            'productName' => $item['productName'], 'variantName' => $item['variantName'],
            'sku' => $item['sku'], 'imageUrl' => $item['imageUrl'],
            'unitPrice' => $item['unitPriceInCents'], 'quantity' => $item['quantity'], 'subtotal' => $item['subtotalInCents'],
        ]);
    }

    public function insertStatusHistory(string $orderId, ?string $fromStatus, string $toStatus, ?string $note, ?string $changedBy): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
             VALUES (:id, :orderId, :fromStatus, :toStatus, :note, :changedBy)',
        );
        $stmt->execute(['id' => 'c' . bin2hex(random_bytes(12)), 'orderId' => $orderId, 'fromStatus' => $fromStatus, 'toStatus' => $toStatus, 'note' => $note, 'changedBy' => $changedBy]);
    }

    /**
     * Aplica uma transição validada por OrderStateMachine — chame
     * `OrderStateMachine::assertCanTransition()` antes.
     */
    public function transition(string $orderId, string $fromStatus, string $toStatus, ?string $note, ?string $changedBy): void
    {
        $timestampColumn = OrderStateMachine::timestampColumnFor($toStatus);
        $sql = 'UPDATE orders SET status = :status' . ($timestampColumn !== null ? ", {$timestampColumn} = :now" : '') . ' WHERE id = :id';
        $params = ['status' => $toStatus, 'id' => $orderId];
        if ($timestampColumn !== null) {
            $params['now'] = (new \DateTimeImmutable())->format('Y-m-d H:i:s.v');
        }
        $this->db->prepare($sql)->execute($params);

        $this->insertStatusHistory($orderId, $fromStatus, $toStatus, $note, $changedBy);
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->withItems($row);
    }

    public function findByTrackingToken(string $token): array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE tracking_token = :token LIMIT 1');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new NotFoundException('Pedido não encontrado. Confira o link enviado por e-mail.');
        }
        return $this->withItems($row);
    }

    /** @param array<string, mixed> $row */
    private function withItems(array $row): array
    {
        $itemsStmt = $this->db->prepare('SELECT * FROM order_items WHERE order_id = :orderId ORDER BY created_at ASC');
        $itemsStmt->execute(['orderId' => $row['id']]);

        return [
            'id' => $row['id'],
            'orderNumber' => $row['order_number'],
            'status' => $row['status'],
            'customerName' => $row['customer_name'],
            'customerEmail' => $row['customer_email'],
            'shippingAddress' => [
                'zipCode' => $row['shipping_zip_code'], 'street' => $row['shipping_street'], 'number' => $row['shipping_number'],
                'complement' => $row['shipping_complement'], 'district' => $row['shipping_district'],
                'city' => $row['shipping_city'], 'state' => $row['shipping_state'],
            ],
            'subtotalInCents' => (int) $row['subtotal_in_cents'],
            'shippingInCents' => (int) $row['shipping_in_cents'],
            'discountInCents' => (int) $row['discount_in_cents'],
            'totalInCents' => (int) $row['total_in_cents'],
            'trackingToken' => $row['tracking_token'],
            'paidAt' => $row['paid_at'],
            'shippedAt' => $row['shipped_at'],
            'deliveredAt' => $row['delivered_at'],
            'cancelledAt' => $row['cancelled_at'],
            'createdAt' => $row['created_at'],
            'items' => array_map(fn (array $item): array => [
                'productName' => $item['product_name'],
                'variantName' => $item['variant_name'],
                'sku' => $item['sku'],
                'imageUrl' => $item['image_url'],
                'unitPriceInCents' => (int) $item['unit_price_in_cents'],
                'quantity' => (int) $item['quantity'],
                'subtotalInCents' => (int) $item['subtotal_in_cents'],
            ], $itemsStmt->fetchAll()),
        ];
    }
}

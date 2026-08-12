<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\NotFoundException;
use App\Orders\OrderRepository;
use App\Orders\OrderStateMachine;
use PDO;

/**
 * "Operação de pedidos no painel" (Fase 4) — listar, ver detalhe e
 * mudar status. A mudança de status sempre passa por
 * App\Orders\OrderStateMachine (mesma regra usada pelo webhook e pelo
 * cron de reconciliação) — não existe um caminho separado e mais
 * permissivo só porque é o admin mexendo.
 */
final class OrderAdminRepository
{
    public function __construct(private readonly PDO $db, private readonly OrderRepository $orders)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listAll(?string $status = null): array
    {
        $sql = 'SELECT id, order_number, status, customer_name, customer_email, total_in_cents, created_at, paid_at
                FROM orders';
        $params = [];
        if ($status !== null) {
            $sql .= ' WHERE status = :status';
            $params['status'] = $status;
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 200';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return array_map(fn (array $row): array => [
            'id' => $row['id'], 'orderNumber' => $row['order_number'], 'status' => $row['status'],
            'customerName' => $row['customer_name'], 'customerEmail' => $row['customer_email'],
            'totalInCents' => (int) $row['total_in_cents'], 'createdAt' => $row['created_at'], 'paidAt' => $row['paid_at'],
        ], $stmt->fetchAll());
    }

    public function findById(string $id): array
    {
        $order = $this->orders->findById($id);
        if ($order === null) {
            throw new NotFoundException('Pedido não encontrado.');
        }

        $paymentsStmt = $this->db->prepare(
            'SELECT id, gateway, gateway_payment_id, method, status, amount_in_cents, paid_at, created_at
             FROM payments WHERE order_id = :orderId ORDER BY created_at DESC',
        );
        $paymentsStmt->execute(['orderId' => $id]);

        $historyStmt = $this->db->prepare(
            'SELECT from_status, to_status, note, changed_by, created_at
             FROM order_status_history WHERE order_id = :orderId ORDER BY created_at ASC',
        );
        $historyStmt->execute(['orderId' => $id]);

        return [
            ...$order,
            'internalNote' => $this->fetchInternalNote($id),
            'payments' => $paymentsStmt->fetchAll(),
            'statusHistory' => $historyStmt->fetchAll(),
        ];
    }

    public function transition(string $orderId, string $toStatus, ?string $note, string $adminEmail): void
    {
        $stmt = $this->db->prepare('SELECT status FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new NotFoundException('Pedido não encontrado.');
        }

        $fromStatus = $row['status'];
        OrderStateMachine::assertCanTransition($fromStatus, $toStatus);

        if ($toStatus === 'CANCELLED' && in_array($fromStatus, ['PENDING_PAYMENT', 'PAID', 'PREPARING'], true)) {
            $this->restock($orderId);
        }

        $this->orders->transition($orderId, $fromStatus, $toStatus, $note, "admin:{$adminEmail}");
    }

    private function restock(string $orderId): void
    {
        $itemsStmt = $this->db->prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = :orderId');
        $itemsStmt->execute(['orderId' => $orderId]);
        foreach ($itemsStmt->fetchAll() as $item) {
            if ($item['variant_id'] === null) {
                continue;
            }
            $this->db->prepare('UPDATE product_variants SET stock = stock + :quantity WHERE id = :id')
                ->execute(['quantity' => $item['quantity'], 'id' => $item['variant_id']]);
        }
    }

    private function fetchInternalNote(string $orderId): ?string
    {
        $stmt = $this->db->prepare('SELECT internal_note FROM orders WHERE id = :id');
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row['internal_note'];
    }

    public function setInternalNote(string $orderId, string $note): void
    {
        $this->db->prepare('UPDATE orders SET internal_note = :note WHERE id = :id')
            ->execute(['note' => $note, 'id' => $orderId]);
    }
}

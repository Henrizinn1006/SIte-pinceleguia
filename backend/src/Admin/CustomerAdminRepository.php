<?php

declare(strict_types=1);

namespace App\Admin;

use PDO;

/**
 * "Clientes" nesta fase é uma visão agregada a partir de `orders`, não
 * uma tabela de contas — não existe cadastro/login de cliente no
 * projeto (só checkout como visitante). Cada linha aqui representa um
 * e-mail que já comprou, com o total gasto e a data da última compra;
 * não é um CRM, é o mínimo útil para responder "quem já comprou aqui".
 */
final class CustomerAdminRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listAll(): array
    {
        $stmt = $this->db->query(
            "SELECT customer_email, MAX(customer_name) AS customer_name, COUNT(*) AS order_count,
                    SUM(CASE WHEN status NOT IN ('CANCELLED') THEN total_in_cents ELSE 0 END) AS total_spent_in_cents,
                    MAX(created_at) AS last_order_at
             FROM orders
             GROUP BY customer_email
             ORDER BY last_order_at DESC",
        );

        return array_map(fn (array $row): array => [
            'email' => $row['customer_email'],
            'name' => $row['customer_name'],
            'orderCount' => (int) $row['order_count'],
            'totalSpentInCents' => (int) $row['total_spent_in_cents'],
            'lastOrderAt' => $row['last_order_at'],
        ], $stmt->fetchAll());
    }

    /** @return array<int, array<string, mixed>> */
    public function findOrdersByEmail(string $email): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, order_number, status, total_in_cents, created_at
             FROM orders WHERE customer_email = :email ORDER BY created_at DESC',
        );
        $stmt->execute(['email' => mb_strtolower($email)]);

        return array_map(fn (array $row): array => [
            'id' => $row['id'], 'orderNumber' => $row['order_number'], 'status' => $row['status'],
            'totalInCents' => (int) $row['total_in_cents'], 'createdAt' => $row['created_at'],
        ], $stmt->fetchAll());
    }
}

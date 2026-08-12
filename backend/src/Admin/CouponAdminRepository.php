<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\ValidationException;
use PDO;

final class CouponAdminRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listAll(): array
    {
        $stmt = $this->db->query('SELECT * FROM coupons ORDER BY created_at DESC');
        return array_map([self::class, 'toView'], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM coupons WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : self::toView($row);
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): string
    {
        $this->assertCodeAvailable($data['code']);

        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_in_cents,
                 max_discount_in_cents, starts_at, ends_at, usage_limit, usage_limit_per_customer, is_active)
             VALUES (:id, :code, :description, :discountType, :discountValue, :minOrder, :maxDiscount,
                 :startsAt, :endsAt, :usageLimit, :usageLimitPerCustomer, :isActive)',
        );
        $stmt->execute([
            'id' => $id, 'code' => mb_strtoupper(trim($data['code'])), 'description' => $data['description'] ?? null,
            'discountType' => $data['discountType'], 'discountValue' => $data['discountValue'],
            'minOrder' => $data['minOrderInCents'] ?? null, 'maxDiscount' => $data['maxDiscountInCents'] ?? null,
            'startsAt' => $data['startsAt'] ?? null, 'endsAt' => $data['endsAt'] ?? null,
            'usageLimit' => $data['usageLimit'] ?? null, 'usageLimitPerCustomer' => $data['usageLimitPerCustomer'] ?? null,
            'isActive' => ($data['isActive'] ?? true) ? 1 : 0,
        ]);
        return $id;
    }

    /** @param array<string, mixed> $data */
    public function update(string $id, array $data): void
    {
        $current = $this->findById($id);
        if ($current === null) {
            throw new ValidationException('Cupom não encontrado.');
        }
        if (isset($data['code']) && mb_strtoupper($data['code']) !== $current['code']) {
            $this->assertCodeAvailable($data['code'], $id);
        }

        $columns = [
            'code' => 'code', 'description' => 'description', 'discountType' => 'discount_type',
            'discountValue' => 'discount_value', 'minOrderInCents' => 'min_order_in_cents',
            'maxDiscountInCents' => 'max_discount_in_cents', 'startsAt' => 'starts_at', 'endsAt' => 'ends_at',
            'usageLimit' => 'usage_limit', 'usageLimitPerCustomer' => 'usage_limit_per_customer', 'isActive' => 'is_active',
        ];

        $sets = [];
        $params = ['id' => $id];
        foreach ($columns as $field => $column) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if ($field === 'code') {
                $value = mb_strtoupper(trim((string) $value));
            }
            $sets[] = "{$column} = :{$field}";
            $params[$field] = is_bool($value) ? (int) $value : $value;
        }

        if ($sets === []) {
            return;
        }

        $this->db->prepare('UPDATE coupons SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
    }

    public function delete(string $id): void
    {
        $this->db->prepare('DELETE FROM coupons WHERE id = :id')->execute(['id' => $id]);
    }

    private function assertCodeAvailable(string $code, ?string $excludingId = null): void
    {
        $sql = 'SELECT id FROM coupons WHERE code = :code';
        $params = ['code' => mb_strtoupper(trim($code))];
        if ($excludingId !== null) {
            $sql .= ' AND id != :excludingId';
            $params['excludingId'] = $excludingId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetch() !== false) {
            throw new ValidationException("Já existe um cupom com o código \"{$code}\".");
        }
    }

    /** @param array<string, mixed> $row */
    private static function toView(array $row): array
    {
        return [
            'id' => $row['id'], 'code' => $row['code'], 'description' => $row['description'],
            'discountType' => $row['discount_type'], 'discountValue' => (int) $row['discount_value'],
            'minOrderInCents' => $row['min_order_in_cents'] !== null ? (int) $row['min_order_in_cents'] : null,
            'maxDiscountInCents' => $row['max_discount_in_cents'] !== null ? (int) $row['max_discount_in_cents'] : null,
            'startsAt' => $row['starts_at'], 'endsAt' => $row['ends_at'],
            'usageLimit' => $row['usage_limit'] !== null ? (int) $row['usage_limit'] : null,
            'usageCount' => (int) $row['usage_count'],
            'usageLimitPerCustomer' => $row['usage_limit_per_customer'] !== null ? (int) $row['usage_limit_per_customer'] : null,
            'isActive' => (bool) $row['is_active'],
        ];
    }
}

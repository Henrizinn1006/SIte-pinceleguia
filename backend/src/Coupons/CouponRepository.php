<?php

declare(strict_types=1);

namespace App\Coupons;

use App\Http\CouponExpiredException;
use App\Http\CouponInvalidException;
use PDO;

/**
 * Validação e aplicação de cupom — porta do conceito de
 * `CouponInvalidError`/`CouponExpiredError` de
 * packages/commerce/src/shared/errors.ts (só os erros existiam no
 * original; a lógica de validação não tinha sido escrita ainda, ver
 * inventário da Fase 1).
 */
final class CouponRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Valida o cupom para um checkout específico e retorna o desconto
     * a aplicar, em centavos. Não grava nada — a gravação (resgate)
     * só acontece depois que o pedido é criado, dentro da mesma
     * transação do checkout (ver App\Checkout\CheckoutService).
     */
    public function validateAndCalculateDiscount(string $code, int $subtotalInCents, string $customerEmail): array
    {
        $stmt = $this->db->prepare('SELECT * FROM coupons WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => mb_strtoupper(trim($code))]);
        $coupon = $stmt->fetch();

        if ($coupon === false || !(bool) $coupon['is_active']) {
            throw new CouponInvalidException('Cupom inválido.');
        }

        $now = new \DateTimeImmutable();
        if ($coupon['starts_at'] !== null && $now < new \DateTimeImmutable($coupon['starts_at'])) {
            throw new CouponExpiredException('Este cupom ainda não está válido.');
        }
        if ($coupon['ends_at'] !== null && $now > new \DateTimeImmutable($coupon['ends_at'])) {
            throw new CouponExpiredException('Este cupom não está mais válido.');
        }

        if ($coupon['usage_limit'] !== null && (int) $coupon['usage_count'] >= (int) $coupon['usage_limit']) {
            throw new CouponExpiredException('Este cupom atingiu o limite de uso.');
        }

        if ($coupon['usage_limit_per_customer'] !== null) {
            $countStmt = $this->db->prepare(
                'SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = :couponId AND customer_email = :email',
            );
            $countStmt->execute(['couponId' => $coupon['id'], 'email' => mb_strtolower($customerEmail)]);
            if ((int) $countStmt->fetch()['total'] >= (int) $coupon['usage_limit_per_customer']) {
                throw new CouponExpiredException('Você já usou este cupom o máximo de vezes permitido.');
            }
        }

        if ($coupon['min_order_in_cents'] !== null && $subtotalInCents < (int) $coupon['min_order_in_cents']) {
            $minReais = number_format(((int) $coupon['min_order_in_cents']) / 100, 2, ',', '.');
            throw new CouponInvalidException("Pedido mínimo de R$ {$minReais} para este cupom.");
        }

        $discount = $coupon['discount_type'] === 'PERCENTAGE'
            ? (int) floor($subtotalInCents * ((int) $coupon['discount_value']) / 100)
            : (int) $coupon['discount_value'];

        if ($coupon['max_discount_in_cents'] !== null) {
            $discount = min($discount, (int) $coupon['max_discount_in_cents']);
        }
        $discount = min($discount, $subtotalInCents); // nunca desconta mais que o subtotal

        return ['couponId' => $coupon['id'], 'discountInCents' => $discount];
    }

    public function recordRedemption(string $couponId, string $orderId, string $customerEmail, int $discountInCents): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO coupon_redemptions (id, coupon_id, order_id, customer_email, discount_applied_in_cents)
             VALUES (:id, :couponId, :orderId, :email, :discount)',
        );
        $stmt->execute([
            'id' => 'c' . bin2hex(random_bytes(12)), 'couponId' => $couponId, 'orderId' => $orderId,
            'email' => mb_strtolower($customerEmail), 'discount' => $discountInCents,
        ]);

        $this->db->prepare('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = :id')
            ->execute(['id' => $couponId]);
    }
}

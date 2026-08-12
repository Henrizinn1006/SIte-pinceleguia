<?php

declare(strict_types=1);

namespace App\Orders;

use App\Http\InvalidOrderTransitionException;

/**
 * Porta do conceito de "máquina de estados" pedido pelo escopo original
 * (não havia implementação em TypeScript para portar — o `OrderStatus`
 * enum existia no schema, mas nenhuma regra de transição). Cancelar um
 * pedido já entregue, ou "voltar" de PAID para PENDING_PAYMENT, nunca
 * deveria ser possível por uma chamada de API — é aqui que isso é
 * barrado, independente de quem chama.
 */
final class OrderStateMachine
{
    /** @var array<string, array<int, string>> */
    private const TRANSITIONS = [
        'PENDING_PAYMENT' => ['PAID', 'CANCELLED'],
        'PAID' => ['PREPARING', 'CANCELLED', 'REFUNDED'],
        'PREPARING' => ['SHIPPED', 'CANCELLED'],
        'SHIPPED' => ['DELIVERED', 'REFUNDED'],
        'DELIVERED' => ['REFUNDED'],
        'CANCELLED' => [],
        'REFUNDED' => [],
    ];

    public static function assertCanTransition(string $from, string $to): void
    {
        if ($from === $to) {
            return;
        }
        if (!in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
            throw new InvalidOrderTransitionException("Não é possível mudar o pedido de {$from} para {$to}.");
        }
    }

    /** Coluna de timestamp específica a atualizar junto do status, quando existir. */
    public static function timestampColumnFor(string $status): ?string
    {
        return match ($status) {
            'PAID' => 'paid_at',
            'SHIPPED' => 'shipped_at',
            'DELIVERED' => 'delivered_at',
            'CANCELLED' => 'cancelled_at',
            default => null,
        };
    }
}

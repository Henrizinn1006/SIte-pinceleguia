<?php

declare(strict_types=1);

namespace App\Http;

final class InsufficientStockException extends DomainException
{
    public function __construct(
        public readonly string $variantId,
        public readonly int $available,
        public readonly int $requested,
    ) {
        parent::__construct("Estoque insuficiente para a variação {$variantId}: disponível {$available}, solicitado {$requested}");
    }

    public function code(): string
    {
        return 'INSUFFICIENT_STOCK';
    }

    public function httpStatus(): int
    {
        return 409;
    }
}

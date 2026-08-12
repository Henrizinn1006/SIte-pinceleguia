<?php

declare(strict_types=1);

namespace App\Http;

final class InvalidOrderTransitionException extends DomainException
{
    public function code(): string
    {
        return 'INVALID_ORDER_TRANSITION';
    }

    public function httpStatus(): int
    {
        return 409;
    }
}

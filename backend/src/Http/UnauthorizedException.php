<?php

declare(strict_types=1);

namespace App\Http;

final class UnauthorizedException extends DomainException
{
    public function code(): string
    {
        return 'UNAUTHORIZED';
    }

    public function httpStatus(): int
    {
        return 401;
    }
}

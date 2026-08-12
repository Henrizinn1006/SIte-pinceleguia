<?php

declare(strict_types=1);

namespace App\Http;

final class ForbiddenException extends DomainException
{
    public function code(): string
    {
        return 'FORBIDDEN';
    }

    public function httpStatus(): int
    {
        return 403;
    }
}

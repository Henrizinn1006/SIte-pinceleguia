<?php

declare(strict_types=1);

namespace App\Http;

final class NotFoundException extends DomainException
{
    public function code(): string
    {
        return 'NOT_FOUND';
    }

    public function httpStatus(): int
    {
        return 404;
    }
}

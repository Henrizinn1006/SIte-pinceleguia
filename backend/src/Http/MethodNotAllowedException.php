<?php

declare(strict_types=1);

namespace App\Http;

final class MethodNotAllowedException extends DomainException
{
    public function code(): string
    {
        return 'METHOD_NOT_ALLOWED';
    }

    public function httpStatus(): int
    {
        return 405;
    }
}

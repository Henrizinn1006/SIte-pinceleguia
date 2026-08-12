<?php

declare(strict_types=1);

namespace App\Http;

final class ValidationException extends DomainException
{
    public function code(): string
    {
        return 'VALIDATION_ERROR';
    }

    public function httpStatus(): int
    {
        return 422;
    }
}

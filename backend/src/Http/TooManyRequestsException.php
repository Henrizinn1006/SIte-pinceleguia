<?php

declare(strict_types=1);

namespace App\Http;

final class TooManyRequestsException extends DomainException
{
    public function code(): string
    {
        return 'TOO_MANY_REQUESTS';
    }

    public function httpStatus(): int
    {
        return 429;
    }
}

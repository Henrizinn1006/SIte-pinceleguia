<?php

declare(strict_types=1);

namespace App\Http;

final class CouponInvalidException extends DomainException
{
    public function code(): string
    {
        return 'COUPON_INVALID';
    }
}

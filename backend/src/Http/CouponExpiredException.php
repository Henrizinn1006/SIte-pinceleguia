<?php

declare(strict_types=1);

namespace App\Http;

final class CouponExpiredException extends DomainException
{
    public function code(): string
    {
        return 'COUPON_EXPIRED';
    }
}

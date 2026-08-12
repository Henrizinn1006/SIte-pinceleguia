<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Porta de packages/commerce/src/shared/errors.ts.
 *
 * A camada de apresentação nunca vê stack trace nem SQL — só `code` e
 * `message`. O `httpStatus` decide o código HTTP da resposta. Cada
 * subclasse concreta vive em seu próprio arquivo (App\Http\NotFoundException,
 * App\Http\ValidationException, App\Http\MethodNotAllowedException) para
 * caber no autoloader manual em backend/public/index.php.
 */
abstract class DomainException extends \RuntimeException
{
    abstract public function code(): string;

    public function httpStatus(): int
    {
        return 400;
    }
}

<?php

declare(strict_types=1);

namespace App\Catalog;

/**
 * Porta 1:1 de packages/commerce/src/catalog/domain/pricing.ts.
 *
 * Funções puras, sem I/O — por isso são fáceis de testar
 * (ver backend/tests/PricingTest.php) e fáceis de auditar contra o
 * original em TypeScript.
 */
final class Pricing
{
    /**
     * @param array{basePriceInCents:int, salePriceInCents:?int, saleStartsAt:?\DateTimeImmutable, saleEndsAt:?\DateTimeImmutable} $input
     */
    public static function isSaleActive(array $input, ?\DateTimeImmutable $now = null): bool
    {
        $now ??= new \DateTimeImmutable();

        if ($input['salePriceInCents'] === null) {
            return false;
        }
        if ($input['salePriceInCents'] >= $input['basePriceInCents']) {
            return false;
        }
        if ($input['saleStartsAt'] !== null && $now < $input['saleStartsAt']) {
            return false;
        }
        if ($input['saleEndsAt'] !== null && $now > $input['saleEndsAt']) {
            return false;
        }

        return true;
    }

    /**
     * @param array{basePriceInCents:int, salePriceInCents:?int, saleStartsAt:?\DateTimeImmutable, saleEndsAt:?\DateTimeImmutable} $input
     * @return array{priceInCents:int, salePriceInCents:?int, effectivePriceInCents:int, discountPercent:int}
     */
    public static function resolvePrice(array $input, ?\DateTimeImmutable $now = null): array
    {
        $now ??= new \DateTimeImmutable();
        $active = self::isSaleActive($input, $now);
        $sale = $active ? $input['salePriceInCents'] : null;
        $effective = $sale ?? $input['basePriceInCents'];

        $discountPercent = 0;
        if ($sale !== null && $input['basePriceInCents'] > 0) {
            $discountPercent = (int) round((($input['basePriceInCents'] - $sale) / $input['basePriceInCents']) * 100);
        }

        return [
            'priceInCents' => $input['basePriceInCents'],
            'salePriceInCents' => $sale,
            'effectivePriceInCents' => $effective,
            'discountPercent' => $discountPercent,
        ];
    }

    /**
     * O preço da variação sobrepõe o do produto quando informado. Uma
     * variação sem priceInCents herda o preço do produto.
     *
     * @param array{basePriceInCents:int, salePriceInCents:?int, saleStartsAt:?\DateTimeImmutable, saleEndsAt:?\DateTimeImmutable} $product
     * @param array{priceInCents:?int, salePriceInCents:?int} $variant
     * @return array{priceInCents:int, salePriceInCents:?int, effectivePriceInCents:int, discountPercent:int}
     */
    public static function resolveVariantPrice(array $product, array $variant, ?\DateTimeImmutable $now = null): array
    {
        return self::resolvePrice([
            'basePriceInCents' => $variant['priceInCents'] ?? $product['basePriceInCents'],
            'salePriceInCents' => $variant['salePriceInCents'] ?? $product['salePriceInCents'],
            'saleStartsAt' => $product['saleStartsAt'],
            'saleEndsAt' => $product['saleEndsAt'],
        ], $now);
    }
}

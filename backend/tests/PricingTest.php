<?php

declare(strict_types=1);

namespace App\Tests;

use App\Catalog\Pricing;
use PHPUnit\Framework\TestCase;

/**
 * Porta 1:1 de packages/commerce/src/catalog/domain/pricing.test.ts —
 * mesmos casos, mesmos valores, para poder auditar a paridade entre a
 * implementação TypeScript original e esta em PHP.
 */
final class PricingTest extends TestCase
{
    private function today(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('2026-08-11T12:00:00Z');
    }

    /** @return array{basePriceInCents:int, salePriceInCents:?int, saleStartsAt:?\DateTimeImmutable, saleEndsAt:?\DateTimeImmutable} */
    private function base(): array
    {
        return [
            'basePriceInCents' => 15700,
            'salePriceInCents' => null,
            'saleStartsAt' => null,
            'saleEndsAt' => null,
        ];
    }

    public function testNaoHaPromocaoQuandoSalePriceInCentsENulo(): void
    {
        self::assertFalse(Pricing::isSaleActive($this->base(), $this->today()));
    }

    public function testIgnoraPromocaoComPrecoMaiorOuIgualAoCheio(): void
    {
        self::assertFalse(Pricing::isSaleActive([...$this->base(), 'salePriceInCents' => 15700], $this->today()));
        self::assertFalse(Pricing::isSaleActive([...$this->base(), 'salePriceInCents' => 19900], $this->today()));
    }

    public function testAceitaPromocaoSemJanelaDeDatas(): void
    {
        self::assertTrue(Pricing::isSaleActive([...$this->base(), 'salePriceInCents' => 13900], $this->today()));
    }

    public function testRejeitaPromocaoQueAindaNaoComecou(): void
    {
        $input = [...$this->base(), 'salePriceInCents' => 13900, 'saleStartsAt' => new \DateTimeImmutable('2026-09-01T00:00:00Z')];
        self::assertFalse(Pricing::isSaleActive($input, $this->today()));
    }

    public function testRejeitaPromocaoJaEncerrada(): void
    {
        $input = [...$this->base(), 'salePriceInCents' => 13900, 'saleEndsAt' => new \DateTimeImmutable('2026-08-01T00:00:00Z')];
        self::assertFalse(Pricing::isSaleActive($input, $this->today()));
    }

    public function testAceitaPromocaoDentroDaJanela(): void
    {
        $input = [
            ...$this->base(),
            'salePriceInCents' => 13900,
            'saleStartsAt' => new \DateTimeImmutable('2026-08-01T00:00:00Z'),
            'saleEndsAt' => new \DateTimeImmutable('2026-08-31T23:59:59Z'),
        ];
        self::assertTrue(Pricing::isSaleActive($input, $this->today()));
    }

    public function testSemPromocaoOPrecoEfetivoEOPrecoCheio(): void
    {
        self::assertEquals([
            'priceInCents' => 15700,
            'salePriceInCents' => null,
            'effectivePriceInCents' => 15700,
            'discountPercent' => 0,
        ], Pricing::resolvePrice($this->base(), $this->today()));
    }

    public function testComPromocaoVigenteOPrecoEfetivoEOPromocional(): void
    {
        $result = Pricing::resolvePrice([...$this->base(), 'salePriceInCents' => 13900], $this->today());
        self::assertSame(13900, $result['effectivePriceInCents']);
        self::assertSame(15700, $result['priceInCents']);
        self::assertSame(11, $result['discountPercent']);
    }

    public function testPromocaoExpiradaNaoAlteraOPrecoCobrado(): void
    {
        $result = Pricing::resolvePrice([
            ...$this->base(),
            'salePriceInCents' => 13900,
            'saleEndsAt' => new \DateTimeImmutable('2026-01-01T00:00:00Z'),
        ], $this->today());
        self::assertSame(15700, $result['effectivePriceInCents']);
        self::assertNull($result['salePriceInCents']);
    }

    public function testOPrecoDaVariacaoSobrepoeODoProduto(): void
    {
        $result = Pricing::resolveVariantPrice($this->base(), ['priceInCents' => 19900, 'salePriceInCents' => null], $this->today());
        self::assertSame(19900, $result['effectivePriceInCents']);
    }

    public function testVariacaoSemPrecoHerdaODoProduto(): void
    {
        $result = Pricing::resolveVariantPrice($this->base(), ['priceInCents' => null, 'salePriceInCents' => null], $this->today());
        self::assertSame(15700, $result['effectivePriceInCents']);
    }

    public function testPromocaoDaVariacaoVenceADoProduto(): void
    {
        $result = Pricing::resolveVariantPrice(
            [...$this->base(), 'salePriceInCents' => 14900],
            ['priceInCents' => 19900, 'salePriceInCents' => 16900],
            $this->today(),
        );
        self::assertSame(19900, $result['priceInCents']);
        self::assertSame(16900, $result['effectivePriceInCents']);
    }
}

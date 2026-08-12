<?php

declare(strict_types=1);

namespace App\Tests;

use App\Catalog\ProductFilters;
use PHPUnit\Framework\TestCase;

/**
 * Porta parcial de packages/commerce/src/catalog/domain/product-filters.test.ts
 * (só os casos de `parseProductFilters`/`hasActiveFilters` — `buildFilterHref`
 * é utilitário de construção de URL e permanece só no frontend, ver
 * frontend/storefront/src/lib/filters.ts).
 */
final class ProductFiltersTest extends TestCase
{
    public function testAplicaOsPadroesQuandoNaoHaParametros(): void
    {
        $filters = ProductFilters::fromQuery([]);
        self::assertSame('recentes', $filters->ordem);
        self::assertSame('todos', $filters->disponibilidade);
        self::assertSame(1, $filters->pagina);
        self::assertNull($filters->categoria);
    }

    public function testNaoQuebraComValoresInvalidosVindosDaUrl(): void
    {
        $filters = ProductFilters::fromQuery([
            'ordem' => 'sql-injection',
            'disponibilidade' => 'qualquer-coisa',
            'pagina' => '-5',
            'precoMin' => 'abc',
        ]);
        self::assertSame('recentes', $filters->ordem);
        self::assertSame('todos', $filters->disponibilidade);
        self::assertSame(1, $filters->pagina);
        self::assertNull($filters->precoMin);
    }

    public function testLeParametrosValidos(): void
    {
        $filters = ProductFilters::fromQuery([
            'categoria' => 'categoria-exemplo',
            'ordem' => 'menor-preco',
            'pagina' => '3',
            'precoMin' => '100',
            'precoMax' => '300',
        ]);
        self::assertSame('categoria-exemplo', $filters->categoria);
        self::assertSame('menor-preco', $filters->ordem);
        self::assertSame(3, $filters->pagina);
        self::assertSame(100, $filters->precoMin);
        self::assertSame(300, $filters->precoMax);
    }

    public function testHasActiveFiltersEFalsoNoEstadoInicial(): void
    {
        self::assertFalse(ProductFilters::fromQuery([])->hasActiveFilters());
    }

    public function testPaginacaoSozinhaNaoContaComoFiltroAtivo(): void
    {
        self::assertFalse(ProductFilters::fromQuery(['pagina' => '4'])->hasActiveFilters());
    }

    public function testEVerdadeiroComCategoriaSelecionada(): void
    {
        self::assertTrue(ProductFilters::fromQuery(['categoria' => 'categoria-exemplo'])->hasActiveFilters());
    }
}

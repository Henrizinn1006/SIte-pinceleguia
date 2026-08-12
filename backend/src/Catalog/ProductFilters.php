<?php

declare(strict_types=1);

namespace App\Catalog;

/**
 * Porta de packages/commerce/src/catalog/domain/product-filters.ts.
 *
 * O contrato dos filtros do catálogo é o mesmo do storefront Next.js:
 * mesmos nomes de campo em português na query string, mesmos valores
 * default, mesma tolerância a entrada inválida (cai no default em vez
 * de quebrar) — para que a experiência de uso não mude na migração.
 */
final class ProductFilters
{
    public const PAGE_SIZE = 12;

    public const SORT_OPTIONS = ['recentes', 'menor-preco', 'maior-preco', 'destaque'];

    public const AVAILABILITY_OPTIONS = ['todos', 'em-estoque'];

    public readonly ?string $categoria;
    public readonly ?string $q;
    public readonly ?int $precoMin;
    public readonly ?int $precoMax;
    public readonly string $disponibilidade;
    public readonly string $ordem;
    public readonly int $pagina;

    private function __construct(
        ?string $categoria,
        ?string $q,
        ?int $precoMin,
        ?int $precoMax,
        string $disponibilidade,
        string $ordem,
        int $pagina,
    ) {
        $this->categoria = $categoria;
        $this->q = $q;
        $this->precoMin = $precoMin;
        $this->precoMax = $precoMax;
        $this->disponibilidade = $disponibilidade;
        $this->ordem = $ordem;
        $this->pagina = $pagina;
    }

    /** @param array<string, mixed> $query normalmente $_GET */
    public static function fromQuery(array $query): self
    {
        $categoria = self::optionalString($query['categoria'] ?? null, 1, 255);
        $q = self::optionalString($query['q'] ?? null, 1, 80);
        $precoMin = self::optionalPositiveInt($query['precoMin'] ?? null);
        $precoMax = self::optionalPositiveInt($query['precoMax'] ?? null);

        $disponibilidade = (string) ($query['disponibilidade'] ?? 'todos');
        if (!in_array($disponibilidade, self::AVAILABILITY_OPTIONS, true)) {
            $disponibilidade = 'todos';
        }

        $ordem = (string) ($query['ordem'] ?? 'recentes');
        if (!in_array($ordem, self::SORT_OPTIONS, true)) {
            $ordem = 'recentes';
        }

        $pagina = 1;
        if (isset($query['pagina'])) {
            $parsed = filter_var($query['pagina'], FILTER_VALIDATE_INT);
            if ($parsed !== false && $parsed >= 1) {
                $pagina = $parsed;
            }
        }

        return new self($categoria, $q, $precoMin, $precoMax, $disponibilidade, $ordem, $pagina);
    }

    public function hasActiveFilters(): bool
    {
        return $this->categoria !== null
            || $this->q !== null
            || $this->precoMin !== null
            || $this->precoMax !== null
            || $this->disponibilidade !== 'todos';
    }

    private static function optionalString(mixed $value, int $min, int $max): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        $length = mb_strlen($trimmed);
        if ($length < $min || $length > $max) {
            return null;
        }
        return $trimmed;
    }

    private static function optionalPositiveInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        if ($parsed === false || $parsed < 0) {
            return null;
        }
        return $parsed;
    }
}

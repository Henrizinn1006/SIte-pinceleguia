"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CloseIcon, FilterIcon } from "@vortexis/ui";
import { formatMoney } from "@vortexis/commerce/client";
import { dynamicHref } from "@/lib/routes";
import { cn } from "@vortexis/ui";
import {
  AVAILABILITY_OPTIONS,
  buildFilterHref,
  hasActiveFilters,
  type CategoryView,
  type ProductFilters,
} from "@vortexis/commerce/client";

/**
 * Filtros do catálogo.
 *
 * Todo filtro é um <Link> que muda a query string — funciona sem
 * JavaScript, é indexável, compartilhável e o botão "voltar" do
 * navegador se comporta como o usuário espera.
 *
 * Mobile: bottom sheet. Desktop: sidebar fixa. Ver docs/07.
 */
export function CatalogFilters({
  filters,
  categories,
  priceRange,
  totalResults,
}: {
  filters: ProductFilters;
  categories: CategoryView[];
  priceRange: { minInCents: number; maxInCents: number };
  totalResults: number;
}) {
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(filters);

  const priceBands = buildPriceBands(priceRange);

  const content = (
    <div className="flex flex-col gap-8">
      {active && (
        <Link
          href="/loja"
          className="inline-flex items-center gap-1.5 text-sm text-caramel-text underline underline-offset-4 hover:text-ink"
        >
          <CloseIcon className="size-3.5" />
          Limpar filtros
        </Link>
      )}

      <FilterGroup title="Categoria">
        <FilterOption
          href={buildFilterHref(filters, { categoria: undefined, pagina: undefined })}
          active={!filters.categoria}
        >
          Todas
        </FilterOption>
        {categories.map((category) => (
          <FilterOption
            key={category.slug}
            href={buildFilterHref(filters, {
              categoria: category.slug,
              pagina: undefined,
            })}
            active={filters.categoria === category.slug}
          >
            {category.name}
            {typeof category.productCount === "number" && (
              <span className="ml-1.5 text-xs text-ink-muted">
                ({category.productCount})
              </span>
            )}
          </FilterOption>
        ))}
      </FilterGroup>

      {priceBands.length > 0 && (
        <FilterGroup title="Faixa de preço">
          <FilterOption
            href={buildFilterHref(filters, {
              precoMin: undefined,
              precoMax: undefined,
              pagina: undefined,
            })}
            active={filters.precoMin === undefined && filters.precoMax === undefined}
          >
            Qualquer valor
          </FilterOption>
          {priceBands.map((band) => (
            <FilterOption
              key={band.label}
              href={buildFilterHref(filters, {
                precoMin: band.min,
                precoMax: band.max,
                pagina: undefined,
              })}
              active={filters.precoMin === band.min && filters.precoMax === band.max}
            >
              {band.label}
            </FilterOption>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Disponibilidade">
        {AVAILABILITY_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            href={buildFilterHref(filters, {
              disponibilidade: option.value,
              pagina: undefined,
            })}
            active={filters.disponibilidade === option.value}
          >
            {option.label}
          </FilterOption>
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 lg:block" aria-label="Filtros">
        {content}
      </aside>

      {/* Mobile — gatilho */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-beige-dark px-4 text-sm text-ink lg:hidden"
        aria-expanded={open}
      >
        <FilterIcon className="size-4" />
        Filtrar
        {active && <Badge tone="gold">ativo</Badge>}
      </button>

      {/* Mobile — bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setOpen(false)}
            aria-label="Fechar filtros"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg bg-cream shadow-strong"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-beige bg-cream px-5 py-4">
              <h2 className="font-serif text-lg text-ink">Filtros</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-sm text-ink hover:bg-beige/60"
                aria-label="Fechar filtros"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <div className="px-5 py-6">{content}</div>

            <div className="sticky bottom-0 border-t border-beige bg-cream px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-12 w-full rounded-sm bg-caramel-deep text-warm-white"
              >
                Ver {totalResults} {totalResults === 1 ? "peça" : "peças"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-base tracking-[0.1em] text-ink uppercase">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

function FilterOption({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={dynamicHref(href)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex min-h-11 items-center rounded-sm px-2 text-sm transition-colors lg:min-h-9",
          active ? "bg-beige/70 text-ink" : "text-ink-muted hover:text-ink",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

/** Gera faixas de preço a partir do catálogo real, em reais inteiros. */
function buildPriceBands(range: { minInCents: number; maxInCents: number }) {
  if (range.maxInCents <= 0 || range.maxInCents === range.minInCents) return [];

  const maxReais = Math.ceil(range.maxInCents / 100);
  const step = Math.max(50, Math.ceil(maxReais / 3 / 50) * 50);

  const bands: { label: string; min: number; max?: number }[] = [];
  for (let start = 0; start < maxReais; start += step) {
    const end = start + step;
    bands.push({
      label:
        end >= maxReais
          ? `Acima de ${formatMoney(start * 100)}`
          : `${formatMoney(start * 100)} — ${formatMoney(end * 100)}`,
      min: start,
      ...(end >= maxReais ? {} : { max: end }),
    });
  }
  return bands;
}

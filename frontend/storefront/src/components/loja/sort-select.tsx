import { useNavigate } from "react-router-dom";
import { ChevronDownIcon } from "@/components/ui/icons";
import { buildFilterHref, SORT_OPTIONS, type ProductFilters } from "@/lib/filters";

/** Porta de apps/storefront/src/components/loja/sort-select.tsx. */
export function SortSelect({ filters, basePath = "/loja" }: { filters: ProductFilters; basePath?: string }) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <label htmlFor="ordenacao" className="sr-only">
        Ordenar por
      </label>
      <select
        id="ordenacao"
        value={filters.ordem}
        onChange={(event) => {
          navigate(buildFilterHref(filters, { ordem: event.target.value, pagina: undefined }, basePath));
        }}
        className="min-h-11 appearance-none rounded-sm border border-beige-dark bg-transparent pl-4 pr-10 text-sm text-ink"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </div>
  );
}

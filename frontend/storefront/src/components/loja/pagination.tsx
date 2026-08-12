import { Link } from "react-router-dom";
import { buildFilterHref, type ProductFilters } from "@/lib/filters";
import type { Paginated } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Porta de apps/storefront/src/components/loja/pagination.tsx. */
export function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrevious,
  filters,
  basePath = "/loja",
}: Pick<Paginated<unknown>, "page" | "totalPages" | "hasNext" | "hasPrevious"> & {
  filters: ProductFilters;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav className="mt-14 flex items-center justify-center gap-1.5" aria-label="Paginação">
      <PageLink href={buildFilterHref(filters, { pagina: page - 1 }, basePath)} disabled={!hasPrevious} label="Página anterior">
        ←
      </PageLink>

      {pages.map((entry, index) =>
        entry === "…" ? (
          <span key={`gap-${index}`} className="px-2 text-ink-muted" aria-hidden>
            …
          </span>
        ) : (
          <PageLink key={entry} href={buildFilterHref(filters, { pagina: entry }, basePath)} current={entry === page} label={`Página ${entry}`}>
            {entry}
          </PageLink>
        ),
      )}

      <PageLink href={buildFilterHref(filters, { pagina: page + 1 }, basePath)} disabled={!hasNext} label="Próxima página">
        →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "flex size-11 items-center justify-center rounded-sm text-sm transition-colors",
    current ? "bg-caramel-deep text-warm-white" : "text-ink hover:bg-beige/60",
    disabled && "pointer-events-none opacity-35",
  );

  if (disabled) {
    return (
      <span className={className} aria-hidden>
        {children}
      </span>
    );
  }

  return (
    <Link to={href} className={className} aria-label={label} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

/** [1, …, 4, 5, 6, …, 12] */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("…");
    result.push(page);
  });

  return result;
}

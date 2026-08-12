import type { ProductListItem } from "@vortexis/commerce/client";
import { cn } from "@vortexis/ui";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  columns = 4,
  className,
}: {
  products: ProductListItem[];
  columns?: 3 | 4 | 6;
  className?: string;
}) {
  const gridCols = {
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  }[columns];

  return (
    <ul className={cn("grid gap-x-5 gap-y-9", gridCols, className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-beige-dark px-6 py-20 text-center">
      <p className="font-serif text-xl text-ink">{title}</p>
      {description && <p className="mt-2 text-ink-muted">{description}</p>}
    </div>
  );
}

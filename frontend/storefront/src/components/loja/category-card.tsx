import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { CategoryView } from "@/lib/types";

/** Porta de apps/storefront/src/components/loja/category-card.tsx. */
export function CategoryCard({ category }: { category: CategoryView }) {
  return (
    <Link
      to={`/categoria/${category.slug}`}
      className="group flex items-center gap-4 overflow-hidden rounded-md bg-beige/55 pl-6 transition-colors duration-300 hover:bg-beige/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
    >
      <div className="flex-1 py-6">
        <h3 className="font-serif text-xl text-ink">{category.name}</h3>
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors group-hover:text-ink">
          Ver coleção
          <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>

      {category.imageUrl && (
        <div className="relative aspect-square w-28 shrink-0 sm:w-32">
          <img
            src={category.imageUrl}
            alt={category.imageAlt ?? ""}
            width={128}
            height={128}
            loading="lazy"
            className="size-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
    </Link>
  );
}

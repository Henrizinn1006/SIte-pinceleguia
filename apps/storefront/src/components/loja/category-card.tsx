import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@vortexis/ui";
import { dynamicHref } from "@/lib/routes";
import type { CategoryView } from "@vortexis/commerce/client";

export function CategoryCard({ category }: { category: CategoryView }) {
  return (
    <Link
      href={dynamicHref(`/categoria/${category.slug}`)}
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
          <Image
            src={category.imageUrl}
            alt={category.imageAlt ?? ""}
            fill
            sizes="128px"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
    </Link>
  );
}

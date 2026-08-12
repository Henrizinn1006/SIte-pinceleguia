import "server-only";
import { db } from "@vortexis/db";
import type { CategoryView } from "../domain/product.types";

const activeCategory = { isActive: true, deletedAt: null } as const;

const categorySelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  imageUrl: true,
  imageAlt: true,
} as const;

/** Categorias marcadas para aparecer na home. */
export async function findHomeCategories(): Promise<CategoryView[]> {
  return db.category.findMany({
    where: { ...activeCategory, showOnHome: true },
    select: categorySelect,
    orderBy: { position: "asc" },
  });
}

/** Todas as categorias ativas, com contagem de produtos — usado no filtro. */
export async function findAllCategories(): Promise<CategoryView[]> {
  const rows = await db.category.findMany({
    where: activeCategory,
    select: {
      ...categorySelect,
      _count: {
        select: { products: { where: { isActive: true, deletedAt: null } } },
      },
    },
    orderBy: { position: "asc" },
  });

  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    productCount: _count.products,
  }));
}

export async function findCategoryBySlug(slug: string) {
  return db.category.findFirst({
    where: { slug, ...activeCategory },
    select: {
      ...categorySelect,
      metaTitle: true,
      metaDescription: true,
    },
  });
}

export async function findAllCategorySlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return db.category.findMany({
    where: activeCategory,
    select: { slug: true, updatedAt: true },
  });
}

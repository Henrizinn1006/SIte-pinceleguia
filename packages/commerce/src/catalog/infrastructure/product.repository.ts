import "server-only";
import type { Prisma } from "@vortexis/db";
import { db } from "@vortexis/db";
import { resolvePrice, resolveVariantPrice } from "../domain/pricing";
import {
  LOW_STOCK_THRESHOLD,
  type Paginated,
  type ProductDetail,
  type ProductListItem,
} from "../domain/product.types";
import { PAGE_SIZE, type ProductFilters } from "../domain/product-filters";

/**
 * Única camada que conhece o Prisma no módulo de catálogo.
 * Nenhum componente React importa este arquivo diretamente —
 * o acesso é sempre pelo `index.ts` do módulo.
 */

const listSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  basePriceInCents: true,
  salePriceInCents: true,
  saleStartsAt: true,
  saleEndsAt: true,
  isFeatured: true,
  category: { select: { name: true, slug: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, alt: true, width: true, height: true, blurDataUrl: true },
  },
  variants: {
    where: { isActive: true },
    select: { stock: true },
  },
} satisfies Prisma.ProductSelect;

type ProductListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

/** Select da página de produto: o de lista + descrição, SEO e variações completas. */
const detailSelect = {
  ...listSelect,
  description: true,
  metaTitle: true,
  metaDescription: true,
  weightInGrams: true,
  images: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    select: { url: true, alt: true, width: true, height: true, blurDataUrl: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      priceInCents: true,
      salePriceInCents: true,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductDetailRow = Prisma.ProductGetPayload<{ select: typeof detailSelect }>;

function toListItem(row: ProductListRow, now: Date): ProductListItem {
  const price = resolvePrice(row, now);
  const totalStock = row.variants.reduce((sum, v) => sum + v.stock, 0);
  const image = row.images[0] ?? null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    priceInCents: price.priceInCents,
    salePriceInCents: price.salePriceInCents,
    effectivePriceInCents: price.effectivePriceInCents,
    image,
    totalStock,
    isAvailable: totalStock > 0,
    isLowStock: totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD,
    isFeatured: row.isFeatured,
  };
}

/** Filtro base: nunca retorna produto inativo ou removido. */
const activeProduct: Prisma.ProductWhereInput = {
  isActive: true,
  deletedAt: null,
};

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...activeProduct };

  if (filters.categoria) {
    where.category = { slug: filters.categoria, isActive: true };
  }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.precoMin !== undefined || filters.precoMax !== undefined) {
    where.basePriceInCents = {
      ...(filters.precoMin !== undefined ? { gte: filters.precoMin * 100 } : {}),
      ...(filters.precoMax !== undefined ? { lte: filters.precoMax * 100 } : {}),
    };
  }

  if (filters.disponibilidade === "em-estoque") {
    where.variants = { some: { isActive: true, stock: { gt: 0 } } };
  }

  return where;
}

function buildOrderBy(
  filters: ProductFilters,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (filters.ordem) {
    case "menor-preco":
      return [{ basePriceInCents: "asc" }, { name: "asc" }];
    case "maior-preco":
      return [{ basePriceInCents: "desc" }, { name: "asc" }];
    case "destaque":
      return [{ isFeatured: "desc" }, { position: "asc" }, { createdAt: "desc" }];
    case "recentes":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function findProducts(
  filters: ProductFilters,
): Promise<Paginated<ProductListItem>> {
  const where = buildWhere(filters);
  const page = filters.pagina;
  const now = new Date();

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: listSelect,
      orderBy: buildOrderBy(filters),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    items: rows.map((row) => toListItem(row, now)),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export async function findFeaturedProducts(limit = 6): Promise<ProductListItem[]> {
  const now = new Date();
  const rows = await db.product.findMany({
    where: { ...activeProduct, isFeatured: true },
    select: listSelect,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => toListItem(row, now));
}

export async function findProductBySlug(slug: string): Promise<ProductDetail | null> {
  const now = new Date();

  const row: ProductDetailRow | null = await db.product.findFirst({
    where: { slug, ...activeProduct },
    select: detailSelect,
  });

  if (!row) return null;

  const price = resolvePrice(row, now);
  const totalStock = row.variants.reduce((sum, v) => sum + v.stock, 0);

  const variants = row.variants.map((v) => {
    const vp = resolveVariantPrice(row, v, now);
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceInCents: vp.priceInCents,
      salePriceInCents: vp.salePriceInCents,
      stock: v.stock,
      isAvailable: v.stock > 0,
    };
  });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    priceInCents: price.priceInCents,
    salePriceInCents: price.salePriceInCents,
    effectivePriceInCents: price.effectivePriceInCents,
    image: row.images[0] ?? null,
    images: row.images,
    variants,
    // "Variações reais" = mais de uma, ou uma que não é a padrão.
    hasRealVariants: variants.length > 1,
    totalStock,
    isAvailable: totalStock > 0,
    isLowStock: totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD,
    isFeatured: row.isFeatured,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    weightInGrams: row.weightInGrams,
  };
}

export async function findRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const now = new Date();
  const rows = await db.product.findMany({
    where: {
      ...activeProduct,
      id: { not: productId },
      category: { slug: categorySlug },
    },
    select: listSelect,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => toListItem(row, now));
}

/** Slugs para o sitemap e para generateStaticParams. */
export async function findAllProductSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return db.product.findMany({
    where: activeProduct,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

/** Faixa de preço do catálogo — usada para montar o filtro. */
export async function getPriceRange(): Promise<{ minInCents: number; maxInCents: number }> {
  const result = await db.product.aggregate({
    where: activeProduct,
    _min: { basePriceInCents: true },
    _max: { basePriceInCents: true },
  });

  return {
    minInCents: result._min.basePriceInCents ?? 0,
    maxInCents: result._max.basePriceInCents ?? 0,
  };
}

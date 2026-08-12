/**
 * Tipos do domínio de catálogo.
 *
 * Estes tipos NÃO são os do Prisma de propósito: a camada de
 * apresentação consome uma forma estável, e mudar uma coluna do banco
 * não deve quebrar todos os componentes. Ver docs/02-ARQUITETURA.md
 */

export interface ProductImageView {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface ProductVariantView {
  id: string;
  sku: string;
  name: string;
  /** Preço já resolvido em centavos (variação > produto). */
  priceInCents: number;
  /** Preço promocional vigente, se houver. */
  salePriceInCents: number | null;
  stock: number;
  isAvailable: boolean;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  categoryName: string;
  categorySlug: string;
  /** Preço cheio. */
  priceInCents: number;
  /** Preço promocional vigente, ou null. */
  salePriceInCents: number | null;
  /** O que o cliente efetivamente paga. */
  effectivePriceInCents: number;
  image: ProductImageView | null;
  totalStock: number;
  isAvailable: boolean;
  isLowStock: boolean;
  isFeatured: boolean;
}

export interface ProductDetail extends ProductListItem {
  description: string;
  images: ProductImageView[];
  variants: ProductVariantView[];
  hasRealVariants: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  weightInGrams: number | null;
}

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  productCount?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Abaixo ou igual a este número mostramos "Últimas unidades". */
export const LOW_STOCK_THRESHOLD = 2;

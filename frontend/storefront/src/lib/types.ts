/**
 * Tipos do domínio de catálogo — espelham exatamente a forma devolvida
 * pela API PHP (backend/src/Catalog/ProductRepository.php), que por sua
 * vez replica packages/commerce/src/catalog/domain/product.types.ts.
 * Mudar uma coluna do banco não deve quebrar todo componente aqui.
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
  priceInCents: number;
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
  priceInCents: number;
  salePriceInCents: number | null;
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
  metaTitle?: string | null;
  metaDescription?: string | null;
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

export const LOW_STOCK_THRESHOLD = 2;

export interface ContentPage {
  slug: string;
  title: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPlaceholder: boolean;
  updatedAt: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  tagline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
}

export interface FeaturedTitle {
  title: string;
  linkLabel: string;
}

export interface StoreContact {
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  legalName: string | null;
  document: string | null;
}

export interface ShippingFlatRate {
  priceInCents: number;
  estimatedDays: number | null;
  label: string;
  freeShippingThresholdInCents: number | null;
}

export interface PublicSettings {
  homeHero: HeroContent;
  homeFeaturedTitle: FeaturedTitle;
  storeContact: StoreContact;
  shippingFlatRate: ShippingFlatRate;
}

export interface CartItemView {
  itemId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  stock: number;
  isAvailable: boolean;
}

export interface CartView {
  items: CartItemView[];
  subtotalInCents: number;
  totalItems: number;
}

export interface ShippingAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface CheckoutPayload {
  name: string;
  email: string;
  phone: string;
  document?: string;
  note?: string;
  couponCode?: string;
  shipping: ShippingAddress;
}

export interface OrderItemView {
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceInCents: number;
  quantity: number;
  subtotalInCents: number;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  subtotalInCents: number;
  shippingInCents: number;
  discountInCents: number;
  totalInCents: number;
  trackingToken: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: OrderItemView[];
}

export interface PixPayment {
  id: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
}

export interface CheckoutResult {
  order: OrderView;
  payment: PixPayment | null;
}

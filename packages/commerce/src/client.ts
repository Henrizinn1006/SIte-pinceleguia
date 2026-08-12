/**
 * Superfície SEGURA PARA O NAVEGADOR do núcleo de commerce.
 *
 * Só domínio: tipos, regras puras, formatação. Nada aqui toca banco,
 * `server-only` ou variável de ambiente — por isso pode ser importado
 * por Client Components sem arrastar código de servidor para o bundle.
 *
 * Componentes com "use client" DEVEM importar daqui, nunca de
 * "@vortexis/commerce". Ver docs/02-ARQUITETURA.md
 */

// --- Catálogo: domínio ---
export type {
  CategoryView,
  Paginated,
  ProductDetail,
  ProductImageView,
  ProductListItem,
  ProductVariantView,
} from "./catalog/domain/product.types";
export { LOW_STOCK_THRESHOLD } from "./catalog/domain/product.types";

export {
  AVAILABILITY_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
  buildFilterHref,
  hasActiveFilters,
  parseProductFilters,
  productFiltersSchema,
  type ProductFilters,
  type SortOption,
} from "./catalog/domain/product-filters";

export {
  isSaleActive,
  resolvePrice,
  resolveVariantPrice,
} from "./catalog/domain/pricing";

// --- Compartilhado: puro, sem I/O ---
export {
  clampToZero,
  formatMoney,
  formatMoneyPlain,
  parseMoneyToCents,
  percentOf,
  sumCents,
} from "./shared/money";

export {
  CouponExpiredError,
  CouponInvalidError,
  DomainError,
  ForbiddenError,
  InsufficientStockError,
  InvalidOrderTransitionError,
  NotFoundError,
  PaymentDeclinedError,
  UnauthorizedError,
  ValidationError,
  isDomainError,
  toUserMessage,
} from "./shared/errors";

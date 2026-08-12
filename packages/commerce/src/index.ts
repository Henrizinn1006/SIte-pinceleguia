/**
 * Superfície de SERVIDOR do núcleo de commerce.
 *
 * Reexporta todo o domínio (client.ts) + os repositórios, que são
 * `server-only`. Só pode ser importado por Server Components, Server
 * Actions e Route Handlers.
 *
 * Client Components importam de "@vortexis/commerce/client".
 */

export * from "./client";

export {
  findAllProductSlugs,
  findFeaturedProducts,
  findProductBySlug,
  findProducts,
  findRelatedProducts,
  getPriceRange,
} from "./catalog/infrastructure/product.repository";

export {
  findAllCategories,
  findAllCategorySlugs,
  findCategoryBySlug,
  findHomeCategories,
} from "./catalog/infrastructure/category.repository";

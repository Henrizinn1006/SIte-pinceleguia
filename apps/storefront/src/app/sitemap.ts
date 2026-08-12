import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { findAllCategorySlugs, findAllProductSlugs } from "@vortexis/commerce";
import { getAllContentPageSlugs } from "@/modules/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/loja`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const [products, categories, pages] = await Promise.all([
      findAllProductSlugs(),
      findAllCategorySlugs(),
      getAllContentPageSlugs(),
    ]);

    return [
      ...staticRoutes,
      ...categories.map(({ slug, updatedAt }) => ({
        url: `${site.url}/categoria/${slug}`,
        lastModified: updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map(({ slug, updatedAt }) => ({
        url: `${site.url}/produto/${slug}`,
        lastModified: updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...pages.map(({ slug, updatedAt }) => ({
        url: `${site.url}/${slug}`,
        lastModified: updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
    ];
  } catch {
    // Banco indisponível durante o build: publica ao menos as rotas fixas.
    return staticRoutes;
  }
}

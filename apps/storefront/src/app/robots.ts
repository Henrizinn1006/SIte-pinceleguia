import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Rotas transacionais e privadas nunca devem ser indexadas.
      disallow: [
        "/admin",
        "/api/",
        "/carrinho",
        "/checkout",
        "/minha-conta",
        "/pedido/",
        "/busca",
        "/entrar",
        "/cadastro",
        "/recuperar-senha",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}

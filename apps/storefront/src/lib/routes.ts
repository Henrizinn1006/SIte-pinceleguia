import type { Route } from "next";

/**
 * Ponte entre URLs construídas em runtime e o `typedRoutes` do Next.
 *
 * O `typedRoutes` verifica em tempo de compilação que todo `href`
 * literal aponta para uma rota existente — o que evita 404 silencioso
 * em produção. Mas URLs montadas dinamicamente (filtros, paginação)
 * são `string` e o compilador não tem como validá-las.
 *
 * Em vez de desligar a checagem para o projeto inteiro, concentramos o
 * cast AQUI. Assim as rotas escritas à mão continuam verificadas, e
 * existe um único lugar auditável onde a garantia é dispensada.
 *
 * Uso: `<Link href={dynamicHref(buildFilterHref(...))} />`
 */
export function dynamicHref(url: string): Route {
  return url as Route;
}

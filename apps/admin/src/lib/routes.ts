import type { Route } from "next";

/**
 * Ponte entre destinos definidos em configuração e o `typedRoutes`.
 *
 * O `typedRoutes` confere em tempo de compilação que todo `href`
 * literal aponta para uma rota existente — evita 404 silencioso. Mas o
 * menu do painel é uma lista de dados (`lib/navegacao.ts`), e boa parte
 * dos destinos ainda não tem rota: aparecem marcados como "FASE 6",
 * "FASE 9" e não são clicáveis.
 *
 * Em vez de desligar a checagem no projeto inteiro, o cast fica
 * concentrado aqui — as rotas escritas à mão continuam verificadas.
 */
export function dynamicHref(url: string): Route {
  return url as Route;
}

import type { Route } from "next";
import { clientEnv } from "./env.client";
import { dynamicHref } from "./routes";

/**
 * Configuração estática do site.
 *
 * ⚠️ Dados de contato, CNPJ e redes sociais NÃO ficam aqui — eles são
 * conteúdo do cliente e vivem na tabela `settings`, editáveis pelo admin.
 * Ver docs/10-DECISOES-PENDENTES.md (item 9).
 */
export const site = {
  name: "Pincel & Guia",
  tagline: "Porcelana autoral feita à mão",
  description:
    "Porcelana autoral pintada à mão. Peças dedicadas aos Orixás, Guias e Entidades — arte, fé e ancestralidade em cada peça.",
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  locale: "pt-BR",
  developer: "VORTEXIS",
} as const;

/**
 * Links de navegação.
 *
 * `href` é `Route` para que o `typedRoutes` valide as rotas estáticas
 * em tempo de compilação.
 *
 * As categorias e as páginas institucionais são servidas por rotas
 * DINÂMICAS (`/categoria/[slug]` e `/[slug]`) — o compilador não tem
 * como conferir se o slug existe no banco, então elas passam por
 * `dynamicHref`. Se um desses slugs for renomeado no admin, o link
 * quebra em runtime; por isso eles também entram no sitemap e devem
 * ser revisados quando o cliente reorganizar o catálogo.
 */
export interface NavItem {
  readonly label: string;
  readonly href: Route;
}

export const mainNav: readonly NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Loja", href: "/loja" },
  { label: "Orixás", href: dynamicHref("/categoria/orixas") },
  {
    label: "Guias & Entidades",
    href: dynamicHref("/categoria/guias-e-entidades"),
  },
  { label: "Sobre", href: dynamicHref("/sobre") },
  { label: "Contato", href: dynamicHref("/contato") },
];

export const footerNav = {
  loja: [
    { label: "Todas as peças", href: "/loja" },
    { label: "Orixás", href: dynamicHref("/categoria/orixas") },
    { label: "Guias & Entidades", href: dynamicHref("/categoria/guias-e-entidades") },
    { label: "Guias de proteção", href: dynamicHref("/categoria/guias-de-protecao") },
  ],
  atendimento: [
    { label: "Contato", href: dynamicHref("/contato") },
    { label: "Entrega", href: dynamicHref("/entrega") },
    { label: "Trocas e devoluções", href: dynamicHref("/trocas-e-devolucoes") },
    { label: "Atendimento", href: dynamicHref("/atendimento") },
  ],
  institucional: [
    { label: "Sobre", href: dynamicHref("/sobre") },
    { label: "Política de Privacidade", href: dynamicHref("/politica-de-privacidade") },
    { label: "Termos de Uso", href: dynamicHref("/termos") },
  ],
  // `satisfies` em vez de anotação: mantém as chaves literais, evitando
  // que a indexação vire `NavItem[] | undefined`.
} satisfies Record<string, readonly NavItem[]>;

/**
 * Configuração estática do site. Dados de contato/CNPJ/redes sociais
 * NÃO ficam aqui — vêm de /api/configuracoes/publicas (tabela settings).
 * Porta de apps/storefront/src/lib/site.ts.
 */
export const site = {
  name: "Pincel & Guia",
  tagline: "Porcelana autoral feita à mão",
  description:
    "Porcelana autoral pintada à mão. Peças dedicadas aos Orixás, Guias e Entidades — arte, fé e ancestralidade em cada peça.",
  locale: "pt-BR",
  developer: "VORTEXIS",
} as const;

export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export const mainNav: readonly NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Loja", href: "/loja" },
  { label: "Orixás", href: "/categoria/orixas" },
  { label: "Guias & Entidades", href: "/categoria/guias-e-entidades" },
  { label: "Sobre", href: "/sobre" },
  { label: "Contato", href: "/contato" },
];

export const footerNav = {
  loja: [
    { label: "Todas as peças", href: "/loja" },
    { label: "Orixás", href: "/categoria/orixas" },
    { label: "Guias & Entidades", href: "/categoria/guias-e-entidades" },
    { label: "Guias de proteção", href: "/categoria/guias-de-protecao" },
  ],
  atendimento: [
    { label: "Contato", href: "/contato" },
    { label: "Entrega", href: "/entrega" },
    { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
    { label: "Atendimento", href: "/atendimento" },
  ],
  institucional: [
    { label: "Sobre", href: "/sobre" },
    { label: "Política de Privacidade", href: "/politica-de-privacidade" },
    { label: "Termos de Uso", href: "/termos" },
  ],
} satisfies Record<string, readonly NavItem[]>;

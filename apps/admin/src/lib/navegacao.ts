import type { PermissionKey } from "@vortexis/auth/permissions";

/**
 * Navegação do painel.
 *
 * Cada destino declara a permissão que exige. O menu esconde o que a
 * pessoa não pode acessar — mas isso é só conveniência: a defesa real
 * é `requirePermission` dentro de cada action.
 *
 * `implementadoEm` documenta o que ainda não existe, para o menu não
 * mentir sobre o que já funciona.
 */
export interface ItemDeNavegacao {
  href: string;
  label: string;
  icone: string;
  permissao?: PermissionKey;
  /** Fase do roadmap. undefined = já funciona. */
  implementadoEm?: string;
  /** Aparece na barra inferior do celular (máx. 5). */
  principal?: boolean;
}

export const NAVEGACAO: ItemDeNavegacao[] = [
  { href: "/inicio", label: "Início", icone: "home", principal: true },
  {
    href: "/produtos",
    label: "Produtos",
    icone: "package",
    permissao: "product.view",
    implementadoEm: "FASE 6",
    principal: true,
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    icone: "receipt",
    permissao: "order.view",
    implementadoEm: "FASE 9",
    principal: true,
  },
  {
    href: "/midia",
    label: "Mídia",
    icone: "image",
    permissao: "media.view",
    implementadoEm: "FASE 5",
    principal: true,
  },
  {
    href: "/categorias",
    label: "Categorias",
    icone: "folder",
    permissao: "category.view",
    implementadoEm: "FASE 6",
  },
  {
    href: "/colecoes",
    label: "Coleções",
    icone: "layers",
    permissao: "collection.view",
    implementadoEm: "FASE 6",
  },
  {
    href: "/parceiros",
    label: "Parceiros",
    icone: "users",
    permissao: "partner.view",
    implementadoEm: "FASE 6",
  },
  {
    href: "/estoque",
    label: "Estoque",
    icone: "boxes",
    permissao: "inventory.view",
    implementadoEm: "FASE 9",
  },
  {
    href: "/conteudo",
    label: "Conteúdo",
    icone: "layout",
    permissao: "section.view",
    implementadoEm: "FASE 10",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icone: "settings",
    permissao: "settings.update",
    implementadoEm: "FASE 9",
  },
];

/** Itens que o ator pode ver. */
export function filtrarPorPermissao(
  itens: ItemDeNavegacao[],
  podeVer: (permissao: PermissionKey) => boolean,
): ItemDeNavegacao[] {
  return itens.filter((item) => !item.permissao || podeVer(item.permissao));
}

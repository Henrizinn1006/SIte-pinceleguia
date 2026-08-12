/**
 * Catálogo de permissões.
 *
 * Formato "recurso.acao". Este arquivo é a fonte da verdade: o seed
 * popula a tabela `permissions` a partir daqui, e o tipo
 * `PermissionKey` impede o uso de uma chave que não exista.
 *
 * Seguro para o navegador — são só constantes. Ver docs/13.
 */

export const PERMISSIONS = {
  // --- Catálogo ---
  "product.view": { group: "Catálogo", description: "Ver produtos" },
  "product.create": { group: "Catálogo", description: "Criar produtos" },
  "product.update": { group: "Catálogo", description: "Editar produtos" },
  "product.archive": { group: "Catálogo", description: "Arquivar produtos" },
  "product.delete": { group: "Catálogo", description: "Excluir produtos" },
  /**
   * Separado de `product.update` de propósito: mudar descrição e mudar
   * preço têm consequências muito diferentes.
   */
  "product.price.update": { group: "Catálogo", description: "Alterar preços" },

  "category.view": { group: "Catálogo", description: "Ver categorias" },
  "category.update": { group: "Catálogo", description: "Criar e editar categorias" },
  "category.delete": { group: "Catálogo", description: "Excluir categorias" },

  "collection.view": { group: "Catálogo", description: "Ver coleções" },
  "collection.update": { group: "Catálogo", description: "Criar e editar coleções" },
  "collection.delete": { group: "Catálogo", description: "Excluir coleções" },

  "partner.view": { group: "Catálogo", description: "Ver parceiros" },
  "partner.update": { group: "Catálogo", description: "Criar e editar parceiros" },
  "partner.delete": { group: "Catálogo", description: "Excluir parceiros" },

  "inventory.view": { group: "Catálogo", description: "Ver estoque" },
  "inventory.adjust": { group: "Catálogo", description: "Ajustar estoque" },

  // --- Conteúdo ---
  "page.view": { group: "Conteúdo", description: "Ver páginas" },
  "page.update": { group: "Conteúdo", description: "Editar páginas" },
  "section.view": { group: "Conteúdo", description: "Ver seções" },
  "section.update": { group: "Conteúdo", description: "Editar seções (rascunho)" },
  /** A fronteira entre EDITOR e ADMIN: um prepara, o outro aprova. */
  "section.publish": { group: "Conteúdo", description: "Publicar alterações" },
  "menu.update": { group: "Conteúdo", description: "Editar menus" },
  "banner.update": { group: "Conteúdo", description: "Editar banners" },
  "media.view": { group: "Conteúdo", description: "Ver biblioteca de mídia" },
  "media.upload": { group: "Conteúdo", description: "Enviar arquivos" },
  "media.delete": { group: "Conteúdo", description: "Excluir mídia" },

  // --- Comércio ---
  "order.view": { group: "Pedidos", description: "Ver pedidos" },
  "order.update_status": { group: "Pedidos", description: "Alterar status de pedidos" },
  "order.cancel": { group: "Pedidos", description: "Cancelar pedidos" },
  "coupon.view": { group: "Pedidos", description: "Ver cupons" },
  "coupon.update": { group: "Pedidos", description: "Criar e editar cupons" },
  "customer.view": { group: "Pedidos", description: "Ver clientes" },

  // --- Sistema ---
  "settings.update": { group: "Sistema", description: "Alterar configurações" },
  "user.invite": { group: "Sistema", description: "Convidar usuários" },
  "user.update": { group: "Sistema", description: "Gerenciar usuários e papéis" },
  "audit.view": { group: "Sistema", description: "Consultar auditoria" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const TODAS_AS_PERMISSOES = Object.keys(PERMISSIONS) as PermissionKey[];

/** Papéis criados pelo seed. `isSystem` impede exclusão pelo painel. */
export const PAPEIS_DE_SISTEMA = {
  admin: {
    name: "Administrador",
    description: "Acesso total ao painel.",
    permissions: TODAS_AS_PERMISSOES,
  },
  editor: {
    name: "Editor",
    description:
      "Prepara catálogo e conteúdo. Não publica, não altera preço, não mexe em pedidos.",
    permissions: [
      "product.view",
      "product.create",
      "product.update",
      "category.view",
      "category.update",
      "collection.view",
      "collection.update",
      "partner.view",
      "partner.update",
      "inventory.view",
      "page.view",
      "page.update",
      "section.view",
      "section.update",
      "media.view",
      "media.upload",
      "order.view",
    ] satisfies PermissionKey[],
  },
} as const;

export type RoleKey = keyof typeof PAPEIS_DE_SISTEMA;

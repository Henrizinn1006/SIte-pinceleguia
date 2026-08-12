import { describe, expect, it } from "vitest";
import { criarActor } from "./actor";
import { PAPEIS_DE_SISTEMA, PERMISSIONS, TODAS_AS_PERMISSOES } from "./permissions";

describe("Actor", () => {
  const editor = criarActor({
    id: "u1",
    name: "Editor",
    email: "editor@exemplo.com",
    roleKeys: ["editor"],
    permissions: [...PAPEIS_DE_SISTEMA.editor.permissions],
  });

  const admin = criarActor({
    id: "u2",
    name: "Admin",
    email: "admin@exemplo.com",
    roleKeys: ["admin"],
    permissions: [...TODAS_AS_PERMISSOES],
  });

  it("admin pode tudo que existe no catálogo", () => {
    for (const permissao of TODAS_AS_PERMISSOES) {
      expect(admin.can(permissao)).toBe(true);
    }
  });

  it("editor prepara conteúdo mas NÃO publica", () => {
    expect(editor.can("section.update")).toBe(true);
    expect(editor.can("section.publish")).toBe(false);
  });

  it("editor NÃO altera preço", () => {
    expect(editor.can("product.update")).toBe(true);
    expect(editor.can("product.price.update")).toBe(false);
  });

  it("editor NÃO mexe em pedidos nem em configurações", () => {
    expect(editor.can("order.view")).toBe(true);
    expect(editor.can("order.cancel")).toBe(false);
    expect(editor.can("order.update_status")).toBe(false);
    expect(editor.can("settings.update")).toBe(false);
    expect(editor.can("user.invite")).toBe(false);
  });

  it("editor NÃO exclui nada", () => {
    expect(editor.can("product.delete")).toBe(false);
    expect(editor.can("category.delete")).toBe(false);
    expect(editor.can("media.delete")).toBe(false);
  });

  it("usuário sem papel não pode nada", () => {
    const anonimo = criarActor({
      id: "u3",
      name: "Sem papel",
      email: "x@exemplo.com",
      roleKeys: [],
      permissions: [],
    });
    for (const permissao of TODAS_AS_PERMISSOES) {
      expect(anonimo.can(permissao)).toBe(false);
    }
  });

  it("canAll exige todas; canAny exige uma", () => {
    expect(editor.canAll("product.view", "product.update")).toBe(true);
    expect(editor.canAll("product.view", "section.publish")).toBe(false);
    expect(editor.canAny("section.publish", "product.view")).toBe(true);
    expect(editor.canAny("section.publish", "order.cancel")).toBe(false);
  });
});

describe("catálogo de permissões", () => {
  it("toda permissão de papel existe no catálogo", () => {
    for (const [papel, definicao] of Object.entries(PAPEIS_DE_SISTEMA)) {
      for (const permissao of definicao.permissions) {
        expect(
          TODAS_AS_PERMISSOES,
          `papel "${papel}" referencia permissão inexistente: ${permissao}`,
        ).toContain(permissao);
      }
    }
  });

  it("toda permissão segue o formato recurso.acao", () => {
    for (const chave of TODAS_AS_PERMISSOES) {
      expect(chave, `chave fora do padrão: ${chave}`).toMatch(
        /^[a-z]+(\.[a-z_]+)+$/,
      );
    }
  });

  it("toda permissão tem grupo e descrição", () => {
    for (const [chave, meta] of Object.entries(PERMISSIONS)) {
      expect(meta.group, `sem grupo: ${chave}`).toBeTruthy();
      expect(meta.description, `sem descrição: ${chave}`).toBeTruthy();
    }
  });
});

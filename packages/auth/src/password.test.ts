import { describe, expect, it } from "vitest";
import {
  HASH_FALSO,
  gastarTempoDeVerificacao,
  hashPassword,
  verifyPassword,
} from "./password";

/**
 * Esta é a camada que protege o acesso ao painel inteiro.
 * Testar aqui vale mais que testar qualquer tela.
 */

describe("hashPassword", () => {
  it("produz hash no formato esperado", async () => {
    const hash = await hashPassword("uma-senha-qualquer");
    const partes = hash.split("$");

    expect(partes[0]).toBe("scrypt");
    expect(partes).toHaveLength(6);
    expect(Number(partes[1])).toBe(16384);
  });

  it("nunca guarda a senha em texto claro", async () => {
    const senha = "uma-senha-longa-de-teste-2026";
    const hash = await hashPassword(senha);
    expect(hash).not.toContain(senha);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const a = await hashPassword("mesma-senha");
    const b = await hashPassword("mesma-senha");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("aceita a senha correta", async () => {
    const hash = await hashPassword("senha-correta-123");
    expect(await verifyPassword("senha-correta-123", hash)).toBe(true);
  });

  it("recusa senha errada", async () => {
    const hash = await hashPassword("senha-correta-123");
    expect(await verifyPassword("senha-errada-123", hash)).toBe(false);
  });

  it("recusa senha vazia", async () => {
    const hash = await hashPassword("senha-correta-123");
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("é sensível a maiúsculas", async () => {
    const hash = await hashPassword("SenhaComMaiuscula");
    expect(await verifyPassword("senhacommaiuscula", hash)).toBe(false);
  });

  it("normaliza unicode — acento composto e precomposto são a mesma senha", async () => {
    // "ção" com caractere único vs. c + til combinante
    const precomposta = "ação-secreta";
    const decomposta = "ação-secreta";
    const hash = await hashPassword(precomposta);
    expect(await verifyPassword(decomposta, hash)).toBe(true);
  });

  it("aceita senha longa sem truncar", async () => {
    const longa = "x".repeat(200) + "-fim";
    const hash = await hashPassword(longa);
    expect(await verifyPassword(longa, hash)).toBe(true);
    expect(await verifyPassword("x".repeat(200), hash)).toBe(false);
  });

  it("recusa hash malformado sem lançar exceção", async () => {
    // Registro corrompido não pode derrubar o login de todo mundo.
    for (const ruim of [
      "",
      "texto-solto",
      "scrypt$16384$8$1$so-cinco-partes",
      "bcrypt$16384$8$1$c2FsdA==$aGFzaA==",
      "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
      "scrypt$16384$8$1$$",
    ]) {
      expect(await verifyPassword("qualquer", ruim)).toBe(false);
    }
  });
});

describe("proteção contra enumeração de e-mail", () => {
  it("o hash falso tem formato válido e sempre reprova", async () => {
    expect(await verifyPassword("qualquer-coisa", HASH_FALSO)).toBe(false);
  });

  it("gastarTempoDeVerificacao não lança e leva tempo comparável", async () => {
    const hashReal = await hashPassword("senha-de-referencia");

    const inicioReal = performance.now();
    await verifyPassword("senha-errada", hashReal);
    const duracaoReal = performance.now() - inicioReal;

    const inicioFalso = performance.now();
    await gastarTempoDeVerificacao();
    const duracaoFalsa = performance.now() - inicioFalso;

    // Não exigimos igualdade — máquina compartilhada tem ruído.
    // O que importa é a ordem de grandeza: se o caminho "usuário não
    // existe" fosse instantâneo, daria para enumerar e-mails por tempo.
    expect(duracaoFalsa).toBeGreaterThan(duracaoReal * 0.2);
  });
});

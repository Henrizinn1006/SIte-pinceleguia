import { describe, expect, it } from "vitest";
import { gerarToken, hashToken, tokensIguais } from "./tokens";

describe("gerarToken", () => {
  it("gera token com entropia suficiente", () => {
    const token = gerarToken();
    // 32 bytes em base64url ≈ 43 caracteres
    expect(token.length).toBeGreaterThanOrEqual(42);
  });

  it("usa alfabeto seguro para cookie e URL", () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("nunca repete", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 1000; i++) vistos.add(gerarToken());
    expect(vistos.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("é determinístico", () => {
    const token = gerarToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("não permite recuperar o token original", () => {
    const token = gerarToken();
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64); // sha-256 em hexadecimal
  });

  it("tokens diferentes geram hashes diferentes", () => {
    expect(hashToken(gerarToken())).not.toBe(hashToken(gerarToken()));
  });
});

describe("tokensIguais", () => {
  it("reconhece hashes idênticos", () => {
    const hash = hashToken(gerarToken());
    expect(tokensIguais(hash, hash)).toBe(true);
  });

  it("recusa hashes diferentes", () => {
    expect(tokensIguais(hashToken("a"), hashToken("b"))).toBe(false);
  });

  it("recusa comprimentos diferentes sem lançar", () => {
    expect(tokensIguais("abc", "abcdef")).toBe(false);
  });
});

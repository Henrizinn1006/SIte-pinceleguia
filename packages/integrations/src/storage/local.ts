import "server-only";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArquivoGravado, ArquivoParaGravar, StorageProvider } from "./types";

/**
 * Armazenamento em disco.
 *
 * ⚠️ DESENVOLVIMENTO APENAS.
 *
 * Não serve para produção em ambiente serverless: o sistema de
 * arquivos é efêmero e não compartilhado entre instâncias. Em produção
 * usaremos Cloudflare R2 — ver `r2.ts` e docs/08.
 *
 * Existe para que a biblioteca de mídia funcione desde o primeiro dia,
 * sem depender de conta em serviço externo.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly nome = "local";

  constructor(
    /** Pasta absoluta onde os arquivos são gravados. */
    private readonly pastaBase: string,
    /** Prefixo da rota que serve os arquivos. */
    private readonly prefixoUrl = "/api/midia",
  ) {}

  private caminhoAbsoluto(key: string): string {
    // Normaliza e confirma que o resultado continua DENTRO da pasta base.
    // Sem isto, uma chave com ".." escaparia do diretório.
    const destino = path.resolve(this.pastaBase, key);
    const base = path.resolve(this.pastaBase);
    if (destino !== base && !destino.startsWith(base + path.sep)) {
      throw new Error(`Chave de armazenamento inválida: ${key}`);
    }
    return destino;
  }

  async gravar(arquivo: ArquivoParaGravar): Promise<ArquivoGravado> {
    const destino = this.caminhoAbsoluto(arquivo.key);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, arquivo.conteudo);

    return {
      key: arquivo.key,
      url: this.urlPublica(arquivo.key),
      sizeInBytes: arquivo.conteudo.byteLength,
    };
  }

  urlPublica(key: string): string {
    return `${this.prefixoUrl}/${key}`;
  }

  async remover(key: string): Promise<void> {
    await rm(this.caminhoAbsoluto(key), { force: true });
  }

  async existe(key: string): Promise<boolean> {
    try {
      await stat(this.caminhoAbsoluto(key));
      return true;
    } catch {
      return false;
    }
  }
}

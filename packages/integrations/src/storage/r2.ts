import "server-only";
import type { ArquivoGravado, ArquivoParaGravar, StorageProvider } from "./types";

/**
 * Cloudflare R2 — S3-compatível, com egress zero.
 *
 * ⚠️ NÃO IMPLEMENTADO AINDA. Proposital.
 *
 * O R2 exige credenciais que ainda não existem (docs/10, decisão do
 * cliente) e assinatura AWS SigV4, que só faz sentido validar contra o
 * serviço real. Escrever agora um adapter que ninguém consegue testar
 * produziria código com aparência de pronto e comportamento
 * desconhecido — pior que uma falha explícita.
 *
 * A interface já está fechada; ligar isto é trabalho contido:
 *
 *   1. npm i @aws-sdk/client-s3 --workspace @vortexis/integrations
 *   2. Preencher no .env:
 *        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *        R2_BUCKET_NAME, R2_PUBLIC_URL
 *   3. Implementar os métodos abaixo com PutObjectCommand /
 *      DeleteObjectCommand / HeadObjectCommand, endpoint
 *      https://<accountId>.r2.cloudflarestorage.com e region "auto"
 *   4. STORAGE_PROVIDER="r2"
 *
 * Previsto para a FASE 15 (go-live). Ver docs/09-ROADMAP.md
 */
export class R2StorageProvider implements StorageProvider {
  readonly nome = "r2";

  constructor(
    private readonly config: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      urlPublicaBase: string;
    },
  ) {}

  private naoImplementado(): never {
    throw new Error(
      "R2StorageProvider ainda não foi implementado. " +
        'Use STORAGE_PROVIDER="local" em desenvolvimento. ' +
        "Ver packages/integrations/src/storage/r2.ts",
    );
  }

  async gravar(_arquivo: ArquivoParaGravar): Promise<ArquivoGravado> {
    this.naoImplementado();
  }

  urlPublica(key: string): string {
    return `${this.config.urlPublicaBase.replace(/\/$/, "")}/${key}`;
  }

  async remover(_key: string): Promise<void> {
    this.naoImplementado();
  }

  async existe(_key: string): Promise<boolean> {
    this.naoImplementado();
  }
}

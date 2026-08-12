import "server-only";
import { LocalStorageProvider } from "./local";
import { R2StorageProvider } from "./r2";
import type { StorageProvider } from "./types";

export type {
  ArquivoGravado,
  ArquivoParaGravar,
  StorageProvider,
} from "./types";
export { gerarChave } from "./types";
export { LocalStorageProvider } from "./local";
export { R2StorageProvider } from "./r2";

export interface ConfiguracaoDeStorage {
  provedor: "local" | "r2";
  /** Obrigatório para o provedor local. */
  pastaLocal?: string;
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    urlPublicaBase: string;
  };
}

/**
 * Fábrica do provedor de armazenamento.
 *
 * A escolha vem de configuração, nunca de `if` espalhado pelo código.
 * Quem consome só conhece a interface.
 */
export function criarStorageProvider(
  config: ConfiguracaoDeStorage,
): StorageProvider {
  if (config.provedor === "r2") {
    if (!config.r2) {
      throw new Error(
        'STORAGE_PROVIDER="r2" exige as credenciais R2_* no ambiente.',
      );
    }
    return new R2StorageProvider(config.r2);
  }

  if (!config.pastaLocal) {
    throw new Error("O provedor local exige a pasta de destino.");
  }
  return new LocalStorageProvider(config.pastaLocal);
}

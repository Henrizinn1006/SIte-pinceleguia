/**
 * Contrato de armazenamento de arquivos.
 *
 * Trocar disco local por Cloudflare R2, S3 ou qualquer outro é escrever
 * um adapter — nenhum código de aplicação muda. Ver docs/02 §3.
 */

export interface ArquivoParaGravar {
  /** Caminho no storage. Gerado por nós, nunca vindo do usuário. */
  key: string;
  conteudo: Uint8Array;
  mimeType: string;
}

export interface ArquivoGravado {
  key: string;
  /** URL pública para exibir a imagem. */
  url: string;
  sizeInBytes: number;
}

export interface StorageProvider {
  readonly nome: string;

  gravar(arquivo: ArquivoParaGravar): Promise<ArquivoGravado>;

  /** URL pública de uma chave já existente. */
  urlPublica(key: string): string;

  remover(key: string): Promise<void>;

  /** Usado por jobs de limpeza para não tentar apagar o que já sumiu. */
  existe(key: string): Promise<boolean>;
}

/**
 * Gera a chave de armazenamento.
 *
 * ⚠️ O nome enviado pelo usuário é DESCARTADO. Um arquivo chamado
 * `../../etc/passwd` ou `foto.jpg.php` não pode virar caminho.
 * Ver docs/13-AUTH-RBAC-SEGURANCA.md §3
 */
export function gerarChave(extensao: string, aleatorio: string): string {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");

  const extensaoLimpa = extensao.toLowerCase().replace(/[^a-z0-9]/g, "");
  const idLimpo = aleatorio.replace(/[^a-zA-Z0-9-]/g, "");

  return `${ano}/${mes}/${idLimpo}.${extensaoLimpa}`;
}

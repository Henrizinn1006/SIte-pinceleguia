/**
 * Validação de arquivo enviado.
 *
 * A porta mais frágil de qualquer CMS. Extensão e MIME são DECLARADOS
 * pelo cliente — logo, mentira em potencial. A única verificação que o
 * atacante não controla é ler os primeiros bytes do arquivo e conferir
 * se aquilo é mesmo uma imagem.
 *
 * Puro, sem I/O — testável sem servidor. Ver docs/13 §3.
 */

export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB
export const LADO_MINIMO_PX = 200;
export const LADO_MAXIMO_PX = 8000;

/**
 * SVG está FORA da allowlist de propósito: é XML, aceita `<script>`, e
 * sanitizar SVG com segurança é notoriamente difícil. Ícone é trabalho
 * da VORTEXIS, não upload do painel.
 */
export const TIPOS_PERMITIDOS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
} as const;

export type MimePermitido = keyof typeof TIPOS_PERMITIDOS;

export const EXTENSOES_PERMITIDAS = Object.values(TIPOS_PERMITIDOS).flat();

export type MotivoDeRecusa =
  | "vazio"
  | "grande_demais"
  | "mime_nao_permitido"
  | "extensao_nao_permitida"
  | "extensao_diverge_do_mime"
  | "conteudo_nao_e_imagem"
  | "conteudo_diverge_do_mime"
  | "dimensoes_invalidas";

export const MENSAGENS: Record<MotivoDeRecusa, string> = {
  vazio: "O arquivo está vazio.",
  grande_demais: "A imagem passa de 10 MB. Tente reduzir antes de enviar.",
  mime_nao_permitido: "Formato não aceito. Envie JPG, PNG, WebP ou AVIF.",
  extensao_nao_permitida: "Extensão não aceita. Use .jpg, .png, .webp ou .avif.",
  extensao_diverge_do_mime: "A extensão não corresponde ao tipo do arquivo.",
  conteudo_nao_e_imagem: "Este arquivo não é uma imagem.",
  conteudo_diverge_do_mime: "O conteúdo do arquivo não corresponde ao tipo declarado.",
  dimensoes_invalidas: `A imagem precisa ter entre ${LADO_MINIMO_PX}px e ${LADO_MAXIMO_PX}px.`,
};

export interface ResultadoDaValidacao {
  ok: boolean;
  motivo?: MotivoDeRecusa;
  mimeReal?: MimePermitido;
  extensao?: string;
}

/**
 * Identifica o formato pela assinatura binária ("magic bytes").
 * Retorna null quando o conteúdo não é uma das imagens aceitas.
 */
export function detectarTipoReal(bytes: Uint8Array): MimePermitido | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const assinaturaPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (assinaturaPng.every((byte, i) => bytes[i] === byte)) {
    return "image/png";
  }

  // Contêiner RIFF/ISO-BMFF: o tipo real está nos bytes 8..11
  const marca = String.fromCharCode(
    bytes[8] ?? 0,
    bytes[9] ?? 0,
    bytes[10] ?? 0,
    bytes[11] ?? 0,
  );

  // WebP: "RIFF" .... "WEBP"
  const riff = String.fromCharCode(
    bytes[0] ?? 0,
    bytes[1] ?? 0,
    bytes[2] ?? 0,
    bytes[3] ?? 0,
  );
  if (riff === "RIFF" && marca === "WEBP") return "image/webp";

  // AVIF: "....ftyp" + marca avif/avis
  const ftyp = String.fromCharCode(
    bytes[4] ?? 0,
    bytes[5] ?? 0,
    bytes[6] ?? 0,
    bytes[7] ?? 0,
  );
  if (ftyp === "ftyp" && (marca === "avif" || marca === "avis")) {
    return "image/avif";
  }

  return null;
}

export function extrairExtensao(nomeDoArquivo: string): string {
  const partes = nomeDoArquivo.toLowerCase().split(".");
  return partes.length > 1 ? (partes.pop() ?? "") : "";
}

/** Extensão canônica de um tipo — usada para montar a chave no storage. */
export function extensaoCanonica(mime: MimePermitido): string {
  return TIPOS_PERMITIDOS[mime][0];
}

export function validarUpload(entrada: {
  nomeDoArquivo: string;
  mimeDeclarado: string;
  tamanhoEmBytes: number;
  bytesIniciais: Uint8Array;
}): ResultadoDaValidacao {
  if (entrada.tamanhoEmBytes <= 0) {
    return { ok: false, motivo: "vazio" };
  }

  if (entrada.tamanhoEmBytes > TAMANHO_MAXIMO_BYTES) {
    return { ok: false, motivo: "grande_demais" };
  }

  const mimeDeclarado = entrada.mimeDeclarado.toLowerCase().split(";")[0]?.trim();
  if (!mimeDeclarado || !(mimeDeclarado in TIPOS_PERMITIDOS)) {
    return { ok: false, motivo: "mime_nao_permitido" };
  }

  const extensao = extrairExtensao(entrada.nomeDoArquivo);
  if (!extensao || !EXTENSOES_PERMITIDAS.includes(extensao as never)) {
    return { ok: false, motivo: "extensao_nao_permitida" };
  }

  const extensoesDoMime = TIPOS_PERMITIDOS[mimeDeclarado as MimePermitido];
  if (!extensoesDoMime.includes(extensao as never)) {
    return { ok: false, motivo: "extensao_diverge_do_mime" };
  }

  // A verificação que importa: o conteúdo real.
  const mimeReal = detectarTipoReal(entrada.bytesIniciais);
  if (!mimeReal) {
    return { ok: false, motivo: "conteudo_nao_e_imagem" };
  }

  if (mimeReal !== mimeDeclarado) {
    return { ok: false, motivo: "conteudo_diverge_do_mime" };
  }

  return { ok: true, mimeReal, extensao: extensaoCanonica(mimeReal) };
}

export function validarDimensoes(largura: number, altura: number): boolean {
  const maior = Math.max(largura, altura);
  const menor = Math.min(largura, altura);
  return menor > 0 && maior >= LADO_MINIMO_PX && maior <= LADO_MAXIMO_PX;
}

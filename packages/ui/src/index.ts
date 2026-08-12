/**
 * Primitivos compartilhados entre storefront e admin.
 *
 * ⚠️ REGRA: nada aqui decide cor, fonte ou espaçamento de marca.
 * Um `grep` por HEX neste pacote roda no CI e falha o build.
 * Ver docs/16-VORTEXIS-CORE.md
 *
 * Componentes com estética própria da marca — card de produto com selo,
 * logotipo, ornamentos — ficam no app, não aqui.
 */

export { cn } from "./cn";
export { Container } from "./container";
export * from "./icons";

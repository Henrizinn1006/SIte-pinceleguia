#!/usr/bin/env node
/**
 * Verifica as fronteiras da arquitetura. Roda no CI e antes de commitar.
 *
 * Regra que não é verificada é regra que já foi quebrada.
 * Ver docs/16-VORTEXIS-CORE.md §6
 */
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");

/** Termos do domínio DESTE cliente. Em packages/ eles são conteúdo, nunca código. */
const TERMOS_DO_CLIENTE = [
  "orix", "exu", "pombagira", "iemanja", "iemanjá", "oxossi", "oxóssi",
  "oxum", "ogum", "nana", "xango", "xangô", "umbanda", "candombl",
  "pincel", "porcelana", "ceramica", "cerâmica",
];

const IGNORAR = new Set(["node_modules", ".next", "dist", ".turbo", ".git"]);
const EXTENSOES = new Set([".ts", ".tsx", ".css", ".mjs", ".js"]);

async function listarArquivos(dir) {
  const saida = [];
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch {
    return saida; // pasta ainda não existe
  }
  for (const entrada of entradas) {
    if (IGNORAR.has(entrada.name)) continue;
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      saida.push(...(await listarArquivos(caminho)));
    } else if (EXTENSOES.has(path.extname(entrada.name))) {
      saida.push(caminho);
    }
  }
  return saida;
}

const relativo = (p) => path.relative(RAIZ, p).replaceAll("\\", "/");
const falhas = [];

function reportar(regra, arquivo, linha, trecho) {
  falhas.push({ regra, arquivo: relativo(arquivo), linha, trecho: trecho.trim().slice(0, 90) });
}

// ---------------------------------------------------------------------
// 1. Termo específico do cliente dentro de packages/
// ---------------------------------------------------------------------
for (const arquivo of await listarArquivos(path.join(RAIZ, "packages"))) {
  const linhas = readFileSync(arquivo, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    const minuscula = linha.toLowerCase();
    for (const termo of TERMOS_DO_CLIENTE) {
      if (minuscula.includes(termo)) {
        reportar(
          `termo do cliente ("${termo}") em pacote genérico`,
          arquivo,
          i + 1,
          linha,
        );
        return;
      }
    }
  });
}

// ---------------------------------------------------------------------
// 2. Pacote importando de app — dependência invertida
// ---------------------------------------------------------------------
for (const arquivo of await listarArquivos(path.join(RAIZ, "packages"))) {
  const linhas = readFileSync(arquivo, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    if (/from\s+["'](@pincel\/|.*\/apps\/|apps\/)/.test(linha)) {
      reportar("pacote dependendo de app", arquivo, i + 1, linha);
    }
  });
}

// ---------------------------------------------------------------------
// 3. Cor fixa em packages/ui — ele consome tokens, não os define
// ---------------------------------------------------------------------
for (const arquivo of await listarArquivos(path.join(RAIZ, "packages/ui"))) {
  const linhas = readFileSync(arquivo, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(linha) && !linha.trimStart().startsWith("*")) {
      reportar("cor fixa em @vortexis/ui", arquivo, i + 1, linha);
    }
  });
}

// ---------------------------------------------------------------------
// 4. Client Component importando superfície de servidor
// ---------------------------------------------------------------------
for (const arquivo of await listarArquivos(path.join(RAIZ, "apps"))) {
  const conteudo = readFileSync(arquivo, "utf8");
  if (!/^\s*["']use client["']/m.test(conteudo)) continue;

  const linhas = conteudo.split("\n");
  linhas.forEach((linha, i) => {
    const importaServidor =
      /from\s+["']@vortexis\/commerce["']/.test(linha) ||
      /from\s+["']@vortexis\/db["']/.test(linha) ||
      /from\s+["']@\/lib\/env["']/.test(linha);
    if (importaServidor) {
      reportar(
        'Client Component importando servidor (use "/client" ou "@/lib/env.client")',
        arquivo,
        i + 1,
        linha,
      );
    }
  });
}

// ---------------------------------------------------------------------

if (falhas.length === 0) {
  console.log("✓ fronteiras da arquitetura respeitadas");
  process.exit(0);
}

console.error(`\n❌ ${falhas.length} violação(ões) de fronteira:\n`);
for (const f of falhas) {
  console.error(`  ${f.arquivo}:${f.linha}`);
  console.error(`    ${f.regra}`);
  console.error(`    ${f.trecho}\n`);
}
console.error("Ver docs/16-VORTEXIS-CORE.md e docs/02-ARQUITETURA.md\n");
process.exit(1);

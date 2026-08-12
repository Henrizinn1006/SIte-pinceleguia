import "server-only";

/**
 * Rate limiting em memória.
 *
 * ⚠️ LIMITAÇÃO CONHECIDA: o estado vive no processo. Em ambiente
 * serverless com várias instâncias, cada uma tem o próprio contador —
 * o limite efetivo é maior que o configurado.
 *
 * É suficiente para desenvolvimento e para um painel de poucos
 * usuários. Antes do go-live, trocar por Upstash Redis, que é o que
 * está previsto em docs/13 §5. A interface abaixo não muda.
 */

interface Janela {
  contagem: number;
  expiraEm: number;
}

const janelas = new Map<string, Janela>();

/** Evita crescimento indefinido do Map em processo de vida longa. */
function limparExpiradas(agora: number) {
  if (janelas.size < 500) return;
  for (const [chave, janela] of janelas) {
    if (janela.expiraEm <= agora) janelas.delete(chave);
  }
}

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
  /** Segundos até liberar. */
  esperarSegundos: number;
}

export function verificarLimite(
  chave: string,
  limite: number,
  janelaMs: number,
): ResultadoLimite {
  const agora = Date.now();
  limparExpiradas(agora);

  const atual = janelas.get(chave);

  if (!atual || atual.expiraEm <= agora) {
    janelas.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return { permitido: true, restantes: limite - 1, esperarSegundos: 0 };
  }

  if (atual.contagem >= limite) {
    return {
      permitido: false,
      restantes: 0,
      esperarSegundos: Math.ceil((atual.expiraEm - agora) / 1000),
    };
  }

  atual.contagem += 1;
  return {
    permitido: true,
    restantes: limite - atual.contagem,
    esperarSegundos: 0,
  };
}

/** Zera o contador — chamado após login bem-sucedido. */
export function limparLimite(chave: string) {
  janelas.delete(chave);
}

/** Limites do painel. Ver docs/13-AUTH-RBAC-SEGURANCA.md §5 */
export const LIMITES = {
  loginPorIp: { limite: 5, janelaMs: 15 * 60 * 1000 },
  loginPorEmail: { limite: 5, janelaMs: 15 * 60 * 1000 },
} as const;

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { autenticar, registrar, registrarLoginFalho } from "@vortexis/auth";
import {
  apagarCookieDeSessao,
  contextoDaRequisicao,
  gravarCookieDeSessao,
  lerTokenDaSessao,
} from "@/lib/session";
import { LIMITES, limparLimite, verificarLimite } from "@/lib/rate-limit";
import { encerrarSessao } from "@vortexis/auth";

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

export interface EstadoLogin {
  erro?: string;
}

/**
 * Login do painel.
 *
 * A mensagem de erro é sempre a mesma para e-mail inexistente, senha
 * errada e usuário sem acesso. Distinguir revelaria quais e-mails têm
 * conta administrativa — informação valiosa para quem está atacando.
 * A distinção real fica na auditoria.
 */
export async function entrar(
  _estadoAnterior: EstadoLogin,
  dados: FormData,
): Promise<EstadoLogin> {
  const contexto = await contextoDaRequisicao();

  const parsed = esquemaLogin.safeParse({
    email: dados.get("email"),
    senha: dados.get("senha"),
  });

  if (!parsed.success) {
    return { erro: "Confira o e-mail e a senha." };
  }

  const { email, senha } = parsed.data;
  const ip = contexto.ipAddress ?? "desconhecido";

  // Limite por IP e por e-mail: o primeiro barra varredura de senhas,
  // o segundo barra ataque distribuído contra uma conta específica.
  const porIp = verificarLimite(`login:ip:${ip}`, LIMITES.loginPorIp.limite, LIMITES.loginPorIp.janelaMs);
  const porEmail = verificarLimite(
    `login:email:${email}`,
    LIMITES.loginPorEmail.limite,
    LIMITES.loginPorEmail.janelaMs,
  );

  if (!porIp.permitido || !porEmail.permitido) {
    const espera = Math.max(porIp.esperarSegundos, porEmail.esperarSegundos);
    const minutos = Math.ceil(espera / 60);
    await registrarLoginFalho(email, "rate_limit", contexto);
    return {
      erro: `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
    };
  }

  const resultado = await autenticar({
    email,
    senha,
    ipAddress: contexto.ipAddress ?? undefined,
    userAgent: contexto.userAgent ?? undefined,
  });

  if (!resultado.ok || !resultado.token || !resultado.expiresAt || !resultado.actor) {
    await registrarLoginFalho(email, resultado.motivo ?? "desconhecido", contexto);
    return { erro: "E-mail ou senha incorretos." };
  }

  limparLimite(`login:ip:${ip}`);
  limparLimite(`login:email:${email}`);

  await gravarCookieDeSessao(resultado.token, resultado.expiresAt);
  await registrar(resultado.actor, {
    action: "auth.login",
    entityType: "session",
    ...contexto,
  });

  redirect("/inicio");
}

export async function sair(): Promise<never> {
  const token = await lerTokenDaSessao();
  await encerrarSessao(token);
  await apagarCookieDeSessao();
  redirect("/entrar");
}

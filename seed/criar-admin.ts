/**
 * Cria o primeiro administrador.
 *
 * O painel NÃO tem tela de cadastro — formulário de registro exposto
 * num admin é convite para força bruta. O primeiro usuário nasce aqui,
 * pela linha de comando; os demais nascem de convite.
 * Ver docs/13-AUTH-RBAC-SEGURANCA.md §1
 *
 * Uso:
 *   npm run admin:criar -- --email=voce@exemplo.com --nome="Seu Nome"
 *
 * A senha é gerada aleatoriamente e mostrada UMA vez. Não fica em
 * nenhum arquivo, nem no histórico do shell.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@vortexis/auth";
import { semearRbac } from "./rbac";

const db = new PrismaClient();

function lerArgumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

/** Senha legível de digitar no celular, com ~62 bits de entropia. */
function gerarSenhaProvisoria(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  const senha = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join("");
  return `${senha.slice(0, 4)}-${senha.slice(4, 8)}-${senha.slice(8, 12)}`;
}

async function main() {
  const email = lerArgumento("email")?.trim().toLowerCase();
  const nome = lerArgumento("nome")?.trim();

  if (!email || !email.includes("@")) {
    console.error(
      '\n❌ Informe um e-mail válido:\n' +
        '   npm run admin:criar -- --email=voce@exemplo.com --nome="Seu Nome"\n',
    );
    process.exit(1);
  }

  // Garante que papéis e permissões existam antes de vincular.
  await semearRbac();

  const papelAdmin = await db.role.findUnique({ where: { key: "admin" } });
  if (!papelAdmin) {
    console.error("❌ Papel 'admin' não encontrado após o seed.");
    process.exit(1);
  }

  const existente = await db.user.findUnique({ where: { email } });

  if (existente) {
    // Não sobrescreve a senha de quem já existe — apenas promove.
    await db.user.update({
      where: { id: existente.id },
      data: { isStaff: true, isActive: true },
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: existente.id, roleId: papelAdmin.id } },
      update: {},
      create: { userId: existente.id, roleId: papelAdmin.id },
    });
    console.log(`\n✅ ${email} promovido a administrador.`);
    console.log("   A senha atual foi mantida.\n");
    return;
  }

  const senha = gerarSenhaProvisoria();
  const usuario = await db.user.create({
    data: {
      email,
      name: nome || email.split("@")[0] || "Administrador",
      passwordHash: await hashPassword(senha),
      emailVerified: true,
      isStaff: true,
      isActive: true,
      roles: { create: { roleId: papelAdmin.id } },
    },
  });

  console.log("\n" + "─".repeat(58));
  console.log("  ADMINISTRADOR CRIADO");
  console.log("─".repeat(58));
  console.log(`  E-mail: ${usuario.email}`);
  console.log(`  Senha:  ${senha}`);
  console.log("─".repeat(58));
  console.log("  Esta senha aparece UMA única vez. Guarde-a agora.");
  console.log("  Troque no primeiro acesso.");
  console.log("─".repeat(58) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Falha:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

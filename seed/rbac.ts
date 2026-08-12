/**
 * Seed de permissões e papéis.
 *
 * Idempotente: pode rodar quantas vezes quiser. Papéis de sistema têm
 * suas permissões RESSINCRONIZADAS a cada execução — é assim que uma
 * permissão nova criada pela VORTEXIS chega ao papel de administrador
 * sem intervenção manual.
 *
 * Uso:  npm run db:rbac
 */
import { PrismaClient } from "@prisma/client";
import { PAPEIS_DE_SISTEMA, PERMISSIONS } from "@vortexis/auth/permissions";

const db = new PrismaClient();

export async function semearRbac(): Promise<void> {
  // --- Permissões ---
  for (const [key, meta] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({
      where: { key },
      update: { description: meta.description, group: meta.group },
      create: { key, description: meta.description, group: meta.group },
    });
  }
  console.log(`✓ ${Object.keys(PERMISSIONS).length} permissões`);

  // --- Papéis ---
  let posicao = 0;
  for (const [key, definicao] of Object.entries(PAPEIS_DE_SISTEMA)) {
    const papel = await db.role.upsert({
      where: { key },
      update: { name: definicao.name, description: definicao.description },
      create: {
        key,
        name: definicao.name,
        description: definicao.description,
        isSystem: true,
        position: posicao++,
      },
    });

    const permissoes = await db.permission.findMany({
      where: { key: { in: [...definicao.permissions] } },
      select: { id: true },
    });

    // Ressincroniza: remove o que saiu do catálogo, adiciona o que entrou.
    await db.rolePermission.deleteMany({ where: { roleId: papel.id } });
    await db.rolePermission.createMany({
      data: permissoes.map((p) => ({ roleId: papel.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    console.log(`✓ papel "${key}" com ${permissoes.length} permissões`);
  }
}

// Executado diretamente (npm run db:rbac)
if (process.argv[1]?.includes("rbac")) {
  semearRbac()
    .then(() => console.log("\n✅ RBAC sincronizado.\n"))
    .catch((e) => {
      console.error("❌ Falha ao semear RBAC:", e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}

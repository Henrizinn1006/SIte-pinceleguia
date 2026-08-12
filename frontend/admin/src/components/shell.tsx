import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", label: "Início", end: true },
  { to: "/categorias", label: "Categorias" },
  { to: "/produtos", label: "Produtos" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/cupons", label: "Cupons" },
  { to: "/clientes", label: "Clientes" },
  { to: "/auditoria", label: "Auditoria" },
  { to: "/configuracoes", label: "Configurações" },
];

/**
 * Casca do painel autenticado. Métrica decorativa nenhuma na home —
 * mesma decisão do apps/admin original: número inventado é pior que
 * espaço vazio.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-beige bg-warm-white p-4 sm:block">
        <p className="mb-6 px-2 font-serif text-lg text-ink">Pincel &amp; Guia</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("rounded-sm px-3 py-2 text-sm transition-colors", isActive ? "bg-beige/70 text-ink" : "text-ink-muted hover:bg-beige/40 hover:text-ink")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-beige bg-warm-white px-4 py-3 sm:px-6">
          <p className="text-sm text-ink-muted">
            Olá, <span className="text-ink">{user?.name}</span>
          </p>
          <button type="button" onClick={() => void logout()} className="rounded-sm border border-beige-dark px-3 py-1.5 text-sm text-ink hover:bg-beige/40">
            Sair
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

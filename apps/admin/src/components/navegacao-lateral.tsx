"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@vortexis/ui";
import { dynamicHref } from "@/lib/routes";
import { Icone } from "./icones";
import type { ItemDeNavegacao } from "@/lib/navegacao";

function estaAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Sidebar do desktop. */
export function NavegacaoLateral({ itens }: { itens: ItemDeNavegacao[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Seções do painel">
      {itens.map((item) => {
        const ativo = estaAtivo(pathname, item.href);
        const emBreve = Boolean(item.implementadoEm);

        return (
          <Link
            key={item.href}
            href={dynamicHref(emBreve ? "#" : item.href)}
            aria-disabled={emBreve}
            aria-current={ativo ? "page" : undefined}
            onClick={emBreve ? (e) => e.preventDefault() : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm transition-colors",
              ativo && "bg-beige/70 font-medium text-ink",
              !ativo && !emBreve && "text-ink-muted hover:bg-beige/40 hover:text-ink",
              emBreve && "cursor-default text-ink-muted/50",
            )}
          >
            <Icone nome={item.icone} className="size-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {emBreve && (
              <span className="text-[10px] tracking-wide uppercase opacity-70">
                {item.implementadoEm}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Barra inferior do celular.
 *
 * Máximo 5 destinos, ao alcance do polegar. O resto vive na gaveta.
 * Ver docs/14-CMS-SECTION-BUILDER.md §6
 */
export function NavegacaoInferior({ itens }: { itens: ItemDeNavegacao[] }) {
  const pathname = usePathname();
  const principais = itens.filter((i) => i.principal).slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-beige-dark bg-warm-white lg:hidden"
      aria-label="Navegação principal"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {principais.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          const emBreve = Boolean(item.implementadoEm);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={dynamicHref(emBreve ? "#" : item.href)}
                aria-disabled={emBreve}
                aria-current={ativo ? "page" : undefined}
                onClick={emBreve ? (e) => e.preventDefault() : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                  ativo ? "text-ink" : "text-ink-muted",
                  emBreve && "opacity-40",
                )}
              >
                <Icone nome={item.icone} className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

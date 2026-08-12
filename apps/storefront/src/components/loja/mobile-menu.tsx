"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@vortexis/ui";
import { mainNav } from "@/lib/site";
import { cn } from "@vortexis/ui";

/**
 * Menu mobile em painel lateral (não dropdown) — ver docs/07.
 *
 * Acessibilidade: foco preso dentro do painel, Esc fecha, foco retorna
 * ao botão que abriu, scroll do body travado enquanto aberto.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fecha ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60 lg:hidden"
        aria-label="Abrir menu de navegação"
        aria-expanded={open}
      >
        <MenuIcon className="size-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            tabIndex={-1}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-cream shadow-strong"
          >
            <div className="flex items-center justify-between border-b border-beige px-5 py-4">
              <span className="font-serif text-lg tracking-[0.15em] text-ink uppercase">
                Menu
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="flex size-11 items-center justify-center rounded-sm text-ink hover:bg-beige/60"
                aria-label="Fechar menu"
              >
                <CloseIcon className="size-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Principal">
              <ul className="flex flex-col gap-1">
                {mainNav.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center rounded-sm px-3 font-serif text-lg transition-colors",
                          isActive
                            ? "bg-beige/70 text-ink"
                            : "text-ink hover:bg-beige/40",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-beige px-5 py-5">
              <Link
                href="/entrar"
                className="flex min-h-12 items-center justify-center rounded-sm border border-caramel text-ink transition-colors hover:bg-gold-soft/30"
              >
                Minha conta
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

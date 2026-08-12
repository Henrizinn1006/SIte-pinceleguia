"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icone } from "./icones";
import { NavegacaoLateral } from "./navegacao-lateral";
import type { ItemDeNavegacao } from "@/lib/navegacao";

/**
 * Gaveta lateral do celular — dá acesso ao que não cabe na barra
 * inferior.
 *
 * Acessibilidade: foco preso, Esc fecha, foco volta ao gatilho.
 */
export function Gaveta({
  itens,
  children,
}: {
  itens: ItemDeNavegacao[];
  children?: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const pathname = usePathname();
  const painelRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setAberta(false), [pathname]);

  useEffect(() => {
    if (!aberta) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAberta(false);
        gatilhoRef.current?.focus();
        return;
      }
      if (evento.key !== "Tab" || !painelRef.current) return;

      const focaveis = painelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!primeiro || !ultimo) return;

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    painelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu"
        aria-expanded={aberta}
        className="flex size-11 items-center justify-center rounded-sm text-ink hover:bg-beige/60 lg:hidden"
      >
        <Icone nome="menu" className="size-6" />
      </button>

      {aberta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setAberta(false)}
            aria-label="Fechar menu"
            tabIndex={-1}
          />
          <div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu do painel"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-warm-white shadow-medium"
          >
            <div className="flex items-center justify-between border-b border-beige px-4 py-3">
              <span className="font-serif text-lg">Menu</span>
              <button
                type="button"
                onClick={() => {
                  setAberta(false);
                  gatilhoRef.current?.focus();
                }}
                aria-label="Fechar menu"
                className="flex size-11 items-center justify-center rounded-sm text-ink hover:bg-beige/60"
              >
                <Icone nome="close" className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <NavegacaoLateral itens={itens} />
            </div>

            {children && <div className="border-t border-beige p-3">{children}</div>}
          </div>
        </div>
      )}
    </>
  );
}

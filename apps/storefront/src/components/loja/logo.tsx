import Link from "next/link";
import { cn } from "@vortexis/ui";

/**
 * Logo tipográfico provisório, no espírito da prévia (monograma
 * circular + nome serifado).
 *
 * DECISÃO PENDENTE: substituir pelo arquivo vetorial oficial quando o
 * cliente enviar. Ver docs/10-DECISOES-PENDENTES.md
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="Pincel & Guia — página inicial"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-caramel/60 bg-warm-white transition-colors group-hover:border-caramel"
      >
        <span className="font-serif text-lg leading-none text-gold">P&amp;G</span>
      </span>

      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-base tracking-[0.18em] text-ink uppercase">
            Pincel
          </span>
          <span className="font-serif text-base tracking-[0.18em] text-ink uppercase">
            <span className="text-gold">&amp;</span> Guia
          </span>
        </span>
      )}
    </Link>
  );
}

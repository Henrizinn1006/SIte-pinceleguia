import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

/** Porta de apps/storefront/src/components/loja/nav-link.tsx. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <RouterNavLink
      to={href}
      end={href === "/"}
      className={({ isActive }) =>
        cn("relative py-2 text-sm tracking-wide transition-colors", isActive ? "text-ink" : "text-ink-muted hover:text-ink")
      }
    >
      {({ isActive }) => (
        <>
          {children}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-caramel-deep transition-transform duration-300",
              isActive ? "scale-x-100" : "scale-x-0",
            )}
          />
        </>
      )}
    </RouterNavLink>
  );
}

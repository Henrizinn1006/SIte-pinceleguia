"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@vortexis/ui";

/** Link da navegação com underline dourado no item ativo. */
export function NavLink({ href, children }: { href: Route; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative py-2 text-sm tracking-wide transition-colors",
        isActive ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-caramel-deep transition-transform duration-300",
          isActive ? "scale-x-100" : "scale-x-0",
        )}
      />
    </Link>
  );
}

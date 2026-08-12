import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@/components/ui/icons";

/** Porta de apps/storefront/src/components/loja/section-heading.tsx. */
export function SectionHeading({
  title,
  linkLabel,
  linkHref,
  children,
  as: Tag = "h2",
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  children?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Tag className="text-h2 font-serif">{title}</Tag>
        {children && <p className="mt-2 max-w-prose text-ink-muted">{children}</p>}
      </div>

      {linkLabel && linkHref && (
        <Link to={linkHref} className="group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          {linkLabel}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

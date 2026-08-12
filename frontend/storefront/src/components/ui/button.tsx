import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-caramel-deep text-warm-white hover:bg-ink shadow-soft hover:shadow-medium",
  secondary: "bg-ink text-warm-white hover:bg-olive",
  outline: "border border-caramel text-ink bg-transparent hover:bg-gold-soft/30",
  ghost: "text-ink hover:bg-beige/60",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-11 px-6 text-base",
  lg: "min-h-13 px-8 text-base sm:text-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium " +
  "transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & { to: LinkProps["to"] } & Omit<LinkProps, "to" | "className" | "children">) {
  return (
    <Link to={to} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}

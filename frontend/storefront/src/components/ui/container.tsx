import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Porta de packages/ui/src/container.tsx. */
interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
  as?: "div" | "section" | "header" | "footer" | "main" | "nav";
}

const SIZES = {
  narrow: "max-w-3xl",
  default: "max-w-7xl",
  wide: "max-w-[90rem]",
} as const;

export function Container({ children, className, size = "default", as: Tag = "div" }: ContainerProps) {
  return <Tag className={cn("mx-auto w-full px-5 sm:px-8", SIZES[size], className)}>{children}</Tag>;
}

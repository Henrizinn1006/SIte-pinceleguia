import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes do Tailwind resolvendo conflitos. Porta de packages/ui/src/cn.ts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

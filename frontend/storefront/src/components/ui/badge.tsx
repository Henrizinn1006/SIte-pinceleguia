import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "gold" | "success" | "danger" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-beige text-ink",
  gold: "bg-caramel-deep text-warm-white",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
  warning: "bg-warning/15 text-warning",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide", TONES[tone], className)}>
      {children}
    </span>
  );
}

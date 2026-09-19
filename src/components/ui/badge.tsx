import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

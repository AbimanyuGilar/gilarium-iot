import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("mb-4 block", className)}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-gray-400">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const selectBase =
  "w-full appearance-none rounded-md bg-muted px-4 h-12 text-sm font-medium text-foreground outline-none border-2 border-transparent transition-all duration-200 focus:bg-white focus:border-primary cursor-pointer";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

export default function Select({ className, options, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(selectBase, className, "pr-10")} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
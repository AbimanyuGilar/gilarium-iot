"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "danger" | "success" | "ghost";
type Size = "sm" | "md" | "lg" | "xl" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold uppercase tracking-wider transition-all duration-200 select-none whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong hover:scale-105",
  secondary: "bg-muted text-foreground hover:bg-gray-200 hover:scale-105",
  outline:
    "border-4 border-foreground text-foreground hover:bg-foreground hover:text-white",
  danger: "bg-red-500 text-white hover:bg-red-600 hover:scale-105",
  success: "bg-secondary text-white hover:bg-secondary-strong hover:scale-105",
  ghost: "text-foreground hover:bg-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-xs",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-sm",
  xl: "h-16 px-10 text-base",
  icon: "h-11 w-11",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
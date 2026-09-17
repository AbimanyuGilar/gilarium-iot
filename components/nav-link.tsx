"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export default function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-14 items-center gap-4 rounded-md px-3 transition-all duration-200 hover:scale-[1.02]",
        active ? "bg-primary text-white" : "text-gray-300 hover:bg-white/10"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110",
          active ? "bg-white text-primary" : "bg-white/10 text-gray-100"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="hidden text-sm font-semibold uppercase tracking-wider lg:block">
        {label}
      </span>
    </Link>
  );
}
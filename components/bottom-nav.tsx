"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Kasir", icon: ShoppingCart },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t-2 border-white/10 bg-foreground text-white lg:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              active ? "text-white" : "text-gray-400"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                active ? "bg-primary text-white" : "bg-white/10 text-gray-200"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-200 transition-colors">
          <LogOut className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span>Keluar</span>
      </button>
    </nav>
  );
}
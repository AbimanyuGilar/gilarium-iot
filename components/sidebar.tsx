"use client";

import Link from "next/link";
import { LayoutDashboard, ShoppingCart, Package, Receipt, Cpu } from "lucide-react";
import NavLink from "@/components/nav-link";
import LogoutButton from "@/components/logout-button";

export default function Sidebar({ user }: { user: { name?: string; email: string } }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col bg-foreground text-white lg:flex lg:w-64">
      <div className="relative flex h-36 shrink-0 items-center gap-4 overflow-hidden bg-primary px-4 lg:px-6">
        <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <span className="absolute -bottom-14 -right-4 h-24 w-24 rotate-45 bg-white/5" />
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-primary">
          <Cpu className="h-9 w-9" strokeWidth={2.5} />
        </span>
        <div className="hidden lg:block">
          <p className="text-2xl font-extrabold tracking-tight leading-none">Gilarium IoT</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6 lg:px-4">
        <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 lg:block">
          Menu
        </p>
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
        <NavLink href="/pos" label="Kasir POS" icon={ShoppingCart} />
        <NavLink href="/products" label="Produk" icon={Package} />
        <NavLink href="/transactions" label="Transaksi" icon={Receipt} />
      </nav>

      <div className="shrink-0 border-t-2 border-white/10 p-3 lg:p-4">
        <div className="flex items-center justify-center gap-3 lg:justify-between">
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
              {(user.name ?? "U").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name ?? "Pengguna"}</p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <LogoutButton compact />
        </div>
      </div>

      <Link
        href="/products"
        className="hidden h-14 items-center justify-center gap-2 bg-accent text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 hover:scale-[1.02] hover:bg-accent-strong lg:flex"
      >
        <Package className="h-5 w-5" strokeWidth={2.5} />
        Kelola Stok
      </Link>
    </aside>
  );
}
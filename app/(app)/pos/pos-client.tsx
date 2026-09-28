"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Wallet,
  PackageX,
} from "lucide-react";
import type { Product } from "@/lib/generated/prisma/client";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/common";
import { formatIDR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { checkout, pendingTransaction } from "@/lib/actions";
import Script from "next/script";

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void,
          onPending?: (result: any) => void,
          onError?: (result: any) => void,
          onClose?: () => void 
        }
      ) => void
    }
  }
}

type PosProduct = Product & { imageUrl: string };

export default function PosClient({ products }: { products: PosProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua Kategori");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["Semua Kategori", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const mq = !q || p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
      const mc = category === "Semua Kategori" || p.category === category;
      return mq && mc;
    });
  }, [products, query, category]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = byId.get(id);
          return product ? { product, qty } : null;
        })
        .filter((x): x is { product: PosProduct; qty: number } => x !== null)
        .sort((a, b) => a.product.name.localeCompare(b.product.name)),
    [cart, byId]
  );

  const itemCount = useMemo(() => cartLines.reduce((s, l) => s + l.qty, 0), [cartLines]);
  const subtotal = useMemo(() => cartLines.reduce((s, l) => s + l.product.price * l.qty, 0), [cartLines]);

  function add(id: string, qty = 1) {
    setCart((prev) => {
      const product = byId.get(id);
      if (!product) return prev;
      const next = Math.min((prev[id] ?? 0) + qty, product.stock);
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) return remove(id);
    const product = byId.get(id);
    const max = product?.stock ?? 0;
    setCart((prev) => ({ ...prev, [id]: Math.min(qty, max) }));
  }

  function remove(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function clearCart() {
    setCart({});
  }

  // console.log(cartLines)

  async function pay() {
    const productsToCheckout = cartLines.map(({product, qty}) => ({
      id: product.id, 
      qty
    }))

    const transaction = await checkout(productsToCheckout)

    if (transaction.ok && transaction.token) {
      window.snap.pay(transaction.token, {
        onSuccess: () => {
          window.location.href = `/pos`;
        },
        onPending: async () => {
          const pending = await pendingTransaction({ snapToken: transaction.token, orderId: transaction.orderId })
          if (pending.ok) {
            alert('Pembayaran ditunda.')
            console.log(pending)
          } else {
            console.log(pending.message)
          }
        },
      })
    } else {
      alert(transaction.message)
    }

    console.log(productsToCheckout)
  }

  return (
    <>
      <Script 
        type="text/javascript"
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.MIDTRANS_CLIENT_KEY}
      ></Script>
      
      <div className="space-y-8 pb-40 lg:pb-0">
        <PageHeader
          title="Kasir POS"
          subtitle="Klik produk untuk menambahkan ke keranjang. Stok berkurang otomatis saat transaksi lunas."
          action={
            <Badge color="green" className="h-11 px-4 text-sm">
              <ShoppingCart className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
              {formatNumber(itemCount)} item · {formatIDR(subtotal)}
            </Badge>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
                <Input
                  placeholder="Cari produk..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12"
                />
              </div>
              <div className="sm:w-72">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={categories.map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-lg bg-white p-16 text-center">
                <PackageX className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={2} />
                <p className="text-lg font-bold">Produk tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => {
                  const qty = cart[p.id] ?? 0;
                  const out = p.stock === 0;
                  const maxed = qty >= p.stock;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => add(p.id, 1)}
                      className={cn(
                        "group relative overflow-hidden rounded-lg bg-white p-4 text-left transition-all duration-200 hover:scale-[1.02]",
                        out && "cursor-not-allowed opacity-50 hover:scale-100",
                        qty > 0 && "ring-2 ring-primary"
                      )}
                    >
                      <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/10" />
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-12 w-12 rounded-md object-cover ring-1 ring-gray-100"
                        />
                        {qty > 0 ? (
                          <span className="flex h-8 items-center rounded-full bg-primary px-3 text-sm font-extrabold text-white">
                            {formatNumber(qty)}×
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-1 text-sm font-bold">{p.name}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-extrabold tracking-tight">{formatIDR(p.price)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            out ? "bg-red-100 text-red-600" : p.stock <= 10 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                          )}
                        >
                          {out ? "Habis" : maxed ? "Maks" : `${formatNumber(p.stock)} stok`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="hidden h-fit lg:sticky lg:top-8 lg:block">
            <div className="flex h-full flex-col rounded-lg bg-foreground p-5 text-white lg:h-[calc(100vh-6rem)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
                  <ShoppingCart className="h-6 w-6" strokeWidth={2.5} />
                  Keranjang
                </h2>
                {cartLines.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-semibold uppercase tracking-wider text-white/60 transition-colors hover:text-red-400"
                  >
                    Kosongkan
                  </button>
                ) : null}
              </div>

              {cartLines.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-14 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <ShoppingCart className="h-8 w-8 text-white/60" strokeWidth={2.5} />
                  </span>
                  <p className="font-semibold text-white/70">Keranjang masih kosong</p>
                  <p className="max-w-[220px] text-sm text-white/45">Klik produk di kiri untuk mulai menjual.</p>
                </div>
              ) : (
                <ul className="max-h-[50vh] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-none">
                  {cartLines.map(({ product, qty }) => (
                    <li key={product.id} className="rounded-md bg-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/20"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{product.name}</p>
                            <p className="text-xs text-white/50">{formatIDR(product.price)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/70 transition-all duration-200 hover:scale-105 hover:bg-red-500 hover:text-white"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQty(product.id, qty - 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-all duration-200 hover:scale-105 hover:bg-white/25"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="w-9 text-center font-extrabold">{formatNumber(qty)}</span>
                          <button
                            type="button"
                            onClick={() => add(product.id, 1)}
                            disabled={qty >= product.stock}
                            className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-all duration-200 hover:scale-105 hover:bg-white/25 disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                        <span className="font-extrabold">{formatIDR(product.price * qty)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-2 border-t-2 border-white/10 pt-4 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">{formatIDR(subtotal)}</span>
                </div>
              </div>

              <Button
                size="xl"
                className="mt-4 w-full"
                disabled={cartLines.length === 0}
                onClick={pay}
              >
                <Wallet className="h-6 w-6" strokeWidth={2.5} />
                {cartLines.length === 0 ? "Keranjang Kosong" : `Bayar ${formatIDR(subtotal)}`}
              </Button>
              <p className="mt-3 text-center text-xs text-white/50">
                Disimpan otomatis &amp; stok berkurang saat lunas.
              </p>
            </div>
          </aside>
        </div>

        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-20 left-4 right-4 z-40 flex items-center gap-3 rounded-xl bg-foreground px-4 py-3.5 text-white shadow-2xl transition-transform duration-200 active:scale-[0.98] lg:hidden"
        >
          <span className="relative shrink-0">
            <ShoppingCart className="h-6 w-6" strokeWidth={2.5} />
            {itemCount > 0 ? (
              <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-white">
                {formatNumber(itemCount)}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-extrabold tracking-tight">
              {formatIDR(subtotal)}
            </span>
            <span className="block text-xs text-white/60">
              {cartLines.length === 0 ? "Keranjang kosong" : `${formatNumber(itemCount)} item`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold">
            <Wallet className="h-4 w-4" strokeWidth={2.5} />
            Bayar
          </span>
        </button>

        <Modal
          open={mobileCartOpen}
          onClose={() => setMobileCartOpen(false)}
          title="Keranjang"
        >
          <div className="rounded-lg bg-foreground p-4 text-white">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">
                {formatNumber(itemCount)} item
              </p>
              {cartLines.length > 0 ? (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold uppercase tracking-wider text-white/60 transition-colors hover:text-red-400"
                >
                  Kosongkan
                </button>
              ) : null}
            </div>

            {cartLines.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <ShoppingCart className="h-7 w-7 text-white/60" strokeWidth={2.5} />
                </span>
                <p className="font-semibold text-white/70">Keranjang masih kosong</p>
              </div>
            ) : (
              <ul className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                {cartLines.map(({ product, qty }) => (
                  <li key={product.id} className="rounded-md bg-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/20"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{product.name}</p>
                          <p className="text-xs text-white/50">{formatIDR(product.price)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/70 transition-all duration-200 hover:scale-105 hover:bg-red-500 hover:text-white"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(product.id, qty - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-all duration-200 hover:bg-white/25"
                        >
                          <Minus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <span className="w-9 text-center font-extrabold">{formatNumber(qty)}</span>
                        <button
                          type="button"
                          onClick={() => add(product.id, 1)}
                          disabled={qty >= product.stock}
                          className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-all duration-200 hover:bg-white/25 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <span className="font-extrabold">{formatIDR(product.price * qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2 border-t-2 border-white/10 pt-4 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatIDR(subtotal)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={cartLines.length === 0}
              onClick={pay}
            >
              <Wallet className="h-5 w-5" strokeWidth={2.5} />
              {cartLines.length === 0 ? "Keranjang Kosong" : `Bayar ${formatIDR(subtotal)}`}
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
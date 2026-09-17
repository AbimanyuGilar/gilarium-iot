"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock4,
  Wallet,
  PackageX,
  Banknote,
} from "lucide-react";
import type { Product } from "@/lib/generated/prisma/client";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/common";
import { checkout, type ActionResult } from "@/lib/actions";
import { formatIDR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const METHOD_OPTIONS = [
  { value: "CASH", label: "Tunai" },
  { value: "QRIS", label: "QRIS" },
  { value: "CARD", label: "Kartu Debit/Kredit" },
  { value: "TRANSFER", label: "Transfer Bank" },
];

type ResultState = { invoiceNo: string; deferred: boolean } | null;

type PosProduct = Product & { imageUrl: string };

const INITIAL: ActionResult = { ok: false, error: "" };

export default function PosClient({ products }: { products: PosProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua Kategori");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

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
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

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

  return (
    <div className="space-y-8 pb-40 lg:pb-0">
      <PageHeader
        title="Kasir POS"
        subtitle="Klik produk untuk menambahkan ke keranjang. Stok berkurang otomatis saat transaksi lunas."
        action={
          <Badge color="green" className="h-11 px-4 text-sm">
            <ShoppingCart className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
            {formatNumber(itemCount)} item · {formatIDR(total)}
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
              <div className="flex justify-between text-white/70">
                <span>Pajak PPN 11%</span>
                <span className="font-semibold text-white">{formatIDR(tax)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-white">
                <span>Total</span>
                <span>{formatIDR(total)}</span>
              </div>
            </div>

            <Button
              size="xl"
              className="mt-4 w-full"
              disabled={cartLines.length === 0}
              onClick={() => setCheckoutOpen(true)}
            >
              <Wallet className="h-6 w-6" strokeWidth={2.5} />
              {cartLines.length === 0 ? "Keranjang Kosong" : `Bayar ${formatIDR(total)}`}
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
            {formatIDR(total)}
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
            <div className="flex justify-between text-white/70">
              <span>Pajak PPN 11%</span>
              <span className="font-semibold text-white">{formatIDR(tax)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-extrabold text-white">
              <span>Total</span>
              <span>{formatIDR(total)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={cartLines.length === 0}
            onClick={() => {
              setMobileCartOpen(false);
              setCheckoutOpen(true);
            }}
          >
            <Wallet className="h-5 w-5" strokeWidth={2.5} />
            {cartLines.length === 0 ? "Keranjang Kosong" : `Bayar ${formatIDR(total)}`}
          </Button>
        </div>
      </Modal>

      {checkoutOpen ? (
        <CheckoutModal
          lines={cartLines}
          onClose={() => setCheckoutOpen(false)}
          onDone={(invoiceNo, deferred) => {
            setCheckoutOpen(false);
            clearCart();
            setResult({ invoiceNo, deferred });
            router.refresh();
          }}
        />
      ) : null}

      {result ? (
        <Modal open onClose={() => setResult(null)} title="Transaksi Berhasil">
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-11 w-11" strokeWidth={2.5} />
            </span>
            <p className="text-xl font-extrabold tracking-tight">{result.invoiceNo}</p>
            <p className="mt-1 text-sm text-gray-500">
              {result.deferred
                ? "Transaksi disimpan sebagai menunggu pembayaran."
                : "Pembayaran diterima. Stok sudah diperbarui otomatis."}
            </p>
            <Button size="lg" className="mt-6 w-full" onClick={() => setResult(null)}>
              Transaksi Baru
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CheckoutModal({
  lines,
  onClose,
  onDone,
}: {
  lines: Array<{ product: PosProduct; qty: number }>;
  onClose: () => void;
  onDone: (invoiceNo: string, deferred: boolean) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("CASH");
  const [received, setReceived] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deferring, setDeferring] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const receivedNum = Number(received);
  const change = receivedNum - total;
  const cashValid = method !== "CASH" || (!Number.isNaN(receivedNum) && received !== "" && change >= 0);
  const insufficientItems = lines.some((l) => l.qty > l.product.stock);

  function run(defer: boolean) {
    setError(null);
    setDeferring(defer);

    const form = new FormData();
    form.set(
      "items",
      JSON.stringify(lines.map((l) => ({ productId: l.product.id, quantity: l.qty })))
    );
    form.set("customerName", customer.trim());
    form.set("paymentMethod", method);
    form.set("defer", String(defer));

    startTransition(async () => {
      const res: ActionResult = await checkout(INITIAL, form);
      if (res.ok && res.invoiceNo) {
        onDone(res.invoiceNo, defer);
      } else if (!res.ok) {
        setError(res.error);
      } else {
        setError("Gagal memproses pembayaran.");
      }
    });
  }

  return (
    <Modal open onClose={onClose} title="Konfirmasi Pembayaran" wide>
      {insufficientItems ? (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Ada item di keranjang yang melebihi stok. Perbarui jumlahnya.
        </div>
      ) : null}

      <div className="mb-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-md bg-muted p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ringkasan</p>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {lines.map((l) => (
              <li key={l.product.id} className="flex items-center gap-2 text-sm">
                <img
                  src={l.product.imageUrl}
                  alt={l.product.name}
                  className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-gray-200"
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-bold">{l.qty}×</span> {l.product.name}
                </span>
                <span className="shrink-0 font-semibold">{formatIDR(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Nama Pelanggan <span className="text-gray-400">(opsional)</span>
          </label>
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" className="mb-4" />
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Metode Pembayaran
          </label>
          <Select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setReceived("");
              setError(null);
            }}
            options={METHOD_OPTIONS}
          />

          {method === "CASH" ? (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Uang Diterima
              </label>
              <Input
                type="number"
                min={0}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder={String(total)}
              />
              {!Number.isNaN(receivedNum) && received !== "" ? (
                <p className={`mt-2 text-sm font-bold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  Kembalian: {formatIDR(Math.max(change, 0))}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md bg-foreground p-5 text-white">
        <div className="flex justify-between text-sm text-white/70">
          <span>Subtotal</span>
          <span>{formatIDR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-white/70">
          <span>Pajak PPN 11%</span>
          <span>{formatIDR(tax)}</span>
        </div>
        <div className="mt-1 flex justify-between text-xl font-extrabold">
          <span>Total Tagihan</span>
          <span>{formatIDR(total)}</span>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={pending || insufficientItems}
          onClick={() => run(true)}
        >
          {pending && deferring ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock4 className="h-5 w-5" strokeWidth={2.5} />}
          Tunda Pembayaran
        </Button>
        <Button
          type="button"
          size="lg"
          variant="success"
          disabled={pending || !cashValid || insufficientItems}
          onClick={() => run(false)}
        >
          {pending && !deferring ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5" strokeWidth={2.5} />}
          {method === "CASH" ? `Bayar Tunai ${formatIDR(total)}` : "Bayar Sekarang"}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        Pembayaran lunas akan langsung mengurangi stok produk secara otomatis.
      </p>
    </Modal>
  );
}
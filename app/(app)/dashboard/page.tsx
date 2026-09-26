import Link from "next/link";
import {
  Package,
  Wallet,
  Receipt,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { productsWithImageUrl } from "@/lib/images";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatDate,
  formatIDR,
  formatNumber,
} from "@/lib/format";

const LOW_STOCK_THRESHOLD = 10;

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireSession();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    productCount,
    totalProducts,
    todaySummary,
    pendingCount,
    lowStockProducts,
    recentTransactions,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.transaction.aggregate({
      _sum: { total: true },
      _count: { _all: true },
      where: {
        paymentStatus: "PAID",
        OR: [
          { paidAt: { gte: startOfToday } },
          { paidAt: null, createdAt: { gte: startOfToday } },
          { paidAt: null, updatedAt: { gte: startOfToday } },
        ],
      },
    }),
    prisma.transaction.count({ where: { paymentStatus: "PENDING" } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { items: true },
    }),
  ]);

  const lowStock = productsWithImageUrl(lowStockProducts);

  const stats = [
    {
      label: "Produk Aktif",
      value: formatNumber(productCount),
      total: `${formatNumber(totalProducts)} total`,
      icon: Package,
      color: "bg-secondary text-white",
      accent: "bg-secondary",
    },
    {
      label: "Penjualan Hari Ini",
      value: todaySummary._sum.total ? formatIDR(todaySummary._sum.total) : formatIDR(0),
      total: `${formatNumber(todaySummary._count._all)} transaksi lunas`,
      icon: Wallet,
      color: "bg-accent text-white",
      accent: "bg-accent",
    },
    {
      label: "Menunggu Bayar",
      value: formatNumber(pendingCount),
      total: "Memerlukan tindakan",
      icon: AlertTriangle,
      color: "bg-amber-600 text-white",
      accent: "bg-amber-600",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ringkasan aktivitas toko Gilarium IoT hari ini.
          </p>
        </div>
        <Link href="/pos" className="shrink-0">
          <Button size="lg">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
            Buka Kasir
          </Button>
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-lg bg-white p-6 transition-all duration-200 hover:scale-[1.02]"
          >
            <span className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${s.accent}`} />
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full">
              <s.icon className="h-7 w-7 text-foreground" strokeWidth={2.5} />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {s.label}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{s.value}</p>
            <p className="mt-1 text-sm text-gray-400">{s.total}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-lg bg-white p-6 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Transaksi Terbaru</h2>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Lihat semua <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="rounded-md bg-muted p-8 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-400" strokeWidth={2} />
              <p className="font-semibold text-gray-500">
                Belum ada transaksi. Mulai jualan melalui halaman Kasir POS.
              </p>
            </div>
          ) : (
            <ul className="divide-none space-y-3">
              {recentTransactions.map((t) => (
                <li key={t.id} className="rounded-md bg-muted p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{t.invoiceNo}</p>
                      <p className="text-xs text-gray-500">
                        {t.customerName ?? "Walk-in"} · {formatDate(t.createdAt)} ·{" "}
                        {t.items.reduce((s, i) => s + i.quantity, 0)} item
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={PAYMENT_STATUS_COLOR[t.paymentStatus]}>
                        {PAYMENT_STATUS_LABEL[t.paymentStatus]}
                      </Badge>
                      <span className="font-extrabold tracking-tight">{formatIDR(t.total)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-foreground p-6 text-white lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Stok Menipis</h2>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm font-bold text-white/70 hover:underline"
            >
              Kelola <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="rounded-md bg-white/10 p-4 text-sm font-semibold text-white/80">
              Semua produk stoknya aman.
            </p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-md bg-white/10 p-3 transition-all duration-200 hover:bg-white/15"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-white/60">{p.category ?? "Tanpa kategori"}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      p.stock === 0 ? "bg-red-500 text-white" : "bg-accent text-white"
                    }`}
                  >
                    {p.stock === 0 ? "Habis" : `${p.stock} sisa`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
          >
            <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
            Perbarui stok sekarang
          </Link>
        </div>
      </section>
    </div>
  );
}
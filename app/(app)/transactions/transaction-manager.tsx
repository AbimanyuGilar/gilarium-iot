"use client";

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

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  Receipt,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import type { Transaction } from "@/lib/generated/prisma/client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/common";
import {
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatDate,
  formatIDR,
  formatNumber,
} from "@/lib/format";
import { getSnapToken } from "@/lib/actions";

type ItemDTO = { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number };
export type TransactionWithItems = Transaction & { items: ItemDTO[] };

export default function TransactionManager({
  initialTransactions,
}: {
  initialTransactions: TransactionWithItems[];
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [prevInitial, setPrevInitial] = useState(initialTransactions);

  if (prevInitial !== initialTransactions) {
    setPrevInitial(initialTransactions);
    setTransactions(initialTransactions);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? transactions
        : transactions.filter((t) => t.paymentStatus === statusFilter),
    [transactions, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of transactions) c[t.paymentStatus] = (c[t.paymentStatus] ?? 0) + 1;
    return c;
  }, [transactions]);

  const revenuePaid = useMemo(
    () => transactions.filter((t) => t.paymentStatus === "PAID").reduce((s, t) => s + t.total, 0),
    [transactions]
  );

  async function handleSettlement(transactionId: string) {
    const transaction = await getSnapToken(transactionId)

    if (transaction.ok && transaction.snapToken) {
      window.snap.pay(
        transaction.snapToken,
        {
          onSuccess: () => {
            window.location.href = `/transactions`;
          },
        }
      )
    }
  }

  return (
    <>
      <Script 
        type="text/javascript"
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.MIDTRANS_CLIENT_KEY}
      ></Script>
      
      <div className="space-y-8">
        <PageHeader
          title="Riwayat Transaksi"
          subtitle={`Total pendapatan lunas: ${formatIDR(revenuePaid)}`}
        />

        {toast ? (
          <p
            className={`rounded-md px-4 py-3 text-sm font-semibold ${
              toast.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {toast.text}
          </p>
        ) : null}

        <div className="flex gap-3 overflow-x-auto pb-1 sm:overflow-visible">
          {(
            [
              ["all", "Semua", "bg-foreground text-white"],
              ["PENDING", PAYMENT_STATUS_LABEL.PENDING, "bg-accent text-white"],
              ["PAID", PAYMENT_STATUS_LABEL.PAID, "bg-secondary text-white"],
              ["FAILED", PAYMENT_STATUS_LABEL.FAILED, "bg-red-500 text-white"],
              ["EXPIRED", PAYMENT_STATUS_LABEL.EXPIRED, "bg-gray-300 text-gray-900"],
            ] as const
          ).map(([value, label, cls]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 ${
                statusFilter === value ? cls : "bg-white text-gray-500"
              }`}
            >
              {label}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {value === "all" ? transactions.length : (counts[value] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg bg-white p-16 text-center">
            <Receipt className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={2} />
            <p className="text-lg font-bold">Tidak ada transaksi</p>
            <p className="mt-1 text-sm text-gray-500">
              Belum ada transaksi dengan filter ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-100 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-white">
                      <Wallet className="h-6 w-6" strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="font-extrabold tracking-tight">{t.invoiceNo}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(t.createdAt)} · {formatNumber(t.items.reduce((s, i) => s + i.quantity, 0))} item
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge color={PAYMENT_STATUS_COLOR[t.paymentStatus]}>
                      {PAYMENT_STATUS_LABEL[t.paymentStatus]}
                    </Badge>
                    <span className="text-xl font-extrabold tracking-tight">{formatIDR(t.total)}</span>
                  </div>
                </div>

                <div className="grid gap-6 py-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <ul className="space-y-2">
                      {t.items.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">{formatNumber(i.quantity)}×</span>
                            <span className="font-medium">{i.productName}</span>
                          </span>
                          <span className="font-semibold">{formatIDR(i.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-md bg-muted p-4 text-sm">
                      <div className="mt-1 flex justify-between border-gray-200 text-base font-extrabold">
                        <span>Total</span>
                        <span>{formatIDR(t.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    <div className="text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pelanggan</p>
                      <p className="mt-0.5 font-bold">{t.customerName || "Walk-in"} ({t.customerName ? "Terdaftar" : "Umum"})</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Metode Pembayaran</p>
                      <p className="mt-0.5 font-bold">{t.paymentMethod?.toUpperCase()}</p>
                      {t.note ? (
                        <>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Catatan</p>
                          <p className="mt-0.5 text-gray-600">{t.note}</p>
                        </>
                      ) : null}
                    </div>

                    {t.paymentStatus === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleSettlement(t.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                          Lunasi Transaksi
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
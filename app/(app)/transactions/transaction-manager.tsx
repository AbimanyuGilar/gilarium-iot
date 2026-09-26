"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Clock4,
  Loader2,
  Wallet,
} from "lucide-react";
import type { Transaction } from "@/lib/generated/prisma/client";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Field, PageHeader } from "@/components/ui/common";
import { updatePaymentStatus, type ActionResult } from "@/lib/actions";
import {
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatDate,
  formatIDR,
  formatNumber,
} from "@/lib/format";

const INITIAL: ActionResult = { ok: false, error: "" };

type ItemDTO = { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number };
export type TransactionWithItems = Transaction & { items: ItemDTO[] };

type StatusAction =
  | { type: "PAID"; title: string; text: string }
  | { type: "REFUNDED"; title: string; text: string }
  | { type: "FAILED"; title: string; text: string }
  | { type: "EXPIRED"; title: string; text: string };

export default function TransactionManager({
  initialTransactions,
}: {
  initialTransactions: TransactionWithItems[];
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [statusFilter, setStatusFilter] = useState("all");
  const [target, setTarget] = useState<{
    transaction: TransactionWithItems;
    action: StatusAction;
  } | null>(null);
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

  function availableActions(t: TransactionWithItems): StatusAction[] {
    switch (t.paymentStatus) {
      case "PENDING":
        return [
          { type: "PAID", title: "Lunasi Transaksi", text: "Terima pembayaran dan tandai lunas. Stok produk akan dikurangi." },
          { type: "FAILED", title: "Tandai Gagal", text: "Pembayaran gagal / batal. Transaksi dibatalkan, stok tidak berubah." },
          { type: "EXPIRED", title: "Tandai Kedaluwarsa", text: "Batas pembayaran lewat. Transaksi dianggap kedaluwarsa." },
        ];
      case "PAID":
        return [
          { type: "REFUNDED", title: "Refund Transaksi", text: "Kembalikan dana pelanggan. Stok produk akan dikembalikan." },
        ];
      case "REFUNDED":
        return [
          { type: "PAID", title: "Lunasi Ulang", text: "Pelanggan membayar ulang. Stok produk akan dikurangi kembali." },
        ];
      default:
        return [];
    }
  }

  return (
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
            ["REFUNDED", PAYMENT_STATUS_LABEL.REFUNDED, "bg-primary text-white"],
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
                    {/* <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatIDR(t.subtotal)}</span>
                    </div> */}
                    {/* <div className="flex justify-between text-gray-500">
                      <span>Pajak (11%)</span>
                      <span>{formatIDR(t.tax)}</span>
                    </div> */}
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

                  {availableActions(t).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableActions(t).map((a) => (
                        <Button
                          key={a.type}
                          size="sm"
                          variant={
                            a.type === "PAID"
                              ? "success"
                              : a.type === "REFUNDED"
                                ? "outline"
                                : "secondary"
                          }
                          onClick={() => setTarget({ transaction: t, action: a })}
                        >
                          {a.type === "PAID" ? (
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                          ) : a.type === "REFUNDED" ? (
                            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
                          ) : (
                            <Clock4 className="h-4 w-4" strokeWidth={2.5} />
                          )}
                          {a.title}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {target ? (
        <StatusActionModal
          key={`${target.transaction.id}-${target.action.type}`}
          transaction={target.transaction}
          action={target.action}
          onClose={() => setTarget(null)}
          onDone={(msg) => {
            setTarget(null);
            setToast({ type: "ok", text: msg });
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatusActionModal({
  transaction,
  action,
  onClose,
  onDone,
}: {
  transaction: TransactionWithItems;
  action: StatusAction;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updatePaymentStatus,
    INITIAL
  );

  useEffect(() => {
    if (state.ok && state.message) onDone(state.message);
  }, [state, onDone]);

  const error = state.ok ? null : state.error;
  const isPaidDest = action.type === "PAID";

  return (
    <Modal open onClose={onClose} title={action.title}>
      <div className="mb-6 flex items-start gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
            isPaidDest ? "bg-green-100 text-green-600" : action.type === "REFUNDED" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500"
          }`}
        >
          {isPaidDest ? (
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
          ) : action.type === "REFUNDED" ? (
            <RotateCcw className="h-7 w-7" strokeWidth={2.5} />
          ) : (
            <XCircle className="h-7 w-7" strokeWidth={2.5} />
          )}
        </span>
        <div>
          <p className="font-bold">{transaction.invoiceNo}</p>
          <p className="mt-1 text-sm text-gray-500">{action.text}</p>
          <p className="mt-2 text-lg font-extrabold">{formatIDR(transaction.total)}</p>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="id" value={transaction.id} />
        <input type="hidden" name="status" value={action.type} />

        <Field label="Catatan (opsional)">
          <Textarea name="note" placeholder="Contoh: sudah menerima tunai / alasan refund..." />
        </Field>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            size="lg"
            variant={isPaidDest ? "success" : action.type === "REFUNDED" ? "primary" : "danger"}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />}
            {action.title}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
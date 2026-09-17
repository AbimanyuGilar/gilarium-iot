export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeStyle: "short",
  }).format(d);
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  PAID: "Lunas",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: "amber",
  PAID: "green",
  EXPIRED: "gray",
  FAILED: "red",
  REFUNDED: "blue",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  CARD: "Kartu Debit/Kredit",
  TRANSFER: "Transfer Bank",
};

export const TAX_RATE = 0.11; // PPN 11%

export function rounding(value: number): number {
  return Math.round(value);
}
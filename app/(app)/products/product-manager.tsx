"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Minus,
  Boxes,
  AlertTriangle,
  Loader2,
  ImagePlus,
} from "lucide-react";
import type { Product } from "@/lib/generated/prisma/client";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Field, PageHeader } from "@/components/ui/common";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  updateStock,
  type ActionResult,
} from "@/lib/actions";
import { formatIDR, formatNumber } from "@/lib/format";
import { useActionState } from "react";

const CATEGORIES = [
  "Arduino",
  "ESP32",
  "ESP8266",
  "Raspberry Pi",
  "Sensor",
  "Modul IoT",
  "Komponen",
  "Catu Daya",
  "Kabel & Konektor",
  "Aksesoris",
];

const INITIAL: ActionResult = { ok: false, error: "" };

type ProductImg = Product & { imageUrl: string };

export default function ProductManager({
  initialProducts,
}: {
  initialProducts: ProductImg[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductImg | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductImg | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductImg | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [prevInitial, setPrevInitial] = useState(initialProducts);

  if (prevInitial !== initialProducts) {
    setPrevInitial(initialProducts);
    setProducts(initialProducts);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q);
      const matchC = category === "all" || p.category === category;
      return matchQ && matchC;
    });
  }, [products, query, category]);

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + p.price * p.stock, 0),
    [products]
  );
  const lowStock = products.filter((p) => p.isActive && p.stock <= 10).length;

  function closeAll() {
    setFormOpen(false);
    setEditing(null);
    setStockTarget(null);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manajemen Produk"
        subtitle={`${formatNumber(products.length)} produk · nilai stok ${formatIDR(totalValue)} · ${formatNumber(lowStock)} stok menipis`}
        action={
          <Button size="lg" onClick={() => setFormOpen(true)}>
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Tambah Produk
          </Button>
        }
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

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
          <Input
            placeholder="Cari nama atau kategori..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12"
          />
        </div>
        <div className="sm:w-64">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "all", label: "Semua Kategori" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-16 text-center">
          <Package className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={2} />
          <p className="text-lg font-bold">Tidak ada produk ditemukan</p>
          <p className="mt-1 text-sm text-gray-500">
            Ubah kata kunci pencarian atau tambahkan produk baru.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-lg bg-white p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{p.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{p.category ?? "—"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-extrabold tracking-tight">{formatIDR(p.price)}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          p.stock === 0
                            ? "bg-red-100 text-red-600"
                            : p.stock <= 10
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {p.stock === 0 ? "Habis" : `${formatNumber(p.stock)} stok`}
                      </span>
                      {p.isActive ? (
                        <Badge color="green">Aktif</Badge>
                      ) : (
                        <Badge color="gray">Nonaktif</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStockTarget(p)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-muted text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary hover:text-white"
                  >
                    <Boxes className="h-5 w-5" strokeWidth={2.5} />
                    Ubah Stok
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-200 hover:bg-primary hover:text-white"
                    aria-label="Edit produk"
                  >
                    <Pencil className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-200 hover:bg-red-500 hover:text-white"
                    aria-label="Hapus produk"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg bg-white lg:block">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b-2 border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Harga</th>
                <th className="px-6 py-4 text-center">Stok</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 transition-colors hover:bg-muted/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-gray-100"
                      />
                      <p className="font-bold">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.category ?? "—"}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatIDR(p.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-bold ${
                        p.stock === 0
                          ? "bg-red-100 text-red-600"
                          : p.stock <= 10
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {formatNumber(p.stock)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.isActive ? (
                      <Badge color="green">Aktif</Badge>
                    ) : (
                      <Badge color="gray">Nonaktif</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setStockTarget(p)}
                        className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-200 hover:scale-105 hover:bg-secondary hover:text-white"
                        title="Ubah stok"
                      >
                        <Boxes className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-white"
                        title="Edit produk"
                      >
                        <Pencil className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-200 hover:scale-105 hover:bg-red-500 hover:text-white"
                        title="Hapus produk"
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {formOpen ? (
        <ProductFormModal
          key={editing?.id ?? "new"}
          product={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onDone={(msg) => {
            closeAll();
            setToast({ type: "ok", text: msg });
            router.refresh();
          }}
        />
      ) : null}

      {stockTarget ? (
        <StockModal
          key={stockTarget.id}
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onDone={(msg) => {
            setStockTarget(null);
            setToast({ type: "ok", text: msg });
            router.refresh();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmModal
          key={deleteTarget.id}
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDone={(msg) => {
            setDeleteTarget(null);
            setToast({ type: "ok", text: msg });
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProductFormModal({
  product,
  onClose,
  onDone,
}: {
  product: ProductImg | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const isEdit = Boolean(product);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    isEdit ? updateProduct : createProduct,
    INITIAL
  );

  useEffect(() => {
    if (state.ok && state.message) {
      onDone(state.message);
    }
  }, [state, onDone]);

  const error = state.ok ? null : state.error;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Produk" : "Tambah Produk Baru"}
      wide
    >
      <form action={formAction}>
        {isEdit ? <input type="hidden" name="id" value={product!.id} /> : null}

        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="Nama Produk" className="sm:col-span-2">
            <Input name="name" required defaultValue={product?.name ?? ""} placeholder="Arduino Uno R3" />
          </Field>

          <Field label="Kategori">
            <Select
              name="category"
              defaultValue={product?.category ?? CATEGORIES[0]}
              options={[
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
                { value: "", label: "Tanpa kategori" },
              ]}
            />
          </Field>

          <Field label="Harga Jual (Rp)">
            <Input name="price" type="number" min={1} step={1} required defaultValue={product?.price ?? ""} placeholder="150000" />
          </Field>

          <Field label="Harga Modal (Rp) — opsional">
            <Input
              name="costPrice"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.costPrice ?? ""}
              placeholder="Kosongkan jika tidak ada"
            />
          </Field>

          {!isEdit ? (
            <Field label="Stok Awal" className="sm:col-span-2">
              <Input name="stock" type="number" min={0} step={1} defaultValue={0} />
            </Field>
          ) : null}

          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea name="description" defaultValue={product?.description ?? ""} placeholder="Deskripsi singkat produk..." />
          </Field>

          <Field label="Gambar Produk (maks 2 MB)" className="sm:col-span-2">
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Pratinjau gambar produk"
                  className="h-16 w-16 shrink-0 rounded-md object-cover ring-1 ring-gray-200"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-gray-400">
                  <ImagePlus className="h-6 w-6" strokeWidth={2} />
                </span>
              )}
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImagePreview(URL.createObjectURL(file));
                  } else {
                    setImagePreview(product?.imageUrl ?? null);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90"
              />
            </div>
          </Field>
        </div>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" strokeWidth={2.5} />}
            {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function StockModal({
  product,
  onClose,
  onDone,
}: {
  product: ProductImg;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"set" | "add">("set");
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateStock,
    INITIAL
  );

  useEffect(() => {
    if (state.ok && state.message) onDone(state.message);
  }, [state, onDone]);

  const error = state.ok ? null : state.error;

  return (
    <Modal open onClose={onClose} title={`Ubah Stok — ${product.name}`}>
      <div className="mb-6 flex items-center gap-4 rounded-lg bg-muted p-4">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-gray-200"
        />
        <div>
          <p className="font-bold">{product.category ?? "Tanpa kategori"}</p>
          <p className="text-sm text-gray-500">
            Stok saat ini:{" "}
            <span className="font-extrabold text-foreground">{formatNumber(product.stock)}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("set")}
          className={`flex h-14 items-center justify-center gap-2 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 ${
            mode === "set" ? "bg-primary text-white" : "bg-muted text-foreground"
          }`}
        >
          <Boxes className="h-5 w-5" strokeWidth={2.5} />
          Set Stok
        </button>
        <button
          type="button"
          onClick={() => setMode("add")}
          className={`flex h-14 items-center justify-center gap-2 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 ${
            mode === "add" ? "bg-secondary text-white" : "bg-muted text-foreground"
          }`}
        >
          <Minus className="h-5 w-5 rotate-90" strokeWidth={2.5} />
          Tambah Stok
        </button>
      </div>

      <form action={formAction}>
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="mode" value={mode} />

        <Field label={mode === "set" ? "Stok baru" : "Jumlah yang ditambahkan"}>
          <Input name="amount" type="number" min={0} step={1} required placeholder={mode === "set" ? String(product.stock) : "10"} />
        </Field>

        <p className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {mode === "set"
            ? `Stok akan diatur tepat ke angka yang Anda masukkan (saat ini ${formatNumber(product.stock)}).`
            : `Barang masuk akan menambahkan: ${formatNumber(product.stock)} + jumlah baru.`}
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="lg" variant="success" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Boxes className="h-5 w-5" strokeWidth={2.5} />}
            Simpan Stok
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  product,
  onClose,
  onDone,
}: {
  product: ProductImg;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteProduct,
    INITIAL
  );

  useEffect(() => {
    if (state.ok && state.message) onDone(state.message);
  }, [state, onDone]);

  const error = state.ok ? null : state.error;

  return (
    <Modal open onClose={onClose} title="Hapus Produk">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
          <AlertTriangle className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-bold">Yakin ingin menghapus produk ini?</p>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold">{product.name}</span> — aksi
            ini tidak bisa dibatalkan. Produk yang sudah pernah terjual tidak dapat dihapus.
          </p>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="id" value={product.id} />

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="danger" size="lg" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" strokeWidth={2.5} />}
            Ya, Hapus
          </Button>
        </div>
      </form>
    </Modal>
  );
}
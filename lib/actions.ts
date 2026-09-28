"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { PRODUCTS_BUCKET, deleteImage } from "@/lib/images";
import midtransClient from 'midtrans-client'

export type ActionResult =
  | { ok: true; message?: string; invoiceNo?: string; transactionId?: string }
  | { ok: false; error: string };

async function authorized(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.user);
}

function int(value: FormDataEntryValue | null): number | null {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) ? n : null;
}

async function uploadProductImage(file: File | null | undefined): Promise<{ path: string } | { error: string } | { none: true }> {
  if (!file || file.size === 0) return { none: true };
  if (!file.type.startsWith("image/")) return { error: "File yang diunggah harus berupa gambar." };
  if (file.size > 2 * 1024 * 1024) return { error: "Ukuran gambar maksimal 2 MB." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `products/${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage.from(PRODUCTS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) return { error: "Gagal mengunggah gambar. Coba lagi." };
  return { path };
}

// ---------------------------------------------------------------------------
// Produk
// ---------------------------------------------------------------------------
export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = int(formData.get("price"));
  const costRaw = String(formData.get("costPrice") ?? "").trim();
  const costPrice = costRaw === "" ? null : int(formData.get("costPrice"));
  const stock = int(formData.get("stock")) ?? 0;

  if (!name) return { ok: false, error: "Nama produk wajib diisi." };
  if (price === null || price <= 0) return { ok: false, error: "Harga jual harus angka lebih dari 0." };
  if (costPrice !== null && costPrice < 0) return { ok: false, error: "Harga modal tidak valid." };
  if (stock < 0) return { ok: false, error: "Stok tidak boleh negatif." };

  const imageResult = await uploadProductImage(formData.get("image") as File | null);
  if ("error" in imageResult) return { ok: false, error: imageResult.error };

  await prisma.product.create({
    data: {
      name,
      category: category || null,
      description: description || null,
      image: "path" in imageResult ? imageResult.path : null,
      price,
      costPrice,
      stock,
    },
  });

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { ok: true, message: "Produk berhasil ditambahkan." };
}

export async function updateProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = int(formData.get("price"));
  const costRaw = String(formData.get("costPrice") ?? "").trim();
  const costPrice = costRaw === "" ? null : int(formData.get("costPrice"));

  if (!id) return { ok: false, error: "Produk tidak ditemukan." };
  if (!name) return { ok: false, error: "Nama produk wajib diisi." };
  if (price === null || price <= 0) return { ok: false, error: "Harga jual harus angka lebih dari 0." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Produk tidak ditemukan." };

  let image: string | undefined;
  const imageResult = await uploadProductImage(formData.get("image") as File | null);
  if ("error" in imageResult) return { ok: false, error: imageResult.error };
  if ("path" in imageResult) {
    image = imageResult.path;
    await deleteImage(existing.image);
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      category: category || null,
      description: description || null,
      price,
      costPrice,
      ...(image ? { image } : {}),
    },
  });

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { ok: true, message: "Produk berhasil diperbarui." };
}

export async function deleteProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Produk tidak ditemukan." };

  const used = await prisma.transactionItem.count({ where: { productId: id } });
  if (used > 0) {
    return { ok: false, error: "Produk tidak bisa dihapus karena sudah pernah terjual." };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Produk tidak ditemukan." };

  await prisma.product.delete({ where: { id } });
  await deleteImage(existing.image);
  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { ok: true, message: "Produk berhasil dihapus." };
}

export async function updateStock(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const id = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "set");
  const amount = int(formData.get("amount"));

  if (!id) return { ok: false, error: "Produk tidak ditemukan." };
  if (amount === null || amount < 0) return { ok: false, error: "Jumlah stok tidak valid." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Produk tidak ditemukan." };

  const next =
    mode === "add" ? existing.stock + amount : amount;

  await prisma.product.update({ where: { id }, data: { stock: next } });

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { ok: true, message: `Stok ${existing.name} diperbarui menjadi ${next}.` };
}

// ---------------------------------------------------------------------------
// POS / Transaksi
// ---------------------------------------------------------------------------

interface ProductToCheckout {
  id: string
  qty: number
}

function generateOrderId() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `ORDER-${timestamp}-${random}`;
}

export async function checkout(products: ProductToCheckout[]) {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const orderId = generateOrderId()

  const productIds = products.map(item => item.id)

  const productToCheckout = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      },
      stock: {
        gte: 0
      }
    }
  })

  if (productToCheckout.length <= 0) {
    return {
      ok: false,
      message: 'Produk tidak ada.'
    }
  }

  const productDetails = productToCheckout.map(item => {
    const quantity = products.find(product => product.id == item.id)?.qty as number
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity,
      total: item.price * quantity
    }
  })
  
  const grandTotal = productDetails.reduce((acc, item) => acc + item.total, 0)

  try {
    await prisma.$transaction(async tx => {
      const transaction = await tx.transaction.create({
        data: {
          invoiceNo: orderId,
          subtotal: grandTotal,
          total: grandTotal,
        }
      })

      const transactionItems = await tx.transactionItem.createMany({
        data: productDetails.map(item => ({
          transactionId: transaction.id,
          productId: item.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        }))
      })

      return {
        transaction, transactionItems
      }
    })
  } catch {
    return {
      ok: false,
      message: 'Gagal memproses transaksi.'
    }
  }

  try {
    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_ENV === 'production',
      serverKey: process.env.MIDTRANS_SERVER_KEY ?? '',
      clientKey: process.env.MIDTRANS_CLIENT_KEY ?? ''
    })
  
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grandTotal,
      },

      item_details: productDetails,

      enabled_payments: ['gopay', 'qris'],

      credit_card: {
        secure: true
      },
    }
  
    const transaction = await snap.createTransaction(parameter)
    
    const token = transaction.token
  
    return {
      ok: true,
      token,
      orderId
    }
  } catch {
    return {
      ok: false,
      message: 'Gagal memproses transaksi.'
    }
  }
}

export async function pendingTransaction({ snapToken, orderId}: { snapToken: string, orderId: string }) {
  try {
    const transaction = await prisma.transaction.update({
      where: {
        invoiceNo: orderId
      },
      data: {
        snapToken
      }
    })
    return {
      ok: true,
      data: transaction,
      message: 'Pembayaran ditunda.'
    }
  } catch (e){
    return {
      ok: false,
      message: 'Galat: ' + e
    }
  }
}

export async function getSnapToken(transactionId: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId
      },
      select: {
        snapToken: true
      }
    })

    return {
      ok: true,
      snapToken: transaction?.snapToken
    }
  } catch {
    return {
      ok: false,
      message: 'Gagal memproses pelunasan.'
    }
  }
}

const ALLOWED_STATUS = ["PAID", "PENDING", "FAILED", "EXPIRED"] as const;

export async function updatePaymentStatus(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Sesi berakhir, silakan login." };

  const id = String(formData.get("id") ?? "");
  const target = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!ALLOWED_STATUS.includes(target as never)) {
    return { ok: false, error: "Status pembayaran tidak valid." };
  }
  if (target === "PENDING") return { ok: false, error: "Tidak bisa mengembalikan ke status menunggu." };

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!transaction) return { ok: false, error: "Transaksi tidak ditemukan." };

  const current = transaction.paymentStatus;

  // PENDING → PAID : kurangi stok (dengan cek ketersediaan)
  if (current === "PENDING" && target === "PAID") {
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of transaction.items) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count !== 1) {
            throw new Error(`Stok ${item.productName} tidak mencukupi.`);
          }
        }
        await tx.transaction.update({
          where: { id },
          data: { paymentStatus: "PAID", paidAt: new Date(), note: note || null },
        });
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Gagal melunasi transaksi." };
    }
  }

  // PENDING → FAILED / EXPIRED : tanpa perubahan stok
  else if (current === "PENDING" && (target === "FAILED" || target === "EXPIRED")) {
    await prisma.transaction.update({
      where: { id },
      data: { paymentStatus: target, note: note || null },
    });
  } else {
    return { ok: false, error: `Transisi status ${current} → ${target} tidak diizinkan.` };
  }

  revalidatePath("/transactions");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true, message: "Status pembayaran diperbarui." };
}
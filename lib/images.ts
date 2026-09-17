import "server-only";

import type { Product } from "@/lib/generated/prisma/client";
import { supabaseAdmin } from "@/lib/supabase";

export const PRODUCTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "products";
export const DEFAULT_PRODUCT_IMAGE = "/default_product.jpg";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_PRODUCT_IMAGE;
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCTS_BUCKET}/${path}`;
}

export type ProductWithImage = Product & { imageUrl: string };

export function productsWithImageUrl(products: Product[]): ProductWithImage[] {
  return products.map((p) => ({ ...p, imageUrl: getImageUrl(p.image) }));
}

export async function deleteImage(path: string | null | undefined): Promise<void> {
  if (!path) return;

  await supabaseAdmin.storage.from(PRODUCTS_BUCKET).remove([path]);
}
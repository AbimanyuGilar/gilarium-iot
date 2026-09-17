import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { productsWithImageUrl } from "@/lib/images";
import ProductManager from "./product-manager";

export const metadata = { title: "Produk" };

export default async function ProductsPage() {
  await requireSession();

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return <ProductManager initialProducts={productsWithImageUrl(products)} />;
}
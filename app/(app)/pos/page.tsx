import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { productsWithImageUrl } from "@/lib/images";
import PosClient from "./pos-client";

export const metadata = { title: "Kasir POS" };

export default async function PosPage() {
  await requireSession();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return <PosClient products={productsWithImageUrl(products)} />;
}
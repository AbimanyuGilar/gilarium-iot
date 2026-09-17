import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import TransactionManager from "./transaction-manager";

export const metadata = { title: "Transaksi" };

export default async function TransactionsPage() {
  await requireSession();

  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return <TransactionManager initialTransactions={transactions} />;
}
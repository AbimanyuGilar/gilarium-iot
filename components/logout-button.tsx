"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export default function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Keluar"
      className={cn(
        "flex items-center justify-center rounded-md bg-white/10 text-gray-300 transition-all duration-200 hover:scale-105 hover:bg-red-500 hover:text-white",
        compact ? "h-11 w-11 rounded-full" : "h-12 w-12"
      )}
    >
      <LogOut className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
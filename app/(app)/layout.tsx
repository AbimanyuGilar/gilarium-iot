// Auth area layouts
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-muted">
      <Sidebar
        user={{
          name: session.user.name ?? undefined,
          email: session.user.email,
        }}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 lg:px-8 lg:pb-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
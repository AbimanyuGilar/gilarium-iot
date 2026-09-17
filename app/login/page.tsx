import { redirect } from "next/navigation";
import { Cpu, Radio, ShieldCheck, Zap } from "lucide-react";
import LoginForm from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Masuk",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <span className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <span className="absolute -bottom-32 -left-20 h-80 w-80 rotate-45 bg-white/5" />
        <span className="absolute right-16 top-1/3 h-24 w-24 rotate-12 bg-white/10" />

        <div className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary">
            <Cpu className="h-9 w-9" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-3xl font-extrabold tracking-tight">Gilarium IoT</p>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-white/80">
              <Radio className="h-4 w-4" strokeWidth={2.5} />
              POS Elektronik
            </p>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight">
            Kasir untuk toko elektronik &amp; komponen IoT.
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/85">
            Kelola produk, stok, dan transaksi dalam satu tempat — cepat, akurat, dan tanpa repot.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              { icon: Zap, label: "POS Cepat & Responsif" },
              { icon: ShieldCheck, label: "Stok Otomatis Terkontrol" },
              { icon: Cpu, label: "Khusus Arduino & IoT" },
            ].map((f) => (
              <div key={f.label} className="rounded-md bg-white/10 p-4">
                <f.icon className="mb-3 h-6 w-6" strokeWidth={2.5} />
                <p className="text-xs font-bold uppercase tracking-wide leading-snug">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs font-semibold uppercase tracking-widest text-white/60">
          © {new Date().getFullYear()} Gilarium IoT
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
              <Cpu className="h-9 w-9" strokeWidth={2.5} />
            </span>
            <p className="text-3xl font-extrabold tracking-tight">Gilarium IoT</p>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight">Selamat datang kembali</h2>
          <p className="mt-2 text-sm text-gray-500">
            Masuk untuk mengelola toko elektronik Anda.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
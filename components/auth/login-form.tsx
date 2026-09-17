"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await authClient.signIn.email({
      email,
      password,
      rememberMe: remember,
      callbackURL: "/dashboard",
    });

    if (res.error) {
      setError(res.error.message ?? "Email atau password salah.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="mb-6">
        <label
          htmlFor="email"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@gilarium.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            Password
          </label>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <label className="mb-6 flex cursor-pointer items-center gap-3 select-none">
        <span
          onClick={() => setRemember((v) => !v)}
          role="checkbox"
          aria-checked={remember}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " ") {
              e.preventDefault();
              setRemember((v) => !v);
            }
          }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
            remember ? "border-primary bg-primary text-white" : "border-gray-300 bg-muted"
          }`}
        >
          {remember ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <span className="text-sm font-medium text-gray-700">
          Ingat saya — tetap login selama 30 hari
        </span>
      </label>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" strokeWidth={2.5} />}
        Masuk
      </Button>
    </form>
  );
}
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "No se pudo iniciar sesión");
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoFocus className="input"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" type="password" required className="input"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p className="text-sm font-semibold" style={{ color: "#e31e24" }}>{err}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--panel-bg)" }}>
      <div className="w-full max-w-sm card">
        <div className="mb-6 flex items-start gap-3">
          <div className="h-8 rounded-full mt-0.5" style={{ width: 3, backgroundColor: "#e31e24" }} />
          <div>
            <div className="text-xl font-black tracking-tight" style={{ letterSpacing: "-0.03em", color: "var(--panel-logo-text)" }}>MININI</div>
            <div className="text-[10px] font-bold tracking-[0.18em]" style={{ color: "var(--panel-logo-sub)" }}>CRM CONSORCIOS</div>
          </div>
        </div>
        <Suspense fallback={<div className="text-sm" style={{ color: "var(--panel-nav-item)" }}>Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

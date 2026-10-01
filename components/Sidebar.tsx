"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: (p: { className?: string }) => JSX.Element };

type Props = {
  user: { email: string; nombre: string; rol: "admin" | "empleado" };
};

const GRUPOS_BASE: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Inicio", icon: IconHome },
      { href: "/consorcios", label: "Consorcios", icon: IconBuilding },
    ],
  },
  {
    label: "CAPTACIÓN",
    items: [
      { href: "/propietarios", label: "Propietarios", icon: IconUsers },
      { href: "/captacion", label: "Oportunidades", icon: IconTarget },
      { href: "/inversores", label: "Inversores", icon: IconStar },
    ],
  },
];

const GRUPO_ADMIN = {
  label: "ADMIN",
  items: [{ href: "/admin/usuarios", label: "Usuarios", icon: IconKey }],
};

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const grupos = user.rol === "admin" ? [...GRUPOS_BASE, GRUPO_ADMIN] : GRUPOS_BASE;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function toggleTheme() {
    const root = document.getElementById("crm-root");
    if (!root) return;
    const cur = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", cur);
    try { localStorage.setItem("crm-consorcios-theme", cur); } catch {}
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: "var(--panel-sidebar-bg)", borderBottom: "1px solid var(--panel-border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 rounded-full" style={{ width: 3, backgroundColor: "#e31e24" }} />
          <span className="font-black text-base tracking-tight" style={{ color: "var(--panel-logo-text)" }}>MININI · CRM</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -mr-2" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--panel-nav-item)" }}>
            {mobileOpen ? <path d="M6 6l12 12M18 6l-12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={
          "flex-col gap-5 py-6 lg:min-h-screen lg:w-64 lg:flex lg:shrink-0 " +
          (mobileOpen ? "flex fixed inset-0 z-40 overflow-auto" : "hidden lg:flex")
        }
        style={{ backgroundColor: "var(--panel-sidebar-bg)", borderRight: "1px solid var(--panel-border)" }}
      >
        <div className="flex items-start justify-between px-6">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className="h-7 rounded-full" style={{ width: 3, backgroundColor: "#e31e24" }} />
              <span className="text-xl font-black tracking-tight" style={{ letterSpacing: "-0.03em", color: "var(--panel-logo-text)" }}>MININI</span>
            </div>
            <span className="text-[10px] font-bold tracking-[0.18em]" style={{ color: "var(--panel-logo-sub)", paddingLeft: "11px" }}>CRM CONSORCIOS</span>
            <span className="text-xs mt-1.5" style={{ color: "var(--panel-muted)", paddingLeft: "11px" }}>Captación propietarios</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 -mr-2" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--panel-nav-item)" }}>
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-4 px-3">
          {grupos.map((grupo, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {grupo.label && (
                <span className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-[0.15em]"
                  style={{ color: "var(--panel-nav-label)" }}>
                  {grupo.label}
                </span>
              )}
              {grupo.items.map((it) => {
                const active = it.href === "/"
                  ? pathname === it.href
                  : pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMobileOpen(false)}
                    style={
                      active
                        ? { backgroundColor: "var(--panel-nav-active-bg)", color: "var(--panel-nav-active-text)", boxShadow: "inset 3px 0 0 #e31e24" }
                        : { color: "var(--panel-nav-item)" }
                    }
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
                    onMouseEnter={(e) => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.backgroundColor = "var(--panel-nav-hover-bg)";
                        el.style.color = "var(--panel-link-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.backgroundColor = "";
                        el.style.color = "var(--panel-nav-item)";
                      }
                    }}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-6">
          <div className="text-xs flex flex-col gap-0.5">
            <span style={{ color: "var(--panel-muted)" }}>Sesión</span>
            <span style={{ color: "var(--panel-text)" }} className="font-semibold">{user.nombre}</span>
            <span style={{ color: "var(--panel-muted)" }} className="text-[11px]">{user.email}</span>
          </div>
          <button onClick={toggleTheme} className="panel-chrome-link text-xs text-left transition" style={{ color: "var(--panel-link)" }}>
            Cambiar tema →
          </button>
          <button onClick={logout} className="panel-chrome-link text-xs text-left transition" style={{ color: "var(--panel-link)" }}>
            Cerrar sesión →
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── ICONOS ─── */
function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </svg>
  );
}
function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
    </svg>
  );
}
function IconKey({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15L19 4M18 5l2 2M15 8l2 2" />
    </svg>
  );
}

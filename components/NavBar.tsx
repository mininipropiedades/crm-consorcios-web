"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  user: { email: string; nombre: string; rol: "admin" | "empleado" };
};

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/propietarios", label: "Propietarios" },
  { href: "/consorcios", label: "Consorcios" },
  { href: "/inversores", label: "Inversores" },
  { href: "/captacion", label: "Captación" },
];

export default function NavBar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = user.rol === "admin"
    ? [...NAV, { href: "/admin/usuarios", label: "Usuarios" }]
    : NAV;

  return (
    <header className="bg-minini-black text-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-bold">CRM Minini</Link>
          <button
            onClick={logout}
            className="text-xs text-white/70 hover:text-white"
            title={user.email}
          >
            {user.nombre || user.email} · Salir
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto -mx-2 px-2 pb-2 scroll-smooth">
          {items.map((item) => {
            const active = pathname === item.href
              || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition " +
                  (active ? "bg-white text-minini-black" : "text-white/70 hover:text-white")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

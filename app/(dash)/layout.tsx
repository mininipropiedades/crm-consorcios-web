import { requireSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await (async () => {
    try { return await requireSession(); } catch { return null; }
  })();

  if (!session) redirect("/login");

  return (
    <div className="min-h-screen lg:flex" style={{ backgroundColor: "var(--panel-bg)" }}>
      <Sidebar user={{ email: session.email, nombre: session.nombre, rol: session.rol }} />
      <div className="flex-1" style={{ backgroundColor: "var(--panel-content-bg)" }}>
        <main className="mx-auto w-full max-w-6xl px-5 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

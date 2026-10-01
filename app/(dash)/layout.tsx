import { requireSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { redirect } from "next/navigation";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await (async () => {
    try {
      return await requireSession();
    } catch {
      return null;
    }
  })();

  if (!session) redirect("/login");

  return (
    <div>
      <NavBar user={{ email: session.email, nombre: session.nombre, rol: session.rol }} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

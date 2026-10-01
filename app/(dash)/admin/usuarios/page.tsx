import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function crearUsuario(formData: FormData) {
  "use server";
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const password = String(formData.get("password") || "");
  const rol = (String(formData.get("rol") || "empleado") === "admin" ? "admin" : "empleado") as "admin" | "empleado";
  if (!email || !nombre || !password) return;
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { nombre, rol, passwordHash: hash, activo: true },
    create: { email, nombre, rol, passwordHash: hash },
  });
  revalidatePath("/admin/usuarios");
}

async function toggleActivo(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const activo = String(formData.get("activo") || "") === "true";
  await prisma.user.update({ where: { id }, data: { activo: !activo } });
  revalidatePath("/admin/usuarios");
}

export default async function Page() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-minini-gray">Alta y baja de usuarios con acceso al CRM. Solo admin.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Nuevo usuario</h2>
        <form action={crearUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Nombre</label>
            <input name="nombre" required className="input" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input name="password" required className="input" minLength={6} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select name="rol" className="input" defaultValue="empleado">
              <option value="empleado">Empleado (solo consulta)</option>
              <option value="admin">Admin (control total)</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button className="btn-primary" type="submit">Crear o actualizar</button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-minini-border">
          <thead className="text-left">
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Último login</th>
              <th className="p-2">Estado</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-minini-border/60">
                <td className="p-2 font-medium">{u.nombre}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  {u.rol === "admin" ? <span className="tag-blue">admin</span> : <span className="tag-gray">empleado</span>}
                </td>
                <td className="p-2 text-xs text-minini-gray">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-AR") : "—"}
                </td>
                <td className="p-2">
                  {u.activo ? <span className="tag-green">activo</span> : <span className="tag-red">suspendido</span>}
                </td>
                <td className="p-2">
                  <form action={toggleActivo}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="activo" value={String(u.activo)} />
                    <button className="btn-ghost text-xs" type="submit">
                      {u.activo ? "Suspender" : "Reactivar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
          Alta y baja de usuarios con acceso al CRM. Solo admin.
        </p>
      </div>

      <details className="card" open>
        <summary className="cursor-pointer font-bold">Nuevo usuario</summary>
        <form action={crearUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
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
              <option value="empleado">Empleado (consulta)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button className="btn-primary" type="submit">Crear o actualizar</button>
          </div>
        </form>
      </details>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Último login</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.nombre}</td>
                <td>{u.email}</td>
                <td>
                  {u.rol === "admin" ? <span className="tag-red">admin</span> : <span className="tag-gray">empleado</span>}
                </td>
                <td className="text-xs" style={{ color: "var(--panel-nav-item)" }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-AR") : "—"}
                </td>
                <td>
                  {u.activo ? <span className="tag-green">activo</span> : <span className="tag-red">suspendido</span>}
                </td>
                <td>
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

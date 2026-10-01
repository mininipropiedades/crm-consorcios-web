import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  nombre: string;
  email: string | null;
  tels: string | null;
  cantidad: number;
  consorcios: string | null;
};

export default async function Page() {
  const raw = await prisma.$queryRawUnsafe<Row[]>(`
    SELECT
      p.id,
      p."nombreNormalizado" AS nombre,
      p.email,
      p."telefonosNormalizados" AS tels,
      COUNT(uf.id)::int AS cantidad,
      string_agg(DISTINCT c."identificadorCorto", ', ') AS consorcios
    FROM "Propietario" p
    JOIN "UnidadFuncional" uf ON uf."propietarioId" = p.id
    JOIN "Consorcio" c ON c.id = uf."consorcioId"
    WHERE p."esConstructora" = false
    GROUP BY p.id, p."nombreNormalizado", p.email, p."telefonosNormalizados"
    HAVING COUNT(uf.id) >= 2
    ORDER BY cantidad DESC, nombre ASC
    LIMIT 200
  `);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inversores</h1>
        <p className="text-sm text-minini-gray">Propietarios con 2 o más UFs. {raw.length} detectados.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-minini-border">
          <thead className="text-left">
            <tr>
              <th className="p-2">Propietario</th>
              <th className="p-2 text-right">UFs</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Consorcios</th>
            </tr>
          </thead>
          <tbody>
            {raw.map((r) => {
              let tels: string[] = [];
              try { tels = r.tels ? JSON.parse(r.tels) : []; } catch {}
              return (
                <tr key={r.id} className="border-b border-minini-border/60 align-top">
                  <td className="p-2 font-medium">{r.nombre}</td>
                  <td className="p-2 text-right font-bold">{r.cantidad}</td>
                  <td className="p-2">{tels.join(", ") || "—"}</td>
                  <td className="p-2">{r.email || "—"}</td>
                  <td className="p-2 text-xs text-minini-gray">{r.consorcios}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

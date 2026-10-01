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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inversores</h1>
        <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
          Propietarios con 2 o más unidades funcionales — {raw.length} detectados.
        </p>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Propietario</th>
              <th className="text-right">UFs</th>
              <th>Teléfonos</th>
              <th>Email</th>
              <th>En consorcios</th>
            </tr>
          </thead>
          <tbody>
            {raw.map((r) => {
              let tels: string[] = [];
              try { tels = r.tels ? JSON.parse(r.tels) : []; } catch {}
              return (
                <tr key={r.id}>
                  <td><div className="font-semibold">{r.nombre}</div></td>
                  <td className="text-right">
                    <span className="text-lg font-bold tnum" style={{ color: "#e31e24" }}>{r.cantidad}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    {tels.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {tels.map((t, j) => (
                          <a key={j} href={`https://wa.me/${t.replace("+", "")}`} target="_blank"
                            className="text-sm hover:underline" style={{ color: "#e31e24" }}>
                            {t}
                          </a>
                        ))}
                      </div>
                    ) : <span style={{ color: "var(--panel-muted)" }}>—</span>}
                  </td>
                  <td className="text-xs">
                    {r.email ? <a href={`mailto:${r.email.split(";")[0]}`} className="hover:underline">{r.email.split(";")[0]}</a> : <span style={{ color: "var(--panel-muted)" }}>—</span>}
                  </td>
                  <td className="text-xs" style={{ color: "var(--panel-nav-item)" }}>{r.consorcios}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

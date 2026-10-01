import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const localidad = (sp.localidad as string) || "";

  const where: any = {
    nivelAusentismo: "ausentista_externo",
    propietario: {
      esConstructora: false,
      telefonosNormalizados: { not: "[]" },
    },
    consorcio: {
      estado: {
        noContactar: false,
        estadoEdificio: { in: ["excelente", "muy_bueno", "bueno"] },
      },
    },
  };
  if (localidad) where.localidadPostal = { contains: localidad, mode: "insensitive" };

  const rows = await prisma.unidadFuncional.findMany({
    where,
    include: { propietario: true, consorcio: { include: { estado: true } } },
    orderBy: [
      { consorcio: { estado: { estadoEdificio: "asc" } } },
      { consorcio: { codigoInterno: "asc" } },
    ],
    take: 500,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Oportunidades de captación</h1>
        <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
          Ausentistas con teléfono en edificios de calidad bueno, muy bueno o excelente.
        </p>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="GET">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Filtrar por localidad del propietario</label>
          <input name="localidad" defaultValue={localidad} className="input" placeholder="CABA, Hurlingham, La Plata..." />
        </div>
        <button className="btn-primary" type="submit">Filtrar</button>
        {localidad && <Link className="btn-ghost" href="/captacion">Limpiar</Link>}
      </form>

      <div className="text-sm" style={{ color: "var(--panel-nav-item)" }}>
        {rows.length} oportunidades.
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Propietario</th>
              <th>Teléfonos</th>
              <th>Vive en</th>
              <th>Consorcio</th>
              <th>UF</th>
              <th>Edificio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              let tels: string[] = [];
              try { tels = r.propietario?.telefonosNormalizados ? JSON.parse(r.propietario.telefonosNormalizados) : []; } catch {}
              return (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold">{r.propietario?.nombreNormalizado}</div>
                    {r.propietario?.email && (
                      <div className="text-xs" style={{ color: "var(--panel-nav-item)" }}>
                        {r.propietario.email.split(";")[0]}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {tels.map((t, j) => (
                        <a key={j} href={`https://wa.me/${t.replace("+", "")}`} target="_blank"
                          className="text-sm hover:underline" style={{ color: "#e31e24" }}>
                          {t}
                        </a>
                      ))}
                    </div>
                  </td>
                  <td className="text-sm">{r.localidadPostal || "—"}</td>
                  <td>
                    <Link href={`/consorcios/${r.consorcio.codigoInterno}`} className="hover:underline">
                      <span className="text-[11px] font-mono mr-1" style={{ color: "var(--panel-nav-item)" }}>#{r.consorcio.codigoInterno}</span>
                      {r.consorcio.identificadorCorto || r.consorcio.nombreConsorcio}
                    </Link>
                  </td>
                  <td className="text-xs font-mono">
                    {r.numeroUf}
                    {r.ubicacion && <span style={{ color: "var(--panel-nav-item)" }}> · {r.ubicacion}</span>}
                  </td>
                  <td>
                    <span className="tag-green">{r.consorcio.estado?.estadoEdificio}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: "var(--panel-nav-item)" }}>
                No hay oportunidades con esos filtros.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

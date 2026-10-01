import { prisma } from "@/lib/db";

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

  if (localidad) {
    where.localidadPostal = { contains: localidad, mode: "insensitive" };
  }

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Captación</h1>
        <p className="text-sm text-minini-gray">
          Ausentistas con teléfono en consorcios de calidad bueno/muy bueno/excelente que SÍ se pueden llamar.
          Base natural para campaña de temporada y venta.
        </p>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="GET">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Filtrar por localidad del propietario</label>
          <input name="localidad" defaultValue={localidad} className="input" placeholder="CABA, Hurlingham, La Plata..." />
        </div>
        <button className="btn-primary" type="submit">Filtrar</button>
        {localidad && <a className="btn-ghost" href="/captacion">Limpiar</a>}
      </form>

      <div className="text-sm text-minini-gray">
        {rows.length} oportunidades.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-minini-border">
          <thead className="text-left">
            <tr>
              <th className="p-2">Propietario</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Vive en</th>
              <th className="p-2">Consorcio</th>
              <th className="p-2">UF</th>
              <th className="p-2">Edificio</th>
              <th className="p-2">Avisos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              let tels: string[] = [];
              try { tels = r.propietario?.telefonosNormalizados ? JSON.parse(r.propietario.telefonosNormalizados) : []; } catch {}
              const admin = r.consorcio.estado?.administramos;
              const avisos: string[] = [];
              if (admin === false) avisos.push("No administramos — hablar como inmobiliaria");
              if (r.consorcio.estado?.observaciones) avisos.push(r.consorcio.estado.observaciones);
              return (
                <tr key={r.id} className="border-b border-minini-border/60 align-top">
                  <td className="p-2 font-medium">{r.propietario?.nombreNormalizado}</td>
                  <td className="p-2 whitespace-nowrap">{tels.join(", ")}</td>
                  <td className="p-2 text-sm">{r.localidadPostal || "—"}</td>
                  <td className="p-2 text-xs">
                    {r.consorcio.codigoInterno} · {r.consorcio.identificadorCorto || r.consorcio.nombreConsorcio}
                  </td>
                  <td className="p-2">{r.numeroUf} {r.ubicacion ? `(${r.ubicacion})` : ""}</td>
                  <td className="p-2"><span className="tag-green">{r.consorcio.estado?.estadoEdificio}</span></td>
                  <td className="p-2 text-xs text-amber-700">
                    {avisos.length === 0 ? <span className="text-minini-gray">—</span> :
                      avisos.map((a, i) => <div key={i}>{a}</div>)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-minini-gray">
                No hay resultados con el filtro.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

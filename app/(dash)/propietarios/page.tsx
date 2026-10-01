import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = { [k: string]: string | string[] | undefined };

async function search(filters: {
  q?: string;
  localidad?: string;
  ausentismo?: string;
  edificio?: string;
  conTelefono?: boolean;
  excluirConstructoras?: boolean;
}) {
  const where: any = { AND: [] };
  if (filters.q) {
    where.AND.push({
      OR: [
        { propietario: { nombreNormalizado: { contains: filters.q, mode: "insensitive" } } },
        { propietario: { email: { contains: filters.q, mode: "insensitive" } } },
        { consorcio: { nombreConsorcio: { contains: filters.q, mode: "insensitive" } } },
        { consorcio: { identificadorCorto: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.localidad) where.AND.push({ localidadPostal: { contains: filters.localidad, mode: "insensitive" } });
  if (filters.ausentismo) where.AND.push({ nivelAusentismo: filters.ausentismo });
  if (filters.excluirConstructoras) where.AND.push({ propietario: { esConstructora: false } });
  if (filters.conTelefono) where.AND.push({ propietario: { telefonosNormalizados: { not: "[]" } } });
  if (filters.edificio) where.AND.push({ consorcio: { estado: { estadoEdificio: filters.edificio } } });

  // No excluimos NO LLAMAR en la vista previa — el aviso se da en el detalle del consorcio
  const rows = await prisma.unidadFuncional.findMany({
    where,
    include: { propietario: true, consorcio: { include: { estado: true } } },
    orderBy: [{ consorcio: { codigoInterno: "asc" } }, { numeroUf: "asc" }],
    take: 500,
  });
  return rows;
}

function AusentismoTag({ v }: { v: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    ausentista_externo: { cls: "tag-blue", label: "Ausentista" },
    vive_en_la_costa: { cls: "tag-green", label: "Local costa" },
    vive_en_la_propiedad: { cls: "tag-amber", label: "Vive ahí" },
    constructora: { cls: "tag-gray", label: "Constructora" },
  };
  const m = map[v] ?? { cls: "tag-gray", label: v };
  return <span className={m.cls}>{m.label}</span>;
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const localidad = (sp.localidad as string) || "";
  const ausentismo = (sp.ausentismo as string) || "";
  const edificio = (sp.edificio as string) || "";
  const conTel = sp.tel === "1";
  const excCons = sp.cons === "0" ? false : true;

  const hasFilters = !!(q || localidad || ausentismo || edificio || conTel);
  const rows = hasFilters
    ? await search({ q, localidad, ausentismo, edificio, conTelefono: conTel, excluirConstructoras: excCons })
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Propietarios</h1>
        <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
          Filtrá por nombre, localidad, ausentismo o calidad de edificio.
        </p>
      </div>

      <form className="card space-y-4" method="GET">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="label">Buscar</label>
            <input name="q" defaultValue={q} className="input" placeholder="Civano, Costanera..." />
          </div>
          <div>
            <label className="label">Localidad propietario</label>
            <input name="localidad" defaultValue={localidad} className="input" placeholder="Hurlingham, CABA..." />
          </div>
          <div>
            <label className="label">Ausentismo</label>
            <select name="ausentismo" defaultValue={ausentismo} className="input">
              <option value="">— cualquiera —</option>
              <option value="ausentista_externo">Ausentista externo</option>
              <option value="vive_en_la_costa">Vive en la costa</option>
              <option value="vive_en_la_propiedad">Vive en la propiedad</option>
              <option value="constructora">Constructora</option>
            </select>
          </div>
          <div>
            <label className="label">Calidad edificio</label>
            <select name="edificio" defaultValue={edificio} className="input">
              <option value="">— cualquiera —</option>
              <option value="excelente">Excelente</option>
              <option value="muy_bueno">Muy bueno</option>
              <option value="bueno">Bueno</option>
              <option value="normal">Normal</option>
              <option value="malo">Malo</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="tel" value="1" defaultChecked={conTel} /> Solo con teléfono
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="cons" value="0" defaultChecked={!excCons} /> Incluir constructoras
          </label>
          <div className="ml-auto flex gap-2">
            <button className="btn-primary" type="submit">Buscar</button>
            {hasFilters && <Link className="btn-ghost" href="/propietarios">Limpiar</Link>}
          </div>
        </div>
      </form>

      {!hasFilters ? (
        <div className="card text-center py-12" style={{ color: "var(--panel-nav-item)" }}>
          Ingresá un filtro para empezar a buscar.
        </div>
      ) : (
        <>
          <div className="text-sm" style={{ color: "var(--panel-nav-item)" }}>
            {rows.length} resultados {rows.length === 500 && "(máximo por consulta)"}.
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
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  let tels: string[] = [];
                  try { tels = r.propietario?.telefonosNormalizados ? JSON.parse(r.propietario.telefonosNormalizados) : []; } catch {}
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="font-semibold">{r.propietario?.nombreNormalizado ?? "(sin propietario)"}</div>
                        {r.propietario?.email && (
                          <div className="text-xs" style={{ color: "var(--panel-nav-item)" }}>
                            {r.propietario.email.split(";")[0]}
                          </div>
                        )}
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
                      <td className="text-sm">{r.localidadPostal || "—"}</td>
                      <td>
                        <Link href={`/consorcios/${r.consorcio.codigoInterno}`}
                          className="text-sm hover:underline">
                          <span className="text-[11px] font-mono mr-1" style={{ color: "var(--panel-nav-item)" }}>#{r.consorcio.codigoInterno}</span>
                          {r.consorcio.identificadorCorto || r.consorcio.nombreConsorcio}
                        </Link>
                      </td>
                      <td className="text-xs font-mono">
                        {r.numeroUf}
                        {r.ubicacion && <span style={{ color: "var(--panel-nav-item)" }}> · {r.ubicacion}</span>}
                      </td>
                      <td><AusentismoTag v={r.nivelAusentismo} /></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: "var(--panel-nav-item)" }}>
                    No hay resultados con esos filtros.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

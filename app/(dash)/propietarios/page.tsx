import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = { [k: string]: string | string[] | undefined };

type UFRow = {
  uf_id: number;
  cod: string;
  consorcio: string;
  nro: string;
  ubic: string | null;
  prop_id: number | null;
  prop_nombre: string | null;
  email: string | null;
  telefonos: string | null;
  localidad: string | null;
  ausent: string;
  edif: string | null;
  no_contactar: boolean | null;
  administramos: boolean | null;
  obs: string | null;
};

async function search(filters: {
  q?: string;
  localidad?: string;
  ausentismo?: string;
  edificio?: string;
  conTelefono?: boolean;
  excluirConstructoras?: boolean;
  excluirNoContactar?: boolean;
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
  if (filters.localidad) {
    where.AND.push({ localidadPostal: { contains: filters.localidad, mode: "insensitive" } });
  }
  if (filters.ausentismo) {
    where.AND.push({ nivelAusentismo: filters.ausentismo });
  }
  if (filters.excluirConstructoras) {
    where.AND.push({ propietario: { esConstructora: false } });
  }
  if (filters.conTelefono) {
    where.AND.push({ propietario: { telefonosNormalizados: { not: "[]" } } });
  }
  if (filters.edificio) {
    where.AND.push({ consorcio: { estado: { estadoEdificio: filters.edificio } } });
  }
  if (filters.excluirNoContactar) {
    where.AND.push({ consorcio: { estado: { noContactar: false } } });
  }

  const rows = await prisma.unidadFuncional.findMany({
    where,
    include: {
      propietario: true,
      consorcio: { include: { estado: true } },
    },
    orderBy: [{ consorcio: { codigoInterno: "asc" } }, { numeroUf: "asc" }],
    take: 500,
  });

  return rows.map<UFRow>((r) => ({
    uf_id: r.id,
    cod: r.consorcio.codigoInterno,
    consorcio: r.consorcio.identificadorCorto ?? r.consorcio.nombreConsorcio,
    nro: r.numeroUf,
    ubic: r.ubicacion,
    prop_id: r.propietarioId,
    prop_nombre: r.propietario?.nombreNormalizado ?? "(sin propietario)",
    email: r.propietario?.email || null,
    telefonos: r.propietario?.telefonosNormalizados || null,
    localidad: r.localidadPostal,
    ausent: r.nivelAusentismo,
    edif: r.consorcio.estado?.estadoEdificio ?? null,
    no_contactar: r.consorcio.estado?.noContactar ?? null,
    administramos: r.consorcio.estado?.administramos ?? null,
    obs: r.consorcio.estado?.observaciones ?? null,
  }));
}

function parseTels(json: string | null): string[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function AusentismoTag({ v }: { v: string }) {
  const map: Record<string, string> = {
    ausentista_externo: "tag-blue",
    vive_en_la_costa: "tag-green",
    vive_en_la_propiedad: "tag-amber",
    constructora: "tag-gray",
  };
  const label = v.replace(/_/g, " ");
  return <span className={map[v] ?? "tag-gray"}>{label}</span>;
}

function EdifTag({ v }: { v: string | null }) {
  if (!v) return <span className="tag-gray">—</span>;
  const map: Record<string, string> = {
    excelente: "tag-green",
    muy_bueno: "tag-green",
    bueno: "tag-green",
    normal: "tag-amber",
    malo: "tag-red",
    desconocido: "tag-gray",
  };
  return <span className={map[v] ?? "tag-gray"}>{v}</span>;
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const localidad = (sp.localidad as string) || "";
  const ausentismo = (sp.ausentismo as string) || "";
  const edificio = (sp.edificio as string) || "";
  const conTel = sp.tel === "1";
  const excCons = sp.cons === "0" ? false : true;
  const excNoCont = sp.noc === "0" ? false : true;

  const rows = (q || localidad || ausentismo || edificio || conTel)
    ? await search({ q, localidad, ausentismo, edificio, conTelefono: conTel, excluirConstructoras: excCons, excluirNoContactar: excNoCont })
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Propietarios</h1>
        <p className="text-sm text-minini-gray">Filtrá por nombre, localidad, ausentismo, calidad del edificio.</p>
      </div>

      <form className="card grid grid-cols-1 md:grid-cols-5 gap-3" method="GET">
        <div className="md:col-span-2">
          <label className="label">Buscar (nombre, email, consorcio)</label>
          <input name="q" defaultValue={q} className="input" placeholder="Civano, Costanera..." />
        </div>
        <div>
          <label className="label">Localidad</label>
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
          <label className="label">Edificio</label>
          <select name="edificio" defaultValue={edificio} className="input">
            <option value="">— cualquiera —</option>
            <option value="excelente">Excelente</option>
            <option value="muy_bueno">Muy bueno</option>
            <option value="bueno">Bueno</option>
            <option value="normal">Normal</option>
            <option value="malo">Malo</option>
            <option value="desconocido">Desconocido</option>
          </select>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-4 items-center text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tel" value="1" defaultChecked={conTel} /> Solo con teléfono
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="cons" value="0" defaultChecked={!excCons} /> Incluir constructoras
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="noc" value="0" defaultChecked={!excNoCont} /> Incluir consorcios "NO LLAMAR"
          </label>
          <div className="ml-auto flex gap-2">
            <button className="btn-primary" type="submit">Buscar</button>
            <a className="btn-ghost" href="/propietarios">Limpiar</a>
          </div>
        </div>
      </form>

      {rows.length > 0 && (
        <div className="text-sm text-minini-gray">
          {rows.length} resultados (máximo 500 por consulta).
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left bg-white border border-minini-border">
            <tr>
              <th className="p-2">Propietario</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Localidad</th>
              <th className="p-2">Consorcio</th>
              <th className="p-2">UF</th>
              <th className="p-2">Ausentismo</th>
              <th className="p-2">Edificio</th>
              <th className="p-2">Avisos</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((r) => {
              const tels = parseTels(r.telefonos);
              const warn = [];
              if (r.no_contactar) warn.push("NO LLAMAR");
              if (r.administramos === false) warn.push("No administramos — hablar como inmobiliaria");
              if (r.obs) warn.push(r.obs);
              return (
                <tr key={r.uf_id} className="border-b border-minini-border/60">
                  <td className="p-2 font-medium">{r.prop_nombre}</td>
                  <td className="p-2 whitespace-nowrap">
                    {tels.length > 0 ? tels.join(", ") : <span className="text-minini-gray">—</span>}
                  </td>
                  <td className="p-2">{r.email || <span className="text-minini-gray">—</span>}</td>
                  <td className="p-2">{r.localidad || "—"}</td>
                  <td className="p-2">{r.cod} · {r.consorcio}</td>
                  <td className="p-2">{r.nro} {r.ubic ? `(${r.ubic})` : ""}</td>
                  <td className="p-2"><AusentismoTag v={r.ausent} /></td>
                  <td className="p-2"><EdifTag v={r.edif} /></td>
                  <td className="p-2 text-xs">
                    {warn.length === 0 ? <span className="text-minini-gray">—</span> :
                      warn.map((w, i) => <div key={i} className={w.includes("NO LLAMAR") ? "text-minini-red" : "text-amber-700"}>{w}</div>)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-minini-gray">
                Ingresá un filtro para buscar.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

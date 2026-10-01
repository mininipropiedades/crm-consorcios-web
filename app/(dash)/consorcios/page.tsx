import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const edif = (sp.edif as string) || "";

  const where: any = {};
  if (q) {
    where.OR = [
      { nombreConsorcio: { contains: q, mode: "insensitive" } },
      { identificadorCorto: { contains: q, mode: "insensitive" } },
      { direccionEdificio: { contains: q, mode: "insensitive" } },
      { codigoInterno: { contains: q, mode: "insensitive" } },
    ];
  }
  if (edif) {
    where.estado = { estadoEdificio: edif };
  }

  const rows = await prisma.consorcio.findMany({
    where,
    include: {
      estado: true,
      _count: { select: { ufs: true } },
    },
    orderBy: { codigoInterno: "asc" },
  });

  const totalUfs = rows.reduce((a, r) => a + r._count.ufs, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Consorcios</h1>
          <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
            {rows.length} en base · {totalUfs.toLocaleString("es-AR")} UFs totales.
          </p>
        </div>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="GET">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Buscar</label>
          <input name="q" defaultValue={q} className="input" placeholder="Costanera, Raba, 0001..." />
        </div>
        <div className="min-w-[180px]">
          <label className="label">Calidad del edificio</label>
          <select name="edif" defaultValue={edif} className="input">
            <option value="">— cualquiera —</option>
            <option value="excelente">Excelente</option>
            <option value="muy_bueno">Muy bueno</option>
            <option value="bueno">Bueno</option>
            <option value="normal">Normal</option>
            <option value="malo">Malo</option>
            <option value="desconocido">Sin dato</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="btn-primary" type="submit">Filtrar</button>
          {(q || edif) && <Link className="btn-ghost" href="/consorcios">Limpiar</Link>}
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/consorcios/${c.codigoInterno}`}
            className="card hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "var(--panel-nav-hover-bg)", color: "var(--panel-nav-item)" }}>
                    #{c.codigoInterno}
                  </span>
                  <EdifTag v={c.estado?.estadoEdificio} />
                </div>
                <div className="font-bold text-base leading-tight">
                  {c.identificadorCorto || c.nombreConsorcio}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--panel-nav-item)" }}>
                  {c.direccionEdificio || c.nombreConsorcio}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold tnum">{c._count.ufs}</div>
                <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--panel-nav-item)" }}>UFs</div>
              </div>
            </div>
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="col-span-full card text-center py-12" style={{ color: "var(--panel-nav-item)" }}>
            No hay consorcios con esos filtros.
          </div>
        )}
      </div>
    </div>
  );
}

function EdifTag({ v }: { v: string | null | undefined }) {
  if (!v || v === "desconocido") return null;
  const map: Record<string, string> = {
    excelente: "tag-green",
    muy_bueno: "tag-green",
    bueno: "tag-green",
    normal: "tag-amber",
    malo: "tag-red",
  };
  const label: Record<string, string> = {
    excelente: "Excelente",
    muy_bueno: "Muy bueno",
    bueno: "Bueno",
    normal: "Normal",
    malo: "Malo",
  };
  return <span className={map[v] ?? "tag-gray"}>{label[v] ?? v}</span>;
}

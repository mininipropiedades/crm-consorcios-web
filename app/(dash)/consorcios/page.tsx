import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await prisma.consorcio.findMany({
    include: {
      estado: true,
      _count: { select: { ufs: true } },
    },
    orderBy: { codigoInterno: "asc" },
  });

  const totalUfs = rows.reduce((a, r) => a + r._count.ufs, 0);
  const captables = rows.filter(r => r.estado && !r.estado.noContactar).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Consorcios</h1>
          <p className="text-sm text-minini-gray">
            {rows.length} en base · {totalUfs.toLocaleString("es-AR")} UFs totales · {captables} captables.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-minini-border">
          <thead className="text-left">
            <tr>
              <th className="p-2">Código</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Dirección</th>
              <th className="p-2 text-right">UFs</th>
              <th className="p-2">Edificio</th>
              <th className="p-2">¿Llamar?</th>
              <th className="p-2">¿Administramos?</th>
              <th className="p-2">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-minini-border/60 align-top">
                <td className="p-2 font-mono text-xs">{r.codigoInterno}</td>
                <td className="p-2 font-medium">{r.identificadorCorto || r.nombreConsorcio}</td>
                <td className="p-2 text-minini-gray">{r.direccionEdificio}</td>
                <td className="p-2 text-right">{r._count.ufs}</td>
                <td className="p-2">
                  <EdifTag v={r.estado?.estadoEdificio} />
                </td>
                <td className="p-2">
                  {r.estado?.noContactar ? <span className="tag-red">NO LLAMAR</span> :
                    r.estado ? <span className="tag-green">OK</span> :
                    <span className="tag-gray">sin dato</span>}
                </td>
                <td className="p-2">
                  {r.estado?.administramos === false ? <span className="tag-amber">no</span> :
                    r.estado?.administramos === true ? <span className="tag-green">sí</span> :
                    <span className="tag-gray">?</span>}
                </td>
                <td className="p-2 text-xs text-minini-gray max-w-xs">{r.estado?.observaciones || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EdifTag({ v }: { v: string | null | undefined }) {
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

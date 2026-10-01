import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    nCons,
    nProps,
    nUfs,
    nUfsCapt,
    nAusent,
    nCosta,
    nInv,
    noContactar,
    noAdmin,
  ] = await Promise.all([
    prisma.consorcio.count(),
    prisma.propietario.count(),
    prisma.unidadFuncional.count(),
    prisma.unidadFuncional.count({
      where: {
        nivelAusentismo: "ausentista_externo",
        propietario: { esConstructora: false },
        consorcio: {
          estado: { noContactar: false },
        },
      },
    }),
    prisma.unidadFuncional.count({ where: { nivelAusentismo: "ausentista_externo" } }),
    prisma.unidadFuncional.count({ where: { nivelAusentismo: "vive_en_la_costa" } }),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS n FROM (
        SELECT "propietarioId" FROM "UnidadFuncional"
        WHERE "propietarioId" IS NOT NULL
        GROUP BY "propietarioId" HAVING COUNT(*) >= 2
      ) q`,
    ).then((r) => r[0]?.n ?? 0),
    prisma.estadoConsorcio.count({ where: { noContactar: true } }),
    prisma.estadoConsorcio.count({ where: { administramos: false } }),
  ]);
  return { nCons, nProps, nUfs, nUfsCapt, nAusent, nCosta, nInv, noContactar, noAdmin };
}

export default async function Home() {
  const s = await getStats();

  const cards = [
    { label: "Consorcios", value: s.nCons },
    { label: "Propietarios únicos", value: s.nProps },
    { label: "Unidades funcionales", value: s.nUfs },
    { label: "UFs captables", value: s.nUfsCapt, highlight: true },
    { label: "Ausentistas externos", value: s.nAusent },
    { label: "Viven en la costa", value: s.nCosta },
    { label: "Inversores (2+ UF)", value: s.nInv },
    { label: 'Consorcios "NO LLAMAR"', value: s.noContactar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel</h1>
        <p className="text-minini-gray text-sm">
          Base cargada desde iData + filtros del Excel LISTA CONSORCIOS MININI.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-xs text-minini-gray">{c.label}</div>
            <div className={`mt-1 text-2xl font-bold ${c.highlight ? "text-minini-red" : ""}`}>
              {c.value.toLocaleString("es-AR")}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Atajos</h2>
        <ul className="text-sm space-y-1 list-disc list-inside text-minini-gray">
          <li><a className="text-minini-black underline" href="/propietarios">Buscar propietarios</a> por localidad, ausentismo, cantidad de UFs.</li>
          <li><a className="text-minini-black underline" href="/captacion">Oportunidades calientes</a>: ausentistas en consorcios buenos sin tocar.</li>
          <li><a className="text-minini-black underline" href="/inversores">Inversores</a>: propietarios con 2+ UFs.</li>
          <li><a className="text-minini-black underline" href="/consorcios">Consorcios</a>: estado por edificio y filtros.</li>
        </ul>
      </div>
    </div>
  );
}

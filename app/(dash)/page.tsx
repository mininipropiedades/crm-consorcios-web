import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [nCons, nProps, nUfs, nUfsCapt, nAusent, nCosta, nInvRow] = await Promise.all([
    prisma.consorcio.count(),
    prisma.propietario.count(),
    prisma.unidadFuncional.count(),
    prisma.unidadFuncional.count({
      where: {
        nivelAusentismo: "ausentista_externo",
        propietario: { esConstructora: false },
        consorcio: { estado: { noContactar: false } },
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
    ),
  ]);
  const nInv = nInvRow[0]?.n ?? 0;
  return { nCons, nProps, nUfs, nUfsCapt, nAusent, nCosta, nInv };
}

export default async function Home() {
  const s = await getStats();

  const stats = [
    { label: "Consorcios", value: s.nCons, href: "/consorcios" },
    { label: "Propietarios", value: s.nProps, href: "/propietarios" },
    { label: "Unidades funcionales", value: s.nUfs, href: "/propietarios" },
    { label: "Oportunidades captables", value: s.nUfsCapt, href: "/captacion", highlight: true },
    { label: "Ausentistas externos", value: s.nAusent, href: "/propietarios?ausentismo=ausentista_externo" },
    { label: "Viven en la costa", value: s.nCosta, href: "/propietarios?ausentismo=vive_en_la_costa" },
    { label: "Inversores (2+ UF)", value: s.nInv, href: "/inversores" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de captación</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--panel-nav-item)" }}>
            Base cargada desde iData + filtros del Excel LISTA CONSORCIOS MININI.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((c) => (
          <Link key={c.label} href={c.href} className="stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={c.highlight ? { color: "#e31e24" } : undefined}>
              {c.value.toLocaleString("es-AR")}
            </div>
          </Link>
        ))}
      </div>

      {/* Atajos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/captacion" className="card group hover:border-brand-500 transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-lg">Oportunidades calientes</div>
              <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
                Ausentistas con teléfono en edificios buenos.
              </p>
            </div>
            <span className="text-xl" style={{ color: "#e31e24" }}>→</span>
          </div>
        </Link>

        <Link href="/consorcios" className="card group hover:border-brand-500 transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-lg">Explorar consorcios</div>
              <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
                Lista completa con sus propietarios y notas.
              </p>
            </div>
            <span className="text-xl" style={{ color: "#e31e24" }}>→</span>
          </div>
        </Link>

        <Link href="/inversores" className="card group hover:border-brand-500 transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-lg">Inversores</div>
              <p className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
                Propietarios con 2 o más unidades.
              </p>
            </div>
            <span className="text-xl" style={{ color: "#e31e24" }}>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

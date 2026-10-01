import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function guardarNotas(formData: FormData) {
  "use server";
  const session = await requireSession();
  const codigoInterno = String(formData.get("codigo") || "");
  const nota = String(formData.get("nota") || "");
  const observaciones = String(formData.get("observaciones") || "");
  const noContactar = formData.get("no_contactar") === "on";
  const administramos = formData.get("administramos") as string | null;

  if (!codigoInterno) return;

  // Buscar o crear estado
  const consorcio = await prisma.consorcio.findUnique({ where: { codigoInterno } });
  if (!consorcio) return;

  await prisma.estadoConsorcio.upsert({
    where: { consorcioId: consorcio.id },
    update: {
      notaRaw: nota,
      observaciones,
      noContactar,
      administramos: administramos === "true" ? true : administramos === "false" ? false : null,
    },
    create: {
      consorcioId: consorcio.id,
      codigoInterno,
      notaRaw: nota,
      observaciones,
      noContactar,
      administramos: administramos === "true" ? true : administramos === "false" ? false : null,
      estadoEdificio: "desconocido",
    },
  });

  revalidatePath(`/consorcios/${codigoInterno}`);
  revalidatePath("/consorcios");
}

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const consorcio = await prisma.consorcio.findUnique({
    where: { codigoInterno: codigo },
    include: {
      estado: true,
      exclusiones: true,
      ufs: {
        include: { propietario: true },
        orderBy: { numeroUf: "asc" },
      },
    },
  });

  if (!consorcio) notFound();

  // Agrupar UFs por propietario
  const porPropietario = new Map<number | string, { propietario: any; ufs: typeof consorcio.ufs }>();
  for (const uf of consorcio.ufs) {
    const key = uf.propietarioId ?? `sin_prop_${uf.id}`;
    if (!porPropietario.has(key)) {
      porPropietario.set(key, { propietario: uf.propietario, ufs: [] });
    }
    porPropietario.get(key)!.ufs.push(uf);
  }

  const grupos = Array.from(porPropietario.values()).sort((a, b) => {
    const na = a.propietario?.nombreNormalizado ?? "zz";
    const nb = b.propietario?.nombreNormalizado ?? "zz";
    return na.localeCompare(nb);
  });

  const estado = consorcio.estado;
  const totalContactables = consorcio.ufs.filter(u => u.propietario && !u.propietario.esConstructora).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/consorcios" className="text-xs flex items-center gap-1 mb-2 panel-chrome-link"
          style={{ color: "var(--panel-link)" }}>
          ← Volver a consorcios
        </Link>
        <div className="flex items-start gap-3">
          <span className="text-xs font-mono px-2 py-1 rounded mt-1"
            style={{ background: "var(--panel-nav-hover-bg)", color: "var(--panel-nav-item)" }}>
            #{consorcio.codigoInterno}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-tight">
              {consorcio.identificadorCorto || consorcio.nombreConsorcio}
            </h1>
            <div className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
              {consorcio.nombreConsorcio}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--panel-nav-item)" }}>
              {consorcio.direccionEdificio} · {consorcio.ufs.length} UFs · {totalContactables} contactables
            </div>
          </div>
        </div>
      </div>

      {/* Avisos destacados (acá SI mostramos NO LLAMAR) */}
      {estado?.noContactar && (
        <div className="card border-l-4 flex gap-3 items-start" style={{ borderLeftColor: "#e31e24", background: "#fdeaea", color: "#a0141a" }}>
          <span className="text-xl">⚠</span>
          <div>
            <div className="font-bold">NO LLAMAR</div>
            <p className="text-sm mt-1">Este consorcio está marcado como no contactar. Los propietarios de abajo quedan excluidos de los listados generales de captación.</p>
          </div>
        </div>
      )}

      {estado?.administramos === false && !estado?.noContactar && (
        <div className="card border-l-4 flex gap-3 items-start" style={{ borderLeftColor: "#f59e0b", background: "#fef3c7", color: "#78350f" }}>
          <span className="text-xl">!</span>
          <div>
            <div className="font-bold">No administramos este edificio</div>
            <p className="text-sm mt-1">Al contactar hablar como <strong>Minini Propiedades inmobiliaria</strong>, no mencionar la administración.</p>
          </div>
        </div>
      )}

      {consorcio.exclusiones.length > 0 && (
        <div className="card border-l-4 flex gap-3 items-start" style={{ borderLeftColor: "#f59e0b", background: "#fef3c7", color: "#78350f" }}>
          <span className="text-xl">!</span>
          <div>
            <div className="font-bold">Exclusiones específicas</div>
            <ul className="text-sm mt-1 list-disc pl-4">
              {consorcio.exclusiones.map((e) => (
                <li key={e.id}>{e.motivo} ({e.patronExclusion})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Formulario de notas editables */}
      <details className="card" open>
        <summary className="cursor-pointer flex items-center justify-between font-bold">
          <span>Anotaciones del consorcio</span>
          <span className="text-xs font-normal" style={{ color: "var(--panel-nav-item)" }}>Click para editar</span>
        </summary>
        <form action={guardarNotas} className="mt-4 space-y-4">
          <input type="hidden" name="codigo" value={consorcio.codigoInterno} />

          <div>
            <label className="label">Nota original (del Excel LISTA)</label>
            <textarea
              name="nota"
              rows={3}
              defaultValue={estado?.notaRaw ?? ""}
              className="input"
              placeholder="Ej: BUENA CALIDAD, NINGUN PROBLEMA PARA ALQUILAR"
            />
          </div>

          <div>
            <label className="label">Observaciones comerciales</label>
            <textarea
              name="observaciones"
              rows={3}
              defaultValue={estado?.observaciones ?? ""}
              className="input"
              placeholder="Ej: tiene gas natural, vecinos complicados, contacto preferente..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">¿Administramos?</label>
              <select name="administramos" defaultValue={estado?.administramos === null || estado?.administramos === undefined ? "" : String(estado.administramos)} className="input">
                <option value="">Sin dato</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 py-2 text-sm font-semibold">
                <input type="checkbox" name="no_contactar" defaultChecked={estado?.noContactar || false} />
                <span>Marcar como NO LLAMAR</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary" type="submit">Guardar</button>
          </div>
        </form>
      </details>

      {/* Lista de propietarios */}
      <div>
        <h2 className="text-lg font-bold mb-3">Propietarios ({grupos.length})</h2>
        <div className="card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Propietario</th>
                <th>UF</th>
                <th>Teléfonos</th>
                <th>Email</th>
                <th>Vive en</th>
                <th>Avisos</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => {
                const p = g.propietario;
                const esConstructora = p?.esConstructora;
                const esJuridica = p?.esPersonaJuridica;
                let tels: string[] = [];
                try { tels = p?.telefonosNormalizados ? JSON.parse(p.telefonosNormalizados) : []; } catch {}
                const ubicPrimera = g.ufs[0]?.localidadPostal;
                return (
                  <tr key={i}>
                    <td>
                      <div className="font-semibold">{p?.nombreNormalizado ?? "(sin propietario)"}</div>
                      {esConstructora && <span className="tag-gray mt-1 inline-block">Constructora</span>}
                      {esJuridica && !esConstructora && <span className="tag-blue mt-1 inline-block">Jurídica</span>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {g.ufs.map((u) => (
                          <span key={u.id} className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "var(--panel-nav-hover-bg)" }}>
                            {u.numeroUf}{u.ubicacion ? ` · ${u.ubicacion}` : ""}
                          </span>
                        ))}
                      </div>
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
                      {p?.email ? <a href={`mailto:${p.email.split(";")[0]}`} className="hover:underline">{p.email.split(";")[0]}</a> : <span style={{ color: "var(--panel-muted)" }}>—</span>}
                    </td>
                    <td className="text-sm">{ubicPrimera ?? "—"}</td>
                    <td className="text-xs">
                      <AusentismoTag v={g.ufs[0]?.nivelAusentismo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AusentismoTag({ v }: { v: string | undefined }) {
  if (!v) return null;
  const map: Record<string, { cls: string; label: string }> = {
    ausentista_externo: { cls: "tag-blue", label: "Ausentista" },
    vive_en_la_costa: { cls: "tag-green", label: "Local" },
    vive_en_la_propiedad: { cls: "tag-amber", label: "Vive ahí" },
    constructora: { cls: "tag-gray", label: "Constructora" },
  };
  const m = map[v];
  if (!m) return <span className="tag-gray">{v}</span>;
  return <span className={m.cls}>{m.label}</span>;
}

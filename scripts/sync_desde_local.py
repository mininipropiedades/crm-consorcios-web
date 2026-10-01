"""
Sincroniza el CRM local (SQLite en POWERSYSTEM CRM - FRANCO/database/crm.db)
hacia el Postgres del CRM web (Supabase/Neon).

Uso:
  export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
  python scripts/sync_desde_local.py

Estrategia: full upsert. Rapido para 60 consorcios y 1600 UFs.
NO borra datos existentes del Postgres (users, interacciones), solo pisa el espejo del CRM.
"""
import os
import sys
import sqlite3
import json
from datetime import datetime

try:
    import psycopg
except ImportError:
    print("Instala psycopg: pip install 'psycopg[binary]'")
    sys.exit(1)

SQLITE = r"C:\Users\franc\OneDrive\Documentos\POWERSYSTEM CRM - FRANCO\database\crm.db"
PG_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")

if not PG_URL:
    print("Falta DATABASE_URL. Exportalo primero.")
    sys.exit(1)

if not os.path.exists(SQLITE):
    print(f"No se encontro el SQLite local: {SQLITE}")
    sys.exit(1)

print(f"Local SQLite: {SQLITE}")
print(f"Remoto Postgres: {PG_URL[:40]}...")

sq = sqlite3.connect(SQLITE)
sq.row_factory = sqlite3.Row

pg = psycopg.connect(PG_URL)
pg.autocommit = False
cur = pg.cursor()

try:
    # 1) Consorcios
    print("Sync Consorcios ...")
    cons_rows = sq.execute("SELECT * FROM consorcios").fetchall()
    for r in cons_rows:
        cur.execute("""
            INSERT INTO "Consorcio" ("codigoInterno", "nombreConsorcio", "identificadorCorto",
                "direccionEdificio", "localidadEdificio", "codPostalEdificio", "ultimaImportacion")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT ("codigoInterno") DO UPDATE SET
                "nombreConsorcio" = EXCLUDED."nombreConsorcio",
                "identificadorCorto" = EXCLUDED."identificadorCorto",
                "direccionEdificio" = EXCLUDED."direccionEdificio",
                "localidadEdificio" = EXCLUDED."localidadEdificio",
                "codPostalEdificio" = EXCLUDED."codPostalEdificio",
                "ultimaImportacion" = EXCLUDED."ultimaImportacion"
        """, (r["codigo_interno"], r["nombre_consorcio"], r["identificador_corto"],
              r["direccion_edificio"], r["localidad_edificio"], r["cod_postal_edificio"],
              r["ultima_importacion"]))
    print(f"  {len(cons_rows)} consorcios")

    # Cache: codigo_sqlite_id -> codigo_interno
    sq_cons_id_to_codigo = {r["id"]: r["codigo_interno"] for r in cons_rows}

    # 2) Propietarios
    print("Sync Propietarios ...")
    prop_rows = sq.execute("SELECT * FROM propietarios").fetchall()
    # Mapping: sqlite_id -> postgres_id
    sq_prop_to_pg = {}
    for r in prop_rows:
        cur.execute("""
            INSERT INTO "Propietario" ("nombreCompletoRaw", "nombreNormalizado", "apellido",
                "nombres", "esConstructora", "esPersonaJuridica", "email",
                "telefonosNormalizados", "telefonosRaw")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (r["nombre_completo_raw"], r["nombre_normalizado"], r["apellido"],
              r["nombres"], bool(r["es_constructora"]), bool(r["es_persona_juridica"]),
              r["email"] or None, r["telefonos_normalizados"] or "[]",
              r["telefonos_raw"] or "[]"))
        pg_id = cur.fetchone()[0]
        sq_prop_to_pg[r["id"]] = pg_id
    print(f"  {len(prop_rows)} propietarios")

    # Build postgres consorcio_id lookup by codigo_interno
    cur.execute('SELECT id, "codigoInterno" FROM "Consorcio"')
    cons_codigo_to_pg = {row[1]: row[0] for row in cur.fetchall()}

    # 3) UFs - borrar las existentes y recrear (es espejo)
    print("Sync Unidades Funcionales ...")
    cur.execute('DELETE FROM "UnidadFuncional"')
    uf_rows = sq.execute("SELECT * FROM unidades_funcionales").fetchall()
    for r in uf_rows:
        codigo = sq_cons_id_to_codigo.get(r["consorcio_id"])
        if not codigo:
            continue
        pg_cons = cons_codigo_to_pg.get(codigo)
        if not pg_cons:
            continue
        pg_prop = sq_prop_to_pg.get(r["propietario_id"]) if r["propietario_id"] else None
        cur.execute("""
            INSERT INTO "UnidadFuncional" ("consorcioId", "propietarioId", "numeroUf",
                "ubicacion", "direccionPostal", "codPostalPostal", "localidadPostal",
                "provinciaPostal", "nivelAusentismo", "fechaImportacion")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (pg_cons, pg_prop, r["numero_uf"], r["ubicacion"],
              r["direccion_postal"], r["cod_postal_postal"], r["localidad_postal"],
              r["provincia_postal"], r["nivel_ausentismo"],
              r["fecha_importacion"] or datetime.now().isoformat()))
    print(f"  {len(uf_rows)} UFs")

    # 4) Estado consorcios llamados
    print("Sync Estado Consorcios ...")
    cur.execute('DELETE FROM "EstadoConsorcio"')
    est_rows = sq.execute("SELECT * FROM estado_consorcios_llamados").fetchall()
    for r in est_rows:
        pg_cons = cons_codigo_to_pg.get(r["codigo_interno"])
        admin = None if r["administramos"] is None else bool(r["administramos"])
        cur.execute("""
            INSERT INTO "EstadoConsorcio" ("consorcioId", "codigoInterno", "cantidadUfNotada",
                "notaRaw", "noContactar", "administramos", "estadoEdificio",
                "observaciones", "excepcionesContacto", "fechaImportacion")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (pg_cons, r["codigo_interno"], r["cantidad_uf_notada"],
              r["nota_raw"], bool(r["no_contactar"]), admin,
              r["estado_edificio"] or "desconocido", r["observaciones"],
              r["excepciones_contacto"], r["fecha_importacion"] or datetime.now().isoformat()))
    print(f"  {len(est_rows)} estados")

    # 5) Exclusiones
    print("Sync Exclusiones ...")
    cur.execute('DELETE FROM "ExclusionPropietario"')
    exc_rows = sq.execute("SELECT * FROM exclusiones_propietarios").fetchall()
    for r in exc_rows:
        codigo = sq_cons_id_to_codigo.get(r["consorcio_id"])
        if not codigo: continue
        pg_cons = cons_codigo_to_pg.get(codigo)
        if not pg_cons: continue
        cur.execute("""
            INSERT INTO "ExclusionPropietario" ("consorcioId", "patronExclusion", "motivo", "fecha")
            VALUES (%s, %s, %s, %s)
        """, (pg_cons, r["patron_exclusion"], r["motivo"], r["fecha"]))
    print(f"  {len(exc_rows)} exclusiones")

    pg.commit()
    print("\n[OK] Sync completo")
except Exception as e:
    pg.rollback()
    print(f"[ERROR] {e}")
    raise
finally:
    cur.close()
    pg.close()
    sq.close()

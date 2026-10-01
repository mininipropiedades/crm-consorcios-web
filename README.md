# CRM Consorcios — Minini Propiedades

CRM web para los propietarios de los consorcios administrados por Román (iData/PowerSystem).
Vista web multi-usuario con roles (admin / empleado) para que vos y tus empleados puedan consultar
y segmentar la base. Deploy en Vercel. Base en Supabase/Neon.

La base canónica sigue siendo el **SQLite local** manejado por el agente
`/CRM-CONSORCIOS-FRANCO` en tu PC. Este web es una **vista sincronizada** para los empleados.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Prisma + Postgres
- Auth propia (cookies httpOnly con JWT HS256, bcrypt)
- PWA ready (manifest + ícono) — se puede instalar en celular como app

## Pasos para dejarlo online

### 1. Instalar deps
```bash
cd ~/OneDrive/Escritorio/crm-consorcios-web
npm install
```

### 2. Base de datos (Supabase recomendado)
- Crear nuevo project en https://supabase.com (gratis, pool connection ya viene).
- Copiar la **Connection String** (URI) con **modo Transaction** → `DATABASE_URL`.
- Copiar la **Connection String directa** (puerto 5432) → `DIRECT_URL`.

Alternativa: Neon (https://neon.tech). Mismo setup, dos URLs.

### 3. Variables de entorno locales
```bash
cp .env.example .env
```
Editar `.env`:
- `DATABASE_URL` y `DIRECT_URL` → las que te dio Supabase/Neon.
- `AUTH_SECRET` → generar con `openssl rand -base64 32` (o Python: `python -c "import secrets; print(secrets.token_urlsafe(32))"`).
- `ADMIN_EMAIL` → tu email (ya tiene mininipropiedades@gmail.com por default).
- `ADMIN_PASSWORD` → el password que vas a usar la primera vez (cambialo después desde /admin/usuarios).

### 4. Crear el schema y seedear tu usuario admin
```bash
npm run db:deploy
```
Esto corre `prisma db push` (crea las tablas) y `prisma/seed.ts` (crea tu admin).

### 5. Sincronizar la base local → Postgres
Primera vez (y cada vez que corras una ingesta nueva en el agente local):
```bash
# Instalar psycopg (una sola vez)
pip install "psycopg[binary]"

# En Git Bash en Windows:
export DATABASE_URL="postgresql://..."
python scripts/sync_desde_local.py
```
En PowerShell:
```powershell
$env:DATABASE_URL = "postgresql://..."
python scripts/sync_desde_local.py
```

### 6. Correr en local para verificar
```bash
npm run dev
```
Abrir http://localhost:3000. Login con el email/password que pusiste.

### 7. Deploy en Vercel
```bash
git init
git add .
git commit -m "init crm web"
# Crear repo en GitHub
gh repo create crm-consorcios-web --private --source=. --push
# o pusheas manual
```

Después, en Vercel:
1. Importar el repo.
2. En **Environment Variables** pegar `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Deploy.
4. Primera vez, correr seed desde terminal local contra la DB prod (ya está si usaste `db:deploy`).

Después de deploy exitoso:
- La URL será algo tipo `crm-consorcios-web.vercel.app`.
- Agregar dominio custom si querés desde Vercel.
- Para "instalar como app" en celular: entrás con Chrome, menú → "Agregar a pantalla de inicio".

## Dar acceso a empleados

Entrás como admin → `/admin/usuarios` → **Nuevo usuario**:
- Email + nombre + password + rol `empleado`.
- Les mandás por WhatsApp el link + usuario + password temporal.
- Ellos entran y ven todo menos la pantalla de admin.

## Mantener el CRM web actualizado

El flujo es:
1. Franco baja PDFs nuevos de iData.
2. Franco corre `/CRM-CONSORCIOS-FRANCO importar los pdfs nuevos` en Claude Code.
3. Franco corre `python scripts/sync_desde_local.py` (desde el repo del CRM web, con `DATABASE_URL` seteado).
4. Los empleados ven los nuevos datos al refrescar.

Se puede automatizar: setear un cron o hook en el agente que, al terminar una importación, dispare el sync. Fase 2.

## Rutas

- `/login` — ingreso
- `/` — dashboard con stats generales
- `/propietarios` — búsqueda con filtros (nombre, localidad, ausentismo, calidad edificio)
- `/consorcios` — listado completo con estado y flags
- `/inversores` — top propietarios con 2+ UFs
- `/captacion` — oportunidades calientes (ausentistas + edificio bueno + consorcio captable)
- `/admin/usuarios` — gestión de empleados (solo admin)

## Seguridad y confidencialidad

- Cookies httpOnly + SameSite=lax + Secure en producción.
- Passwords hasheadas con bcrypt (10 rounds).
- Middleware bloquea toda ruta no pública si no hay sesión válida.
- Roles: empleados NO ven la gestión de usuarios ni pueden editar.
- Datos sensibles (DNI, CBU) **no se exportan** salvo que lo pidas explícito.

La base queda en servidor de Supabase/Neon (US) con TLS. Si querés mantener máxima
confidencialidad: usá IPs restringidas en Supabase, 2FA en el account de Vercel, y rotá
el `AUTH_SECRET` cada tanto.

## Fase 2 planeada

- Edición de interacciones (marcar llamado como "hecho / no atendió / interesado").
- Export a Excel desde la web.
- App móvil nativa con Capacitor (opcional, el PWA ya se instala).
- Sync automático post-ingesta.
- Dashboard de productividad por empleado.

---

v0.1 — 2026-10-01 · Construido por `agente-constructor-de-agentes` para Minini Propiedades

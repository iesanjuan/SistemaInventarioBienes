# Sistema de Inventario y Auditoría — AssetTrack Pro

Sistema web ligero de gestión de activos (Tablets y Paneles Solares) con **React + Vite + Tailwind CSS** en el frontend y **Supabase** (PostgreSQL + Auth + RLS) como backend.

La referencia visual/maquetación es `UI/UI.html` (design system Material 3, portado a `tailwind.config.js`).

## Requisitos

- Node.js 18+
- Un proyecto en [Supabase](https://supabase.com)

## Puesta en marcha

1. **Instalar dependencias** (gestor de paquetes: **pnpm**)

   ```bash
   pnpm install
   ```

2. **Configurar Supabase**

   Copia `.env.example` a `.env` y rellena con los valores de tu proyecto
   (Supabase Dashboard → *Project Settings* → *API*):

   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-public-key
   ```

3. **Crear el esquema de base de datos**

   En el **SQL Editor** de Supabase, ejecuta en orden:

   1. `supabase/migrations/0001_schema.sql` — tablas, enums y triggers
   2. `supabase/migrations/0002_rls.sql` — políticas Row Level Security
   3. `supabase/migrations/0003_asignaciones_observaciones.sql` — columna `observaciones` en asignaciones
   4. `supabase/migrations/0004_activos_solo_caja.sql` — columna `solo_caja` en activos
   5. `supabase/seed.sql` — *(opcional)* datos de prueba

4. **Crear un usuario**

   En Supabase → *Authentication* → *Users* → *Add user* (email + password),
   ya que el registro público está fuera del alcance de este sistema interno.

5. **Levantar el entorno de desarrollo**

   ```bash
   pnpm dev
   ```

   > El servidor se expone en la red local (`host: true`) para poder probar el
   > escáner de códigos de barras desde el móvil (Fase 3).

## Estructura

```
├── index.html
├── tailwind.config.js        # design tokens portados desde UI/UI.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   └── lib/
│       └── supabaseClient.js # cliente @supabase/supabase-js
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql    # Tarea 1.1
│   │   └── 0002_rls.sql       # Tarea 1.2
│   └── seed.sql
└── UI/UI.html                # maqueta de referencia
```

## Roadmap por fases

- [x] **Fase 1** — Esquema PostgreSQL + RLS
- [x] **Fase 2** — Auth + Login (PAN-0101), Catálogo (PAN-0301), Registro (PAN-0303)
- [x] **Fase 3** — Escáner móvil (PAN-0401) + Conciliación de auditoría (PAN-0402)
- [x] **Fase 4** — Asignación y salida de equipos (PAN-0501)
- [x] **Extras** — Dashboard (KPIs reales), Reportes (filtros + CSV + acta PDF), Configuración (perfil + cambio de contraseña). Interfaz en español.

> **Nota sobre el escáner (Fase 3):** la cámara requiere contexto seguro
> (`localhost` o HTTPS). Al probar desde el móvil por IP de red local (http),
> usa la búsqueda manual de código, o expón el dev server por HTTPS.
```

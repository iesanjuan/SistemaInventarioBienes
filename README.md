# Sistema de Inventario y Auditoría de Bienes — I.E. San Juan

Aplicación web para **gestionar, auditar y asignar los activos** de la
Institución Educativa San Juan (Tablets PC y Paneles Solares): registro de
equipos, control de accesorios, agrupación en cajas, auditoría por escaneo de
código de barras desde el móvil, asignación/salida de equipos y generación de
reportes (Excel y Acta imprimible).

Es una **SPA (Single Page Application)** que corre íntegramente en el navegador y
usa **Supabase** (PostgreSQL + Auth + RLS) como backend gestionado: **no hay un
servidor propio**, el navegador habla directo con Supabase sobre HTTPS.

---

## ¿Qué hace el sistema?

- **Inventario de activos.** Cada activo es un "conjunto" identificado por su
  **código de barras** (impreso en el equipo y en la caja): tipo (Tablet / Panel
  Solar), marca, modelo, estado físico, ubicación, código patrimonial y
  observaciones.
- **Accesorios por tipo.** Tablet → cargador, funda, pin SIM · Panel → cable de
  suministro. El sistema sabe qué accesorios se esperan según el tipo y marca los
  conjuntos **incompletos**.
- **Cajas / contenedores.** Agrupa varios activos por `numero_caja`, con
  numeración independiente para Tablets y Paneles, y muestra cuántos hay y
  cuántos están incompletos por caja.
- **Auditoría móvil por escáner.** Se escanea el código de barras con la cámara
  del teléfono para abrir el activo y **conciliar** sus accesorios (marcándolo
  como verificado y dejando registro en un historial inmutable).
- **Asignación / salida de equipos.** Registra a quién se entrega un equipo (DNI,
  nombre, área/aula) y actualiza su ubicación.
- **Dashboard con KPIs reales** calculados desde la base de datos.
- **Reportes.** Exporta el inventario filtrado a **Excel (.xlsx)** (con hoja de
  resumen por tipo/estado/caja/integridad) y genera un **Acta imprimible**
  (HTML → impresión del navegador, sin dependencias de PDF).
- **Autenticación** por email + contraseña (Supabase Auth). No hay registro
  público: los usuarios se crean manualmente. Toda la interfaz está en **español**.

---

## Tecnologías utilizadas

| Capa | Tecnología |
| --- | --- |
| Lenguaje | **JavaScript (ES Modules) + JSX** |
| Librería UI | **React 18** (componentes de función + hooks) |
| Build / dev server | **Vite 5** |
| Ruteo | **react-router-dom 6** (con `React.lazy` para carga diferida) |
| Estilos | **Tailwind CSS 3** + PostCSS (design tokens Material 3) |
| Backend (BaaS) | **Supabase** → PostgreSQL + Auth + Row Level Security |
| Cliente de datos | **@supabase/supabase-js** (habla con PostgREST + Auth) |
| Escáner de códigos | **html5-qrcode** (lectura por cámara) |
| Exportación | **xlsx (SheetJS)** para reportes `.xlsx` |
| Gestor de paquetes | **pnpm** |
| Hosting / despliegue | **Vercel** (estáticos + rewrite de SPA) |
| CI / automatización | **GitHub Actions** (keep-alive de Supabase) |

> **Arquitectura sin backend propio:** el cliente consulta Supabase directamente
> con la *anon key* pública; **la seguridad de los datos vive en la base de datos**
> (Row Level Security), no en la aplicación. Ver `ARQUITECTURA.md` para el detalle.

---

## Requisitos

- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)
- Un proyecto en [Supabase](https://supabase.com)

---

## Puesta en marcha

1. **Instalar dependencias**

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

   En el **SQL Editor** de Supabase, ejecuta en orden los archivos de
   `supabase/migrations/` (`0001` → `0009`) y, opcionalmente, `supabase/seed.sql`
   con datos de prueba. Las migraciones son **idempotentes** (se pueden
   re-ejecutar):

   | Migración | Contenido |
   | --- | --- |
   | `0001_schema.sql` | Tablas, enums, triggers e índices |
   | `0002_rls.sql` | Políticas Row Level Security |
   | `0003…0007` | Ajustes de columnas (observaciones, estados, `numero_caja`, componentes) |
   | `0008_vistas_inventario_cajas.sql` | Vistas `v_activos` y `cajas_resumen` |
   | `0009_*` | Cajas por tipo y recálculo de "completo" del panel |

4. **Crear un usuario**

   En Supabase → *Authentication* → *Users* → *Add user* (email + password),
   ya que el registro público está fuera del alcance de este sistema interno.

5. **Levantar el entorno de desarrollo**

   ```bash
   pnpm dev
   ```

   > El servidor se expone en la red local (`host: true`) para probar el escáner
   > de códigos de barras desde el móvil.

### Scripts disponibles

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo (Vite) |
| `pnpm build` | Build de producción a `dist/` |
| `pnpm preview` | Previsualiza el build de producción |
| `pnpm lint` | Linter (ESLint) |

---

## Despliegue en Vercel

El proyecto incluye `vercel.json` con el *rewrite* de SPA (todas las rutas
sirven `index.html`), imprescindible porque se usa **React Router**: sin él,
recargar o entrar directo a `/catalogo`, `/registro`, etc. daría **404**.

1. **Importar el repositorio** en [Vercel](https://vercel.com) → *Add New… →
   Project*. Vercel detecta **Vite** y **pnpm** automáticamente
   (Build: `pnpm build` · Output: `dist`).

2. **Variables de entorno** (Project → *Settings* → *Environment Variables*),
   para *Production*, *Preview* y *Development*:

   | Nombre | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `tu-anon-public-key` |

   > ⚠️ El `.env` local **no** se sube al repo (está en `.gitignore`). Se usa la
   > *anon key* pública (protegida por RLS), **no** la *service_role*.

3. **Deploy.** Cada push a `main` genera un despliegue de producción; cada rama o
   PR genera un *Preview*.

> **Cámara / escáner en producción:** Vercel sirve por **HTTPS**, así que el
> escáner funciona sin configuración extra (la cámara requiere contexto seguro).

---

## Keep-alive de Supabase (GitHub Actions)

El plan gratuito de Supabase **pausa la base de datos tras ~7 días sin
peticiones**. El workflow `.github/workflows/keepalive-supabase.yml` hace una
consulta ligera a la API REST **lunes, miércoles y viernes** para mantener el
proyecto activo (también se puede lanzar a mano desde la pestaña *Actions*).

Requiere configurar dos **secrets** en el repositorio
(*Settings → Secrets and variables → Actions*):

| Secret | Valor |
| --- | --- |
| `SUPABASE_URL` | El mismo valor de `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | El mismo valor de `VITE_SUPABASE_ANON_KEY` |

---

## Estructura del proyecto

```
├── index.html
├── vercel.json                 # rewrite SPA → index.html
├── tailwind.config.js          # design tokens Material 3
├── .github/workflows/          # CI: keep-alive de Supabase
├── src/
│   ├── main.jsx                # Entrada: React + providers globales
│   ├── App.jsx                 # Rutas (público / protegido)
│   ├── config/nav.js           # Items del menú lateral
│   ├── context/                # AuthContext + ToastContext
│   ├── lib/                    # supabaseClient, dominio (assets/modelos), reportes
│   ├── components/             # Layout, escáner, selects, guardas de ruta
│   └── pages/                  # Login, Dashboard, Catálogo, Registro, Cajas,
│                               #   Auditoría, Conciliación, Asignación, Reportes, Configuración
└── supabase/
    ├── migrations/             # Esquema + RLS + vistas (0001 … 0009)
    └── seed.sql                # Datos de prueba (opcional)
```

Para el detalle de arquitectura, modelo de datos, seguridad (RLS) y decisiones de
diseño, ver **[`ARQUITECTURA.md`](./ARQUITECTURA.md)**.

---

## Estado del proyecto

- [x] **Fase 1** — Esquema PostgreSQL + RLS
- [x] **Fase 2** — Autenticación, Catálogo y Registro de activos
- [x] **Fase 3** — Escáner móvil + Conciliación de auditoría
- [x] **Fase 4** — Asignación / salida de equipos
- [x] **Extras** — Dashboard (KPIs), Reportes (Excel + Acta), Configuración

**Fuera de alcance / pendientes:** módulo de roles y seguridad, vista de detalle
de solo lectura por activo, historial de ediciones manuales y flujo de devolución
de equipos asignados.

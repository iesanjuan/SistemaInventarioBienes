# Arquitectura del Sistema

Sistema web de gestión de **inventario y auditoría de activos** (Tablets PC y
Paneles Solares) para la I.E. San Juan. Aplicación de página única (SPA) que
corre íntegramente en el navegador y usa Supabase como backend gestionado.

---

## 1. Visión general

```
┌──────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                              │
│                                                                │
│   React SPA (Vite)  ──────────►  @supabase/supabase-js         │
│   · React Router (rutas)              │                        │
│   · AuthContext / ToastContext        │  HTTPS + JWT           │
│   · Páginas + componentes             │                        │
│   · html5-qrcode (cámara)             │                        │
│   · xlsx (export Excel)               │                        │
└───────────────────────────────────────┼───────────────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │        SUPABASE (cloud)       │
                          │                               │
                          │  · Auth (JWT, email+pass)     │
                          │  · PostgREST (API REST auto)  │
                          │  · PostgreSQL                 │
                          │      - tablas + enums         │
                          │      - vistas (v_activos…)    │
                          │      - triggers               │
                          │      - Row Level Security     │
                          └───────────────────────────────┘
```

- **Sin backend propio.** No hay servidor Node/API intermedia: el cliente habla
  directo con Supabase (PostgREST + Auth) sobre HTTPS, autenticándose con JWT.
  La seguridad de datos vive en la base (RLS), no en la app.
- **Despliegue estático.** El build de Vite (HTML/CSS/JS) se sirve como archivos
  estáticos en Vercel. No hay estado de servidor.
- **Idioma y dominio:** toda la UI en español; el dominio son "activos" (Tablets
  y Paneles) con sus accesorios, cajas/contenedores, auditorías y asignaciones.

---

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|------|------------|-------|
| Build / dev server | **Vite 5** | `pnpm dev` / `pnpm build` / `pnpm preview` |
| UI | **React 18** | Componentes de función + hooks |
| Ruteo | **react-router-dom 6** | `BrowserRouter`, rutas anidadas, `lazy` |
| Estilos | **Tailwind CSS 3** | Tokens Material 3 portados en `tailwind.config.js` |
| Backend | **Supabase** | Postgres + Auth + RLS, vía `@supabase/supabase-js` |
| Escáner | **html5-qrcode** | Lectura de códigos de barras por cámara |
| Export | **xlsx (SheetJS)** | Reportes `.xlsx` (Inventario + Resumen) |
| Gestor de paquetes | **pnpm** | `esbuild` autorizado en `pnpm-workspace.yaml` |
| Hosting | **Vercel** | SPA con rewrite a `/index.html` |

Referencia visual estricta: `UI/UI.html` (design system Material 3); sus tokens
están portados a la configuración de Tailwind.

---

## 3. Estructura del código (`src/`)

```
src/
├── main.jsx                 # Entrada: monta React + providers globales
├── App.jsx                  # Definición de rutas (público / protegido)
├── index.css                # Base Tailwind + estilos globales
│
├── config/
│   └── nav.js               # Items del sidebar (NAV_ITEMS, footer)
│
├── context/
│   ├── AuthContext.jsx      # Sesión Supabase (signIn, signOut, user)
│   └── ToastContext.jsx     # Notificaciones tipo toast
│
├── lib/
│   ├── supabaseClient.js    # Cliente Supabase (lee VITE_SUPABASE_*)
│   ├── assets.js            # Helpers de dominio (tipos, estados, componentes)
│   ├── modelos.js           # Catálogos marca/modelo por tipo de bien
│   └── reportes.js          # Export XLSX + generación de Acta imprimible
│
├── components/
│   ├── ProtectedRoute.jsx   # Guarda de rutas (redirige a /login sin sesión)
│   ├── Icon.jsx             # Iconos (Material Symbols)
│   ├── OptionSelect.jsx     # Desplegable con opción "Otro…"
│   ├── UbicacionSelect.jsx  # Selector de ubicación
│   ├── BarcodeScanner.jsx   # Escáner (chunk compartido, carga diferida)
│   ├── ScannerModal.jsx     # Envoltorio modal del escáner
│   └── layout/
│       ├── AppLayout.jsx    # Shell: Sidebar + Topbar + <Outlet/>
│       ├── Sidebar.jsx      # Navegación lateral / drawer
│       └── Topbar.jsx       # Barra superior
│
└── pages/
    ├── Login.jsx            # PAN-0101 — inicio de sesión
    ├── Dashboard.jsx        # KPIs reales (home = /dashboard)
    ├── Catalogo.jsx         # PAN-0301 — inventario paginado + filtros
    ├── Registro.jsx         # PAN-0303 — alta/edición de activos (/registro/:id)
    ├── Cajas.jsx            # Listado de cajas/contenedores
    ├── CajaDetalle.jsx      # Detalle de una caja (/cajas/:tipo/:numero)
    ├── Auditoria.jsx        # PAN-0401 — escaneo móvil (lazy)
    ├── Conciliacion.jsx     # PAN-0402 — conciliación de accesorios (lazy)
    ├── Asignacion.jsx       # PAN-0501 — salida/asignación de equipos (lazy)
    ├── Reportes.jsx         # Filtros + export XLSX + Acta (lazy)
    └── Configuracion.jsx    # Perfil + cambio de contraseña
```

### Árbol de composición

```
main.jsx
 └─ <BrowserRouter>
     └─ <AuthProvider>          ← sesión global de Supabase
         └─ <ToastProvider>     ← notificaciones globales
             └─ <App/>          ← rutas
```

---

## 4. Ruteo y protección de acceso

Definido en `src/App.jsx`:

- **Ruta pública:** `/login`.
- **Rutas protegidas:** envueltas en `<ProtectedRoute>` → `<AppLayout>`. Sin
  sesión activa, `ProtectedRoute` redirige a `/login` conservando el destino en
  `location.state.from`.
- **Home / fallback:** `/` y `*` redirigen a `/dashboard`.

**Carga diferida (`React.lazy` + `Suspense`):** Auditoría, Conciliación,
Asignación, Reportes y Cajas se cargan bajo demanda. El objetivo principal es
aislar `html5-qrcode` (pesado) para que no penalice la carga inicial de
login/catálogo. `BarcodeScanner` es un chunk compartido entre Auditoría y
Asignación.

**Deploy SPA:** al ser ruteo del lado del cliente, `vercel.json` reescribe
`/(.*) → /index.html` para que las URLs directas no den 404.

---

## 5. Autenticación

- Implementada con **Supabase Auth** (email + contraseña).
- `AuthContext` (`src/context/AuthContext.jsx`):
  - Carga la sesión inicial con `supabase.auth.getSession()`.
  - Se suscribe a `onAuthStateChange` (login / logout / refresh de token).
  - Expone `session`, `user`, `loading`, `signIn(email, pass)`, `signOut()`.
- El cliente (`supabaseClient.js`) persiste sesión y refresca el token
  automáticamente (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`).
- **No hay registro público:** los usuarios se crean manualmente en Supabase
  (Authentication → Users). No existe módulo de roles/administración (la entrada
  "Seguridad" del nav está deshabilitada; queda fuera de alcance).

---

## 6. Modelo de datos (PostgreSQL / Supabase)

Migraciones idempotentes en `supabase/migrations/` (se ejecutan en el SQL Editor
de Supabase, en orden). `supabase/seed.sql` carga datos de ejemplo.

### Tablas

**`activos`** — activo = "conjunto" identificado por su código de barras
(impreso en el equipo y en la caja).
- `id` (uuid, PK), `codigo_barras` (único), `codigo_patrimonial`
- `tipo_bien` (`TABLET` | `PANEL_SOLAR`), `marca`, `modelo`
- `estado_fisico` (`POR_EVALUAR`* | `BUENO` | `REGULAR` | `MALO` | `INOPERATIVO`)
- `verificado` (bool), `ubicacion_actual`, `observaciones`
- `numero_caja` — contenedor grande que agrupa varios activos (opcional)
- `tiene_caja` / `tiene_equipo` — componentes presentes del conjunto
- `created_at`, `updated_at` (trigger `set_updated_at`)

**`accesorios_activos`** (1:1 con `activos`, `on delete cascade`)
- Tablet: `cargador`, `funda`, `pin_sim`
- Panel: `cable_suministro` (`tiene_panel` quedó obsoleto, ya lo cubre "Equipo")

**`historial_auditoria`** — inmutable, una fila por evento de auditoría.
- `activo_id`, `usuario_id` (→ `auth.users`), `fecha_hora`, `detalles_cambio`
  (jsonb), `observacion`

**`asignaciones`** — salida/entrega de equipos.
- `activo_id`, `responsable_dni`, `responsable_nombre`, `area_aula`,
  `fecha_salida`, `fecha_devolucion`, `estado_entrega`

### Vistas (paginación/agregados en el servidor)

- **`v_activos`** — activos + accesorios embebidos (jsonb) + flag `completo`.
  Permite paginar, contar y filtrar (incl. incompletos) del lado del servidor.
- **`cajas_resumen`** — total de activos e incompletos por `numero_caja`.

Ambas se declaran con `security_invoker = on`, de modo que **RLS sigue
aplicando** al consultar la vista.

> \* `POR_EVALUAR` es el estado por defecto cuando el estado físico no es
> obligatorio (p. ej. conjuntos sin equipo).

### Evolución del esquema (migraciones)

| Migración | Cambio |
|-----------|--------|
| `0001` | Esquema base (enums, tablas, triggers, índices) |
| `0002` | Row Level Security + políticas |
| `0003` | `asignaciones.observaciones`, default `estado_entrega` |
| `0004` | `solo_caja` (obsoleto, reemplazado en 0007) |
| `0005` | Estado `POR_EVALUAR` |
| `0006` | `activos.numero_caja` |
| `0007` | Componentes: `tiene_caja` / `tiene_equipo` |
| `0008` | Vistas `v_activos` y `cajas_resumen` |
| `0009` | Recalcular `completo` del panel / cajas por tipo |

---

## 7. Seguridad (Row Level Security)

Toda la protección de datos vive en la base (`0002_rls.sql`), porque el cliente
consulta Supabase directamente con la `anon key`:

- RLS **habilitado** en las cuatro tablas.
- **Regla general:** lectura y escritura (`select/insert/update/delete`) solo
  para el rol `authenticated` (usuario con sesión válida).
- **`historial_auditoria`** es más estricto: el `insert` exige
  `usuario_id = auth.uid()` (cada quien solo se registra a sí mismo como autor)
  y no admite `update`/`delete` → historial inmutable.
- Las **vistas** heredan RLS por `security_invoker = on`.

Consecuencia de diseño: no hay separación de permisos por rol de usuario; todo
usuario autenticado tiene el mismo acceso. Los roles/admin quedan fuera de
alcance.

---

## 8. Flujos funcionales principales

- **Registro / edición** (`Registro.jsx`, ruta `/registro/:id`): un mismo
  formulario crea y edita. Guarda el activo (`insert`/`update`) y hace `upsert`
  de accesorios. Marca/modelo vía `OptionSelect` ("Otro…"), ubicación vía
  `UbicacionSelect`, componentes presentes (caja/equipo) y `numero_caja`
  independiente.
- **Catálogo** (`Catalogo.jsx`): inventario paginado y filtrable apoyado en la
  vista `v_activos`; export XLSX de lo filtrado.
- **Cajas** (`Cajas.jsx` / `CajaDetalle.jsx`): agrupa por `numero_caja` usando
  `cajas_resumen`; los `numero_caja` nulos caen en el grupo "Sin caja".
  Numeración separada por tipo (Tablet ≠ Panel) en la ruta `/cajas/:tipo/:numero`.
- **Auditoría móvil** (`Auditoria.jsx` + `BarcodeScanner`): escanea el código de
  barras y abre el activo. La cámara requiere **contexto seguro**
  (localhost/HTTPS); por IP LAN sobre http, usar búsqueda manual.
- **Conciliación** (`Conciliacion.jsx`): `upsert` de accesorios + `update` de
  `verificado` + `insert` en `historial_auditoria`.
- **Asignación** (`Asignacion.jsx`): `insert` en `asignaciones` + `update` de
  `ubicacion_actual`.
- **Reportes** (`Reportes.jsx` + `lib/reportes.js`): export **XLSX** (hoja
  Inventario + hoja Resumen con totales por tipo/estado/caja/integridad) y
  generación de **Acta** imprimible (HTML + `window.print`, sin dependencias de
  PDF en el servidor).
- **Configuración** (`Configuracion.jsx`): perfil y cambio de contraseña vía
  `supabase.auth.updateUser`.

---

## 9. Lógica de dominio compartida (`src/lib/assets.js`)

Centraliza las reglas del dominio para que UI, reportes y catálogo sean
consistentes:

- **Etiquetas / iconos:** `TIPO_LABEL`, `TIPO_ICON`, `ESTADO_LABEL`,
  `ACC_LABEL`, y clases de badge (`estadoBadgeClasses`).
- **Componentes del conjunto:** `tieneCaja`, `tieneEquipo`,
  `componenteFaltante` (por defecto, sin dato, se asume presente).
- **Accesorios esperados por tipo:** `expectedAccessories` (Tablet →
  cargador/funda/pin_sim; Panel → cable_suministro), `isComplete`,
  `missingAccessories`, `accessoryRow` (normaliza la relación 1:1 que Supabase
  puede devolver como objeto o array).
- **Slugs de ruta:** `TIPO_SLUG` / `SLUG_TIPO` para separar la numeración de
  cajas de tablets y paneles en las URLs.

---

## 10. Configuración y despliegue

- **Variables de entorno** (Vite, prefijo `VITE_`): `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`. En local van en `.env` (plantilla `.env.example`);
  en producción se configuran en el panel de Vercel. `supabaseClient.js` falla
  temprano y con mensaje claro si faltan.
- **Build:** `pnpm build` (Vite) → estáticos servidos por Vercel.
- **Ruteo SPA:** `vercel.json` reescribe todo a `/index.html`.
- **Estilos:** Tailwind + PostCSS (`tailwind.config.js`, `postcss.config.js`)
  con tokens Material 3 tomados de `UI/UI.html`.

---

## 11. Decisiones de arquitectura y sus implicaciones

| Decisión | Implicación |
|----------|-------------|
| Sin backend propio (cliente → Supabase directo) | Menos infraestructura; la seguridad **depende** de RLS en la base |
| Seguridad en RLS, no en la app | Cambios de permisos = migraciones SQL, no código |
| Vistas para paginar/agregar | El servidor hace el trabajo pesado; el cliente pagina barato |
| Carga diferida del escáner | Carga inicial ligera; el chunk de `html5-qrcode` solo se baja al usarlo |
| Acta vía `window.print` | Sin dependencia de PDF; el navegador genera el documento |
| SPA estática en Vercel | Requiere rewrite a `index.html` para el ruteo del cliente |
| Sin roles/registro público | Usuarios creados a mano en Supabase; todo autenticado tiene igual acceso |

---

## 12. Fuera de alcance / pendientes conocidos

- Módulo de **Seguridad / roles** (nav deshabilitado).
- Vista de **detalle de activo** de solo lectura.
- **Historial de ediciones manuales** (hoy solo se historian las auditorías).
- Historial de auditoría **visible por activo**.
- **Devolución** de equipos asignados (`fecha_devolucion` existe en el esquema
  pero no hay flujo que la use).

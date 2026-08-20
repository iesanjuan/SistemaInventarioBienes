-- =====================================================================
-- FASE 1 · TAREA 1.1 — Esquema PostgreSQL (Supabase)
-- Sistema de Gestión de Inventario y Auditoría (Tablets y Paneles Solares)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Idempotente: se puede re-ejecutar sin error.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ENUM TYPES
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_bien_enum') then
    create type tipo_bien_enum as enum ('TABLET', 'PANEL_SOLAR');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_fisico_enum') then
    create type estado_fisico_enum as enum ('BUENO', 'REGULAR', 'MALO', 'INOPERATIVO');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) FUNCIÓN GENÉRICA: actualizar updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) TABLA: activos
-- ---------------------------------------------------------------------
create table if not exists public.activos (
  id                uuid primary key default gen_random_uuid(),
  codigo_barras     text not null unique,
  codigo_patrimonial text,
  tipo_bien         tipo_bien_enum not null,
  marca             text,
  modelo            text,
  estado_fisico     estado_fisico_enum not null default 'BUENO',
  verificado        boolean not null default false,
  ubicacion_actual  text not null,
  observaciones     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_activos_tipo_bien       on public.activos (tipo_bien);
create index if not exists idx_activos_verificado      on public.activos (verificado);
create index if not exists idx_activos_codigo_patrim   on public.activos (codigo_patrimonial);

drop trigger if exists trg_activos_updated_at on public.activos;
create trigger trg_activos_updated_at
  before update on public.activos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) TABLA: accesorios_activos  (1:1 con activos)
-- ---------------------------------------------------------------------
create table if not exists public.accesorios_activos (
  id               uuid primary key default gen_random_uuid(),
  activo_id        uuid not null unique references public.activos(id) on delete cascade,
  cargador         boolean not null default false,
  funda            boolean not null default false,
  pin_sim          boolean not null default false,
  cable_suministro boolean not null default false,
  tiene_panel      boolean not null default false
);

create index if not exists idx_accesorios_activo_id on public.accesorios_activos (activo_id);

-- ---------------------------------------------------------------------
-- 5) TABLA: historial_auditoria
-- ---------------------------------------------------------------------
create table if not exists public.historial_auditoria (
  id               uuid primary key default gen_random_uuid(),
  activo_id        uuid references public.activos(id) on delete cascade,
  usuario_id       uuid references auth.users(id),
  fecha_hora       timestamptz not null default now(),
  detalles_cambio  jsonb,
  observacion      text not null
);

create index if not exists idx_historial_activo_id  on public.historial_auditoria (activo_id);
create index if not exists idx_historial_usuario_id on public.historial_auditoria (usuario_id);
create index if not exists idx_historial_fecha      on public.historial_auditoria (fecha_hora desc);

-- ---------------------------------------------------------------------
-- 6) TABLA: asignaciones
-- ---------------------------------------------------------------------
create table if not exists public.asignaciones (
  id                uuid primary key default gen_random_uuid(),
  activo_id         uuid references public.activos(id) on delete cascade,
  responsable_dni   text,
  responsable_nombre text,
  area_aula         text,
  fecha_salida      timestamptz not null default now(),
  fecha_devolucion  timestamptz,
  estado_entrega    text
);

create index if not exists idx_asignaciones_activo_id on public.asignaciones (activo_id);
create index if not exists idx_asignaciones_dni       on public.asignaciones (responsable_dni);

-- =====================================================================
-- FIN TAREA 1.1
-- =====================================================================

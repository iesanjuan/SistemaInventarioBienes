-- =====================================================================
-- Ajuste de esquema: marcar activos de los que solo se tiene la caja/empaque
-- (sin el equipo físico). En ese caso el estado físico no aplica.
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
-- =====================================================================

alter table public.activos
  add column if not exists solo_caja boolean not null default false;

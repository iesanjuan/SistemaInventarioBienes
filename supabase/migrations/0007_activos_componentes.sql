-- =====================================================================
-- 0007 — Componentes presentes del conjunto (caja / equipo)
-- =====================================================================
-- El código de barras identifica al CONJUNTO (está impreso en la tablet
-- y también en su caja). Un conjunto tiene 3 partes que pueden estar o no:
--   1) la caja        -> tiene_caja
--   2) el equipo       -> tiene_equipo   (la tablet / el panel)
--   3) los accesorios  -> tabla accesorios_activos (ya existente)
--
-- Esto sustituye al antiguo booleano "solo_caja" (0004), que era binario
-- y no cubría casos como: caja + accesorios SIN tablet, o tablet suelta
-- SIN caja ni accesorios.
-- Idempotente: se puede re-ejecutar sin error.
-- =====================================================================

alter table public.activos add column if not exists tiene_caja   boolean not null default true;
alter table public.activos add column if not exists tiene_equipo boolean not null default true;

-- Backfill: los registros marcados como "solo caja" no tienen equipo físico.
-- (La caja sí existe, por eso tiene_caja se queda en true.)
update public.activos set tiene_equipo = false where solo_caja = true;

-- Nota: se conserva la columna solo_caja por compatibilidad histórica,
-- pero la aplicación ya no la usa (queda derivada de tiene_caja/tiene_equipo).

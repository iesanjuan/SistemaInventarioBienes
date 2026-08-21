-- =====================================================================
-- Relación de cada activo con su CAJA física (número de caja).
-- La "cantidad por caja" se obtiene contando los activos de cada número.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================================

alter table public.activos
  add column if not exists numero_caja integer;

create index if not exists idx_activos_numero_caja
  on public.activos (numero_caja);

-- Asignación inicial de lo ya registrado (una sola vez):
--   * Todas las tablets actuales pertenecen a la caja 63.
--   * Todos los paneles solares actuales pertenecen a la caja 4.
update public.activos
  set numero_caja = 63
  where tipo_bien = 'TABLET' and numero_caja is null;

update public.activos
  set numero_caja = 4
  where tipo_bien = 'PANEL_SOLAR' and numero_caja is null;

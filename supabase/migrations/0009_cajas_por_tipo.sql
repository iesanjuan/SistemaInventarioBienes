-- ====================================================================
-- 0009 - Cajas separadas por tipo de bien (Tablet / Panel Solar)
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 0008)
-- Idempotente: create or replace.
-- --------------------------------------------------------------------
-- Antes, la caja se identificaba solo por numero_caja, de modo que la
-- "Caja 1" de tablets y la "Caja 1" de paneles se mezclaban en una sola.
-- Ahora la identidad de la caja es (tipo_bien, numero_caja): cada tipo
-- lleva su propia numeracion (CAJA 1 TABLET, CAJA 1 PANEL, ...).
-- ====================================================================

create or replace view public.cajas_resumen
with (security_invoker = on)
as
select
  tipo_bien,
  numero_caja,
  count(*)::int as total_activos,
  count(*) filter (where not completo)::int as incompletos
from public.v_activos
group by tipo_bien, numero_caja
order by tipo_bien, numero_caja nulls last;

grant select on public.cajas_resumen to authenticated, anon;

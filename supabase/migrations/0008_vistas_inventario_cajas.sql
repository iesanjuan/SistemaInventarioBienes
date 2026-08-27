-- ====================================================================
-- 0008 - Vistas para paginacion de inventario y resumen por caja
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 0007)
-- Idempotente: se puede re-ejecutar sin error (create or replace).
-- ====================================================================

-- 1) v_activos: activos + accesorios embebidos (jsonb) + flag "completo".
--    Permite paginar, contar y filtrar (incl. incompletos) en el servidor.
create or replace view public.v_activos
with (security_invoker = on)
as
select
  a.*,
  case
    when acc.activo_id is null then null
    else to_jsonb(acc)
  end as accesorios_activos,
  case
    when acc.activo_id is null then false
    when a.tipo_bien = 'TABLET'
      then acc.cargador and acc.funda and acc.pin_sim
    else acc.tiene_panel and acc.cable_suministro
  end as completo
from public.activos a
left join public.accesorios_activos acc on acc.activo_id = a.id;

-- 2) cajas_resumen: total de activos e incompletos por numero de caja.
create or replace view public.cajas_resumen
with (security_invoker = on)
as
select
  numero_caja,
  count(*)::int as total_activos,
  count(*) filter (where not completo)::int as incompletos
from public.v_activos
group by numero_caja
order by numero_caja nulls last;

-- 3) Permisos: PostgREST consulta como rol authenticated (RLS sigue aplicando).
grant select on public.v_activos     to authenticated, anon;
grant select on public.cajas_resumen to authenticated, anon;

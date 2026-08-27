-- ====================================================================
-- 0009 - Ajuste de "completo" para paneles en la vista v_activos
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 0008)
-- Idempotente: create or replace.
-- ====================================================================
-- La existencia del panel ya se registra como componente (tiene_equipo),
-- por lo que el accesorio "tiene_panel" era redundante. Ahora el unico
-- accesorio del panel es "cable_suministro", y de el depende que este
-- completo. Se conserva la columna tiene_panel por compatibilidad, pero
-- deja de usarse.

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
    else acc.cable_suministro
  end as completo
from public.activos a
left join public.accesorios_activos acc on acc.activo_id = a.id;

grant select on public.v_activos to authenticated, anon;

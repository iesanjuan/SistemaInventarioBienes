-- =====================================================================
-- SEED opcional — datos de prueba para desarrollo
-- Ejecutar en Supabase SQL Editor (opcional, tras 0001 y 0002).
-- =====================================================================

with nuevo as (
  insert into public.activos (codigo_barras, codigo_patrimonial, tipo_bien, marca, modelo, estado_fisico, ubicacion_actual)
  values
    ('TAB-0001', 'PAT-1001', 'TABLET', 'Samsung', 'Galaxy Tab A8', 'BUENO', 'Aula 101'),
    ('TAB-0002', 'PAT-1002', 'TABLET', 'Lenovo',  'Tab M10',       'REGULAR', 'Almacén Central'),
    ('SOL-0001', 'PAT-2001', 'PANEL_SOLAR', 'Jinko', 'JKM400', 'BUENO', 'Techo A')
  returning id, tipo_bien
)
insert into public.accesorios_activos (activo_id, cargador, funda, pin_sim, cable_suministro, tiene_panel)
select
  id,
  tipo_bien = 'TABLET',       -- cargador
  tipo_bien = 'TABLET',       -- funda
  false,                      -- pin_sim
  tipo_bien = 'PANEL_SOLAR',  -- cable_suministro
  tipo_bien = 'PANEL_SOLAR'   -- tiene_panel
from nuevo;

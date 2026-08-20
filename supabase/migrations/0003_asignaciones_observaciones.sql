-- =====================================================================
-- FASE 4 · Ajuste de esquema para Asignaciones (PAN-0501)
-- Añade la columna de observaciones que exige el formulario de salida.
-- Ejecutar en: Supabase Dashboard > SQL Editor (tras 0001/0002).
-- Idempotente.
-- =====================================================================

alter table public.asignaciones
  add column if not exists observaciones text;

-- Valor por defecto sugerido para el estado de entrega.
alter table public.asignaciones
  alter column estado_entrega set default 'ENTREGADO';

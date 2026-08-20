-- =====================================================================
-- FASE 1 · TAREA 1.2 — Políticas de Seguridad (Row Level Security)
-- Acceso permitido únicamente a usuarios autenticados.
-- Ejecutar en: Supabase Dashboard > SQL Editor (después de 0001_schema.sql)
-- Idempotente: se puede re-ejecutar sin error.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Habilitar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.activos             enable row level security;
alter table public.accesorios_activos  enable row level security;
alter table public.historial_auditoria enable row level security;
alter table public.asignaciones        enable row level security;

-- ---------------------------------------------------------------------
-- 2) activos — lectura/escritura solo autenticados
-- ---------------------------------------------------------------------
drop policy if exists "activos_select_auth" on public.activos;
create policy "activos_select_auth" on public.activos
  for select to authenticated using (true);

drop policy if exists "activos_insert_auth" on public.activos;
create policy "activos_insert_auth" on public.activos
  for insert to authenticated with check (true);

drop policy if exists "activos_update_auth" on public.activos;
create policy "activos_update_auth" on public.activos
  for update to authenticated using (true) with check (true);

drop policy if exists "activos_delete_auth" on public.activos;
create policy "activos_delete_auth" on public.activos
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 3) accesorios_activos
-- ---------------------------------------------------------------------
drop policy if exists "accesorios_select_auth" on public.accesorios_activos;
create policy "accesorios_select_auth" on public.accesorios_activos
  for select to authenticated using (true);

drop policy if exists "accesorios_insert_auth" on public.accesorios_activos;
create policy "accesorios_insert_auth" on public.accesorios_activos
  for insert to authenticated with check (true);

drop policy if exists "accesorios_update_auth" on public.accesorios_activos;
create policy "accesorios_update_auth" on public.accesorios_activos
  for update to authenticated using (true) with check (true);

drop policy if exists "accesorios_delete_auth" on public.accesorios_activos;
create policy "accesorios_delete_auth" on public.accesorios_activos
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 4) historial_auditoria
--    Inserción: el usuario solo puede registrarse a sí mismo como autor.
--    El historial es inmutable (sin update/delete por parte de usuarios).
-- ---------------------------------------------------------------------
drop policy if exists "historial_select_auth" on public.historial_auditoria;
create policy "historial_select_auth" on public.historial_auditoria
  for select to authenticated using (true);

drop policy if exists "historial_insert_own" on public.historial_auditoria;
create policy "historial_insert_own" on public.historial_auditoria
  for insert to authenticated with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5) asignaciones — lectura/escritura solo autenticados
-- ---------------------------------------------------------------------
drop policy if exists "asignaciones_select_auth" on public.asignaciones;
create policy "asignaciones_select_auth" on public.asignaciones
  for select to authenticated using (true);

drop policy if exists "asignaciones_insert_auth" on public.asignaciones;
create policy "asignaciones_insert_auth" on public.asignaciones
  for insert to authenticated with check (true);

drop policy if exists "asignaciones_update_auth" on public.asignaciones;
create policy "asignaciones_update_auth" on public.asignaciones
  for update to authenticated using (true) with check (true);

drop policy if exists "asignaciones_delete_auth" on public.asignaciones;
create policy "asignaciones_delete_auth" on public.asignaciones
  for delete to authenticated using (true);

-- =====================================================================
-- FIN TAREA 1.2
-- =====================================================================

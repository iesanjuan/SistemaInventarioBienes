-- =====================================================================
-- Estado físico "POR_EVALUAR" para registros de sola existencia.
-- En el primer registro solo se declara que el bien existe; la
-- evaluación de su estado físico queda pendiente.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================================

alter type estado_fisico_enum add value if not exists 'POR_EVALUAR';

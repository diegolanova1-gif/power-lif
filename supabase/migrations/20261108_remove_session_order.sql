-- 2026-11-08: eliminar trigger de orden secuencial de sesiones.
-- El alumno ahora puede registrar cualquier día en cualquier orden.
-- Completitud parcial (3 de 4 sets) es válida — no bloquea días futuros.
-- Idempotente.

DROP FUNCTION IF EXISTS public.enforce_session_order() CASCADE;

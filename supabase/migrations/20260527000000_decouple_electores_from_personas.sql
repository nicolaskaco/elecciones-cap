BEGIN;

-- ============================================================
-- 1. Add contact columns directly to electores
-- ============================================================
ALTER TABLE electores
  ADD COLUMN nombre           text,
  ADD COLUMN cedula           text,
  ADD COLUMN nro_socio        text,
  ADD COLUMN fecha_nacimiento date,
  ADD COLUMN telefono         text,
  ADD COLUMN celular          text,
  ADD COLUMN email            text,
  ADD COLUMN direccion        text;

-- ============================================================
-- 2. Migrate contact data from personas into electores
-- ============================================================
UPDATE electores e
SET
  nombre           = p.nombre,
  cedula           = p.cedula,
  nro_socio        = p.nro_socio,
  fecha_nacimiento = p.fecha_nacimiento::date,
  telefono         = p.telefono,
  celular          = p.celular,
  email            = p.email,
  direccion        = p.direccion
FROM personas p
WHERE e.persona_id = p.id;

-- ============================================================
-- 3. Enforce NOT NULL on nombre
-- ============================================================
ALTER TABLE electores ALTER COLUMN nombre SET NOT NULL;

-- ============================================================
-- 4. Drop the FK constraint and persona_id column
-- ============================================================
ALTER TABLE electores DROP CONSTRAINT electores_persona_id_fkey;
ALTER TABLE electores DROP COLUMN persona_id;

-- ============================================================
-- 5. Unique index on nro_socio for import upserts
-- ============================================================
CREATE UNIQUE INDEX electores_nro_socio_unique
  ON electores (nro_socio)
  WHERE nro_socio IS NOT NULL;

COMMIT;

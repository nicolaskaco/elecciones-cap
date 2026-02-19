BEGIN;

-- Rename enum value (PostgreSQL 10+)
ALTER TYPE elector_estado RENAME VALUE 'Acepto' TO 'Confirmado';

-- Update any existing data (redundant after rename but safe)
UPDATE electores SET estado = 'Confirmado' WHERE estado = 'Confirmado';

COMMIT;

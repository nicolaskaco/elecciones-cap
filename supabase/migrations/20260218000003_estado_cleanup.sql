-- Add new estado values (ADD VALUE cannot run inside a transaction)
ALTER TYPE elector_estado ADD VALUE IF NOT EXISTS 'Lista_Enviada' AFTER 'Para_Enviar';
ALTER TYPE elector_estado ADD VALUE IF NOT EXISTS 'Numero_Incorrecto' AFTER 'Lista_Enviada';

BEGIN;

-- Migrate existing Sobre_Enviado data to Lista_Enviada
UPDATE electores SET estado = 'Lista_Enviada' WHERE estado = 'Sobre_Enviado';

COMMIT;

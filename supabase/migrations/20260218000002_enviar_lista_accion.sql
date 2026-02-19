-- ADD VALUE must run outside a transaction block
ALTER TYPE elector_estado ADD VALUE IF NOT EXISTS 'Para_Enviar' AFTER 'Acepto';

BEGIN;

-- Add enviar_lista flag to electores
ALTER TABLE electores
  ADD COLUMN IF NOT EXISTS enviar_lista boolean NOT NULL DEFAULT false;

-- Add optional accion marker to preguntas_flow
-- Known value: 'enviar_lista' — when a boolean question with this accion is answered 'Si',
-- the flow shows an address confirmation dialog and sets electores.enviar_lista = true.
ALTER TABLE preguntas_flow
  ADD COLUMN IF NOT EXISTS accion text;

COMMIT;

BEGIN;

-- Allow a boolean question to pre-fill the call resultado
-- resultado_si: pre-selected resultado when answered 'Si'
-- resultado_no: pre-selected resultado when answered 'No'
ALTER TABLE preguntas_flow
  ADD COLUMN IF NOT EXISTS resultado_si text,
  ADD COLUMN IF NOT EXISTS resultado_no text;

COMMIT;

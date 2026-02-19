BEGIN;

-- Cast eventos.fecha from timestamptz to date
ALTER TABLE eventos
  ALTER COLUMN fecha TYPE date USING fecha::date;

COMMIT;

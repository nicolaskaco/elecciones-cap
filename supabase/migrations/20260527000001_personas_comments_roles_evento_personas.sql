BEGIN;

-- Add comentario and quien_lo_trajo to personas
ALTER TABLE personas
  ADD COLUMN comentario text,
  ADD COLUMN quien_lo_trajo text;

-- Add Colaborador to rol_lista_tipo enum
ALTER TYPE rol_lista_tipo ADD VALUE IF NOT EXISTS 'Colaborador';

-- Create evento_personas junction table
CREATE TABLE evento_personas (
  id          bigserial PRIMARY KEY,
  evento_id   bigint NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  persona_id  bigint NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, persona_id)
);

ALTER TABLE evento_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage evento_personas"
  ON evento_personas FOR ALL
  USING (get_user_rol() = 'Admin');

CREATE POLICY "Voluntarios view evento_personas"
  ON evento_personas FOR SELECT
  USING (get_user_rol() = 'Voluntario');

COMMIT;

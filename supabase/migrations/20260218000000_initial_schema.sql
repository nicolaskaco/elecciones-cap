-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_rol AS ENUM ('Admin', 'Voluntario');
CREATE TYPE elector_estado AS ENUM ('Sin_contactar', 'No_contesta', 'Rechazado', 'Dudoso', 'Aceptado');
CREATE TYPE rol_lista_tipo AS ENUM (
  'Candidato_Principal', 'Candidato_Suplente',
  'Delegado_Principal', 'Delegado_Suplente'
);
CREATE TYPE comision_tipo AS ENUM (
  'Deportiva', 'Cultural', 'Social', 'Finanzas', 'Infraestructura', 'Otra'
);
CREATE TYPE pregunta_tipo AS ENUM ('libre', 'opcion_multiple', 'si_no', 'escala');
CREATE TYPE llamada_resultado AS ENUM (
  'no_contesta', 'rechazado', 'dudoso', 'aceptado', 'callback'
);
CREATE TYPE campana_estado AS ENUM ('borrador', 'programada', 'enviada', 'cancelada');
CREATE TYPE gasto_rubro AS ENUM (
  'Impresion', 'Transporte', 'Alimentacion', 'Publicidad', 'Tecnologia', 'Otro'
);

-- ============================================================
-- TABLES
-- ============================================================

-- perfiles: mirrors auth.users, one-to-one
CREATE TABLE perfiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  email       text NOT NULL,
  rol         user_rol NOT NULL DEFAULT 'Voluntario',
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTION (SECURITY DEFINER) — must be after perfiles table
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS user_rol
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- personas: deduplicated contact registry
CREATE TABLE personas (
  id              bigserial PRIMARY KEY,
  ci              text UNIQUE,
  nombre          text NOT NULL,
  apellido        text NOT NULL,
  fecha_nacimiento date,
  telefono        text,
  email           text,
  direccion       text,
  barrio          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- electores: campaign-specific data per persona
CREATE TABLE electores (
  id              bigserial PRIMARY KEY,
  persona_id      bigint NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  estado          elector_estado NOT NULL DEFAULT 'Sin_contactar',
  notas           text,
  asignado_a      uuid REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- roles_lista: candidates and delegates
CREATE TABLE roles_lista (
  id          bigserial PRIMARY KEY,
  persona_id  bigint NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo        rol_lista_tipo NOT NULL,
  orden       int,
  bio         text,
  foto_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- comisiones_interes: interest areas for voters
CREATE TABLE comisiones_interes (
  id          bigserial PRIMARY KEY,
  elector_id  bigint NOT NULL REFERENCES electores(id) ON DELETE CASCADE,
  comision    comision_tipo NOT NULL,
  UNIQUE (elector_id, comision)
);

-- preguntas_flow: configurable call-flow questions
CREATE TABLE preguntas_flow (
  id          bigserial PRIMARY KEY,
  orden       int NOT NULL,
  texto       text NOT NULL,
  tipo        pregunta_tipo NOT NULL DEFAULT 'libre',
  opciones    jsonb,              -- for opcion_multiple
  activa      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- reglas_flow: conditional branching rules
CREATE TABLE reglas_flow (
  id              bigserial PRIMARY KEY,
  pregunta_id     bigint NOT NULL REFERENCES preguntas_flow(id) ON DELETE CASCADE,
  condicion_valor text NOT NULL,
  accion          text NOT NULL,   -- e.g. 'skip_to:5', 'end', 'set_estado:Aceptado'
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- llamadas: call log
CREATE TABLE llamadas (
  id              bigserial PRIMARY KEY,
  elector_id      bigint NOT NULL REFERENCES electores(id) ON DELETE CASCADE,
  voluntario_id   uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  resultado       llamada_resultado NOT NULL,
  duracion_seg    int,
  notas           text,
  callback_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- respuestas_flow: answers captured during a call
CREATE TABLE respuestas_flow (
  id              bigserial PRIMARY KEY,
  llamada_id      bigint NOT NULL REFERENCES llamadas(id) ON DELETE CASCADE,
  pregunta_id     bigint NOT NULL REFERENCES preguntas_flow(id) ON DELETE RESTRICT,
  valor           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- campanas_email: email campaigns via Resend
CREATE TABLE campanas_email (
  id              bigserial PRIMARY KEY,
  asunto          text NOT NULL,
  html_body       text NOT NULL,
  estado          campana_estado NOT NULL DEFAULT 'borrador',
  programada_at   timestamptz,
  enviada_at      timestamptz,
  creada_por      uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- gastos: campaign expenses
CREATE TABLE gastos (
  id              bigserial PRIMARY KEY,
  rubro           gasto_rubro NOT NULL,
  descripcion     text NOT NULL,
  monto           numeric(10,2) NOT NULL CHECK (monto >= 0),
  fecha           date NOT NULL DEFAULT current_date,
  comprobante_url text,
  registrado_por  uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- eventos: campaign calendar
CREATE TABLE eventos (
  id              bigserial PRIMARY KEY,
  titulo          text NOT NULL,
  descripcion     text,
  inicio          timestamptz NOT NULL,
  fin             timestamptz,
  lugar           text,
  creado_por      uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create perfil on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::user_rol, 'Voluntario')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER electores_updated_at
  BEFORE UPDATE ON electores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER perfiles_updated_at
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE perfiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE electores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_lista      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_interes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_flow   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_flow      ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_flow  ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas_email   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos          ENABLE ROW LEVEL SECURITY;

-- perfiles: users can read their own; Admin reads all; Admin updates any
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT
  USING (id = auth.uid() OR get_user_rol() = 'Admin');

CREATE POLICY "perfiles_update_admin"
  ON perfiles FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "perfiles_insert_service"
  ON perfiles FOR INSERT
  WITH CHECK (true); -- handled by trigger (SECURITY DEFINER)

-- personas: all authenticated users can read; Admin can write
CREATE POLICY "personas_select_auth"
  ON personas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "personas_write_admin"
  ON personas FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "personas_update_admin"
  ON personas FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "personas_delete_admin"
  ON personas FOR DELETE
  USING (get_user_rol() = 'Admin');

-- electores: Voluntario sees only assigned; Admin sees all
CREATE POLICY "electores_select"
  ON electores FOR SELECT
  USING (
    get_user_rol() = 'Admin'
    OR asignado_a = auth.uid()
  );

CREATE POLICY "electores_insert_admin"
  ON electores FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "electores_update"
  ON electores FOR UPDATE
  USING (
    get_user_rol() = 'Admin'
    OR asignado_a = auth.uid()
  );

CREATE POLICY "electores_delete_admin"
  ON electores FOR DELETE
  USING (get_user_rol() = 'Admin');

-- roles_lista: all authenticated can read; Admin writes
CREATE POLICY "roles_lista_select"
  ON roles_lista FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "roles_lista_write_admin"
  ON roles_lista FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "roles_lista_update_admin"
  ON roles_lista FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "roles_lista_delete_admin"
  ON roles_lista FOR DELETE
  USING (get_user_rol() = 'Admin');

-- comisiones_interes: follows elector access
CREATE POLICY "comisiones_select"
  ON comisiones_interes FOR SELECT
  USING (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM electores e
      WHERE e.id = elector_id
        AND (e.asignado_a = auth.uid() OR get_user_rol() = 'Admin')
    )
  );

CREATE POLICY "comisiones_write"
  ON comisiones_interes FOR INSERT
  WITH CHECK (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM electores e
      WHERE e.id = elector_id AND e.asignado_a = auth.uid()
    )
  );

CREATE POLICY "comisiones_delete"
  ON comisiones_interes FOR DELETE
  USING (get_user_rol() = 'Admin');

-- preguntas_flow & reglas_flow: all authenticated can read; Admin writes
CREATE POLICY "preguntas_select"
  ON preguntas_flow FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "preguntas_write_admin"
  ON preguntas_flow FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "preguntas_update_admin"
  ON preguntas_flow FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "preguntas_delete_admin"
  ON preguntas_flow FOR DELETE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "reglas_select"
  ON reglas_flow FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "reglas_write_admin"
  ON reglas_flow FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "reglas_update_admin"
  ON reglas_flow FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "reglas_delete_admin"
  ON reglas_flow FOR DELETE
  USING (get_user_rol() = 'Admin');

-- llamadas: Voluntario sees own; Admin sees all
CREATE POLICY "llamadas_select"
  ON llamadas FOR SELECT
  USING (
    get_user_rol() = 'Admin'
    OR voluntario_id = auth.uid()
  );

CREATE POLICY "llamadas_insert"
  ON llamadas FOR INSERT
  WITH CHECK (
    voluntario_id = auth.uid()
    OR get_user_rol() = 'Admin'
  );

CREATE POLICY "llamadas_update_admin"
  ON llamadas FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "llamadas_delete_admin"
  ON llamadas FOR DELETE
  USING (get_user_rol() = 'Admin');

-- respuestas_flow: follows llamada access
CREATE POLICY "respuestas_select"
  ON respuestas_flow FOR SELECT
  USING (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM llamadas l
      WHERE l.id = llamada_id AND l.voluntario_id = auth.uid()
    )
  );

CREATE POLICY "respuestas_insert"
  ON respuestas_flow FOR INSERT
  WITH CHECK (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM llamadas l
      WHERE l.id = llamada_id AND l.voluntario_id = auth.uid()
    )
  );

-- campanas_email: Admin only
CREATE POLICY "campanas_admin"
  ON campanas_email FOR ALL
  USING (get_user_rol() = 'Admin')
  WITH CHECK (get_user_rol() = 'Admin');

-- gastos: Admin only
CREATE POLICY "gastos_admin"
  ON gastos FOR ALL
  USING (get_user_rol() = 'Admin')
  WITH CHECK (get_user_rol() = 'Admin');

-- eventos: all authenticated can read; Admin writes
CREATE POLICY "eventos_select"
  ON eventos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "eventos_write_admin"
  ON eventos FOR INSERT
  WITH CHECK (get_user_rol() = 'Admin');

CREATE POLICY "eventos_update_admin"
  ON eventos FOR UPDATE
  USING (get_user_rol() = 'Admin');

CREATE POLICY "eventos_delete_admin"
  ON eventos FOR DELETE
  USING (get_user_rol() = 'Admin');

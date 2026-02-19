-- ============================================================
-- Corrective migration: align Phase 1 schema to SPEC
-- ============================================================
BEGIN;

-- ============================================================
-- A.1 — ENUM REPLACEMENTS
-- ============================================================

-- 1) elector_estado
CREATE TYPE elector_estado_new AS ENUM ('Pendiente', 'Llamado', 'Acepto', 'Sobre_Enviado', 'Descartado');
ALTER TABLE electores ALTER COLUMN estado DROP DEFAULT;
ALTER TABLE electores
  ALTER COLUMN estado TYPE elector_estado_new
  USING CASE estado::text
    WHEN 'Sin_contactar' THEN 'Pendiente'::elector_estado_new
    WHEN 'No_contesta'   THEN 'Llamado'::elector_estado_new
    WHEN 'Rechazado'     THEN 'Descartado'::elector_estado_new
    WHEN 'Dudoso'        THEN 'Llamado'::elector_estado_new
    WHEN 'Aceptado'      THEN 'Acepto'::elector_estado_new
  END;
ALTER TABLE electores ALTER COLUMN estado SET DEFAULT 'Pendiente'::elector_estado_new;
DROP TYPE elector_estado;
ALTER TYPE elector_estado_new RENAME TO elector_estado;

-- 2) rol_lista_tipo
CREATE TYPE rol_lista_tipo_new AS ENUM ('Dirigente', 'Comision_Electoral', 'Comision_Fiscal', 'Asamblea_Representativa');
ALTER TABLE roles_lista
  ALTER COLUMN tipo TYPE rol_lista_tipo_new
  USING CASE tipo::text
    WHEN 'Candidato_Principal' THEN 'Dirigente'::rol_lista_tipo_new
    WHEN 'Candidato_Suplente'  THEN 'Dirigente'::rol_lista_tipo_new
    WHEN 'Delegado_Principal'  THEN 'Asamblea_Representativa'::rol_lista_tipo_new
    WHEN 'Delegado_Suplente'   THEN 'Asamblea_Representativa'::rol_lista_tipo_new
  END;
DROP TYPE rol_lista_tipo;
ALTER TYPE rol_lista_tipo_new RENAME TO rol_lista_tipo;

-- 3) comision_tipo
CREATE TYPE comision_tipo_new AS ENUM ('Futbol', 'Formativas', 'Basketball', 'Deportes_Anexos', 'Social', 'Infraestructura', 'AUFI');
ALTER TABLE comisiones_interes
  ALTER COLUMN comision TYPE comision_tipo_new
  USING CASE comision::text
    WHEN 'Deportiva'       THEN 'Futbol'::comision_tipo_new
    WHEN 'Cultural'        THEN 'Social'::comision_tipo_new
    WHEN 'Social'          THEN 'Social'::comision_tipo_new
    WHEN 'Finanzas'        THEN 'AUFI'::comision_tipo_new
    WHEN 'Infraestructura' THEN 'Infraestructura'::comision_tipo_new
    WHEN 'Otra'            THEN 'Social'::comision_tipo_new
  END;
DROP TYPE comision_tipo;
ALTER TYPE comision_tipo_new RENAME TO comision_tipo;

-- 4) pregunta_tipo
CREATE TYPE pregunta_tipo_new AS ENUM ('text', 'select', 'boolean');
ALTER TABLE preguntas_flow
  ALTER COLUMN tipo TYPE pregunta_tipo_new
  USING CASE tipo::text
    WHEN 'libre'             THEN 'text'::pregunta_tipo_new
    WHEN 'opcion_multiple'   THEN 'select'::pregunta_tipo_new
    WHEN 'si_no'             THEN 'boolean'::pregunta_tipo_new
    WHEN 'escala'            THEN 'select'::pregunta_tipo_new
  END;
ALTER TABLE preguntas_flow ALTER COLUMN tipo SET DEFAULT 'text'::pregunta_tipo_new;
DROP TYPE pregunta_tipo;
ALTER TYPE pregunta_tipo_new RENAME TO pregunta_tipo;

-- 5) llamada_resultado
CREATE TYPE llamada_resultado_new AS ENUM ('No_Atendio', 'Numero_Incorrecto', 'Nos_Vota', 'No_Nos_Vota');
ALTER TABLE llamadas
  ALTER COLUMN resultado TYPE llamada_resultado_new
  USING CASE resultado::text
    WHEN 'no_contesta' THEN 'No_Atendio'::llamada_resultado_new
    WHEN 'rechazado'   THEN 'No_Nos_Vota'::llamada_resultado_new
    WHEN 'dudoso'      THEN 'No_Atendio'::llamada_resultado_new
    WHEN 'aceptado'    THEN 'Nos_Vota'::llamada_resultado_new
    WHEN 'callback'    THEN 'No_Atendio'::llamada_resultado_new
  END;
DROP TYPE llamada_resultado;
ALTER TYPE llamada_resultado_new RENAME TO llamada_resultado;

-- 6) campana_estado
CREATE TYPE campana_estado_new AS ENUM ('Borrador', 'Enviando', 'Enviada');
ALTER TABLE campanas_email
  ALTER COLUMN estado TYPE campana_estado_new
  USING CASE estado::text
    WHEN 'borrador'   THEN 'Borrador'::campana_estado_new
    WHEN 'programada' THEN 'Enviando'::campana_estado_new
    WHEN 'enviada'    THEN 'Enviada'::campana_estado_new
    WHEN 'cancelada'  THEN 'Borrador'::campana_estado_new
  END;
ALTER TABLE campanas_email ALTER COLUMN estado SET DEFAULT 'Borrador'::campana_estado_new;
DROP TYPE campana_estado;
ALTER TYPE campana_estado_new RENAME TO campana_estado;

-- 7) gasto_rubro
CREATE TYPE gasto_rubro_new AS ENUM ('Publicidad_Radio', 'TV', 'Redes', 'Comida', 'Evento', 'Sonido', 'Community_Manager', 'Disenador_Grafico');
ALTER TABLE gastos
  ALTER COLUMN rubro TYPE gasto_rubro_new
  USING CASE rubro::text
    WHEN 'Impresion'     THEN 'Publicidad_Radio'::gasto_rubro_new
    WHEN 'Transporte'    THEN 'Evento'::gasto_rubro_new
    WHEN 'Alimentacion'  THEN 'Comida'::gasto_rubro_new
    WHEN 'Publicidad'    THEN 'Publicidad_Radio'::gasto_rubro_new
    WHEN 'Tecnologia'    THEN 'Redes'::gasto_rubro_new
    WHEN 'Otro'          THEN 'Evento'::gasto_rubro_new
  END;
DROP TYPE gasto_rubro;
ALTER TYPE gasto_rubro_new RENAME TO gasto_rubro;

-- ============================================================
-- A.2 — TABLE COLUMN CHANGES
-- ============================================================

-- personas: drop apellido, barrio; rename ci → cedula; add nro_socio, celular
ALTER TABLE personas DROP COLUMN apellido;
ALTER TABLE personas DROP COLUMN barrio;
ALTER TABLE personas RENAME COLUMN ci TO cedula;
ALTER TABLE personas ADD COLUMN nro_socio text UNIQUE;
ALTER TABLE personas ADD COLUMN celular text;

-- roles_lista: drop orden, bio, foto_url; add posicion, quien_lo_trajo, comentario
ALTER TABLE roles_lista DROP COLUMN orden;
ALTER TABLE roles_lista DROP COLUMN bio;
ALTER TABLE roles_lista DROP COLUMN foto_url;
ALTER TABLE roles_lista ADD COLUMN posicion text;
ALTER TABLE roles_lista ADD COLUMN quien_lo_trajo text;
ALTER TABLE roles_lista ADD COLUMN comentario text;

-- comisiones_interes: rename FK elector_id → persona_id with data migration
-- First drop the unique constraint and FK
ALTER TABLE comisiones_interes DROP CONSTRAINT comisiones_interes_elector_id_comision_key;
ALTER TABLE comisiones_interes DROP CONSTRAINT comisiones_interes_elector_id_fkey;

-- Rename the column
ALTER TABLE comisiones_interes RENAME COLUMN elector_id TO persona_id;

-- Migrate data: map old elector_id to persona_id via electores table
UPDATE comisiones_interes ci
SET persona_id = e.persona_id
FROM electores e
WHERE ci.persona_id = e.id;

-- Add new FK and unique constraint
ALTER TABLE comisiones_interes
  ADD CONSTRAINT comisiones_interes_persona_id_fkey
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE;
ALTER TABLE comisiones_interes
  ADD CONSTRAINT comisiones_interes_persona_id_comision_key
  UNIQUE (persona_id, comision);

-- Add created_at
ALTER TABLE comisiones_interes ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- preguntas_flow: rename orden → orden_default, drop NOT NULL
ALTER TABLE preguntas_flow RENAME COLUMN orden TO orden_default;
ALTER TABLE preguntas_flow ALTER COLUMN orden_default DROP NOT NULL;

-- reglas_flow: rename pregunta_id → pregunta_origen_id; drop condicion_valor, accion; add respuesta_valor, pregunta_destino_id
ALTER TABLE reglas_flow RENAME COLUMN pregunta_id TO pregunta_origen_id;
ALTER TABLE reglas_flow DROP COLUMN condicion_valor;
ALTER TABLE reglas_flow DROP COLUMN accion;
ALTER TABLE reglas_flow ADD COLUMN respuesta_valor text;
ALTER TABLE reglas_flow ADD COLUMN pregunta_destino_id bigint REFERENCES preguntas_flow(id) ON DELETE CASCADE;

-- llamadas: drop duracion_seg, notas, callback_at; add fecha
ALTER TABLE llamadas DROP COLUMN duracion_seg;
ALTER TABLE llamadas DROP COLUMN notas;
ALTER TABLE llamadas DROP COLUMN callback_at;
ALTER TABLE llamadas ADD COLUMN fecha date NOT NULL DEFAULT current_date;

-- campanas_email: drop programada_at, enviada_at, creada_por; rename html_body → template_html; add nombre, segmento, enviados
ALTER TABLE campanas_email DROP COLUMN programada_at;
ALTER TABLE campanas_email DROP COLUMN enviada_at;
ALTER TABLE campanas_email DROP CONSTRAINT campanas_email_creada_por_fkey;
ALTER TABLE campanas_email DROP COLUMN creada_por;
ALTER TABLE campanas_email RENAME COLUMN html_body TO template_html;
ALTER TABLE campanas_email ADD COLUMN nombre text;
ALTER TABLE campanas_email ADD COLUMN segmento text;
ALTER TABLE campanas_email ADD COLUMN enviados int DEFAULT 0;

-- gastos: drop descripcion, comprobante_url, registrado_por; add concepto, programa_campana, quien_pago
ALTER TABLE gastos DROP COLUMN descripcion;
ALTER TABLE gastos DROP COLUMN comprobante_url;
ALTER TABLE gastos DROP CONSTRAINT gastos_registrado_por_fkey;
ALTER TABLE gastos DROP COLUMN registrado_por;
ALTER TABLE gastos ADD COLUMN concepto text;
ALTER TABLE gastos ADD COLUMN programa_campana text;
ALTER TABLE gastos ADD COLUMN quien_pago text;

-- eventos: rename titulo → nombre, inicio → fecha, lugar → direccion; drop fin, creado_por
ALTER TABLE eventos RENAME COLUMN titulo TO nombre;
ALTER TABLE eventos RENAME COLUMN inicio TO fecha;
ALTER TABLE eventos RENAME COLUMN lugar TO direccion;
ALTER TABLE eventos DROP COLUMN fin;
ALTER TABLE eventos DROP CONSTRAINT eventos_creado_por_fkey;
ALTER TABLE eventos DROP COLUMN creado_por;

-- ============================================================
-- A.3 — RLS POLICY UPDATES for comisiones_interes
-- ============================================================

-- Drop old policies that reference elector_id
DROP POLICY IF EXISTS "comisiones_select" ON comisiones_interes;
DROP POLICY IF EXISTS "comisiones_write" ON comisiones_interes;
DROP POLICY IF EXISTS "comisiones_delete" ON comisiones_interes;

-- Recreate with persona_id references
CREATE POLICY "comisiones_select"
  ON comisiones_interes FOR SELECT
  USING (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM electores e
      WHERE e.persona_id = comisiones_interes.persona_id
        AND e.asignado_a = auth.uid()
    )
  );

CREATE POLICY "comisiones_write"
  ON comisiones_interes FOR INSERT
  WITH CHECK (
    get_user_rol() = 'Admin'
    OR EXISTS (
      SELECT 1 FROM electores e
      WHERE e.persona_id = comisiones_interes.persona_id
        AND e.asignado_a = auth.uid()
    )
  );

CREATE POLICY "comisiones_delete"
  ON comisiones_interes FOR DELETE
  USING (get_user_rol() = 'Admin');

COMMIT;

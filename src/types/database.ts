// ============================================================
// ENUMS
// ============================================================

export type UserRol = 'Admin' | 'Voluntario'
export type ElectorEstado = 'Pendiente' | 'Llamado' | 'Acepto' | 'Para_Enviar' | 'Sobre_Enviado' | 'Descartado'
export type RolListaTipo =
  | 'Dirigente'
  | 'Comision_Electoral'
  | 'Comision_Fiscal'
  | 'Asamblea_Representativa'
export type ComisionTipo =
  | 'Futbol'
  | 'Formativas'
  | 'Basketball'
  | 'Deportes_Anexos'
  | 'Social'
  | 'Infraestructura'
  | 'AUFI'
export type PreguntaTipo = 'text' | 'select' | 'boolean'
export type LlamadaResultado = 'No_Atendio' | 'Numero_Incorrecto' | 'Nos_Vota' | 'No_Nos_Vota'
export type CampanaEstado = 'Borrador' | 'Enviando' | 'Enviada'
export type GastoRubro =
  | 'Publicidad_Radio'
  | 'TV'
  | 'Redes'
  | 'Comida'
  | 'Evento'
  | 'Sonido'
  | 'Community_Manager'
  | 'Disenador_Grafico'

// ============================================================
// ROW TYPES
// ============================================================

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: UserRol
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Persona {
  id: number
  cedula: string | null
  nombre: string
  nro_socio: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  celular: string | null
  email: string | null
  direccion: string | null
  created_at: string
  updated_at: string
}

export interface Elector {
  id: number
  persona_id: number
  estado: ElectorEstado
  notas: string | null
  asignado_a: string | null
  enviar_lista: boolean
  created_at: string
  updated_at: string
}

export interface ElectorConPersona extends Elector {
  personas: Persona
}

export interface RolLista {
  id: number
  persona_id: number
  tipo: RolListaTipo
  posicion: string | null
  quien_lo_trajo: string | null
  comentario: string | null
  created_at: string
}

export interface ComisionInteres {
  id: number
  persona_id: number
  comision: ComisionTipo
  created_at: string
}

export interface PreguntaFlow {
  id: number
  orden_default: number | null
  texto: string
  tipo: PreguntaTipo
  opciones: string[] | null
  activa: boolean
  accion: string | null
  created_at: string
}

export interface ReglaFlow {
  id: number
  pregunta_origen_id: number
  respuesta_valor: string | null
  pregunta_destino_id: number | null
  created_at: string
}

export interface Llamada {
  id: number
  elector_id: number
  voluntario_id: string
  resultado: LlamadaResultado
  fecha: string
  created_at: string
}

export interface RespuestaFlow {
  id: number
  llamada_id: number
  pregunta_id: number
  valor: string | null
  created_at: string
}

export interface CampanaEmail {
  id: number
  asunto: string
  template_html: string
  estado: CampanaEstado
  nombre: string | null
  segmento: string | null
  enviados: number
  created_at: string
}

export interface Gasto {
  id: number
  rubro: GastoRubro
  monto: number
  fecha: string
  concepto: string | null
  programa_campana: string | null
  quien_pago: string | null
  created_at: string
}

export interface Evento {
  id: number
  nombre: string
  descripcion: string | null
  fecha: string
  direccion: string | null
  created_at: string
}

// ============================================================
// COMPOSITE TYPES
// ============================================================

export interface PreguntaConReglas extends PreguntaFlow {
  reglas_flow: ReglaFlow[]
}

export interface LlamadaConDetalles extends Llamada {
  electores: { personas: { nombre: string } }
  perfiles: { nombre: string }
}

// ============================================================
// ENUMS
// ============================================================

export type UserRol = 'Admin' | 'Voluntario'
export type ElectorEstado = 'Sin_contactar' | 'No_contesta' | 'Rechazado' | 'Dudoso' | 'Aceptado'
export type RolListaTipo =
  | 'Candidato_Principal'
  | 'Candidato_Suplente'
  | 'Delegado_Principal'
  | 'Delegado_Suplente'
export type ComisionTipo =
  | 'Deportiva'
  | 'Cultural'
  | 'Social'
  | 'Finanzas'
  | 'Infraestructura'
  | 'Otra'
export type PreguntaTipo = 'libre' | 'opcion_multiple' | 'si_no' | 'escala'
export type LlamadaResultado = 'no_contesta' | 'rechazado' | 'dudoso' | 'aceptado' | 'callback'
export type CampanaEstado = 'borrador' | 'programada' | 'enviada' | 'cancelada'
export type GastoRubro =
  | 'Impresion'
  | 'Transporte'
  | 'Alimentacion'
  | 'Publicidad'
  | 'Tecnologia'
  | 'Otro'

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
  ci: string | null
  nombre: string
  apellido: string
  fecha_nacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  barrio: string | null
  created_at: string
  updated_at: string
}

export interface Elector {
  id: number
  persona_id: number
  estado: ElectorEstado
  notas: string | null
  asignado_a: string | null
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
  orden: number | null
  bio: string | null
  foto_url: string | null
  created_at: string
}

export interface ComisionInteres {
  id: number
  elector_id: number
  comision: ComisionTipo
}

export interface PreguntaFlow {
  id: number
  orden: number
  texto: string
  tipo: PreguntaTipo
  opciones: string[] | null
  activa: boolean
  created_at: string
}

export interface ReglaFlow {
  id: number
  pregunta_id: number
  condicion_valor: string
  accion: string
  created_at: string
}

export interface Llamada {
  id: number
  elector_id: number
  voluntario_id: string
  resultado: LlamadaResultado
  duracion_seg: number | null
  notas: string | null
  callback_at: string | null
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
  html_body: string
  estado: CampanaEstado
  programada_at: string | null
  enviada_at: string | null
  creada_por: string
  created_at: string
}

export interface Gasto {
  id: number
  rubro: GastoRubro
  descripcion: string
  monto: number
  fecha: string
  comprobante_url: string | null
  registrado_por: string
  created_at: string
}

export interface Evento {
  id: number
  titulo: string
  descripcion: string | null
  inicio: string
  fin: string | null
  lugar: string | null
  creado_por: string
  created_at: string
}

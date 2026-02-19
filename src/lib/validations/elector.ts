import { z } from 'zod'

export const ELECTOR_ESTADOS = [
  'Pendiente',
  'Llamado',
  'Acepto',
  'Sobre_Enviado',
  'Descartado',
] as const

export const personaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  cedula: z.string().nullable().optional(),
  nro_socio: z.string().nullable().optional(),
  fecha_nacimiento: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  celular: z.string().nullable().optional(),
  email: z.string().email('Email invalido').nullable().optional(),
  direccion: z.string().nullable().optional(),
})

export const electorSchema = z.object({
  estado: z.enum(ELECTOR_ESTADOS).default('Pendiente'),
  notas: z.string().nullable().optional(),
  asignado_a: z.string().uuid().nullable().optional(),
})

export const electorFormSchema = z.object({
  persona: personaSchema,
  elector: electorSchema,
})

export const importRowSchema = z.object({
  nombre: z.string().min(1),
  cedula: z.string().optional(),
  nro_socio: z.string().optional(),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email().optional(),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
})

export type PersonaFormData = z.infer<typeof personaSchema>
export type ElectorFormData = z.infer<typeof electorSchema>
export type ElectorFullFormData = z.infer<typeof electorFormSchema>
export type ImportRowData = z.infer<typeof importRowSchema>

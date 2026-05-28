import { z } from 'zod'

export const inviteUsuarioSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  role: z.enum(['Admin', 'Voluntario']),
  can_manage_electores: z.boolean(),
  can_access_gastos: z.boolean(),
  can_access_lista: z.boolean(),
  can_access_eventos: z.boolean(),
  can_access_campanas: z.boolean(),
})

export type InviteUsuarioFormData = z.infer<typeof inviteUsuarioSchema>

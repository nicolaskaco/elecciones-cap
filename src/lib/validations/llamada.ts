import { z } from 'zod'
import type { ElectorEstado, LlamadaResultado } from '@/types/database'

export const RESULTADO_TO_ESTADO: Record<LlamadaResultado, ElectorEstado> = {
  Nos_Vota: 'Confirmado',
  No_Nos_Vota: 'Descartado',
  No_Atendio: 'Llamado',
  Numero_Incorrecto: 'Numero_Incorrecto',
}

export const RESULTADO_LABELS: Record<LlamadaResultado, string> = {
  Nos_Vota: 'Nos vota',
  No_Nos_Vota: 'No nos vota',
  No_Atendio: 'No atendió',
  Numero_Incorrecto: 'Número incorrecto',
}

export const submitLlamadaSchema = z.object({
  elector_id: z.number().int().positive(),
  resultado: z.enum(['No_Atendio', 'Numero_Incorrecto', 'Nos_Vota', 'No_Nos_Vota']),
  respuestas: z.array(
    z.object({
      pregunta_id: z.number().int().positive(),
      valor: z.string().nullable(),
    })
  ),
})

export type SubmitLlamadaInput = z.infer<typeof submitLlamadaSchema>

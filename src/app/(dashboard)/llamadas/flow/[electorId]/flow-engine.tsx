'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { submitLlamada, confirmEnviarLista } from '@/lib/actions/llamadas'
import { RESULTADO_LABELS } from '@/lib/validations/llamada'
import type { PreguntaFlow, ReglaFlow, LlamadaResultado, ElectorConPersona } from '@/types/database'
import { ArrowLeft, Phone, CheckCircle, MapPin } from 'lucide-react'

type Phase = 'calling' | 'result' | 'submitting'

interface FlowEngineProps {
  elector: ElectorConPersona
  preguntas: PreguntaFlow[]
  reglas: ReglaFlow[]
}

function advanceFlow(
  currentId: number,
  valor: string,
  preguntas: PreguntaFlow[],
  reglas: ReglaFlow[]
): number | null {
  const rule = reglas.find(
    (r) => r.pregunta_origen_id === currentId && r.respuesta_valor === valor
  )
  if (rule !== undefined) return rule.pregunta_destino_id

  const wildcardRule = reglas.find(
    (r) => r.pregunta_origen_id === currentId && r.respuesta_valor === null
  )
  if (wildcardRule !== undefined) return wildcardRule.pregunta_destino_id

  const currentIdx = preguntas.findIndex((p) => p.id === currentId)
  if (currentIdx === -1 || currentIdx === preguntas.length - 1) return null
  return preguntas[currentIdx + 1].id
}

function getFirstPreguntaId(preguntas: PreguntaFlow[]): number | null {
  return preguntas[0]?.id ?? null
}

export function FlowEngine({ elector, preguntas, reglas }: FlowEngineProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('calling')
  const [currentPreguntaId, setCurrentPreguntaId] = useState<number | null>(
    getFirstPreguntaId(preguntas)
  )
  const [answers, setAnswers] = useState<Map<number, string>>(new Map())
  const [history, setHistory] = useState<number[]>([])
  const [localAnswer, setLocalAnswer] = useState('')
  const [resultado, setResultado] = useState<LlamadaResultado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Enviar lista dialog state
  const [enviarListaOpen, setEnviarListaOpen] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<{ preguntaId: number; valor: string } | null>(null)
  const [direccionEdit, setDireccionEdit] = useState('')
  const [savingDireccion, setSavingDireccion] = useState(false)

  const currentPregunta = preguntas.find((p) => p.id === currentPreguntaId) ?? null

  const applyAnswer = useCallback(
    (preguntaId: number, valor: string) => {
      const newAnswers = new Map(answers)
      newAnswers.set(preguntaId, valor)
      setAnswers(newAnswers)
      setHistory((prev) => [...prev, preguntaId])
      setLocalAnswer('')

      const nextId = advanceFlow(preguntaId, valor, preguntas, reglas)
      if (nextId === null) {
        setCurrentPreguntaId(null)
        setPhase('result')
      } else {
        setCurrentPreguntaId(nextId)
      }
    },
    [answers, preguntas, reglas]
  )

  const submitAnswer = useCallback(
    (valor: string) => {
      if (!currentPreguntaId) return
      const pregunta = preguntas.find((p) => p.id === currentPreguntaId)

      // Intercept enviar_lista action on 'Si'
      if (pregunta?.accion === 'enviar_lista' && valor === 'Si') {
        setPendingAnswer({ preguntaId: currentPreguntaId, valor })
        setDireccionEdit(elector.personas.direccion ?? '')
        setEnviarListaOpen(true)
        return
      }

      applyAnswer(currentPreguntaId, valor)
    },
    [currentPreguntaId, preguntas, elector.personas.direccion, applyAnswer]
  )

  async function handleConfirmEnviarLista() {
    if (!pendingAnswer) return
    setSavingDireccion(true)
    try {
      await confirmEnviarLista(elector.id, elector.persona_id, direccionEdit || null)
      toast.success('Dirección confirmada y sobre marcado para envío')
      setEnviarListaOpen(false)
      applyAnswer(pendingAnswer.preguntaId, pendingAnswer.valor)
      setPendingAnswer(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingDireccion(false)
    }
  }

  function goBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    const newAnswers = new Map(answers)
    if (currentPreguntaId) newAnswers.delete(currentPreguntaId)
    setHistory(newHistory)
    setCurrentPreguntaId(prev)
    setAnswers(newAnswers)
    setLocalAnswer('')
    if (phase === 'result') setPhase('calling')
  }

  async function handleFinalizar() {
    if (!resultado) return
    setSubmitting(true)
    setError(null)
    try {
      const respuestas = Array.from(answers.entries()).map(([pregunta_id, valor]) => ({
        pregunta_id,
        valor,
      }))
      await submitLlamada({ elector_id: elector.id, resultado, respuestas })
      toast.success('Llamada registrada correctamente')
      router.push('/llamadas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSubmitting(false)
    }
  }

  // Empty flow — skip straight to result
  if (preguntas.length === 0 && phase === 'calling') {
    setPhase('result')
  }

  const persona = elector.personas

  return (
    <>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/llamadas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{persona.nombre}</h1>
            {persona.celular && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {persona.celular}
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        {preguntas.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Pregunta {Math.min(history.length + 1, preguntas.length)} de {preguntas.length}
          </div>
        )}

        {/* Calling phase */}
        {phase === 'calling' && currentPregunta && (
          <div className="border rounded-lg p-6 space-y-5">
            <p className="text-lg font-medium">{currentPregunta.texto}</p>

            {currentPregunta.tipo === 'boolean' && (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => submitAnswer('Si')}>
                  Sí
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => submitAnswer('No')}>
                  No
                </Button>
              </div>
            )}

            {currentPregunta.tipo === 'select' && (
              <div className="space-y-3">
                <Select value={localAnswer} onValueChange={setLocalAnswer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(currentPregunta.opciones ?? []).map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={() => submitAnswer(localAnswer)}
                  disabled={!localAnswer}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentPregunta.tipo === 'text' && (
              <div className="space-y-3">
                <Input
                  value={localAnswer}
                  onChange={(e) => setLocalAnswer(e.target.value)}
                  placeholder="Respuesta..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAnswer(localAnswer)
                  }}
                />
                <Button className="w-full" onClick={() => submitAnswer(localAnswer)}>
                  Continuar
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={goBack} disabled={history.length === 0}>
                Atrás
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentPreguntaId(null)
                  setPhase('result')
                }}
              >
                Saltar al resultado
              </Button>
            </div>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && (
          <div className="border rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">Resultado de la llamada</p>
            </div>

            {answers.size > 0 && (
              <div className="space-y-1 text-sm bg-muted/40 rounded p-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                  Respuestas
                </p>
                {Array.from(answers.entries()).map(([pid, val]) => {
                  const p = preguntas.find((x) => x.id === pid)
                  return (
                    <div key={pid} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">{p?.texto ?? `#${pid}`}</span>
                      <span className="font-medium">{val || '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RESULTADO_LABELS) as LlamadaResultado[]).map((r) => (
                <Button
                  key={r}
                  variant={resultado === r ? 'default' : 'outline'}
                  className="h-auto py-2 text-sm"
                  onClick={() => setResultado(r)}
                >
                  {RESULTADO_LABELS[r]}
                </Button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={goBack}>
                Atrás
              </Button>
              <Button onClick={handleFinalizar} disabled={!resultado || submitting}>
                {submitting ? 'Guardando...' : 'Finalizar llamada'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Enviar lista dialog */}
      <Dialog open={enviarListaOpen} onOpenChange={setEnviarListaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Confirmar dirección de envío
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirmá o corregí la dirección para enviar el sobre con la lista.
            </p>
            <Input
              value={direccionEdit}
              onChange={(e) => setDireccionEdit(e.target.value)}
              placeholder="Dirección de envío..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEnviarListaOpen(false)
                if (pendingAnswer) {
                  applyAnswer(pendingAnswer.preguntaId, pendingAnswer.valor)
                  setPendingAnswer(null)
                }
              }}
            >
              Omitir dirección
            </Button>
            <Button onClick={handleConfirmEnviarLista} disabled={savingDireccion}>
              {savingDireccion ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

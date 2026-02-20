'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ElectorConPersona, ElectorEstado, LlamadaConDetalles } from '@/types/database'
import { RESULTADO_LABELS } from '@/lib/validations/llamada'
import { Phone } from 'lucide-react'

const RESULTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Nos_Vota: 'default',
  No_Nos_Vota: 'destructive',
  No_Atendio: 'secondary',
  Numero_Incorrecto: 'outline',
}

const ESTADO_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  Llamado: 'secondary',
  Confirmado: 'default',
  Para_Enviar: 'secondary',
  Lista_Enviada: 'secondary',
  Numero_Incorrecto: 'outline',
  Descartado: 'destructive',
}

const CALLABLE_ESTADOS: ElectorEstado[] = ['Pendiente', 'Llamado']

const FILTER_OPTIONS = [
  { value: 'para_llamar', label: 'Para llamar' },
  { value: 'todos', label: 'Todos' },
  { value: 'Confirmado', label: 'Confirmado' },
  { value: 'Para_Enviar', label: 'Para Enviar' },
  { value: 'Lista_Enviada', label: 'Lista Enviada' },
  { value: 'Numero_Incorrecto', label: 'Número Incorrecto' },
  { value: 'Descartado', label: 'Descartado' },
]

interface VoluntarioViewProps {
  electores: ElectorConPersona[]
}

export function VoluntarioView({ electores }: VoluntarioViewProps) {
  const [filtro, setFiltro] = useState('para_llamar')

  const filtered = filtro === 'para_llamar'
    ? electores.filter((e) => CALLABLE_ESTADOS.includes(e.estado as ElectorEstado))
    : filtro === 'todos'
    ? electores
    : electores.filter((e) => e.estado === filtro)

  const pendienteCount = electores.filter((e) => e.estado === 'Pendiente').length
  const llamadoCount = electores.filter((e) => e.estado === 'Llamado').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Llamadas</h1>
          <p className="text-muted-foreground text-sm">
            {pendienteCount} pendiente{pendienteCount !== 1 ? 's' : ''} · {llamadoCount} sin atender
          </p>
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-36 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {electores.length === 0
                    ? 'No tenés electores asignados.'
                    : 'No hay electores en este estado.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.personas.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.personas.celular ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_BADGE_VARIANT[e.estado] ?? 'outline'}>
                      {e.estado.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm">
                      <Link href={`/llamadas/flow/${e.id}`}>
                        <Phone className="h-3.5 w-3.5 mr-1.5" />
                        Iniciar llamada
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const RESULTADOS = ['Nos_Vota', 'No_Nos_Vota', 'No_Atendio', 'Numero_Incorrecto'] as const

interface AdminViewProps {
  llamadas: LlamadaConDetalles[]
}

export function AdminView({ llamadas }: AdminViewProps) {
  // Aggregate by resultado
  const porResultado = RESULTADOS.map((r) => ({
    resultado: r,
    count: llamadas.filter((l) => l.resultado === r).length,
  }))

  // Aggregate by voluntario
  const voluntarioMap = new Map<string, { nombre: string; counts: Record<string, number>; total: number }>()
  for (const l of llamadas) {
    const id = l.perfiles.nombre
    if (!voluntarioMap.has(id)) {
      voluntarioMap.set(id, { nombre: l.perfiles.nombre, counts: {}, total: 0 })
    }
    const entry = voluntarioMap.get(id)!
    entry.counts[l.resultado] = (entry.counts[l.resultado] ?? 0) + 1
    entry.total++
  }
  const porVoluntario = Array.from(voluntarioMap.values()).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Llamadas</h1>
        <p className="text-muted-foreground text-sm">
          {llamadas.length} llamada{llamadas.length !== 1 ? 's' : ''} registrada{llamadas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Resultado summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {porResultado.map(({ resultado, count }) => (
          <div key={resultado} className="rounded-lg border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{RESULTADO_LABELS[resultado]}</p>
              <p className="text-2xl font-bold tabular-nums">{count}</p>
            </div>
            <Badge variant={RESULTADO_VARIANT[resultado] ?? 'secondary'} className="shrink-0">
              {llamadas.length > 0 ? `${Math.round((count / llamadas.length) * 100)}%` : '0%'}
            </Badge>
          </div>
        ))}
      </div>

      {/* Per-voluntario breakdown */}
      {porVoluntario.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voluntario</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {RESULTADOS.map((r) => (
                  <TableHead key={r} className="text-right hidden sm:table-cell">
                    {RESULTADO_LABELS[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVoluntario.map((v) => (
                <TableRow key={v.nombre}>
                  <TableCell className="font-medium">{v.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.total}</TableCell>
                  {RESULTADOS.map((r) => (
                    <TableCell key={r} className="text-right tabular-nums hidden sm:table-cell text-muted-foreground">
                      {v.counts[r] ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Full history */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Historial completo</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Elector</TableHead>
                <TableHead>Voluntario</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {llamadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay llamadas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                llamadas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.electores.personas.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{l.perfiles.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={RESULTADO_VARIANT[l.resultado] ?? 'secondary'}>
                        {RESULTADO_LABELS[l.resultado] ?? l.resultado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(l.fecha).toLocaleDateString('es-UY')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

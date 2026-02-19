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

interface AdminViewProps {
  llamadas: LlamadaConDetalles[]
}

export function AdminView({ llamadas }: AdminViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Llamadas</h1>
        <p className="text-muted-foreground text-sm">Historial de todas las llamadas.</p>
      </div>
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
  )
}

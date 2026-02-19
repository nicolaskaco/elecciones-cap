'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ElectorConPersona, LlamadaConDetalles } from '@/types/database'
import { RESULTADO_LABELS } from '@/lib/validations/llamada'
import { Phone } from 'lucide-react'

const RESULTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Nos_Vota: 'default',
  No_Nos_Vota: 'destructive',
  No_Atendio: 'secondary',
  Numero_Incorrecto: 'outline',
}

interface VoluntarioViewProps {
  electores: ElectorConPersona[]
}

export function VoluntarioView({ electores }: VoluntarioViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Llamadas</h1>
        <p className="text-muted-foreground text-sm">Electores asignados a vos.</p>
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
            {electores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No tenés electores asignados.
                </TableCell>
              </TableRow>
            ) : (
              electores.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.personas.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.personas.celular ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.estado.replace(/_/g, ' ')}</Badge>
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

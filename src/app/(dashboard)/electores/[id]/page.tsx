import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil } from '@/lib/auth'
import { getElectorById, getVoluntarios } from '@/lib/actions/electores'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ElectorDetailActions } from './actions'
import { RESULTADO_LABELS } from '@/lib/validations/llamada'
import type { LlamadaResultado } from '@/types/database'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  Llamado: 'secondary',
  Confirmado: 'default',
  Para_Enviar: 'secondary',
  Lista_Enviada: 'secondary',
  Numero_Incorrecto: 'outline',
  Descartado: 'destructive',
}

const resultadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Nos_Vota: 'default',
  No_Nos_Vota: 'destructive',
  No_Atendio: 'secondary',
  Numero_Incorrecto: 'outline',
}

function calcEdad(fechaNacimiento: string | null | undefined): string | null {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad >= 0 ? `${edad} años` : null
}

function formatFecha(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-UY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function ElectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const electorId = parseInt(id, 10)
  if (isNaN(electorId)) notFound()

  const [elector, perfil] = await Promise.all([
    getElectorById(electorId),
    getRequiredPerfil(),
  ])
  if (!elector) notFound()

  const isAdmin = perfil.rol === 'Admin'
  const supabase = await createClient()

  const [llamadasRes, voluntarios, asignadoRes] = await Promise.all([
    supabase
      .from('llamadas')
      .select('*, perfiles(nombre)')
      .eq('elector_id', electorId)
      .order('created_at', { ascending: false }),
    isAdmin ? getVoluntarios() : Promise.resolve([]),
    elector.asignado_a
      ? supabase.from('perfiles').select('nombre').eq('id', elector.asignado_a).single()
      : Promise.resolve({ data: null }),
  ])

  const llamadas = llamadasRes.data ?? []
  const asignadoNombre = asignadoRes.data?.nombre ?? null
  const persona = elector.personas
  const edad = calcEdad(persona.fecha_nacimiento)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/electores">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{persona.nombre}</h1>
              <Badge variant={estadoBadgeVariant[elector.estado] ?? 'outline'}>
                {elector.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
            {asignadoNombre && (
              <p className="text-sm text-muted-foreground mt-0.5">Asignado a {asignadoNombre}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <ElectorDetailActions elector={elector} voluntarios={voluntarios} />
          )}
          <Button size="sm" asChild>
            <Link href={`/llamadas/flow/${elector.id}`}>
              <Phone className="mr-1.5 h-3.5 w-3.5" />
              Iniciar llamada
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Cédula" value={persona.cedula} />
            <InfoRow label="Nro Socio" value={persona.nro_socio} />
            <InfoRow label="Celular" value={persona.celular} />
            <InfoRow label="Teléfono" value={persona.telefono} />
            <InfoRow label="Email" value={persona.email} />
            <InfoRow label="Dirección" value={persona.direccion} />
            {persona.fecha_nacimiento && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fecha de Nacimiento</span>
                <span className="text-sm font-medium">
                  {formatFecha(persona.fecha_nacimiento)}
                  {edad && <span className="text-muted-foreground ml-1.5">({edad})</span>}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado + notas */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Elector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant={estadoBadgeVariant[elector.estado] ?? 'outline'}>
                {elector.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Asignado a</span>
              <span className="text-sm font-medium">{asignadoNombre ?? '—'}</span>
            </div>
            {elector.notas && (
              <div>
                <span className="text-sm text-muted-foreground">Notas</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{elector.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Llamadas history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Historial de Llamadas
            {llamadas.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {llamadas.length} llamada{llamadas.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {llamadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay llamadas registradas.</p>
          ) : (
            <div className="space-y-2">
              {llamadas.map((ll) => (
                <div
                  key={ll.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={resultadoBadgeVariant[ll.resultado] ?? 'secondary'}>
                      {RESULTADO_LABELS[ll.resultado as LlamadaResultado] ?? ll.resultado}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {(ll as { perfiles?: { nombre: string } }).perfiles?.nombre ?? '—'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ll.fecha).toLocaleDateString('es-UY', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

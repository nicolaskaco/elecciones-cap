import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getElectorById } from '@/lib/actions/electores'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Llamada } from '@/types/database'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  Llamado: 'secondary',
  Acepto: 'default',
  Sobre_Enviado: 'secondary',
  Descartado: 'destructive',
}

export default async function ElectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const electorId = parseInt(id, 10)
  if (isNaN(electorId)) notFound()

  const elector = await getElectorById(electorId)
  if (!elector) notFound()

  const supabase = await createClient()
  const { data: llamadas } = await supabase
    .from('llamadas')
    .select('*')
    .eq('elector_id', electorId)
    .order('created_at', { ascending: false })

  const persona = elector.personas

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/electores">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informacion Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nombre" value={persona.nombre} />
            <InfoRow label="Cedula" value={persona.cedula} />
            <InfoRow label="Nro Socio" value={persona.nro_socio} />
            <InfoRow label="Celular" value={persona.celular} />
            <InfoRow label="Telefono" value={persona.telefono} />
            <InfoRow label="Email" value={persona.email} />
            <InfoRow label="Direccion" value={persona.direccion} />
            <InfoRow label="Fecha Nacimiento" value={persona.fecha_nacimiento} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Elector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant={estadoBadgeVariant[elector.estado] ?? 'outline'}>
                {elector.estado.replace('_', ' ')}
              </Badge>
            </div>
            {elector.notas && (
              <div>
                <span className="text-sm text-muted-foreground">Notas</span>
                <p className="text-sm mt-1">{elector.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Historial de Llamadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!llamadas || llamadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay llamadas registradas.</p>
          ) : (
            <div className="space-y-3">
              {(llamadas as Llamada[]).map((ll) => (
                <div
                  key={ll.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {ll.resultado.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ll.fecha} — {new Date(ll.created_at).toLocaleString()}
                    </p>
                  </div>
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
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  )
}

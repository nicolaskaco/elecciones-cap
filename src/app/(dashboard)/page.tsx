import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Phone, CheckCircle, TrendingUp, Calendar, MapPin } from 'lucide-react'
import type { Evento } from '@/types/database'

async function getKPIs() {
  const supabase = await createClient()

  const [electoresRes, llamadasRes, aceptaronRes] = await Promise.all([
    supabase.from('electores').select('id', { count: 'exact', head: true }),
    supabase.from('llamadas').select('id', { count: 'exact', head: true }),
    supabase
      .from('electores')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'Confirmado'),
  ])

  const totalElectores = electoresRes.count ?? 0
  const totalLlamadas = llamadasRes.count ?? 0
  const electoresAceptaron = aceptaronRes.count ?? 0
  const tasa = totalElectores > 0 ? Math.round((electoresAceptaron / totalElectores) * 100) : 0

  return { totalElectores, totalLlamadas, electoresAceptaron, tasa }
}

async function getUpcomingEventos(): Promise<Evento[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', today)
    .order('fecha', { ascending: true })
    .limit(5)
  return (data ?? []) as Evento[]
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-UY', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default async function DashboardPage() {
  const [perfil, kpis, eventos] = await Promise.all([getRequiredPerfil(), getKPIs(), getUpcomingEventos()])

  const cards = [
    {
      title: 'Total Electores',
      value: kpis.totalElectores,
      description: 'Registrados en el sistema',
      icon: Users,
    },
    {
      title: 'Total Llamadas',
      value: kpis.totalLlamadas,
      description: 'Llamadas realizadas',
      icon: Phone,
    },
    {
      title: 'Aceptaron',
      value: kpis.electoresAceptaron,
      description: 'Electores confirmados',
      icon: CheckCircle,
    },
    {
      title: 'Tasa de Aceptación',
      value: `${kpis.tasa}%`,
      description: 'Del total de electores',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido, {perfil.nombre}</h1>
        <p className="text-muted-foreground text-sm">Resumen de la campaña electoral</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximos Eventos
          </CardTitle>
          <CardDescription>Calendario de la campaña</CardDescription>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos próximos.</p>
          ) : (
            <ul className="space-y-3">
              {eventos.map((evento) => {
                const isToday = evento.fecha === new Date().toISOString().split('T')[0]
                return (
                  <li key={evento.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center rounded-md border bg-muted px-2 py-1 min-w-[3rem] text-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-UY', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(evento.fecha + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${isToday ? 'text-primary' : ''}`}>
                          {evento.nombre}
                        </span>
                        {isToday && <Badge className="text-xs py-0 shrink-0">Hoy</Badge>}
                      </div>
                      {evento.direccion && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{evento.direccion}</span>
                        </div>
                      )}
                      {evento.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{evento.descripcion}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 pt-1">
                      {formatFecha(evento.fecha)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Phone, CheckCircle, TrendingUp, Calendar, MapPin, Clock, BarChart2 } from 'lucide-react'
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

async function getVoluntariosStats() {
  const supabase = await createClient()

  const { data: voluntarios } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('rol', 'Voluntario')
    .order('nombre')

  if (!voluntarios?.length) return []

  return Promise.all(
    voluntarios.map(async (v) => {
      const [asignadosRes, llamadasRes, confirmadosRes] = await Promise.all([
        supabase.from('electores').select('id', { count: 'exact', head: true }).eq('asignado_a', v.id),
        supabase.from('llamadas').select('id', { count: 'exact', head: true }).eq('voluntario_id', v.id),
        supabase.from('electores').select('id', { count: 'exact', head: true }).eq('asignado_a', v.id).eq('estado', 'Confirmado'),
      ])
      const asignados = asignadosRes.count ?? 0
      const llamadas = llamadasRes.count ?? 0
      const confirmados = confirmadosRes.count ?? 0
      const tasa = asignados > 0 ? Math.round((confirmados / asignados) * 100) : 0
      return { id: v.id, nombre: v.nombre, asignados, llamadas, confirmados, tasa }
    })
  )
}

const ESTADO_ORDER = [
  'Pendiente',
  'Llamado',
  'Confirmado',
  'Para_Enviar',
  'Lista_Enviada',
  'Numero_Incorrecto',
  'Descartado',
] as const

const ESTADO_COLORS: Record<string, string> = {
  Pendiente: 'bg-gray-400',
  Llamado: 'bg-blue-400',
  Confirmado: 'bg-green-500',
  Para_Enviar: 'bg-yellow-400',
  Lista_Enviada: 'bg-teal-400',
  Numero_Incorrecto: 'bg-orange-400',
  Descartado: 'bg-red-400',
}

async function getEstadoBreakdown() {
  const supabase = await createClient()
  const results = await Promise.all(
    ESTADO_ORDER.map(async (estado) => {
      const { count } = await supabase
        .from('electores')
        .select('id', { count: 'exact', head: true })
        .eq('estado', estado)
      return [estado, count ?? 0] as const
    })
  )
  const counts = Object.fromEntries(results) as Record<string, number>
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { total, counts }
}

async function getUpcomingEventos(): Promise<Evento[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', today)
    .order('fecha', { ascending: true })
    .limit(20)

  const now = new Date()
  return ((data ?? []) as Evento[])
    .filter((e) => {
      const base = new Date(e.fecha + 'T00:00:00')
      if (e.hora) {
        const [h, m] = e.hora.split(':').map(Number)
        base.setHours(h, m, 0, 0)
      } else {
        base.setHours(23, 59, 59, 999)
      }
      return base > now
    })
    .slice(0, 5)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-UY', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default async function DashboardPage() {
  const perfil = await getRequiredPerfil()
  const isAdmin = perfil.rol === 'Admin'

  const [kpis, eventos, voluntariosStats, estadoBreakdown] = await Promise.all([
    getKPIs(),
    getUpcomingEventos(),
    isAdmin ? getVoluntariosStats() : Promise.resolve([]),
    isAdmin ? getEstadoBreakdown() : Promise.resolve(null),
  ])

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

      {isAdmin && voluntariosStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Voluntarios
            </CardTitle>
            <CardDescription>Progreso por voluntario</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Asignados</TableHead>
                  <TableHead className="text-right">Llamadas</TableHead>
                  <TableHead className="text-right">Confirmados</TableHead>
                  <TableHead className="text-right">Tasa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voluntariosStats.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.asignados}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.llamadas}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.confirmados}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={v.tasa >= 50 ? 'text-green-600 font-medium' : v.tasa > 0 ? 'text-yellow-600' : 'text-muted-foreground'}>
                        {v.asignados > 0 ? `${v.tasa}%` : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isAdmin && estadoBreakdown && estadoBreakdown.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Electores por Estado
            </CardTitle>
            <CardDescription>{estadoBreakdown.total} electores en total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ESTADO_ORDER.map((estado) => {
              const count = estadoBreakdown.counts[estado] ?? 0
              const pct = estadoBreakdown.total > 0 ? Math.round((count / estadoBreakdown.total) * 100) : 0
              return (
                <Link
                  key={estado}
                  href={`/electores?estado=${estado}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="w-32 shrink-0 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {estado.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ESTADO_COLORS[estado]} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                    <span className="font-medium">{count}</span>
                    <span className="text-muted-foreground ml-1">({pct}%)</span>
                  </span>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

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
                      {evento.hora && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{evento.hora.slice(0, 5)}</span>
                        </div>
                      )}
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

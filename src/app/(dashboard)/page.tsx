import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Phone, CheckCircle, TrendingUp, Calendar } from 'lucide-react'

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

export default async function DashboardPage() {
  const [perfil, kpis] = await Promise.all([getRequiredPerfil(), getKPIs()])

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
          <p className="text-sm text-muted-foreground">
            No hay eventos próximos. Los eventos se mostrarán aquí una vez agregados.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

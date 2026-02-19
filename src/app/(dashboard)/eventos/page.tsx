import { getEventos } from '@/lib/actions/eventos'
import { EventosClient } from './eventos-client'

export default async function EventosPage() {
  const eventos = await getEventos()
  return <EventosClient eventos={eventos} />
}

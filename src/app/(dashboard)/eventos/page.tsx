import { getEventosConPersonas } from '@/lib/actions/eventos'
import { getPersonasAll } from '@/lib/actions/lista'
import { EventosClient } from './eventos-client'

export default async function EventosPage() {
  const [eventos, personasTodas] = await Promise.all([
    getEventosConPersonas(),
    getPersonasAll(),
  ])
  return <EventosClient eventos={eventos} personasTodas={personasTodas} />
}

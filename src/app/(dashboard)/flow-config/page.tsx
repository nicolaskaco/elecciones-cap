import { getPreguntasConReglas } from '@/lib/actions/flow-config'
import { FlowConfigClient } from './flow-config-client'

export default async function FlowConfigPage() {
  const preguntas = await getPreguntasConReglas()
  return <FlowConfigClient preguntas={preguntas} />
}

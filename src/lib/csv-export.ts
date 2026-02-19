import type { ElectorConPersona } from '@/types/database'

export function exportElectoresToCSV(electores: ElectorConPersona[]) {
  const headers = ['Nombre', 'Cedula', 'Nro Socio', 'Celular', 'Telefono', 'Email', 'Estado', 'Direccion']

  const rows = electores.map((e) => [
    e.personas.nombre,
    e.personas.cedula ?? '',
    e.personas.nro_socio ?? '',
    e.personas.celular ?? '',
    e.personas.telefono ?? '',
    e.personas.email ?? '',
    e.estado,
    e.personas.direccion ?? '',
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => {
        const str = String(cell)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `electores_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

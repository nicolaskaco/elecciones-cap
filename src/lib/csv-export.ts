import type { Elector } from '@/types/database'

export function exportElectoresToCSV(electores: Elector[]) {
  const headers = ['Nombre', 'Cedula', 'Nro Socio', 'Celular', 'Telefono', 'Email', 'Estado', 'Direccion']

  const rows = electores.map((e) => [
    e.nombre,
    e.cedula ?? '',
    e.nro_socio ?? '',
    e.celular ?? '',
    e.telefono ?? '',
    e.email ?? '',
    e.estado,
    e.direccion ?? '',
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

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `electores_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

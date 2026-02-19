import { requireAdmin } from '@/lib/auth'
import { ExcelImport } from './excel-import'

export default async function ImportElectoresPage() {
  await requireAdmin()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Electores</h1>
        <p className="text-muted-foreground text-sm">
          Sube un archivo Excel (.xlsx) para importar electores en lote
        </p>
      </div>

      <ExcelImport />
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ElectorFormDialog } from '../elector-form'
import { updateNotas } from '@/lib/actions/electores'
import type { ElectorConPersona } from '@/types/database'

interface Props {
  elector: ElectorConPersona
  voluntarios: { id: string; nombre: string }[]
}

export function ElectorDetailActions({ elector, voluntarios }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Editar
      </Button>
      <ElectorFormDialog
        open={open}
        onOpenChange={setOpen}
        elector={elector}
        voluntarios={voluntarios}
      />
    </>
  )
}

interface NotasProps {
  electorId: number
  notas: string | null
}

export function NotasInlineEditor({ electorId, notas }: NotasProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notas ?? '')
  const [isPending, startTransition] = useTransition()

  function handleEdit() {
    setValue(notas ?? '')
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setValue(notas ?? '')
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateNotas(electorId, value.trim() || null)
        toast.success('Notas actualizadas')
        setEditing(false)
        router.refresh()
      } catch {
        toast.error('Error al guardar notas')
      }
    })
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Notas</span>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Agregar notas..."
          rows={3}
          className="text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={isPending} onClick={handleSave}>
            <Check className="mr-1 h-3.5 w-3.5" />
            Guardar
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleCancel}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Notas</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-muted-foreground"
          onClick={handleEdit}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      {notas ? (
        <p className="text-sm mt-1 whitespace-pre-wrap">{notas}</p>
      ) : (
        <p className="text-sm mt-1 text-muted-foreground italic">Sin notas</p>
      )}
    </div>
  )
}

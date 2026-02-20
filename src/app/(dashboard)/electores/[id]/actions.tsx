'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ElectorFormDialog } from '../elector-form'
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

'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InviteDialog } from './invite-dialog'

export function InviteButtonClient() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invitar Usuario
      </Button>
      <InviteDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

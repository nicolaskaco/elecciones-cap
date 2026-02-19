'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserRol } from '@/types/database'
import { updateUsuarioRol } from '@/lib/actions/usuarios'

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: UserRol
  created_at: string
}

interface Props {
  usuarios: Usuario[]
  currentUserId: string
}

export function UsuariosTable({ usuarios, currentUserId }: Props) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleRolChange(userId: string, rol: UserRol) {
    setUpdating(userId)
    try {
      await updateUsuarioRol(userId, rol)
      router.refresh()
    } catch {
      alert('Error al actualizar rol')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Miembro desde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => {
            const isSelf = u.id === currentUserId
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nombre}
                  {isSelf && (
                    <span className="ml-2 text-xs text-muted-foreground">(vos)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  {isSelf ? (
                    <Badge>{u.rol}</Badge>
                  ) : (
                    <Select
                      value={u.rol}
                      disabled={updating === u.id}
                      onValueChange={(v) => handleRolChange(u.id, v as UserRol)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Voluntario">Voluntario</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.created_at).toLocaleDateString('es-UY')}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

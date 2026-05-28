'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { inviteUsuario } from '@/lib/actions/usuarios'
import { inviteUsuarioSchema, type InviteUsuarioFormData } from '@/lib/validations/invite'

const PERMISSION_FIELDS: { name: keyof InviteUsuarioFormData; label: string }[] = [
  { name: 'can_manage_electores', label: 'Gestionar electores' },
  { name: 'can_access_gastos', label: 'Ver gastos' },
  { name: 'can_access_lista', label: 'Ver lista de candidatos' },
  { name: 'can_access_eventos', label: 'Ver eventos' },
  { name: 'can_access_campanas', label: 'Ver campañas de email' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<InviteUsuarioFormData>({
    resolver: zodResolver(inviteUsuarioSchema),
    defaultValues: {
      email: '',
      role: 'Voluntario',
      can_manage_electores: false,
      can_access_gastos: false,
      can_access_lista: false,
      can_access_eventos: false,
      can_access_campanas: false,
    },
  })

  async function onSubmit(values: InviteUsuarioFormData) {
    setLoading(true)
    try {
      const result = await inviteUsuario(values)
      setInviteUrl(result.inviteUrl)
      toast.success('Invitación generada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar invitación')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setInviteUrl(null)
    setCopied(false)
    form.reset()
    onOpenChange(false)
  }

  // ── Link display (second state after successful invite) ──────────────────
  if (inviteUrl) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitación lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compartí este enlace con el usuario. Es de un solo uso y expira en 24 horas.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <span className="flex-1 truncate text-xs font-mono">{inviteUrl}</span>
              <Button variant="ghost" size="icon" onClick={handleCopy} type="button">
                {copied
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Invite form (first state) ────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="usuario@ejemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Voluntario">Voluntario</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Permisos</p>
              {PERMISSION_FIELDS.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Generando...' : 'Generar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

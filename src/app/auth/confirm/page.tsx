'use client'

import { useRef, useState } from 'react'
import { useMountEffect } from '@/hooks/use-mount-effect'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type Status = 'verifying' | 'set-password' | 'error'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmá la contraseña'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function AuthConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Keep the same client instance across OTP verification and password update
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useMountEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const type = params.get('type')
    const tokenHash = params.get('token_hash')

    if (!tokenHash || type !== 'invite') {
      setStatus('error')
      setErrorMsg('Enlace de invitación inválido o ya fue utilizado.')
      return
    }

    const supabase = createClient()
    supabaseRef.current = supabase

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'invite' })
      .then(({ data, error }) => {
        if (error) {
          setStatus('error')
          setErrorMsg(
            error.message.toLowerCase().includes('expired')
              ? 'El enlace expiró. Pedí al administrador que genere uno nuevo.'
              : 'No se pudo verificar la invitación. El enlace puede haber sido usado ya.'
          )
          return
        }

        if (data.session) {
          // Stay on this page — show the password form using the same client
          // instance that holds the verified session.
          setStatus('set-password')
        } else {
          setStatus('error')
          setErrorMsg('No se pudo establecer la sesión. Intentá de nuevo.')
        }
      })
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const [saving, setSaving] = useState(false)

  async function onSubmit(values: FormValues) {
    const supabase = supabaseRef.current
    if (!supabase) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw new Error(error.message)
      toast.success('Contraseña establecida. ¡Bienvenido!')
      router.replace('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al establecer contraseña')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Verificando invitación...</p>
          <p className="text-sm text-muted-foreground">Un momento por favor.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-lg font-semibold text-destructive">Enlace inválido</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Elecciones Peñarol</h1>
          <p className="text-muted-foreground text-sm">Establecé tu contraseña para continuar</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Establecer contraseña'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

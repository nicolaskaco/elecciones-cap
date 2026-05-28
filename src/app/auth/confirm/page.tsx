'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'verifying' | 'success' | 'error'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // The token lives in the fragment — never sent to the server
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

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'invite' })
      .then(({ data, error }) => {
        if (error) {
          console.error('verifyOtp error:', error)
          setStatus('error')
          setErrorMsg(
            error.message.toLowerCase().includes('expired')
              ? 'El enlace expiró. Pedí al administrador que genere uno nuevo.'
              : 'No se pudo verificar la invitación. El enlace puede haber sido usado ya.'
          )
          return
        }

        if (data.session) {
          setStatus('success')
          router.replace('/auth/set-password')
        } else {
          setStatus('error')
          setErrorMsg('No se pudo establecer la sesión. Intentá de nuevo.')
        }
      })
  }, [router])

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirigiendo...</p>
    </div>
  )
}

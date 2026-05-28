import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // 1. Extract caller JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing authorization' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

    // 2. Verify caller identity with their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser()
    if (userError || !callerUser) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // 3. Confirm caller has Admin rol in perfiles (RLS lets them only see their own row)
    const { data: perfil, error: perfilError } = await callerClient
      .from('perfiles')
      .select('rol')
      .eq('id', callerUser.id)
      .single()

    if (perfilError || perfil?.rol !== 'Admin') {
      return json({ error: 'Forbidden: Admin only' }, 403)
    }

    // 4. Parse request body
    const body = await req.json() as {
      email: string
      role: 'Admin' | 'Voluntario'
      permissions: {
        can_manage_electores: boolean
        can_access_gastos: boolean
        can_access_lista: boolean
        can_access_eventos: boolean
        can_access_campanas: boolean
      }
      invitedBy: string
    }

    const { email, role, permissions, invitedBy } = body
    if (!email || !role) {
      return json({ error: 'email and role are required' }, 400)
    }

    // 5. Admin client for privileged operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 6. Generate the invite link — hashed_token is the one-time token
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { rol: role },
        redirectTo: `${siteUrl}/auth/set-password`,
      },
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkError)
      return json({ error: 'Failed to generate invite link' }, 500)
    }

    // 7. Build hash-fragment URL so WhatsApp/Telegram crawlers can't consume the token
    const tokenHash = linkData.properties.hashed_token
    const inviteUrl = `${siteUrl}/auth/confirm#type=invite&token_hash=${tokenHash}`

    // 8. Upsert user_permissions — non-fatal if it fails
    const { error: permError } = await adminClient
      .from('user_permissions')
      .upsert({
        email,
        role,
        can_manage_electores: permissions.can_manage_electores,
        can_access_gastos: permissions.can_access_gastos,
        can_access_lista: permissions.can_access_lista,
        can_access_eventos: permissions.can_access_eventos,
        can_access_campanas: permissions.can_access_campanas,
        invited_at: new Date().toISOString(),
        invited_by: invitedBy ?? null,
        accepted_at: null,
      }, { onConflict: 'email' })

    if (permError) {
      console.error('upsert user_permissions error:', permError)
    }

    return json({ inviteUrl })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

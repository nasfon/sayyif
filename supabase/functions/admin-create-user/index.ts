import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: caller, error: callerErr } = await userClient
    .from('users')
    .select('shop_id, roles:role_id(name)')
    .eq('id', user.id)
    .single()
  if (callerErr || !caller) return json({ error: 'Forbidden' }, 403)

  const callerRole = (caller.roles as { name: string } | null)?.name
  if (callerRole !== 'super_admin' && callerRole !== 'shop_admin') {
    return json({ error: 'Forbidden' }, 403)
  }

  const body = await req.json()
  const { email, password, full_name, phone, role_name, shop_id } = body

  if (!email || !password || !full_name || !role_name) {
    return json({ error: 'Missing required fields' }, 400)
  }

  if (role_name === 'super_admin') {
    return json({ error: 'Creating super_admin accounts is not allowed' }, 403)
  }

  if (callerRole === 'shop_admin') {
    if (role_name === 'shop_admin') {
      return json({ error: 'Shop admins cannot create other shop admins' }, 403)
    }
    if (!shop_id || shop_id !== caller.shop_id) {
      return json({ error: 'Target shop must match your own shop' }, 403)
    }
  }

  if (role_name !== 'super_admin' && !shop_id) {
    return json({ error: 'shop_id is required for non super-admin users' }, 400)
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  console.error('admin.createUser input:', JSON.stringify({ email, role_name, shop_id }))

  const { data: newAuthUser, error: createErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (createErr) {
    console.error('admin.createUser error:', JSON.stringify(createErr, null, 2))
    return json({ error: createErr.message }, 400)
  }

  const { data: roleRow, error: roleErr } = await serviceClient
    .from('roles')
    .select('id')
    .eq('name', role_name)
    .single()
  if (roleErr || !roleRow) return json({ error: 'Invalid role' }, 400)

  const { error: profileErr } = await serviceClient.from('users').insert({
    id: newAuthUser.user.id,
    shop_id: role_name === 'super_admin' ? null : shop_id,
    role_id: roleRow.id,
    full_name,
    email,
    phone: phone ?? null,
  })
  if (profileErr) return json({ error: profileErr.message }, 400)

  await serviceClient.from('audit_logs').insert({
    shop_id: role_name === 'super_admin' ? null : shop_id,
    user_id: user.id,
    action: 'user_created',
    entity: 'user',
    entity_id: newAuthUser.user.id,
  })

    return json({ user: newAuthUser.user }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})

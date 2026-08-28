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
  const { user_id, new_password } = body
  if (!user_id || !new_password) {
    return json({ error: 'Missing required fields' }, 400)
  }

  const { data: target, error: targetErr } = await userClient
    .from('users')
    .select('shop_id, roles:role_id(name)')
    .eq('id', user_id)
    .single()
  if (targetErr || !target) return json({ error: 'Target user not found' }, 404)

  if (callerRole === 'shop_admin') {
    if (target.shop_id !== caller.shop_id) {
      return json({ error: 'Target shop must match your own shop' }, 403)
    }
    if ((target.roles as { name: string } | null)?.name === 'super_admin') {
      return json({ error: 'Cannot reset a super_admin password' }, 403)
    }
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { error: updErr } = await serviceClient.auth.admin.updateUserById(user_id, {
    password: new_password,
  })
  if (updErr) return json({ error: updErr.message }, 400)

  await serviceClient.from('audit_logs').insert({
    shop_id: caller.shop_id ?? null,
    user_id: user.id,
    action: 'user_password_reset',
    entity: 'user',
    entity_id: user_id,
  })

    return json({ ok: true }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})

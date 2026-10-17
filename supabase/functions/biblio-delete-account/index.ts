// supabase/functions/biblio-delete-account/index.ts
// Función Edge para borrado completo y seguro de cuenta (F-B2)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verificar usuario a través de su JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const userId = user.id

  try {
    // 1. Borrar biblio_entries
    await adminClient.from('biblio_entries').delete().eq('user_id', userId)

    // 2. Borrar biblio_friends en ambas direcciones
    await adminClient
      .from('biblio_friends')
      .delete()
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    // 3. Borrar biblio_invites creadas por el usuario
    await adminClient.from('biblio_invites').delete().eq('creator_id', userId)

    // 4. Anular user_id en biblio_events
    await adminClient.from('biblio_events').update({ user_id: null }).eq('user_id', userId)

    // 5. Borrar archivos del usuario en el bucket biblio-avatars si existe
    try {
      const { data: files } = await adminClient.storage.from('biblio-avatars').list(userId)
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${userId}/${f.name}`)
        await adminClient.storage.from('biblio-avatars').remove(filePaths)
      }
    } catch {
      // Ignorar si el bucket no existe todavía
    }

    // 6. Borrar biblio_profiles
    await adminClient.from('biblio_profiles').delete().eq('id', userId)

    // 7. Borrar auth.users
    const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteUserErr) {
      throw deleteUserErr
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error al borrar cuenta' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

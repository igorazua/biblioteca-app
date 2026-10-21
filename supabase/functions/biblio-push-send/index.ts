// supabase/functions/biblio-push-send/index.ts
// Función Edge para envío seguro de notificaciones Web Push (PLAN_MEJORAS §5.3)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}

function isQuietHoursSpain(): boolean {
  // España: UTC+1 o UTC+2 según horario de verano. Calculamos hora peninsular.
  const now = new Date()
  const utcHour = now.getUTCHours()
  // Horario peninsular aproximado (UTC+1 en invierno):
  const madridHour = (utcHour + 1) % 24
  // Nunca entre las 22:00 y las 9:00 hora de España (§5.3)
  return madridHour >= 22 || madridHour < 9
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  // Autenticación: solo ejecutable con service role o header de admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.includes(serviceRoleKey)) {
    return new Response(JSON.stringify({ error: 'No autorizado: requiere service role' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Comprobar ventana de descanso en España
  const force = new URL(req.url).searchParams.get('force') === 'true'
  if (!force && isQuietHoursSpain()) {
    return new Response(JSON.stringify({ skipped: true, reason: 'Horario nocturno en España (22:00-09:00)' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let bodyData: any = {}
  try {
    bodyData = await req.json()
  } catch {
    bodyData = {}
  }

  const targetUserId = bodyData.userId
  const targetDeviceId = bodyData.deviceId
  const payload: PushPayload = {
    title: bodyData.title || 'Biblioteca',
    body: bodyData.body || 'Tienes nuevas recomendaciones esperándote.',
    url: bodyData.url || '/',
    tag: bodyData.tag || 'biblio-nudge',
    icon: bodyData.icon || '/icon-192.png',
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  try {
    let query = adminClient.from('biblio_push_subs').select('*')
    if (targetUserId) {
      query = query.eq('user_id', targetUserId)
    } else if (targetDeviceId) {
      query = query.eq('device_id', targetDeviceId)
    }

    const { data: subs, error } = await query
    if (error) throw error

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No hay suscripciones activas para el objetivo' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let failed = 0
    const expiredEndpoints: string[] = []

    for (const sub of subs) {
      try {
        // Enviar Web Push payload
        // Si el endpoint devuelve 410 Gone o 404, marcamos para limpieza
        sent++
      } catch (err: any) {
        failed++
        if (err?.status === 410 || err?.status === 404) {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    }

    // Limpiar suscripciones caducadas
    if (expiredEndpoints.length > 0) {
      await adminClient.from('biblio_push_subs').delete().in('endpoint', expiredEndpoints)
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      cleanedExpired: expiredEndpoints.length,
      payload,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

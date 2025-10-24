import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Manejar la solicitud 'OPTIONS' (necesario para CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crear un cliente de Supabase CON PERMISOS DE ADMIN
    // (Esto es seguro, la 'service_role' key vive en el servidor)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Obtener los datos del formulario (email, rol, etc.)
    const { email, full_name, role, pharmacy_id } = await req.json()

    if (!email || !full_name || !role) {
      throw new Error("Faltan campos obligatorios: email, full_name, role.")
    }

    // 3. ¡LLAMAR A LA API DE ADMIN! (La llamada correcta)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { // Estos son los metadatos que usará nuestro trigger
          full_name: full_name,
          role: role,
          pharmacy_id: pharmacy_id
        }
      }
    )

    if (error) {
      throw error // Lanza el error para que lo capture el 'catch'
    }

    // 4. Devolver éxito
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 5. Devolver error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
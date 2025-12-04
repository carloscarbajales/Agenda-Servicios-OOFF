import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Definimos las cabeceras CORS aquí mismo para evitar problemas de importación
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Manejo de Preflight (OPTIONS) - Vital para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, email, password, full_name, role, pharmacy_id } = await req.json()

    let result

    // --- CREAR USUARIO ---
    if (action === 'create') {
        if (!email || !password) throw new Error("Email y contraseña requeridos")

        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name, role, pharmacy_id }
        })
        if (createError) throw createError

        // Actualizar perfil
        await supabaseAdmin.from('profiles').update({ 
            full_name: full_name, 
            role: role, 
            pharmacy_id: pharmacy_id ? parseInt(pharmacy_id) : null,
            active: true
        }).eq('id', user.user.id)

        result = { message: "Usuario creado con éxito" }
    } 
    
    // --- ACTUALIZAR USUARIO ---
    else if (action === 'update') {
        if (!userId) throw new Error("Falta ID usuario")
        
        // 1. Intentar actualizar Auth (si tiene login)
        const authUpdates: any = {}
        if (email) authUpdates.email = email
        if (password && password.trim() !== "") authUpdates.password = password
        
        // Si hay cambios de credenciales, intentamos actualizar Auth
        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
            // Si falla porque el usuario no existe en Auth (es local), lo ignoramos.
            // Si falla por otra cosa, lanzamos error.
            if (authError && !authError.message.includes("User not found")) {
                throw authError
            }
        }

        // 2. Actualizar Perfil (Siempre)
        const profileUpdates: any = {}
        if (full_name) profileUpdates.full_name = full_name
        if (role) profileUpdates.role = role
        if (pharmacy_id !== undefined) profileUpdates.pharmacy_id = pharmacy_id ? parseInt(pharmacy_id) : null

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId)

        if (profileError) throw profileError
        result = { message: "Usuario actualizado" }
    }
    else {
        throw new Error("Acción desconocida")
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // ¡IMPORTANTE! Devolver headers también en error
      status: 400,
    })
  }
})
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Reutilizamos los headers CORS

console.log('Reset Password Function Initializing'); // Log para saber que la función se carga

Deno.serve(async (req) => {
  // Manejo preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtenemos el ID del empleado del cuerpo de la solicitud
    const { employee_id } = await req.json()
    if (!employee_id) {
      throw new Error('Falta el ID del empleado (employee_id).')
    }
    console.log('Received reset request for employee_id:', employee_id); // Log

    // Creamos cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtenemos el email del empleado usando su ID (necesario para generateLink)
    console.log('Fetching user details...'); // Log
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(employee_id)

    if (userError) {
      console.error('Error fetching user:', userError); // Log detallado
      throw new Error(`Error al buscar usuario: ${userError.message}`)
    }
    if (!user?.user?.email) {
       console.error('User found but email is missing:', user); // Log
      throw new Error('No se encontró el email para este usuario.')
    }

    const userEmail = user.user.email;
    console.log('User email found:', userEmail); // Log

    // Generamos el enlace de reseteo (tipo 'recovery')
    console.log('Generating recovery link...'); // Log
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery', // Indica que es para resetear contraseña
      email: userEmail,
      // Opcional: redirectTo - A dónde ir después de resetear (por defecto, tu Site URL)
      // redirectTo: 'http://localhost:3000/update-password' // Ejemplo
    })

    if (error) {
      console.error('Error generating link:', error); // Log detallado
      throw error
    }

    console.log('Recovery link generated successfully.'); // Log

    // La función generateLink ya envía el email automáticamente.
    // Devolvemos un mensaje de éxito.
    return new Response(JSON.stringify({ message: 'Email de reseteo enviado correctamente.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in reset-employee-password function:', error); // Log del error completo
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // O 500 si es un error interno
    })
  }
})
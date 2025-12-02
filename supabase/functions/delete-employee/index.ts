import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Delete Employee Function Initializing');

Deno.serve(async (req) => {
  // Manejo preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtenemos el ID del empleado a borrar
    const { employee_id } = await req.json()
    if (!employee_id) {
      throw new Error('Falta el ID del empleado (employee_id).')
    }
    console.log('Received delete request for employee_id:', employee_id);

    // Creamos cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ¡Llamamos a la API de Admin para borrar el usuario!
    console.log('Attempting to delete user...');
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(
      employee_id
      // , shouldSoftDelete // Opcional: poner a true para borrado "suave" si lo configuras
    )

    if (error) {
      console.error('Error deleting user:', error);
      // Manejar caso específico: Usuario no encontrado
      if (error.message.includes('User not found')) {
          // Podríamos considerar esto un éxito si el objetivo es que no exista
          console.warn(`User ${employee_id} not found, potentially already deleted.`);
          // Devolver éxito de todos modos o un mensaje específico
          return new Response(JSON.stringify({ message: 'Usuario no encontrado, posible que ya estuviera borrado.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200, // O 404 Not Found si prefieres indicar que no se encontró
          })
      }
      throw new Error(`Error al borrar usuario: ${error.message}`) // Lanza otros errores
    }

    console.log('User deleted successfully:', data);

    // El Trigger "ON DELETE CASCADE" en la tabla `profiles` (si lo configuramos)
    // debería borrar automáticamente la fila correspondiente en `profiles`.

    return new Response(JSON.stringify({ message: 'Empleado borrado correctamente (cuenta y perfil).' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in delete-employee function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('User not found') ? 404 : 500, // Devuelve 404 si no se encuentra
    })
  }
})
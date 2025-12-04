// En supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
3.  **Despliega la función:**
```bash
npx supabase functions deploy manage-employees --no-verify-jwt
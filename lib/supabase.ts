import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser/anon Supabase client.
//
// Construction is deferred until first use so that server-side prerendering of
// the dashboard pages during `next build` never calls createClient() with
// missing env vars (which throws "supabaseUrl is required"). At runtime the
// NEXT_PUBLIC_* vars are inlined and the real client is created on first access.
let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = (getClient() as any)[prop]
    return typeof value === 'function' ? value.bind(getClient()) : value
  },
})

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client for server-side route handlers.
//
// Construction is deferred until the first property access. If we called
// createClient() at module load, `next build` would throw "supabaseUrl is
// required" while collecting page data (it imports every route module before
// env vars are guaranteed to be inlined). The lazy proxy lets the module be
// imported safely at build time and only constructs the real client at request
// time, when the env vars are present.
let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return client
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = (getClient() as any)[prop]
    return typeof value === 'function' ? value.bind(getClient()) : value
  },
})

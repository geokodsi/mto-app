import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client for server-side route handlers.
//
// Like the Supabase admin client, construction is deferred until first use.
// `new Anthropic({ apiKey })` throws when the key is missing, which would crash
// `next build` while it collects page data (every route module is imported
// before env vars are guaranteed available). The lazy proxy defers that to
// request time.
let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return client
}

export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    const value = (getClient() as any)[prop]
    return typeof value === 'function' ? value.bind(getClient()) : value
  },
})

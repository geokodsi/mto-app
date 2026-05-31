// Shared Twilio WhatsApp helpers for server-side route handlers.
//
// We talk to Twilio's REST API directly with fetch + Basic auth so we don't add
// the `twilio` SDK as a dependency. Credentials are read at call time (never at
// module load) so `next build` can import these route modules without the env
// vars being present yet — mirroring lib/anthropic.ts and lib/supabaseAdmin.ts.

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

/** Strip the "whatsapp:" channel prefix and surrounding whitespace from a number. */
export function normalizePhone(raw: string): string {
  return (raw || '').replace(/^whatsapp:/i, '').trim()
}

/** Keep only the leading "+" and digits — the shape Twilio and wa.me expect. */
export function toE164ish(raw: string): string {
  const s = normalizePhone(raw)
  const plus = s.startsWith('+') ? '+' : ''
  return plus + s.replace(/[^\d]/g, '')
}

export interface SendResult {
  ok: boolean
  sid?: string
  error?: string
  /** True when Twilio credentials aren't configured yet (vs. a real send failure). */
  notConfigured?: boolean
}

/**
 * Send a single WhatsApp message via the Twilio Messages API.
 * `to` may be given with or without the "whatsapp:" prefix.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio not configured — skipping WhatsApp send to', normalizePhone(to))
    return { ok: false, notConfigured: true, error: 'Twilio is not configured' }
  }

  const params = new URLSearchParams({
    From: `whatsapp:${toE164ish(fromNumber)}`,
    To: `whatsapp:${toE164ish(to)}`,
    Body: body,
  })

  try {
    const res = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = data?.message || `Twilio responded ${res.status}`
      console.error('Twilio send error:', message, '| to', normalizePhone(to))
      return { ok: false, error: message }
    }
    return { ok: true, sid: data?.sid }
  } catch (err: any) {
    console.error('Twilio send exception:', err?.message || err)
    return { ok: false, error: err?.message || 'Twilio request failed' }
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build a TwiML response containing one <Message> per string. Twilio delivers
 * them to the candidate in order, so the webhook can reply without a second
 * outbound HTTP call.
 */
export function buildTwiml(messages: string | string[]): string {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(Boolean)
  const body = list.map(m => `<Message>${escapeXml(m)}</Message>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`
}

export const twimlResponseInit = {
  headers: { 'Content-Type': 'text/xml; charset=utf-8' },
}

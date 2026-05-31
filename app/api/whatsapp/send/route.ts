import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/twilio'

// Send a WhatsApp message via the Twilio API.
// Body: { to: string (phone number), message: string }
export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json()

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 })
    }

    const result = await sendWhatsAppMessage(String(to), String(message))

    if (!result.ok) {
      const status = result.notConfigured ? 400 : 502
      return NextResponse.json({ error: result.error || 'Send failed' }, { status })
    }

    return NextResponse.json({ ok: true, sid: result.sid })
  } catch (err: any) {
    console.error('WhatsApp send route error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Send failed' }, { status: 500 })
  }
}

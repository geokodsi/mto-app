import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Sends a test email using the client's own Resend API key + sending address,
// so they can confirm their setup works before saving. We use the values posted
// from the Settings form directly (they may not be saved yet) and send the test
// to their own sending address.
export async function POST(req: NextRequest) {
  try {
    const { apiKey, sendingEmail } = await req.json()

    if (!apiKey || !sendingEmail) {
      return NextResponse.json(
        { error: 'Please enter both your Resend API key and sending email address.' },
        { status: 400 }
      )
    }

    const resend = new Resend(apiKey)

    const result = await resend.emails.send({
      from: sendingEmail,
      to: sendingEmail,
      subject: 'Your RecruitAI email connection works ✅',
      text:
        'Success! This is a test email from RecruitAI.\n\n' +
        'Your Resend API key and sending address are configured correctly. ' +
        'Candidate outreach will now be sent from this address.',
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Resend rejected the test email. Check your API key and that your domain is verified.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, id: result.data?.id ?? null })
  } catch (err: any) {
    console.error('Email test error:', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Could not send the test email.' },
      { status: 500 }
    )
  }
}

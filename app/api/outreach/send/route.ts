import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = 'onboarding@resend.dev'

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobId, subject, body } = await req.json()
    if (!candidateId || !jobId || !subject || !body) {
      return NextResponse.json({ error: 'Missing candidateId, jobId, subject, or body' }, { status: 400 })
    }

    const { data: candidate, error: cErr } = await supabase
      .from('sourced_candidates')
      .select('email, company_id')
      .eq('id', candidateId)
      .single()
    if (cErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Attempt the actual send. Per spec, a failed send still records the
    // outreach_emails row — the error is logged and surfaced in the response.
    let sendError: string | null = null
    let providerMessageId: string | null = null

    if (!candidate.email) {
      sendError = 'Candidate has no email address on file'
      console.error('Resend skipped:', sendError, 'candidate', candidateId)
    } else {
      try {
        const result = await resend.emails.send({
          from: FROM_ADDRESS,
          to: candidate.email,
          subject,
          text: body,
        })
        if (result.error) {
          sendError = result.error.message || 'Resend returned an error'
          console.error('Resend error:', result.error, '| candidate', candidateId)
        } else {
          providerMessageId = result.data?.id ?? null
        }
      } catch (err: any) {
        sendError = err?.message || 'Resend SDK threw'
        console.error('Resend exception:', err, '| candidate', candidateId)
      }
    }

    const now = new Date().toISOString()
    const { data: email, error: insertError } = await supabase
      .from('outreach_emails')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        company_id: candidate.company_id,
        subject,
        body,
        status: 'sent',
        sent_at: now,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Outreach insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // sourced_candidates.status is constrained to ('new','contacted','replied');
    // 'sent' maps to 'contacted' on the candidate row. The outreach_emails row
    // is the source of truth for the finer pending/sent/opened/replied state.
    const { error: candidateUpdateError } = await supabase
      .from('sourced_candidates')
      .update({ status: 'contacted' })
      .eq('id', candidateId)

    if (candidateUpdateError) {
      console.error('Candidate status update error:', candidateUpdateError)
    }

    return NextResponse.json({ ...email, sendError, providerMessageId })
  } catch (err: any) {
    console.error('Outreach send error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Send failed' }, { status: 500 })
  }
}

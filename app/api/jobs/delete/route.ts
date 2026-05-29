import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

// Deletes a job and every record that references it. Most of the foreign keys
// (candidates, screenings, bookings, questions, outreach_emails → jobs) are
// ON DELETE NO ACTION, and candidates/screenings/bookings/outreach_emails are
// not deletable under the client's RLS policies — so this runs with the
// service-role key and removes dependents explicitly, in FK-safe order, before
// removing the job itself.
//
// We require the caller to pass the company_id (which the client reads from its
// authenticated profile) and only proceed when it matches the job's company.
export async function POST(req: NextRequest) {
  try {
    const { jobId, companyId } = await req.json()
    if (!jobId || !companyId) {
      return NextResponse.json({ error: 'Missing jobId or companyId' }, { status: 400 })
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, company_id')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.company_id !== companyId) {
      return NextResponse.json({ error: 'You do not have access to this job' }, { status: 403 })
    }

    // Delete children before parents. bookings/screenings reference candidates,
    // and outreach_emails references sourced_candidates, so clear those first.
    const steps: { table: string; column: string }[] = [
      { table: 'bookings', column: 'job_id' },
      { table: 'screenings', column: 'job_id' },
      { table: 'outreach_emails', column: 'job_id' },
      { table: 'candidates', column: 'job_id' },
      { table: 'questions', column: 'job_id' },
      { table: 'sourced_candidates', column: 'job_id' },
    ]

    for (const step of steps) {
      const { error } = await supabase.from(step.table).delete().eq(step.column, jobId)
      if (error) {
        console.error(`Job delete failed clearing ${step.table}:`, error)
        return NextResponse.json(
          { error: `Failed to delete related ${step.table}: ${error.message}` },
          { status: 500 }
        )
      }
    }

    const { error: delErr } = await supabase.from('jobs').delete().eq('id', jobId)
    if (delErr) {
      console.error('Job delete failed:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Job delete error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export async function POST() {
  const cutoff = new Date(Date.now() - TWO_HOURS_MS).toISOString()

  const { data: stale, error } = await supabase
    .from('candidates')
    .select('id, job_id')
    .eq('status', 'in_progress')
    .lt('created_at', cutoff)

  if (error) {
    console.error('Cleanup query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ cleaned: 0 })
  }

  const ids = stale.map(c => c.id)

  const { error: updateError } = await supabase
    .from('candidates')
    .update({ status: 'declined' })
    .in('id', ids)

  if (updateError) {
    console.error('Cleanup update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  const screenings = stale.map(c => ({
    candidate_id: c.id,
    job_id: c.job_id,
    summary: 'Candidate did not complete screening',
    total_score: 0,
    status: 'declined',
    completed_at: now,
  }))

  const { error: insertError } = await supabase
    .from('screenings')
    .insert(screenings)

  if (insertError) {
    console.error('Cleanup insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ cleaned: stale.length })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobId, slot } = await req.json()
    if (!candidateId || !jobId || !slot) {
      return NextResponse.json({ error: 'Missing candidateId, jobId, or slot' }, { status: 400 })
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({ candidate_id: candidateId, job_id: jobId, booked_slot: slot, status: 'confirmed' })
      .select()
      .single()

    if (error) {
      console.error('Booking insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status: 'booked' })
      .eq('id', candidateId)

    if (updateError) {
      console.error('Candidate status update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

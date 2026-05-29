import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

function extractJson(raw: string) {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence) s = fence[1].trim()
  try {
    return JSON.parse(s)
  } catch {
    const obj = s.match(/\{[\s\S]*\}/)
    if (obj) return JSON.parse(obj[0])
    throw new Error('No JSON object found in model response')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobId } = await req.json()
    if (!candidateId || !jobId) {
      return NextResponse.json({ error: 'Missing candidateId or jobId' }, { status: 400 })
    }

    const { data: candidate, error: cErr } = await supabase
      .from('sourced_candidates')
      .select('name, headline, skills, linkedin_url, github_url, fit_reason')
      .eq('id', candidateId)
      .single()
    if (cErr || !candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const { data: job, error: jErr } = await supabase
      .from('jobs')
      .select('title, description')
      .eq('id', jobId)
      .single()
    if (jErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const skills = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : ''

    const prompt = `You are writing a personalized cold outreach email from a recruiter to a sourced candidate.

Candidate:
- Name: ${candidate.name}
- Headline: ${candidate.headline || '—'}
- Skills: ${skills || '—'}
- LinkedIn: ${candidate.linkedin_url || '—'}
- Why we sourced them: ${candidate.fit_reason || '—'}

Role we are hiring for:
- Title: ${job.title}
- Description: ${job.description || '—'}

Write a short, warm outreach email (4-6 sentences, no buzzwords, no exclamation marks) that:
- Opens with something specific about the candidate (their headline, a skill, or what stood out)
- Briefly explains why they would be a fit for the role
- Invites them to a 15-minute chat next week
- Signs off naturally as a recruiter (use "Best, the MTO team" — no fake name)

Subject line should be specific to the candidate and the role, under 60 characters, no clickbait.

Return ONLY valid JSON:
{"subject": "...", "body": "..."}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const result = extractJson(text)
    if (!result.subject || !result.body) {
      console.error('Generate parse error: missing fields', text)
      return NextResponse.json({ error: 'Model returned incomplete email' }, { status: 502 })
    }

    return NextResponse.json({ subject: String(result.subject), body: String(result.body) })
  } catch (err: any) {
    console.error('Outreach generate error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Generation failed' }, { status: 500 })
  }
}

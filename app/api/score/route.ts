import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// The model often wraps its JSON in ```json fences or adds prose, which
// breaks JSON.parse. Strip fences and fall back to the first {...} block.
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
  const { jobId, candidateId, conversation } = await req.json()
  console.log('Score API called with:', { jobId, candidateId })

  const { data: job } = await supabase
    .from('jobs')
    .select('*, questions(*)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const questionList = job.questions
    .map((q: any) => `- ${q.question_text} (pass criteria: ${q.pass_criteria})`)
    .join('\n')

  const conversationText = conversation
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n')

  let text: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Score this screening conversation for the role of ${job.title}.

Questions and pass criteria:
${questionList}

Conversation:
${conversationText}

Return ONLY valid JSON:
{"total_score": 75, "passed": true, "summary": "one sentence summary for recruiter"}`
      }]
    })
    text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  } catch (err: any) {
    console.error('Anthropic error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'AI service error' }, { status: 502 })
  }

  try {
    const result = extractJson(text)
    const passed = result.total_score >= job.pass_threshold

    await supabase.from('screenings').insert({
      candidate_id: candidateId,
      job_id: jobId,
      conversation,
      total_score: result.total_score,
      summary: result.summary,
      status: passed ? 'passed' : 'declined'
    })

    await supabase.from('candidates').update({
      status: passed ? 'passed' : 'declined'
    }).eq('id', candidateId)

    return NextResponse.json({ ...result, passed })
  } catch (err) {
    console.error('Score parse/save error:', err, '| raw text:', text)
    return NextResponse.json({ passed: false, total_score: 0, summary: 'Could not score' })
  }
}
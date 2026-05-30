import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

// CVs are sent from the widget as base64. PDFs are handed to Claude natively as
// a document block; everything else (txt, and best-effort doc/docx) is decoded
// to text and sent as a plain-text document. This keeps the route dependency
// free while giving the model the richest possible view of a PDF résumé.
export const maxDuration = 60

// The model often wraps its JSON in ```json fences or adds prose, which breaks
// JSON.parse. Strip fences and fall back to the first {...} block. (Mirrors the
// helper in app/api/score/route.ts.)
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
  const { jobId, candidateId, fileBase64, mediaType, fileName } = await req.json()

  if (!jobId || !fileBase64) {
    return NextResponse.json({ error: 'jobId and fileBase64 are required' }, { status: 400 })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*, questions(*)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const questions = (job.questions || []).sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const questionList = questions
    .map((q: any, i: number) => `${i + 1}. ${q.question_text} (pass criteria: ${q.pass_criteria})`)
    .join('\n')

  const systemPrompt = `You are analysing a candidate CV for the role of ${job.title}. Extract their experience, skills, education and score them against these criteria:
${questionList || '(no specific questions provided — score overall fit for the role)'}

Return ONLY valid JSON (no markdown, no prose) with exactly this shape:
{
  "name": "candidate full name, or null if not found",
  "email": "candidate email, or null if not found",
  "skills": ["skill", "..."],
  "years_experience": 0,
  "education": "highest / most relevant qualification as a short string",
  "scores": [{ "question": "the criterion text", "score": 0, "max": 10, "reasoning": "one short sentence" }],
  "total_score": 0,
  "passed": true,
  "summary": "exactly two sentences for the recruiter"
}

Scoring rules:
- Score each criterion out of 10 in "scores".
- "total_score" is on a 0-100 scale (overall fit).
- "passed" is true if total_score >= ${job.pass_threshold ?? 60}.
- Base everything strictly on evidence in the CV; do not invent experience.`

  // Build the document content block. PDFs go in natively; anything else is
  // decoded to UTF-8 text (clean for .txt, best-effort for .doc/.docx).
  const isPdf = (mediaType || '').includes('pdf') || (fileName || '').toLowerCase().endsWith('.pdf')
  let documentBlock: any
  if (isPdf) {
    documentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
    }
  } else {
    let text = ''
    try {
      text = Buffer.from(fileBase64, 'base64').toString('utf-8')
    } catch {
      text = ''
    }
    // Strip the binary noise that surrounds the readable text in .doc/.docx so
    // the model isn't drowned in control characters.
    text = text.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ').replace(/\s{3,}/g, '  ').trim()
    if (!text) {
      return NextResponse.json(
        { error: 'Could not read any text from that file. Please upload a PDF.' },
        { status: 422 }
      )
    }
    documentBlock = {
      type: 'document',
      source: { type: 'text', media_type: 'text/plain', data: text.slice(0, 100000) },
    }
  }

  let responseText: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            documentBlock,
            { type: 'text', text: 'Analyse this CV and return the JSON described in the system prompt.' },
          ],
        },
      ],
    })
    responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  } catch (err: any) {
    console.error('Anthropic error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'AI service error' }, { status: 502 })
  }

  let result: any
  try {
    result = extractJson(responseText)
  } catch (err) {
    console.error('CV parse error:', err, '| raw text:', responseText)
    return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText }, { status: 500 })
  }

  const totalScore = Number(result.total_score) || 0
  const passed = totalScore >= (job.pass_threshold ?? 60)
  const skills = Array.isArray(result.skills) ? result.skills : []
  const yearsExperience =
    result.years_experience === null || result.years_experience === undefined
      ? null
      : Number(result.years_experience)

  // Persist the screening (mirrors app/api/score/route.ts, plus the CV-specific
  // columns). candidateId is optional — the sourcing flow parses CVs without one.
  if (candidateId) {
    const { error: screeningErr } = await supabase.from('screenings').insert({
      candidate_id: candidateId,
      job_id: jobId,
      conversation: null,
      total_score: totalScore,
      summary: result.summary || '',
      status: passed ? 'passed' : 'declined',
      via_cv: true,
      skills,
      years_experience: yearsExperience,
      education: result.education || null,
      scores: result.scores || null,
    })
    if (screeningErr) console.error('Screening insert error:', screeningErr.message)

    const { error: candidateErr } = await supabase
      .from('candidates')
      .update({ status: passed ? 'passed' : 'declined' })
      .eq('id', candidateId)
    if (candidateErr) console.error('Candidate update error:', candidateErr.message)
  }

  return NextResponse.json({
    name: result.name || null,
    email: result.email || null,
    skills,
    years_experience: yearsExperience,
    education: result.education || null,
    scores: result.scores || [],
    total_score: totalScore,
    passed,
    summary: result.summary || '',
    via_cv: true,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

// Parses a sourced candidate's CV and returns the fields we use to auto-fill
// their profile (name, headline, skills, years of experience). Unlike
// app/api/parse-cv this does no scoring and writes nothing — the sourcing page
// owns the sourced_candidates update via the browser client.
export const maxDuration = 60

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
  const { fileBase64, mediaType, fileName } = await req.json()

  if (!fileBase64) {
    return NextResponse.json({ error: 'fileBase64 is required' }, { status: 400 })
  }

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

  const systemPrompt = `You are extracting a candidate's profile from their CV for a recruiter's sourcing pipeline. Return ONLY valid JSON (no markdown, no prose) with exactly this shape:
{
  "name": "candidate full name",
  "headline": "a concise professional headline, e.g. 'Senior Backend Engineer at Acme'",
  "skills": ["skill", "..."],
  "years_experience": 0,
  "email": "email if present, else null"
}
Base everything strictly on the CV. Keep the headline under 80 characters.`

  let responseText: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            documentBlock,
            { type: 'text', text: 'Extract the profile JSON described in the system prompt.' },
          ],
        },
      ],
    })
    responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  } catch (err: any) {
    console.error('Anthropic error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'AI service error' }, { status: 502 })
  }

  try {
    const result = extractJson(responseText)
    return NextResponse.json({
      name: result.name || null,
      headline: result.headline || null,
      skills: Array.isArray(result.skills) ? result.skills : [],
      years_experience:
        result.years_experience === null || result.years_experience === undefined
          ? null
          : Number(result.years_experience),
      email: result.email || null,
    })
  } catch (err) {
    console.error('CV parse error:', err, '| raw text:', responseText)
    return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText }, { status: 500 })
  }
}

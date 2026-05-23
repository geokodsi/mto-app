import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { name, headline, skills, experience, jobDescription } = await req.json()

  if (!jobDescription) {
    return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 })
  }

  const skillsList = Array.isArray(skills) ? skills.join(', ') : (skills || '')

  let text: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Score this candidate's fit for the role described below.

Candidate:
- Name: ${name || 'Unknown'}
- Headline: ${headline || 'N/A'}
- Skills: ${skillsList || 'N/A'}
- Experience: ${experience || 'N/A'}

Job Description:
${jobDescription}

Return ONLY valid JSON:
{"score": 7, "reason": "Two sentences max explaining the fit score. Be specific about strengths and gaps."}`
      }]
    })
    text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  } catch (err: any) {
    console.error('Anthropic error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'AI service error' }, { status: 502 })
  }

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json({ score: result.score, reason: result.reason })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}

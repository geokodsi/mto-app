import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const { jobTitle, jobDescription } = await req.json()

  if (!jobTitle || !jobDescription) {
    return NextResponse.json({ error: 'jobTitle and jobDescription are required' }, { status: 400 })
  }

  let text: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a recruiting expert. Generate 3 Boolean search strings to find candidates for this role.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Return ONLY valid JSON with exactly this shape — no markdown, no explanation:
{
  "linkedin": "the Boolean search string optimized for LinkedIn Recruiter",
  "github": "the Boolean search string optimized for GitHub search",
  "indeed": "the Boolean search string optimized for Indeed resume search"
}

Rules:
- Use AND, OR, NOT, and quotes around phrases
- Include relevant job titles, skills, and technologies from the description
- LinkedIn: target job titles and skills fields
- GitHub: use language: and topic: operators where relevant
- Indeed: mix title terms and skill keywords`
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
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}

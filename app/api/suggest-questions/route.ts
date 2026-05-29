import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json()
    const message = await anthropic.messages.create({
     model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate 5 screening questions for this job. Job title: ${title}. Description: ${description}. Return ONLY valid JSON: {"questions":[{"question_text":"...","pass_criteria":"...","weight":1}]}`
      }]
    })
    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Wrong type' }, { status: 500 })
    }
    const parsed = JSON.parse(content.text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
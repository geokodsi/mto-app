import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { jobId, candidateId, messages } = await req.json()

  const { data: job } = await supabase
    .from('jobs')
    .select('*, questions(*)')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const questionList = job.questions
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((q: any, i: number) => `${i + 1}. ${q.question_text} (pass criteria: ${q.pass_criteria})`)
    .join('\n')

  const systemPrompt = `You are a friendly screening assistant for the role of ${job.title}.

You MUST ask ALL of the following questions one by one before ending the conversation. Do not skip any questions. Do not end the conversation until every single question has been asked and answered. Only add [SCREENING_COMPLETE] after the candidate has answered ALL questions. Here are the questions you must ask:
${questionList}

Rules:
- Ask one question at a time
- Be warm and professional
- Do not mention scoring or evaluation
- When all questions are answered, thank them warmly and say the team will review their application
- Only after the candidate has answered ALL questions, end your final message with exactly: [SCREENING_COMPLETE]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const done = text.includes('[SCREENING_COMPLETE]')
    const cleanText = text.replace('[SCREENING_COMPLETE]', '').trim()

    const totalQuestions = job.questions.length
    const questionNumber = Math.min(messages.filter((m: any) => m.role === 'assistant').length + 1, totalQuestions)

    return NextResponse.json({ message: cleanText, done, questionNumber, totalQuestions })
  } catch (err: any) {
    console.error('Anthropic error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'AI service error' }, { status: 502 })
  }
}
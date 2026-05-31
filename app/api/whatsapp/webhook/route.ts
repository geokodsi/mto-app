import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { buildTwiml, twimlResponseInit, normalizePhone } from '@/lib/twilio'

// ── WhatsApp screening webhook ──────────────────────────────────────────────
//
// Twilio POSTs an inbound WhatsApp message here (application/x-www-form-urlencoded
// with From / To / Body / ProfileName). We drive the whole screening conversation
// from a per-phone `whatsapp_sessions` row and reply with TwiML so Twilio delivers
// our messages back to the candidate — no separate outbound call required.
//
// State machine (whatsapp_sessions.status):
//   screening      → asking AI-driven questions one at a time
//   awaiting_slot  → candidate passed, picking an interview time
//   booked         → interview confirmed (terminal)
//   declined       → did not pass (terminal)

const MODEL = 'claude-haiku-4-5-20251001'

type Msg = { role: 'user' | 'assistant'; content: string }

// Model JSON sometimes arrives wrapped in ```json fences or prose — same
// forgiving extraction used by /api/score.
function extractJson(raw: string): any {
  let s = (raw || '').trim()
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

function firstName(name: string | null | undefined): string {
  const n = (name || '').trim()
  return n ? n.split(/\s+/)[0] : 'there'
}

function digits(s: string): string {
  return (s || '').replace(/[^\d]/g, '')
}

interface Slot {
  iso: string
  label: string
}

function buildSlots(): Slot[] {
  function at(daysAhead: number, hour: number): Slot {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    d.setHours(hour, 0, 0, 0)
    const label = d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    return { iso: d.toISOString(), label }
  }
  return [at(1, 10), at(1, 14), at(2, 11)]
}

function slotsMessage(slots: Slot[]): string {
  const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
  const lines = slots.map((s, i) => `${nums[i] || `${i + 1}.`} ${s.label}`).join('\n')
  return `Reply with the number of the time that works best:\n\n${lines}`
}

function buildSystemPrompt(job: any, questions: any[]): string {
  const questionList = questions
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((q: any, i: number) => `${i + 1}. ${q.question_text} (pass criteria: ${q.pass_criteria})`)
    .join('\n')

  return `You are a friendly recruiting screening assistant chatting with a candidate over WhatsApp for the role of ${job.title}.

You MUST ask ALL of the following questions one by one before ending the conversation. Do not skip any questions. Do not end the conversation until every single question has been asked and answered. Only add [SCREENING_COMPLETE] after the candidate has answered ALL questions. Here are the questions you must ask:
${questionList}

Rules:
- Ask one question at a time and keep each message short and conversational — this is WhatsApp.
- Be warm and professional. A light emoji here and there is fine.
- Do not mention scoring or evaluation.
- When all questions are answered, thank them warmly and say the team will review their application.
- Only after the candidate has answered ALL questions, end your final message with exactly: [SCREENING_COMPLETE]`
}

// One screening turn: append the candidate message, ask the model for the next
// reply, and report back whether screening is complete.
async function runScreeningTurn(job: any, questions: any[], conversation: Msg[]) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: buildSystemPrompt(job, questions),
    messages: conversation,
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const done = raw.includes('[SCREENING_COMPLETE]')
  const message = raw.replace('[SCREENING_COMPLETE]', '').trim()
  return { message, done }
}

// Score the finished conversation with Claude and persist a screenings row.
async function scoreConversation(job: any, questions: any[], candidateId: string, conversation: Msg[]) {
  const questionList = questions
    .map((q: any) => `- ${q.question_text} (pass criteria: ${q.pass_criteria})`)
    .join('\n')
  const conversationText = conversation.map(m => `${m.role}: ${m.content}`).join('\n')

  let totalScore = 0
  let summary = 'Screened via WhatsApp.'
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Score this WhatsApp screening conversation for the role of ${job.title}.

Questions and pass criteria:
${questionList}

Conversation:
${conversationText}

Return ONLY valid JSON:
{"total_score": 75, "passed": true, "summary": "one sentence summary for recruiter"}`,
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const result = extractJson(text)
    totalScore = Number(result.total_score) || 0
    if (result.summary) summary = String(result.summary)
  } catch (err: any) {
    console.error('WhatsApp scoring error:', err?.message || err)
  }

  const passed = totalScore >= (job.pass_threshold ?? 70)

  await supabase.from('screenings').insert({
    candidate_id: candidateId,
    job_id: job.id,
    conversation,
    total_score: totalScore,
    summary,
    status: passed ? 'passed' : 'declined',
    completed_at: new Date().toISOString(),
  })

  await supabase.from('candidates').update({
    status: passed ? 'passed' : 'declined',
  }).eq('id', candidateId)

  return { totalScore, summary, passed }
}

// Resolve which job an inbound first message is applying for. The wa.me apply
// link seeds the body with "I want to apply for {title}", so we match the title
// inside the message, scoped to the recruiter's company when we can identify it.
async function resolveJob(toNumber: string, body: string) {
  // Identify the company by the WhatsApp Business number the candidate messaged.
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, whatsapp_number')
    .not('whatsapp_number', 'is', null)

  const toDigits = digits(toNumber)
  const company = (companies || []).find(c => digits(c.whatsapp_number) === toDigits) || null

  let query = supabase
    .from('jobs')
    .select('*, questions(*), companies(id, name)')
    .eq('active', true)
  if (company) query = query.eq('company_id', company.id)

  const { data: jobs } = await query
  const list = jobs || []
  if (list.length === 0) return null

  const lowerBody = (body || '').toLowerCase()
  // Prefer the longest matching title so "Senior Developer" wins over "Developer".
  const matches = list
    .filter((j: any) => j.title && lowerBody.includes(j.title.toLowerCase()))
    .sort((a: any, b: any) => b.title.length - a.title.length)

  if (matches.length > 0) return matches[0]
  // Fallback only when we know the tenant: their single/most-recent active job.
  if (company) return list[0]
  return null
}

function twiml(messages: string | string[]) {
  return new NextResponse(buildTwiml(messages), twimlResponseInit)
}

export async function POST(req: NextRequest) {
  try {
    // Twilio posts urlencoded; accept JSON too so the flow is easy to test.
    let From = '', To = '', Body = '', ProfileName = ''
    const ctype = req.headers.get('content-type') || ''
    if (ctype.includes('application/json')) {
      const j = await req.json()
      From = j.From || j.from || ''
      To = j.To || j.to || ''
      Body = j.Body || j.body || ''
      ProfileName = j.ProfileName || j.profileName || ''
    } else {
      const f = await req.formData()
      From = String(f.get('From') || '')
      To = String(f.get('To') || '')
      Body = String(f.get('Body') || '')
      ProfileName = String(f.get('ProfileName') || '')
    }

    const phone = normalizePhone(From)
    const body = (Body || '').trim()
    if (!phone) {
      return twiml('Sorry, we could not read your message. Please try again.')
    }

    // Most recent session for this phone number.
    const { data: sessions } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(1)
    const session = sessions?.[0] || null
    const isOpen = session && (session.status === 'screening' || session.status === 'awaiting_slot')

    // ── Continue an in-progress screening ───────────────────────────────────
    if (isOpen && session.status === 'screening') {
      const { data: job } = await supabase
        .from('jobs').select('*, questions(*)').eq('id', session.job_id).single()
      if (!job) return twiml('Sorry, this role is no longer available.')

      const questions = job.questions || []
      const conversation: Msg[] = [...(session.conversation || []), { role: 'user', content: body }]
      const { message, done } = await runScreeningTurn(job, questions, conversation)
      if (message) conversation.push({ role: 'assistant', content: message })

      if (!done) {
        await supabase.from('whatsapp_sessions').update({
          conversation,
          current_question: (session.current_question || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', session.id)
        return twiml(message)
      }

      // Screening finished — score it.
      const { passed } = await scoreConversation(job, questions, session.candidate_id, conversation)
      const name = firstName(session.candidate_name)

      if (passed) {
        const slots = buildSlots()
        await supabase.from('whatsapp_sessions').update({
          conversation,
          status: 'awaiting_slot',
          offered_slots: slots,
          updated_at: new Date().toISOString(),
        }).eq('id', session.id)
        return twiml([
          `🎉 Great news, ${name} — you've passed our initial screening for *${job.title}*!`,
          `Let's get your interview booked. ${slotsMessage(slots)}`,
        ])
      }

      await supabase.from('whatsapp_sessions').update({
        conversation,
        status: 'declined',
        updated_at: new Date().toISOString(),
      }).eq('id', session.id)
      return twiml([
        `Thanks so much for taking the time to apply for *${job.title}*, ${name}. 🙏`,
        `We've carefully reviewed your responses and won't be moving forward at this time. We genuinely appreciate your interest and wish you the very best.`,
      ])
    }

    // ── Candidate is picking an interview slot ──────────────────────────────
    if (isOpen && session.status === 'awaiting_slot') {
      const slots: Slot[] = session.offered_slots || []
      const name = firstName(session.candidate_name)
      const pick = body.match(/[1-9]/)
      const idx = pick ? parseInt(pick[0], 10) - 1 : -1

      if (idx < 0 || idx >= slots.length) {
        return twiml([
          `Sorry, I didn't catch that. ${slotsMessage(slots)}`,
        ])
      }

      const chosen = slots[idx]
      await supabase.from('bookings').insert({
        candidate_id: session.candidate_id,
        job_id: session.job_id,
        booked_slot: chosen.iso,
        status: 'confirmed',
      })
      await supabase.from('candidates').update({ status: 'booked' }).eq('id', session.candidate_id)
      await supabase.from('whatsapp_sessions').update({
        status: 'booked',
        updated_at: new Date().toISOString(),
      }).eq('id', session.id)

      const { data: job } = await supabase.from('jobs').select('title').eq('id', session.job_id).single()
      return twiml(
        `✅ You're all set, ${name}! Your interview${job?.title ? ` for *${job.title}*` : ''} is booked for *${chosen.label}*. ` +
        `You'll get a calendar invite by email shortly. See you then! 🎉`,
      )
    }

    // ── New application ─────────────────────────────────────────────────────
    const job = await resolveJob(To, body)
    if (!job) {
      return twiml(
        `Hi! 👋 To start your application, please tap the WhatsApp apply link for the specific role you're interested in. ` +
        `If you reached us by mistake, no worries at all!`,
      )
    }

    const questions = job.questions || []
    const candidateName = (ProfileName || '').trim() || `WhatsApp ${phone.slice(-4)}`
    const companyName = job.companies?.name || ''

    // Create the candidate record that flows into the main pipeline.
    const { data: candidate, error: candErr } = await supabase
      .from('candidates')
      .insert({ job_id: job.id, name: candidateName, email: null, status: 'in_progress' })
      .select()
      .single()
    if (candErr || !candidate) {
      console.error('WhatsApp candidate insert error:', candErr)
      return twiml('Sorry, something went wrong starting your application. Please try again shortly.')
    }

    // Seed the conversation with the candidate's opening message, then ask Q1.
    const conversation: Msg[] = [{
      role: 'user',
      content: `Hi, my name is ${candidateName}. I'd like to apply for the ${job.title} role. ${body}`.trim(),
    }]
    const { message, done } = await runScreeningTurn(job, questions, conversation)
    if (message) conversation.push({ role: 'assistant', content: message })

    // Almost always there are questions to ask; handle the empty-question edge
    // case by scoring immediately.
    if (done || questions.length === 0) {
      const { passed } = await scoreConversation(job, questions, candidate.id, conversation)
      const name = firstName(candidateName)
      if (passed) {
        const slots = buildSlots()
        await supabase.from('whatsapp_sessions').insert({
          job_id: job.id, company_id: job.company_id, candidate_id: candidate.id,
          phone_number: phone, candidate_name: candidateName, status: 'awaiting_slot',
          conversation, offered_slots: slots, current_question: questions.length,
        })
        return twiml([
          `Hi ${name}! 👋 Thanks for your interest in the *${job.title}* role${companyName ? ` at ${companyName}` : ''}.`,
          `🎉 Based on your message you've passed our initial screening! Let's book your interview. ${slotsMessage(slots)}`,
        ])
      }
      await supabase.from('whatsapp_sessions').insert({
        job_id: job.id, company_id: job.company_id, candidate_id: candidate.id,
        phone_number: phone, candidate_name: candidateName, status: 'declined',
        conversation, current_question: questions.length,
      })
      return twiml(`Thanks for applying for *${job.title}*, ${name}. 🙏 We've reviewed your application and won't be moving forward at this time.`)
    }

    await supabase.from('whatsapp_sessions').insert({
      job_id: job.id,
      company_id: job.company_id,
      candidate_id: candidate.id,
      phone_number: phone,
      candidate_name: candidateName,
      status: 'screening',
      conversation,
      current_question: 1,
    })

    return twiml([
      `Hi ${firstName(candidateName)}! 👋 Thanks for your interest in the *${job.title}* role${companyName ? ` at ${companyName}` : ''}. I'll ask you a few quick questions to get started.`,
      message,
    ])
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err?.message || err)
    return twiml('Sorry, something went wrong on our end. Please try again in a moment.')
  }
}

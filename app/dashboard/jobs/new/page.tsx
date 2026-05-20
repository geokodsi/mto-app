'use client'
import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

type Step = 1 | 2 | 3

interface Question {
  question_text: string
  pass_criteria: string
  weight: number
}

const STEPS = [
  { n: 1, label: 'Job details' },
  { n: 2, label: 'Questions' },
  { n: 3, label: 'Settings' },
]

export default function NewJobPage() {
  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: '', pass_criteria: '', weight: 1 },
  ])
  const [threshold, setThreshold] = useState(70)
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function suggestQuestions() {
    if (!description) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/suggest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (data.questions?.length) setQuestions(data.questions)
      else alert('Could not generate questions — please add them manually.')
    } catch {
      alert('Error generating questions.')
    }
    setSuggesting(false)
  }

  function updateQuestion(i: number, field: keyof Question, value: string) {
    const updated = [...questions]
    updated[i] = { ...updated[i], [field]: value }
    setQuestions(updated)
  }

  function removeQuestion(i: number) {
    if (questions.length === 1) return
    setQuestions(questions.filter((_, idx) => idx !== i))
  }

  function addQuestion() {
    setQuestions([...questions, { question_text: '', pass_criteria: '', weight: 1 }])
  }

  function canNext() {
    if (step === 1) return title.trim().length > 0
    if (step === 2) return questions.some(q => q.question_text.trim())
    return true
  }

  async function save() {
    const filled = questions.filter(q => q.question_text.trim())
    if (!filled.length) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (!profile) return

    const { data: job } = await supabase
      .from('jobs')
      .insert({ company_id: profile.company_id, title, description, pass_threshold: threshold, active: true })
      .select()
      .single()

    if (job) {
      await supabase.from('questions').insert(
        filled.map((q, i) => ({
          job_id: job.id,
          question_text: q.question_text,
          pass_criteria: q.pass_criteria,
          weight: q.weight || 1,
          sort_order: i,
        }))
      )
      router.push(`/dashboard/jobs/${job.id}`)
    }
    setSaving(false)
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create new job</h1>
        <p className="text-gray-500 text-sm mt-0.5">Set up AI screening for this role</p>
      </div>

      {/* Progress */}
      <div className="flex items-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step > s.n
                  ? 'bg-indigo-600 text-white'
                  : step === s.n
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s.n ? <Check size={16} /> : s.n}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${step >= s.n ? 'text-gray-700' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${step > s.n ? 'bg-indigo-600' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Job details */}
      {step === 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Job title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Job description <span className="text-gray-400 font-normal">(optional — used to suggest questions)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Paste the job description here…"
            />
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{questions.filter(q => q.question_text).length} question{questions.filter(q => q.question_text).length !== 1 ? 's' : ''} added</p>
            {description && (
              <button
                onClick={suggestQuestions}
                disabled={suggesting}
                className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={15} />
                {suggesting ? 'Generating…' : 'Suggest with AI'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Question {i + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={q.question_text}
                    onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. How many years of React experience do you have?"
                  />
                  <input
                    type="text"
                    value={q.pass_criteria}
                    onChange={e => updateQuestion(i, 'pass_criteria', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Pass criteria — e.g. At least 3 years"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-200 rounded-2xl py-3 text-sm text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <Plus size={15} /> Add another question
          </button>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Pass threshold</h2>
          <p className="text-sm text-gray-500 mb-6">
            Candidates scoring <span className="font-semibold text-indigo-600">{threshold}%</span> or above will move to Passed.
          </p>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-indigo-600 mb-3"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0% — Accept all</span>
            <span className="font-semibold text-indigo-600 text-sm">{threshold}%</span>
            <span>100% — Very selective</span>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Review</h3>
            <ul className="text-sm text-gray-500 space-y-1.5">
              <li><span className="font-medium text-gray-700">Title:</span> {title}</li>
              <li><span className="font-medium text-gray-700">Questions:</span> {questions.filter(q => q.question_text).length}</li>
              <li><span className="font-medium text-gray-700">Pass threshold:</span> {threshold}%</li>
            </ul>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep((step - 1) as Step)}
          disabled={step === 1}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-0 transition-colors"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canNext()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : <><Check size={16} /> Save job</>}
          </button>
        )}
      </div>
    </div>
  )
}

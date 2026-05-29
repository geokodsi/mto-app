'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Mail, Send, Sparkles, X, Code2, Briefcase, User,
  TrendingUp, MessageCircle, ThumbsUp, Loader2, Check,
} from 'lucide-react'

type OutreachStatus = 'pending' | 'draft' | 'sent' | 'opened' | 'replied'

interface OutreachEmail {
  id: string
  subject: string
  body: string
  status: 'draft' | 'sent' | 'opened' | 'replied'
  created_at: string
  sent_at: string | null
}

interface SourcedCandidate {
  id: string
  job_id: string
  name: string
  email: string | null
  headline: string | null
  skills: string[] | null
  linkedin_url: string | null
  github_url: string | null
  fit_score: number | null
  fit_reason: string | null
  source: 'linkedin' | 'github' | 'indeed' | 'manual'
  status: string
  outreach_emails: OutreachEmail[]
  jobs: { title: string | null } | null
}

type FilterKey = 'all' | 'pending' | 'sent' | 'opened' | 'replied'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
  { key: 'opened', label: 'Opened' },
  { key: 'replied', label: 'Replied' },
]

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-blue-500', 'bg-teal-500', 'bg-orange-500',
]

function getInitials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function avatarColor(name: string) {
  return AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length]
}

function outreachStatus(c: SourcedCandidate): OutreachStatus {
  const latest = c.outreach_emails?.[0]
  return (latest?.status as OutreachStatus) || 'pending'
}

function FitChip({ score }: { score: number | null }) {
  if (score == null) return null
  const tone =
    score >= 8 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
    score >= 5 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}>
      <Sparkles size={10} /> Fit {score}/10
    </span>
  )
}

function SourcePill({ source }: { source: SourcedCandidate['source'] }) {
  const Icon = source === 'github' ? Code2 : source === 'manual' ? User : Briefcase
  const label = source === 'linkedin' ? 'LinkedIn' : source === 'github' ? 'GitHub' : source === 'indeed' ? 'Indeed' : 'Manual'
  const map: Record<string, string> = {
    linkedin: 'bg-[#0a66c2]/10 text-[#0a66c2]',
    github: 'bg-gray-900/10 text-gray-700 dark:text-gray-300',
    indeed: 'bg-blue-800/10 text-blue-800 dark:text-blue-300',
    manual: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[source] || map.manual}`}>
      <Icon size={10} /> {label}
    </span>
  )
}

function StatusPill({ status }: { status: OutreachStatus }) {
  const map: Record<OutreachStatus, { label: string; cls: string; dot: string }> = {
    pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300', dot: 'bg-gray-400' },
    draft:   { label: 'Draft',   cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-gray-200', dot: 'bg-slate-400' },
    sent:    { label: 'Sent',    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', dot: 'bg-indigo-500' },
    opened:  { label: 'Opened',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
    replied: { label: 'Replied', cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500' },
  }
  const v = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} /> {v.label}
    </span>
  )
}

export default function OutreachPage() {
  const [candidates, setCandidates] = useState<SourcedCandidate[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{
    candidate: SourcedCandidate
    subject: string
    body: string
    generating: boolean
    sending: boolean
    error: string | null
  } | null>(null)
  const [bulkSending, setBulkSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('sourced_candidates')
      .select('id, job_id, name, email, headline, skills, linkedin_url, github_url, fit_score, fit_reason, source, status, jobs(title), outreach_emails(id, subject, body, status, created_at, sent_at)')
      .order('created_at', { ascending: false })
    const list = (data as any[] || []).map(c => ({
      ...c,
      outreach_emails: (c.outreach_emails || []).sort(
        (a: OutreachEmail, b: OutreachEmail) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    })) as SourcedCandidate[]
    setCandidates(list)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const counts = {
    all: candidates.length,
    pending: candidates.filter(c => outreachStatus(c) === 'pending').length,
    sent: candidates.filter(c => outreachStatus(c) === 'sent').length,
    opened: candidates.filter(c => outreachStatus(c) === 'opened').length,
    replied: candidates.filter(c => outreachStatus(c) === 'replied').length,
  }

  const filtered = filter === 'all'
    ? candidates
    : candidates.filter(c => outreachStatus(c) === filter)

  const sentish = candidates.filter(c => ['sent', 'opened', 'replied'].includes(outreachStatus(c)))
  const openedish = candidates.filter(c => ['opened', 'replied'].includes(outreachStatus(c)))
  const replied = candidates.filter(c => outreachStatus(c) === 'replied')
  const openRate = sentish.length ? Math.round(openedish.length / sentish.length * 100) : 0
  const replyRate = sentish.length ? Math.round(replied.length / sentish.length * 100) : 0
  // Positive replies will become a sentiment-derived count once we wire up
  // reply parsing; for now it mirrors the replied count as a placeholder.
  const positiveReplies = replied.length

  const stats = [
    { label: 'Total contacted', value: sentish.length.toString(), icon: Send, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { label: 'Open rate', value: `${openRate}%`, icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: 'Reply rate', value: `${replyRate}%`, icon: MessageCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Positive replies', value: positiveReplies.toString(), icon: ThumbsUp, iconBg: 'bg-pink-50', iconColor: 'text-pink-600' },
  ]

  async function startGenerate(c: SourcedCandidate) {
    const latest = c.outreach_emails?.[0]
    if (latest) {
      setEditing({ candidate: c, subject: latest.subject, body: latest.body, generating: false, sending: false, error: null })
      return
    }
    setEditing({ candidate: c, subject: '', body: '', generating: true, sending: false, error: null })
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: c.id, jobId: c.job_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setEditing(e => e && e.candidate.id === c.id ? { ...e, subject: data.subject, body: data.body, generating: false } : e)
    } catch (err: any) {
      setEditing(e => e && e.candidate.id === c.id ? { ...e, generating: false, error: err.message } : e)
    }
  }

  async function approveAndSend() {
    if (!editing) return
    setEditing(e => e && { ...e, sending: true, error: null })
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: editing.candidate.id,
          jobId: editing.candidate.job_id,
          subject: editing.subject,
          body: editing.body,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setEditing(null)
      showToast(`Email sent to ${editing.candidate.name}`)
      await loadData()
    } catch (err: any) {
      setEditing(e => e && { ...e, sending: false, error: err.message })
    }
  }

  async function sendAllPending() {
    const pending = candidates.filter(c => outreachStatus(c) === 'pending')
    if (pending.length === 0) return
    if (!confirm(`Generate and send personalized emails to ${pending.length} pending candidate${pending.length === 1 ? '' : 's'}? This cannot be undone.`)) return

    setBulkSending(true)
    let sent = 0
    let failed = 0
    for (const c of pending) {
      try {
        const gen = await fetch('/api/outreach/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: c.id, jobId: c.job_id }),
        })
        const genData = await gen.json()
        if (!gen.ok) throw new Error(genData.error)
        const send = await fetch('/api/outreach/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: c.id,
            jobId: c.job_id,
            subject: genData.subject,
            body: genData.body,
          }),
        })
        if (!send.ok) throw new Error('Send failed')
        sent++
      } catch {
        failed++
      }
    }
    setBulkSending(false)
    await loadData()
    showToast(failed === 0 ? `Sent ${sent} email${sent === 1 ? '' : 's'}` : `Sent ${sent}, ${failed} failed`)
  }

  return (
    <div>
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 sm:px-10 py-10 sm:py-12">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Mail size={18} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">AI Outreach Engine</h1>
        </div>
        <p className="text-indigo-200 text-sm sm:text-base ml-12">Personalized cold outreach to your sourced candidates, written by Claude.</p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          {stats.map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-snug">{stat.label}</p>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 ${stat.iconBg}`}>
                    <Icon size={18} className={stat.iconColor} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Filter tabs + bulk action */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-1 shadow-sm">
            {FILTERS.map(f => {
              const active = filter === f.key
              const n = counts[f.key]
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] px-1 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
                  }`}>
                    {n}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={sendAllPending}
            disabled={bulkSending || counts.pending === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {bulkSending ? `Sending ${counts.pending}…` : `Send all pending (${counts.pending})`}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
            <Loader2 size={20} className="mx-auto text-gray-300 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-12 text-center">
            <Mail size={28} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {filter === 'all'
                ? 'No sourced candidates yet. Find candidates from the Sourcing page first.'
                : `No candidates in the ${filter} stage yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const status = outreachStatus(c)
              const hasEmail = c.outreach_emails?.length > 0
              return (
                <div key={c.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(c.name)}`}>
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <StatusPill status={status} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1.5">
                        {c.headline || <span className="italic text-gray-400">No headline</span>}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <SourcePill source={c.source} />
                        <FitChip score={c.fit_score} />
                        {c.jobs?.title && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-500 dark:bg-slate-700 dark:text-gray-300">
                            <User size={10} /> {c.jobs.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => startGenerate(c)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex-shrink-0"
                    >
                      {hasEmail ? <><Mail size={13} /> View email</> : <><Sparkles size={13} /> Generate email</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !editing.sending && setEditing(null)}>
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(editing.candidate.name)}`}>
                  {getInitials(editing.candidate.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{editing.candidate.name}</p>
                  <p className="text-xs text-gray-400 truncate">{editing.candidate.headline || editing.candidate.email}</p>
                </div>
              </div>
              <button
                onClick={() => !editing.sending && setEditing(null)}
                className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                disabled={editing.sending}
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {editing.generating ? (
                <div className="py-12 text-center">
                  <Loader2 size={20} className="mx-auto text-indigo-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Drafting a personalized email…</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Subject</label>
                    <input
                      type="text"
                      value={editing.subject}
                      onChange={e => setEditing(s => s && { ...s, subject: e.target.value })}
                      disabled={editing.sending}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Message</label>
                    <textarea
                      value={editing.body}
                      onChange={e => setEditing(s => s && { ...s, body: e.target.value })}
                      disabled={editing.sending}
                      rows={12}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white leading-relaxed font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 resize-none"
                    />
                  </div>
                  {editing.error && (
                    <p className="text-sm text-red-500">{editing.error}</p>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setEditing(null)}
                disabled={editing.sending}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={approveAndSend}
                disabled={editing.generating || editing.sending || !editing.subject.trim() || !editing.body.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editing.sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {editing.sending ? 'Sending…' : 'Approve and send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 bg-gray-900 dark:bg-slate-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <Check size={15} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

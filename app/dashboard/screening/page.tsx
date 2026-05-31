'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  MessageSquare, Users, TrendingUp, Calendar, ClipboardList, X, Clock,
  Loader2, Paperclip, Search, Briefcase,
} from 'lucide-react'

// ─── types ──────────────────────────────────────────────────────────────────

type CandidateStatus = 'in_progress' | 'passed' | 'declined' | 'booked'

interface Screening {
  total_score: number | null
  summary: string | null
  conversation: { role: string; content: string }[] | null
  via_cv: boolean | null
}
interface Candidate {
  id: string
  name: string | null
  email: string | null
  status: CandidateStatus
  created_at: string
  job_id: string | null
  jobs: { title: string | null } | null
  screenings: Screening[] | null
  bookings: { booked_slot: string | null }[] | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500']
function getInitials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}
function avatarColor(name: string) {
  return AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length]
}
function timeAgo(dateString: string) {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
function formatInterview(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70
    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
    : score >= 40
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  const dot = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{score}
    </span>
  )
}

const STATUS_PILL: Record<CandidateStatus, { label: string; cls: string; dot: string }> = {
  in_progress: { label: 'In progress', cls: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300', dot: 'bg-gray-400' },
  passed:      { label: 'Passed',      cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500' },
  booked:      { label: 'Booked',      cls: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300', dot: 'bg-purple-500' },
  declined:    { label: 'Declined',    cls: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500' },
}
function StatusPill({ status }: { status: CandidateStatus }) {
  const v = STATUS_PILL[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} /> {v.label}
    </span>
  )
}

type FilterKey = 'all' | 'in_progress' | 'passed' | 'booked' | 'declined'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'passed', label: 'Passed' },
  { key: 'booked', label: 'Booked' },
  { key: 'declined', label: 'Declined' },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('candidates')
      .select('id, name, email, status, created_at, job_id, jobs(title), screenings(total_score, summary, conversation, via_cv), bookings(booked_slot)')
      .order('created_at', { ascending: false })
    setCandidates((data as any[] || []) as Candidate[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const passedCount = candidates.filter(c => c.status === 'passed' || c.status === 'booked').length
  const bookedCount = candidates.filter(c => c.status === 'booked').length
  const completed = candidates.filter(c => c.status !== 'in_progress').length
  const passRate = completed > 0 ? Math.round(passedCount / completed * 100) : 0

  const stats = [
    { label: 'Total screened', value: candidates.length, icon: Users, iconBg: 'bg-indigo-50 dark:bg-indigo-950', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Passed', value: passedCount, icon: TrendingUp, iconBg: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Interviews booked', value: bookedCount, icon: Calendar, iconBg: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
    { label: 'Pass rate', value: `${passRate}%`, icon: ClipboardList, iconBg: 'bg-pink-50 dark:bg-pink-950', iconColor: 'text-pink-600 dark:text-pink-400' },
  ]

  const counts: Record<FilterKey, number> = {
    all: candidates.length,
    in_progress: candidates.filter(c => c.status === 'in_progress').length,
    passed: candidates.filter(c => c.status === 'passed').length,
    booked: candidates.filter(c => c.status === 'booked').length,
    declined: candidates.filter(c => c.status === 'declined').length,
  }

  const filtered = candidates
    .filter(c => filter === 'all' ? true : c.status === filter)
    .filter(c => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (c.name || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
        || (c.jobs?.title || '').toLowerCase().includes(q)
    })

  return (
    <div>
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 sm:px-10 py-10 sm:py-12">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Screening</h1>
        </div>
        <p className="text-indigo-200 text-sm sm:text-base ml-12">Every candidate Claude has screened across all of your roles, in one place.</p>
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
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {loading ? <span className="text-gray-200 animate-pulse">—</span> : stat.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-1 shadow-sm">
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] px-1 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
                  }`}>{counts[f.key]}</span>
                </button>
              )
            })}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search candidates…"
              className="w-full sm:w-72 border border-gray-200 dark:border-slate-600 rounded-xl pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
            <Loader2 size={20} className="mx-auto text-gray-300 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-12 text-center">
            <MessageSquare size={28} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {candidates.length === 0 ? 'No candidates have been screened yet.' : 'No candidates match this view.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const s = c.screenings?.[0]
              const booking = c.bookings?.[0]
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full text-left bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-md transition-all"
                >
                  <div className="flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(c.name || '?')}`}>
                      {getInitials(c.name || '?')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                          {c.name || 'Candidate'}
                          {s?.via_cv && <Paperclip size={12} className="text-indigo-400" aria-label="Screened via CV" />}
                        </p>
                        <StatusPill status={c.status} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {c.jobs?.title || 'Role'}</span>
                        <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeAgo(c.created_at)}</span>
                        {booking?.booked_slot && (
                          <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-300 font-medium"><Calendar size={11} /> {formatInterview(booking.booked_slot)}</span>
                        )}
                      </div>
                      {s?.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1.5 leading-relaxed">{s.summary}</p>
                      )}
                    </div>
                    {s?.total_score != null ? (
                      <ScoreBadge score={s.total_score} />
                    ) : c.status === 'in_progress' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 flex-shrink-0">
                        <Loader2 size={11} className="animate-spin" /> Screening
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm sm:max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(selected.name || '?')}`}>
                  {getInitials(selected.name || '?')}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">{selected.name || 'Candidate'}</h2>
                  <p className="text-xs text-gray-400 truncate">{selected.email || selected.jobs?.title}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"><X size={20} /></button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <StatusPill status={selected.status} />
                {selected.jobs?.title && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                    <Briefcase size={11} /> {selected.jobs.title}
                  </span>
                )}
                {selected.screenings?.[0]?.via_cv && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Paperclip size={11} /> Screened via CV
                  </span>
                )}
              </div>

              {selected.screenings?.[0] ? (
                <>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score</span>
                      {selected.screenings[0].total_score != null && <ScoreBadge score={selected.screenings[0].total_score} />}
                    </div>
                    {selected.screenings[0].summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selected.screenings[0].summary}</p>
                    )}
                  </div>

                  {selected.screenings[0].conversation && selected.screenings[0].conversation.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Transcript</p>
                      <div className="space-y-3">
                        {selected.screenings[0].conversation.map((msg, i) => (
                          <div key={i} className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                            msg.role === 'assistant'
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200'
                              : 'bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-300'
                          }`}>
                            <p className={`text-xs font-semibold mb-1.5 ${msg.role === 'assistant' ? 'text-indigo-400' : 'text-gray-400'}`}>
                              {msg.role === 'assistant' ? 'MTO AI' : 'Candidate'}
                            </p>
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Screening in progress…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

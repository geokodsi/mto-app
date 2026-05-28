'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import { Users, TrendingUp, Calendar, ClipboardList, X, Copy, Check, Clock, Trash2 } from 'lucide-react'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function timeAgo(dateString: string) {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-blue-500', 'bg-teal-500', 'bg-orange-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 70) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{score}
    </span>
  )
  if (score >= 40) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{score}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{score}
    </span>
  )
}

const COLUMNS = [
  { key: 'in_progress', label: 'In Progress', headerBg: 'bg-blue-50', headerText: 'text-blue-700', dot: 'bg-blue-500' },
  { key: 'passed',      label: 'Passed',      headerBg: 'bg-green-50', headerText: 'text-green-700', dot: 'bg-green-500' },
  { key: 'booked',      label: 'Booked',      headerBg: 'bg-purple-50', headerText: 'text-purple-700', dot: 'bg-purple-500' },
  { key: 'declined',    label: 'Declined',    headerBg: 'bg-red-50', headerText: 'text-red-700', dot: 'bg-red-500' },
]

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e']

function Confetti({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-sm opacity-0"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: '-12px',
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animation: `confetti-fall ${0.9 + Math.random() * 0.8}s ${Math.random() * 0.5}s ease-in forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%  { opacity:1; transform:translateY(0) rotate(0deg) scale(1); }
          100%{ opacity:0; transform:translateY(100vh) rotate(720deg) scale(0.5); }
        }
      `}</style>
    </div>
  )
}

export default function JobPipelinePage() {
  const [job, setJob] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const knownPassedIds = useRef<Set<string>>(new Set())
  const params = useParams()

  const loadData = useCallback(async () => {
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', params.id).single()
    setJob(jobData)
    const { data } = await supabase
      .from('candidates')
      .select('*, screenings(*)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false })
    const list = data || []
    list.filter(c => c.status === 'passed' || c.status === 'booked').forEach(c => knownPassedIds.current.add(c.id))
    setCandidates(list)
  }, [params.id])

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`pipeline-${params.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'candidates',
        filter: `job_id=eq.${params.id}`,
      }, async (payload: any) => {
        const updated = payload.new
        if (
          updated &&
          (updated.status === 'passed' || updated.status === 'booked') &&
          !knownPassedIds.current.has(updated.id)
        ) {
          knownPassedIds.current.add(updated.id)
          setConfetti(true)
          setTimeout(() => setConfetti(false), 2500)
        }
        await loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id, loadData])

  const passedCount = candidates.filter(c => c.status === 'passed' || c.status === 'booked').length
  const passRate = candidates.length > 0 ? Math.round(passedCount / candidates.length * 100) : 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com')
  const embedCode = `<script src="${appUrl}/widget.js" data-job-id="${params.id}" data-job-title="${job?.title || ''}"></script>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleCleanup() {
    setCleaning(true)
    try {
      const res = await fetch('/api/cleanup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cleanup failed')
      const n = data.cleaned ?? 0
      setToast(`Cleaned up ${n} incomplete screening${n === 1 ? '' : 's'}`)
      await loadData()
    } catch {
      setToast('Cleanup failed. Please try again.')
    } finally {
      setCleaning(false)
      setTimeout(() => setToast(null), 3500)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <Confetti active={confetti} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 bg-gray-900 dark:bg-slate-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <Check size={15} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job?.title || '—'}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Candidate pipeline</p>
        </div>
        <button
          onClick={handleCleanup}
          disabled={cleaning}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={13} />
          {cleaning ? 'Cleaning…' : 'Clean up incomplete'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total screened', value: candidates.length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Passed', value: passedCount, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Booked', value: candidates.filter(c => c.status === 'booked').length, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Pass rate', value: `${passRate}%`, icon: ClipboardList, color: 'text-pink-500', bg: 'bg-pink-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.bg}`}>
                  <Icon size={14} className={s.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Embed code */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 mb-7 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Embed on your website</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Paste this code on your careers page to start screening candidates automatically</p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center">
              <Copy size={16} className="text-indigo-500" />
            </div>
          </div>
        </div>
        <div className="relative">
          <code className="block text-xs bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-4 text-gray-600 dark:text-gray-300 select-all break-all pr-24 font-mono leading-relaxed">
            {embedCode}
          </code>
          <button
            onClick={copyEmbed}
            className={`absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copied
                ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy code</>}
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colCandidates = candidates.filter(c => c.status === col.key)
          return (
            <div key={col.key} className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 min-h-[200px]">
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-4 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className={`text-xs font-semibold ${col.headerText}`}>{col.label}</span>
                </div>
                <span className={`text-xs font-bold ${col.headerText}`}>{colCandidates.length}</span>
              </div>

              <div className="space-y-2.5">
                {colCandidates.map(c => {
                  const screening = c.screenings?.[0]
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                        {screening?.total_score != null ? (
                          <ScoreBadge score={screening.total_score} />
                        ) : c.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />In Progress
                          </span>
                        ) : null}
                      </div>
                      {c.status === 'in_progress' ? (
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} /> Started {timeAgo(c.created_at)}
                        </p>
                      ) : screening?.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{screening.summary}</p>
                      )}
                    </div>
                  )
                })}
                {colCandidates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-300 dark:text-gray-600">No candidates</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-end z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-sm sm:max-w-md h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColor(selected.name)}`}>
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{selected.name}</h2>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {selected.screenings?.[0] ? (
                <>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score</span>
                      {selected.screenings[0].total_score != null && (
                        <ScoreBadge score={selected.screenings[0].total_score} />
                      )}
                    </div>
                    {selected.screenings[0].summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selected.screenings[0].summary}</p>
                    )}
                  </div>

                  {selected.screenings[0].conversation?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Transcript</p>
                      <div className="space-y-3">
                        {selected.screenings[0].conversation.map((msg: any, i: number) => (
                          <div
                            key={i}
                            className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                              msg.role === 'assistant'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200'
                                : 'bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-300'
                            }`}
                          >
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

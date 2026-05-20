'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import { Users, TrendingUp, Calendar, ClipboardList, X, Copy, Check } from 'lucide-react'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
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

export default function JobPipelinePage() {
  const [job, setJob] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const params = useParams()

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', params.id).single()
      setJob(jobData)
      const { data } = await supabase
        .from('candidates')
        .select('*, screenings(*)')
        .eq('job_id', params.id)
        .order('created_at', { ascending: false })
      setCandidates(data || [])
    }
    load()
  }, [params.id])

  const passedCount = candidates.filter(c => c.status === 'passed' || c.status === 'booked').length
  const passRate = candidates.length > 0 ? Math.round(passedCount / candidates.length * 100) : 0
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget.js" data-job-id="${params.id}"></script>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">{job?.title || '—'}</h1>
        <p className="text-gray-500 text-sm mt-0.5">Candidate pipeline</p>
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
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.bg}`}>
                  <Icon size={14} className={s.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Embed code */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-7 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Widget embed code</p>
          <button
            onClick={copyEmbed}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {copied ? <><Check size={13} className="text-green-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <code className="block text-xs bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-500 select-all break-all">
          {embedCode}
        </code>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colCandidates = candidates.filter(c => c.status === col.key)
          return (
            <div key={col.key} className="bg-gray-50 rounded-2xl p-4 min-h-[200px]">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-4 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className={`text-xs font-semibold ${col.headerText}`}>{col.label}</span>
                </div>
                <span className={`text-xs font-bold ${col.headerText}`}>{colCandidates.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {colCandidates.map(c => {
                  const screening = c.screenings?.[0]
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="bg-white border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                        {screening?.total_score != null && (
                          <ScoreBadge score={screening.total_score} />
                        )}
                      </div>
                      {screening?.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{screening.summary}</p>
                      )}
                    </div>
                  )
                })}
                {colCandidates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-300">No candidates</p>
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
            className="bg-white w-full max-w-sm sm:max-w-md h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColor(selected.name)}`}>
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selected.name}</h2>
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
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Score</span>
                      {selected.screenings[0].total_score != null && (
                        <ScoreBadge score={selected.screenings[0].total_score} />
                      )}
                    </div>
                    {selected.screenings[0].summary && (
                      <p className="text-sm text-gray-600 leading-relaxed">{selected.screenings[0].summary}</p>
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
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'bg-gray-50 text-gray-800'
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

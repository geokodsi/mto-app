'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  BarChart3, Users, TrendingUp, Gauge, Calendar, Loader2, Briefcase, Trophy,
} from 'lucide-react'

// ─── types ──────────────────────────────────────────────────────────────────

interface Candidate {
  id: string
  status: 'in_progress' | 'passed' | 'declined' | 'booked'
  created_at: string
  job_id: string | null
  jobs: { title: string | null } | null
  screenings: { total_score: number | null }[] | null
}

interface JobStat {
  jobId: string
  title: string
  screened: number
  passed: number
  passRate: number
  avgScore: number | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('candidates')
      .select('id, status, created_at, job_id, jobs(title), screenings(total_score)')
      .order('created_at', { ascending: false })
    setCandidates((data as any[] || []) as Candidate[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── derived metrics ──
  const monthStart = startOfMonth()
  const screeningsThisMonth = candidates.filter(c => new Date(c.created_at) >= monthStart).length

  const completed = candidates.filter(c => c.status !== 'in_progress')
  const passed = candidates.filter(c => c.status === 'passed' || c.status === 'booked')
  const passRate = completed.length > 0 ? Math.round(passed.length / completed.length * 100) : 0

  const allScores = candidates
    .map(c => c.screenings?.[0]?.total_score)
    .filter((s): s is number => typeof s === 'number')
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null

  const bookedCount = candidates.filter(c => c.status === 'booked').length

  // ── top performing jobs ──
  const jobMap = new Map<string, { title: string; screened: number; passed: number; completed: number; scores: number[] }>()
  for (const c of candidates) {
    if (!c.job_id) continue
    const entry = jobMap.get(c.job_id) || { title: c.jobs?.title || 'Untitled role', screened: 0, passed: 0, completed: 0, scores: [] }
    entry.screened += 1
    if (c.status !== 'in_progress') entry.completed += 1
    if (c.status === 'passed' || c.status === 'booked') entry.passed += 1
    const sc = c.screenings?.[0]?.total_score
    if (typeof sc === 'number') entry.scores.push(sc)
    jobMap.set(c.job_id, entry)
  }
  const topJobs: JobStat[] = Array.from(jobMap.entries())
    .map(([jobId, e]) => ({
      jobId,
      title: e.title,
      screened: e.screened,
      passed: e.passed,
      passRate: e.completed > 0 ? Math.round(e.passed / e.completed * 100) : 0,
      avgScore: e.scores.length > 0 ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null,
    }))
    .sort((a, b) => b.passed - a.passed || b.passRate - a.passRate || b.screened - a.screened)
    .slice(0, 5)

  // ── screenings per day (last 7 days) ──
  const days: { label: string; count: number }[] = []
  const counts = new Map<string, number>()
  for (const c of candidates) counts.set(dayKey(new Date(c.created_at)), (counts.get(dayKey(new Date(c.created_at))) || 0) + 1)
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), count: counts.get(dayKey(d)) || 0 })
  }
  const maxDay = Math.max(1, ...days.map(d => d.count))

  const stats = [
    { label: 'Screenings this month', value: screeningsThisMonth, icon: Users, iconBg: 'bg-indigo-50 dark:bg-indigo-950', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Pass rate', value: `${passRate}%`, icon: TrendingUp, iconBg: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Average score', value: avgScore == null ? '—' : avgScore, icon: Gauge, iconBg: 'bg-amber-50 dark:bg-amber-950', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Interviews booked', value: bookedCount, icon: Calendar, iconBg: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
  ]

  return (
    <div>
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 sm:px-10 py-10 sm:py-12">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics</h1>
        </div>
        <p className="text-indigo-200 text-sm sm:text-base ml-12">Track your screening performance across every role.</p>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Screenings per day */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                <BarChart3 size={17} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Screenings per day</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</p>
              </div>
            </div>
            <div className="px-6 py-6">
              {loading ? (
                <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : (
                <div className="flex items-end justify-between gap-2 sm:gap-3 h-44">
                  {days.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{d.count}</span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-500 transition-all"
                        style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%`, opacity: d.count === 0 ? 0.25 : 1 }}
                        title={`${d.count} screening${d.count === 1 ? '' : 's'}`}
                      />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top performing jobs */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Trophy size={17} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top performing jobs</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ranked by candidates passed</p>
              </div>
            </div>
            <div className="px-6 py-5">
              {loading ? (
                <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : topJobs.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center">
                  <Briefcase size={26} className="text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">No screening data yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topJobs.map((job, i) => (
                    <div key={job.jobId}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{job.title}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {job.passed}/{job.screened} passed
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${job.passRate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-9 text-right">{job.passRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

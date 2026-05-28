'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Users, Briefcase, TrendingUp, Calendar, Plus, ArrowRight, Code2, Copy, Check, Clock } from 'lucide-react'

function getInitials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function isToday(ts: string) {
  const d = new Date(ts)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDayTime(ts: string) {
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (target === 0 || started.current) return
    started.current = true
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

function AnimatedStat({ value, suffix = '' }: { value: number; suffix?: string }) {
  const display = useCountUp(value)
  return <>{display}{suffix}</>
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<{ full_name: string; company_name: string } | null>(null)
  const [stats, setStats] = useState({ jobs: 0, screened: 0, passed: 0, booked: 0 })
  const [jobList, setJobList] = useState<{ id: string; title: string }[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com')

  function copyEmbed(job: { id: string; title: string }) {
    const code = `<script src="${appUrl}/widget.js" data-job-id="${job.id}" data-job-title="${job.title}"></script>`
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(job.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, company_id, companies(name)')
        .eq('id', user.id)
        .single()

      if (!p) return
      setProfile({ full_name: p.full_name || '', company_name: (p.companies as any)?.name || '' })

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', p.company_id)
        .order('created_at', { ascending: false })

      const jobIds = (jobs || []).map((j: any) => j.id)
      setJobList(jobs || [])
      let screened = 0, passed = 0, booked = 0

      if (jobIds.length > 0) {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('status')
          .in('job_id', jobIds)

        screened = candidates?.length || 0
        passed = candidates?.filter(c => c.status === 'passed' || c.status === 'booked').length || 0
        booked = candidates?.filter(c => c.status === 'booked').length || 0
      }

      setStats({ jobs: jobIds.length, screened, passed, booked })

      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('id, booked_slot, status, candidates(name), jobs(title)')
        .gte('booked_slot', new Date().toISOString())
        .order('booked_slot', { ascending: true })
      setBookings(bookingRows || [])

      setLoading(false)
    }
    load()
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const todayBookings = bookings.filter(b => isToday(b.booked_slot))
  const weekBookings = bookings.filter(b => !isToday(b.booked_slot) && new Date(b.booked_slot) <= weekEnd)

  function bookingRow(b: any) {
    const name = (b.candidates as any)?.name || 'Candidate'
    const title = (b.jobs as any)?.title || ''
    return (
      <div key={b.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="w-9 h-9 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-300 flex-shrink-0">
          <Clock size={13} />
          {isToday(b.booked_slot) ? fmtTime(b.booked_slot) : fmtDayTime(b.booked_slot)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 sm:px-10 py-10 sm:py-12">
        {profile?.company_name && (
          <p className="text-indigo-200 text-sm font-medium mb-1">{profile.company_name}</p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-indigo-200 text-sm sm:text-base">Here&apos;s what&apos;s happening with your recruiting pipeline.</p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-10">
          {[
            { label: 'Active jobs', value: stats.jobs, icon: Briefcase, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
            { label: 'Total screened', value: stats.screened, icon: Users, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
            { label: 'Passed screening', value: stats.passed, icon: TrendingUp, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
            { label: 'Interviews booked', value: stats.booked, icon: Calendar, iconBg: 'bg-pink-50', iconColor: 'text-pink-600' },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm"
                style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-snug">{stat.label}</p>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 ${stat.iconBg}`}>
                    <Icon size={18} className={stat.iconColor} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {loading
                    ? <span className="text-gray-200 animate-pulse">—</span>
                    : <AnimatedStat value={stat.value} />
                  }
                </p>
              </div>
            )
          })}
        </div>

        {/* Upcoming interviews */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upcoming interviews</h2>
          </div>
          {!loading && bookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No interviews booked yet</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Booked interviews from passed candidates will appear here</p>
            </div>
          ) : (
            <div className="space-y-5">
              {todayBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 pl-1">Today</p>
                  <div className="space-y-2.5">{todayBookings.map(bookingRow)}</div>
                </div>
              )}
              {weekBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 pl-1">This week</p>
                  <div className="space-y-2.5">{weekBookings.map(bookingRow)}</div>
                </div>
              )}
              {!loading && todayBookings.length === 0 && weekBookings.length === 0 && bookings.length > 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 pl-1">No interviews in the next 7 days.</p>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard/jobs/new"
              className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                <Plus size={22} className="text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">Create a new job</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Set up AI screening questions</p>
              </div>
              <ArrowRight size={17} className="ml-auto text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
            </Link>
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 hover:border-purple-200 hover:shadow-sm transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                <Users size={22} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">View candidates</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Browse your pipeline and scores</p>
              </div>
              <ArrowRight size={17} className="ml-auto text-gray-300 group-hover:text-purple-500 flex-shrink-0 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Embed codes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Embed on your website</h2>
          </div>

          {!loading && jobList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Create a job first to get your embed code</p>
              <Link href="/dashboard/jobs/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline">
                <Plus size={14} /> Create a job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobList.map(job => {
                const code = `<script src="${appUrl}/widget.js" data-job-id="${job.id}" data-job-title="${job.title}"></script>`
                const isCopied = copiedId === job.id
                return (
                  <div key={job.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.title}</p>
                      <button
                        onClick={() => copyEmbed(job)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isCopied
                            ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                      >
                        {isCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy code</>}
                      </button>
                    </div>
                    <code className="block text-xs bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-500 dark:text-gray-400 font-mono break-all select-all">
                      {code}
                    </code>
                  </div>
                )
              })}
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">Paste this snippet on your careers page — the AI screening widget will appear automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

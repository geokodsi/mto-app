'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Users, Briefcase, TrendingUp, Calendar, Plus, ArrowRight } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)

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
        .select('id')
        .eq('company_id', p.company_id)

      const jobIds = (jobs || []).map((j: any) => j.id)
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
      setLoading(false)
    }
    load()
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

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

        {/* Quick actions */}
        <div>
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
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { Plus, Search, Briefcase, ArrowRight, ChevronRight } from 'lucide-react'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (profile) {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
        setJobs(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(query.toLowerCase())
  )

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your open roles and AI screening</p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create new job
        </Link>
      </div>

      {/* Search */}
      {jobs.length > 0 && (
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search jobs…"
            className="w-full sm:w-80 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-gray-100 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-48 animate-pulse" />
                <div className="h-3 bg-gray-50 rounded w-24 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — no jobs at all */}
      {!loading && jobs.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 sm:p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Briefcase size={30} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No jobs yet</h2>
          <p className="text-gray-500 text-sm mb-7 max-w-xs mx-auto">
            Create your first job and set up AI screening questions to start collecting candidates.
          </p>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Create your first job
          </Link>
        </div>
      )}

      {/* Empty search state */}
      {!loading && jobs.length > 0 && filtered.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-gray-500 text-sm">No jobs match &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Job</th>
                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Pass threshold</th>
                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(job => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Briefcase size={15} className="text-indigo-500" />
                      </div>
                      <span className="font-semibold text-gray-900">{job.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      job.active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${job.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {job.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-gray-600">{job.pass_threshold}%</td>
                  <td className="px-6 py-4 hidden lg:table-cell text-gray-400 text-xs">{formatDate(job.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 text-xs font-medium hover:text-indigo-800 transition-colors group-hover:gap-2"
                    >
                      View pipeline
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

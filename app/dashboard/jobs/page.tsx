'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { Plus, Search, Briefcase, ChevronRight, Trash2, Loader2, AlertTriangle, Check } from 'lucide-react'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [confirmJob, setConfirmJob] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (profile) {
      setCompanyId(profile.company_id)
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
      setJobs(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleDelete() {
    if (!confirmJob || !companyId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: confirmJob.id, companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setConfirmJob(null)
      showToast('Job deleted successfully')
      await load()
    } catch (err: any) {
      showToast(err.message || 'Could not delete job')
    } finally {
      setDeleting(false)
    }
  }

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
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-indigo-600 text-xs font-medium hover:text-indigo-800 transition-colors group-hover:gap-2"
                      >
                        View pipeline
                        <ChevronRight size={14} />
                      </Link>
                      <button
                        onClick={() => setConfirmJob(job)}
                        className="inline-flex items-center gap-1 text-red-600 text-xs font-medium hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmJob && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setConfirmJob(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">Delete &ldquo;{confirmJob.title}&rdquo;?</h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    Are you sure you want to delete this job? This will also delete all candidates and screenings for this job. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmJob(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <><Loader2 size={15} className="animate-spin" /> Deleting…</> : <><Trash2 size={15} /> Delete job</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <Check size={15} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

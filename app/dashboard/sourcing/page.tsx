'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Search, Copy, Check, Plus, X, Loader2, User,
  ExternalLink, Sparkles, Bot
} from 'lucide-react'

interface Job {
  id: string
  title: string
  active: boolean
  description?: string
}

interface BooleanStrings {
  linkedin: string
  github: string
  indeed: string
}

interface SourcedCandidate {
  id: string
  name: string
  email: string | null
  linkedin_url: string | null
  github_url: string | null
  headline: string | null
  skills: string[]
  fit_score: number | null
  fit_reason: string | null
  source: string
  status: string
  created_at: string
  job_id: string
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3.5 text-xs text-gray-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-all leading-relaxed">
        {value}
      </pre>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
  const color =
    score >= 8 ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    score >= 5 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score}/10
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    contacted: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    replied: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || map.new}`}>
      {status}
    </span>
  )
}

function SourceIcon({ source }: { source: string }) {
  const map: Record<string, string> = {
    linkedin: 'bg-blue-600',
    github: 'bg-gray-800 dark:bg-slate-600',
    indeed: 'bg-indigo-600',
    manual: 'bg-gray-400 dark:bg-slate-500',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-white uppercase tracking-wide ${map[source] || map.manual}`}>
      {source}
    </span>
  )
}

export default function SourcingPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [booleans, setBooleans] = useState<BooleanStrings | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [candidates, setCandidates] = useState<SourcedCandidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Add candidate form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')
  const [addHeadline, setAddHeadline] = useState('')
  const [addSource, setAddSource] = useState<'linkedin' | 'github' | 'indeed' | 'manual'>('manual')
  const [addSkills, setAddSkills] = useState('')
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [addError, setAddError] = useState('')

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (profile?.company_id) {
        setCompanyId(profile.company_id)
        const { data } = await supabase
          .from('jobs')
          .select('id, title, active, description')
          .eq('company_id', profile.company_id)
          .eq('active', true)
          .order('created_at', { ascending: false })
        setJobs(data || [])
      }
    }
    load()
  }, [])

  async function loadCandidates(jobId: string) {
    setLoadingCandidates(true)
    const { data } = await supabase
      .from('sourced_candidates')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    setCandidates(data || [])
    setLoadingCandidates(false)
  }

  function selectJob(job: Job) {
    setSelectedJob(job)
    setBooleans(null)
    setGenerateError('')
    if (job.description) setJobDescription(job.description)
    else setJobDescription('')
    loadCandidates(job.id)
  }

  async function handleGenerate() {
    if (!selectedJob || !jobDescription.trim()) return
    setGenerating(true)
    setGenerateError('')
    setBooleans(null)
    try {
      const res = await fetch('/api/sourcing/generate-strings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: selectedJob.title, jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setBooleans(data)
    } catch (e: any) {
      setGenerateError(e.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleAddCandidate() {
    if (!addName.trim() || !selectedJob || !companyId) return
    setAddingCandidate(true)
    setAddError('')
    try {
      const skills = addSkills.split(',').map(s => s.trim()).filter(Boolean)

      // Score the candidate
      let fitScore: number | null = null
      let fitReason: string | null = null
      if (jobDescription.trim()) {
        const scoreRes = await fetch('/api/sourcing/score-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addName,
            headline: addHeadline,
            skills,
            experience: '',
            jobDescription,
          }),
        })
        if (scoreRes.ok) {
          const scored = await scoreRes.json()
          fitScore = scored.score ?? null
          fitReason = scored.reason ?? null
        }
      }

      const { data, error } = await supabase
        .from('sourced_candidates')
        .insert({
          job_id: selectedJob.id,
          company_id: companyId,
          name: addName.trim(),
          email: addEmail.trim() || null,
          linkedin_url: addLinkedin.trim() || null,
          headline: addHeadline.trim() || null,
          skills,
          fit_score: fitScore,
          fit_reason: fitReason,
          source: addSource,
          status: 'new',
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      setCandidates(prev => [data, ...prev])
      setShowAddForm(false)
      setAddName(''); setAddEmail(''); setAddLinkedin(''); setAddHeadline(''); setAddSkills(''); setAddSource('manual')
    } catch (e: any) {
      setAddError(e.message || 'Failed to add candidate')
    } finally {
      setAddingCandidate(false)
    }
  }

  async function updateStatus(candidateId: string, status: string) {
    setUpdatingStatus(candidateId)
    await supabase
      .from('sourced_candidates')
      .update({ status })
      .eq('id', candidateId)
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status } : c))
    setUpdatingStatus(null)
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Bot size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Sourcing Bot</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm ml-12">
          Generate Boolean search strings and track sourced candidates for your open roles.
        </p>
      </div>

      {/* Step 1: Job selector */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs flex items-center justify-center font-bold">1</span>
          Select a job
        </h2>

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">No active jobs found. Create a job first.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => selectJob(job)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  selectedJob?.id === job.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-slate-700'
                }`}
              >
                {job.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Job description + generate */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs flex items-center justify-center font-bold">2</span>
          Paste job description
        </h2>
        <textarea
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
          placeholder={selectedJob ? 'Paste the full job description here…' : 'Select a job first'}
          disabled={!selectedJob}
          rows={6}
          className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed transition"
        />

        {generateError && (
          <p className="mt-2 text-xs text-red-500">{generateError}</p>
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!selectedJob || !jobDescription.trim() || generating}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            {generating ? (
              <><Loader2 size={15} className="animate-spin" />Generating…</>
            ) : (
              <><Sparkles size={15} />Generate search strings</>
            )}
          </button>
        </div>
      </div>

      {/* Step 3: Results */}
      {booleans && (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full text-xs flex items-center justify-center font-bold">✓</span>
            Boolean search strings
          </h2>
          <div className="space-y-3">
            <CopyBlock label="LinkedIn Recruiter" value={booleans.linkedin} />
            <CopyBlock label="GitHub Search" value={booleans.github} />
            <CopyBlock label="Indeed Resume" value={booleans.indeed} />
          </div>
        </div>
      )}

      {/* Sourced candidates section */}
      {selectedJob && (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sourced candidates</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{selectedJob.title}</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus size={13} />
              Add candidate
            </button>
          </div>

          {/* Add candidate form */}
          {showAddForm && (
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-indigo-50/40 dark:bg-indigo-900/10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">New candidate</p>
                <button onClick={() => { setShowAddForm(false); setAddError('') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Full name *</label>
                  <input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Email</label>
                  <input
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="jane@example.com"
                    type="email"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">LinkedIn URL</label>
                  <input
                    value={addLinkedin}
                    onChange={e => setAddLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/janesmith"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Headline</label>
                  <input
                    value={addHeadline}
                    onChange={e => setAddHeadline(e.target.value)}
                    placeholder="Senior Engineer at Acme"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Skills (comma separated)</label>
                  <input
                    value={addSkills}
                    onChange={e => setAddSkills(e.target.value)}
                    placeholder="React, TypeScript, Node.js"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Source</label>
                  <select
                    value={addSource}
                    onChange={e => setAddSource(e.target.value as any)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="manual">Manual</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                    <option value="indeed">Indeed</option>
                  </select>
                </div>
              </div>
              {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
              <div className="mt-4 flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowAddForm(false); setAddError('') }}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCandidate}
                  disabled={addingCandidate || !addName.trim()}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {addingCandidate ? (
                    <><Loader2 size={14} className="animate-spin" />Scoring & saving…</>
                  ) : (
                    <>Add & score</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loadingCandidates ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 dark:bg-slate-700 rounded w-40 animate-pulse" />
                    <div className="h-3 bg-gray-50 dark:bg-slate-700/50 rounded w-56 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User size={22} className="text-gray-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">No candidates sourced yet</p>
              <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">Add candidates manually or use the search strings above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Fit score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">AI reason</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {candidates.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0">
                            {c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                            {c.headline && (
                              <p className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[180px]">{c.headline}</p>
                            )}
                            {c.email && (
                              <p className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[180px]">{c.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <SourceIcon source={c.source} />
                      </td>
                      <td className="px-4 py-4">
                        <ScoreBadge score={c.fit_score} />
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <p className="text-xs text-gray-500 dark:text-slate-400 max-w-[220px] leading-relaxed line-clamp-2">
                          {c.fit_reason || <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={c.status}
                          disabled={updatingStatus === c.id}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          className="border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="replied">Replied</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.linkedin_url && (
                            <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          {c.github_url && (
                            <a href={c.github_url} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../../lib/supabase'
import { WhatsAppIcon } from '../../../components/WhatsAppIcon'
import {
  Users, TrendingUp, MessageCircle, Calendar, Copy, Check, Loader2,
  Phone, Link2, QrCode, Briefcase, X, Clock, Save, ExternalLink, AlertCircle,
} from 'lucide-react'

// ─── types ──────────────────────────────────────────────────────────────────

type SessionStatus = 'screening' | 'awaiting_slot' | 'booked' | 'declined'

interface WaSession {
  id: string
  job_id: string | null
  candidate_id: string | null
  phone_number: string
  candidate_name: string | null
  status: SessionStatus
  conversation: { role: string; content: string }[] | null
  score: number | null
  offered_slots: { iso: string; label: string }[] | null
  created_at: string
  jobs: { title: string | null } | null
}

interface Job { id: string; title: string }

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-emerald-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-indigo-500']
function getInitials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}
function avatarColor(name: string) {
  return AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length]
}
function digitsOnly(s: string) {
  return (s || '').replace(/[^\d]/g, '')
}
function buildWaLink(number: string, title: string) {
  return `https://wa.me/${digitsOnly(number)}?text=${encodeURIComponent(`I want to apply for ${title}`)}`
}
function timeAgo(dateString: string) {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const COLUMNS: { key: SessionStatus; label: string; headerBg: string; headerText: string; dot: string }[] = [
  { key: 'screening',     label: 'Screening', headerBg: 'bg-blue-50 dark:bg-blue-950',     headerText: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
  { key: 'awaiting_slot', label: 'Passed',    headerBg: 'bg-green-50 dark:bg-green-950',    headerText: 'text-green-700 dark:text-green-300',   dot: 'bg-green-500' },
  { key: 'booked',        label: 'Booked',    headerBg: 'bg-purple-50 dark:bg-purple-950',  headerText: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { key: 'declined',      label: 'Declined',  headerBg: 'bg-red-50 dark:bg-red-950',        headerText: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
]

// ─── QR code thumbnail ──────────────────────────────────────────────────────

function QRImage({ value, size = 148 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(url => { if (!cancelled) setSrc(url) })
      .catch(() => { if (!cancelled) setSrc(null) })
    return () => { cancelled = true }
  }, [value, size])

  if (!src) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-xl" style={{ width: size, height: size }}>
        <Loader2 size={18} className="animate-spin text-gray-300" />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="WhatsApp apply QR code" width={size} height={size} className="rounded-xl border border-gray-100 dark:border-slate-700" />
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [savedNumber, setSavedNumber] = useState('')
  const [numberInput, setNumberInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [customTitle, setCustomTitle] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaSession | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const companyIdRef = useRef<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com')
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`

  const loadSessions = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('id, job_id, candidate_id, phone_number, candidate_name, status, conversation, score, offered_slots, created_at, jobs(title)')
      .eq('company_id', cid)
      .order('created_at', { ascending: false })
    setSessions((data as any[] || []) as WaSession[])
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, companies(name, whatsapp_number)')
      .eq('id', user.id)
      .single()

    if (!profile) { setLoading(false); return }
    const cid = profile.company_id
    setCompanyId(cid)
    companyIdRef.current = cid
    const company = (profile as any).companies
    setCompanyName(company?.name || '')
    setSavedNumber(company?.whatsapp_number || '')
    setNumberInput(company?.whatsapp_number || '')

    const { data: jobRows } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('company_id', cid)
      .eq('active', true)
      .order('created_at', { ascending: false })
    const jobList = (jobRows || []) as Job[]
    setJobs(jobList)
    if (!customTitle && jobList[0]) setCustomTitle(jobList[0].title)

    await loadSessions(cid)
    setLoading(false)
  }, [loadSessions, customTitle])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates as candidates progress through WhatsApp screening.
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel(`whatsapp-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' }, () => {
        if (companyIdRef.current) loadSessions(companyIdRef.current)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [companyId, loadSessions])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 2000)
    })
  }

  async function saveNumber(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    const cleaned = numberInput.trim()
    const { error } = await supabase
      .from('companies')
      .update({ whatsapp_number: cleaned || null })
      .eq('id', companyId)
    setSaving(false)
    if (error) { showToast('Could not save number'); return }
    setSavedNumber(cleaned)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    showToast('WhatsApp number saved')
  }

  // ── stats ──
  const total = sessions.length
  const completed = sessions.filter(s => s.status !== 'screening').length
  const passed = sessions.filter(s => s.status === 'awaiting_slot' || s.status === 'booked').length
  const booked = sessions.filter(s => s.status === 'booked').length
  const passRate = completed > 0 ? Math.round(passed / completed * 100) : 0
  const responseRate = total > 0 ? Math.round(completed / total * 100) : 0

  const stats = [
    { label: 'Screened via WhatsApp', value: String(total), icon: Users, iconBg: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Pass rate', value: `${passRate}%`, icon: TrendingUp, iconBg: 'bg-emerald-50 dark:bg-emerald-950', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Response rate', value: `${responseRate}%`, icon: MessageCircle, iconBg: 'bg-teal-50 dark:bg-teal-950', iconColor: 'text-teal-600 dark:text-teal-400' },
    { label: 'Interviews booked', value: String(booked), icon: Calendar, iconBg: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
  ]

  const hasNumber = digitsOnly(savedNumber).length >= 6
  const customLink = hasNumber && customTitle ? buildWaLink(savedNumber, customTitle) : ''

  return (
    <div>
      {/* Header banner — WhatsApp green */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 sm:px-10 py-10 sm:py-12">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <WhatsAppIcon size={20} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">WhatsApp Screening</h1>
        </div>
        <p className="text-green-100 text-sm sm:text-base ml-12">Let candidates apply and get screened by Claude right inside WhatsApp.</p>
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

        {/* Setup + number */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* How to set up Twilio WhatsApp */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <WhatsAppIcon size={17} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Set up Twilio WhatsApp</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect the WhatsApp Business API in a few steps</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <ol className="space-y-4">
                {[
                  <>Create a free account at <a href="https://www.twilio.com/whatsapp" target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 dark:text-green-400 underline hover:text-green-800 inline-flex items-center gap-0.5">Twilio <ExternalLink size={11} /></a> and activate the WhatsApp Sandbox (or request a WhatsApp sender for production).</>,
                  <>In the Twilio Console, open your WhatsApp sender&apos;s settings and set <span className="font-medium text-gray-700 dark:text-gray-200">&ldquo;When a message comes in&rdquo;</span> to the webhook URL below (HTTP <span className="font-mono text-xs">POST</span>).</>,
                  <>Add your <span className="font-mono text-xs">TWILIO_ACCOUNT_SID</span>, <span className="font-mono text-xs">TWILIO_AUTH_TOKEN</span> and <span className="font-mono text-xs">TWILIO_WHATSAPP_NUMBER</span> to your environment variables.</>,
                  <>Enter your WhatsApp Business number on the right and save — your apply links &amp; QR codes generate automatically.</>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>

              {/* Webhook URL */}
              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Inbound webhook URL</label>
                <div className="relative">
                  <code className="block text-xs bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-600 dark:text-gray-300 font-mono break-all select-all pr-24">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => copy(webhookUrl, 'webhook')}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      copiedKey === 'webhook' ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                    }`}
                  >
                    {copiedKey === 'webhook' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp number + link generator */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Phone size={17} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your WhatsApp Business number</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Candidates message this number to apply</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              <form onSubmit={saveNumber} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={numberInput}
                    onChange={e => setNumberInput(e.target.value)}
                    placeholder="+1 415 523 8886"
                    className="flex-1 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
                    {saving ? 'Saving' : saved ? 'Saved' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Include the country code. For the Twilio sandbox this is typically <span className="font-mono">+1 415 523 8886</span>.</p>
              </form>

              {/* Link generator */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Link2 size={13} /> WhatsApp apply link generator
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Job title, e.g. Senior Developer"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all mb-3"
                />
                {!hasNumber ? (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} className="flex-shrink-0" /> Save your WhatsApp number above to generate links.
                  </div>
                ) : customLink ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="relative">
                        <code className="block text-xs bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-3 text-gray-600 dark:text-gray-300 font-mono break-all select-all pr-20">
                          {customLink}
                        </code>
                        <button
                          onClick={() => copy(customLink, 'custom')}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            copiedKey === 'custom' ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {copiedKey === 'custom' ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <a href={customLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline">
                        <WhatsAppIcon size={13} /> Open in WhatsApp <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <QRImage value={customLink} size={120} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Enter a job title to generate a link.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per-job QR codes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <QrCode size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apply links &amp; QR codes for your jobs</h2>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
              <Loader2 size={20} className="mx-auto text-gray-300 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <Briefcase size={26} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No active jobs yet. Create a job to generate WhatsApp apply links.</p>
            </div>
          ) : !hasNumber ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <Phone size={26} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Save your WhatsApp Business number above to generate apply links and QR codes for each job.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map(job => {
                const link = buildWaLink(savedNumber, job.title)
                return (
                  <div key={job.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-4 w-full">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                        <Briefcase size={14} className="text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate text-left">{job.title}</p>
                    </div>
                    <QRImage value={link} size={148} />
                    <p className="text-[11px] text-gray-400 mt-3 mb-3">Scan to apply on WhatsApp</p>
                    <button
                      onClick={() => copy(link, `job-${job.id}`)}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        copiedKey === `job-${job.id}` ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      }`}
                    >
                      {copiedKey === `job-${job.id}` ? <><Check size={13} /> Link copied</> : <><Copy size={13} /> Copy apply link</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <WhatsAppIcon size={15} className="text-green-500" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WhatsApp candidate pipeline</h2>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
              <Loader2 size={20} className="mx-auto text-gray-300 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-12 text-center">
              <WhatsAppIcon size={28} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No WhatsApp candidates yet.</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Share an apply link or QR code above — candidates who message you will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map(col => {
                const colSessions = sessions.filter(s => s.status === col.key)
                return (
                  <div key={col.key} className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 min-h-[180px]">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-4 ${col.headerBg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-xs font-semibold ${col.headerText}`}>{col.label}</span>
                      </div>
                      <span className={`text-xs font-bold ${col.headerText}`}>{colSessions.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {colSessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className="w-full text-left bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 cursor-pointer hover:border-green-200 dark:hover:border-green-900 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(s.candidate_name || '?')}`}>
                              {getInitials(s.candidate_name || '?')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.candidate_name || 'WhatsApp candidate'}</p>
                              <p className="text-xs text-gray-400 truncate flex items-center gap-1"><Phone size={10} /> {s.phone_number}</p>
                            </div>
                            {s.score != null && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                s.score >= 70 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                                  : s.score >= 40 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                              }`}>{s.score}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 flex items-center justify-between">
                            <span className="truncate">{s.jobs?.title || 'Role'}</span>
                            <span className="flex items-center gap-1 flex-shrink-0 ml-1"><Clock size={10} /> {timeAgo(s.created_at)}</span>
                          </p>
                        </button>
                      ))}
                      {colSessions.length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-xs text-gray-300 dark:text-gray-600">No candidates</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transcript drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm sm:max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(selected.candidate_name || '?')}`}>
                  {getInitials(selected.candidate_name || '?')}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">{selected.candidate_name || 'WhatsApp candidate'}</h2>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1"><Phone size={11} /> {selected.phone_number}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"><X size={20} /></button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <WhatsAppIcon size={11} /> WhatsApp
                </span>
                {selected.jobs?.title && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                    <Briefcase size={11} /> {selected.jobs.title}
                  </span>
                )}
                {selected.score != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Score {selected.score}
                  </span>
                )}
              </div>

              {selected.conversation && selected.conversation.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversation</p>
                  <div className="space-y-3">
                    {selected.conversation.map((msg, i) => (
                      <div key={i} className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'assistant'
                          ? 'bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-200'
                          : 'bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-300'
                      }`}>
                        <p className={`text-xs font-semibold mb-1.5 ${msg.role === 'assistant' ? 'text-green-500' : 'text-gray-400'}`}>
                          {msg.role === 'assistant' ? 'MTO AI' : (selected.candidate_name || 'Candidate')}
                        </p>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Conversation hasn&apos;t started yet…</p>
                </div>
              )}
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

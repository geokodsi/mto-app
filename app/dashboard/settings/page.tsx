'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  User, Building2, Palette, Bell, Check, Upload, X,
  Eye, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react'

// ─── types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string
  company_id: string
  notifications_enabled: boolean
  notification_email: string | null
}

interface Company {
  id: string
  name: string
  logo_url: string | null
  accent_color: string
  widget_greeting: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

type TabId = 'profile' | 'company' | 'widget' | 'notifications'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <User size={16} /> },
  { id: 'company',       label: 'Company',        icon: <Building2 size={16} /> },
  { id: 'widget',        label: 'Widget',         icon: <Palette size={16} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={16} /> },
]

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all"
    >
      {loading ? (
        <><Loader2 size={15} className="animate-spin" /> Saving…</>
      ) : saved ? (
        <><Check size={15} className="text-green-300" /> Saved!</>
      ) : (
        'Save changes'
      )}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm',
        'bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      {msg}
    </div>
  )
}

// ─── widget mini-preview ──────────────────────────────────────────────────────

function WidgetPreview({ color, greeting }: { color: string; greeting: string }) {
  const [open, setOpen] = useState(true)
  const preview = greeting.length > 80 ? greeting.slice(0, 80) + '…' : greeting

  return (
    <div className="relative bg-gray-100 dark:bg-slate-900 rounded-2xl p-6 flex items-end justify-end min-h-[340px] overflow-hidden border border-gray-200 dark:border-slate-700">
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #e0e7ff 0%, transparent 60%)' }} />

      {/* Chat bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-10 transition-transform hover:scale-105"
        style={{ background: color }}
      >
        {open
          ? <X size={22} color="white" />
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        }
      </button>

      {/* Chat window */}
      {open && (
        <div className="absolute bottom-24 right-5 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
          style={{ animation: 'preview-slide-up .22s ease-out' }}>
          {/* Header */}
          <div className="px-4 py-3.5" style={{ background: color }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm">💼</div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">Apply for this role</p>
                <p className="text-white/60 text-[10px] mt-0.5">Powered by MTO AI</p>
              </div>
            </div>
            <div className="mt-2.5 h-[2px] rounded-full bg-white/20" />
          </div>
          {/* Message */}
          <div className="px-4 py-3.5 space-y-2.5">
            <div className="bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] leading-relaxed">
              {preview || 'Hi! What\'s your full name?'}
            </div>
          </div>
          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-slate-700 flex gap-2">
            <div className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-gray-400">
              Type your answer…
            </div>
            <div className="text-white rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: color }}>
              Send
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes preview-slide-up {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <p className="absolute bottom-5 left-5 text-xs text-gray-400 dark:text-gray-500">Live preview</p>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setAuthEmail(user.email ?? '')

      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, company_id, notifications_enabled, notification_email')
        .eq('id', user.id)
        .single()

      if (p) {
        setProfile(p)
        const { data: c } = await supabase
          .from('companies')
          .select('id, name, logo_url, accent_color, widget_greeting')
          .eq('id', p.company_id)
          .single()
        if (c) setCompany(c)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!profile || !company) {
    return (
      <div className="p-8">
        <ErrorBanner msg="Could not load your settings. Please refresh the page." />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage your account, company and widget preferences</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Tab sidebar */}
        <nav className="sm:w-48 flex-shrink-0">
          <ul className="flex sm:flex-col gap-1">
            {TABS.map(t => (
              <li key={t.id} className="flex-1 sm:flex-none">
                <button
                  onClick={() => setTab(t.id)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                    tab === t.id
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  <span className={tab === t.id ? 'text-indigo-600 dark:text-indigo-400' : ''}>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <ProfileTab
              profile={profile}
              authEmail={authEmail}
              onSaved={(updated) => setProfile(p => p ? { ...p, ...updated } : p)}
            />
          )}
          {tab === 'company' && (
            <CompanyTab
              company={company}
              onSaved={(updated) => setCompany(c => c ? { ...c, ...updated } : c)}
            />
          )}
          {tab === 'widget' && (
            <WidgetTab
              company={company}
              onSaved={(updated) => setCompany(c => c ? { ...c, ...updated } : c)}
            />
          )}
          {tab === 'notifications' && (
            <NotificationsTab
              profile={profile}
              authEmail={authEmail}
              onSaved={(updated) => setProfile(p => p ? { ...p, ...updated } : p)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  authEmail,
  onSaved,
}: {
  profile: Profile
  authEmail: string
  onSaved: (u: Partial<Profile>) => void
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [email, setEmail] = useState(authEmail)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)

    if (profileErr) { setError(profileErr.message); setSaving(false); return }

    if (email !== authEmail) {
      const { error: authErr } = await supabase.auth.updateUser({ email })
      if (authErr) { setError(authErr.message); setSaving(false); return }
    }

    onSaved({ full_name: fullName })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  return (
    <Card title="Profile" subtitle="Update your personal information">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner msg={error} />}

        <Field label="Full name">
          <Input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </Field>

        <Field label="Email address" hint="You'll receive a confirmation email if you change this.">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </Field>

        <div className="pt-2">
          <SaveButton loading={saving} saved={saved} />
        </div>
      </form>
    </Card>
  )
}

// ─── Company tab ──────────────────────────────────────────────────────────────

function CompanyTab({
  company,
  onSaved,
}: {
  company: Company
  onSaved: (u: Partial<Company>) => void
}) {
  const [name, setName] = useState(company.name ?? '')
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(file: File) {
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `${company.id}/logo-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('company-logos')
      .upload(path, file, { upsert: true })

    if (upErr) {
      setError(`Logo upload failed: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(path)

    setLogoUrl(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)

    const { error: err } = await supabase
      .from('companies')
      .update({ name, logo_url: logoUrl || null })
      .eq('id', company.id)

    if (err) {
      setError(err.message)
    } else {
      onSaved({ name, logo_url: logoUrl || null })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <Card title="Company" subtitle="Manage your company profile">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner msg={error} />}

        <Field label="Company name">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            required
          />
        </Field>

        <Field label="Company logo" hint="PNG, JPG, SVG or WebP — max 2 MB">
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-slate-800">
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
                : <Building2 size={22} className="text-gray-300 dark:text-gray-600" />
              }
            </div>

            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : 'Upload logo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
              />
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <X size={12} /> Remove logo
                </button>
              )}
            </div>
          </div>
        </Field>

        <div className="pt-2">
          <SaveButton loading={saving} saved={saved} />
        </div>
      </form>
    </Card>
  )
}

// ─── Widget tab ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#0ea5e9',
]

function WidgetTab({
  company,
  onSaved,
}: {
  company: Company
  onSaved: (u: Partial<Company>) => void
}) {
  const [color, setColor] = useState(company.accent_color ?? '#6366f1')
  const [greeting, setGreeting] = useState(
    company.widget_greeting ?? 'Hi! I\'m here to learn more about you for this role. What\'s your full name?'
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)

    const { error: err } = await supabase
      .from('companies')
      .update({ accent_color: color, widget_greeting: greeting })
      .eq('id', company.id)

    if (err) {
      setError(err.message)
    } else {
      onSaved({ accent_color: color, widget_greeting: greeting })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <Card title="Widget" subtitle="Customize the candidate-facing chat widget">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBanner msg={error} />}

          <Field label="Brand color" hint="This color is used for the chat bubble, message bubbles, and buttons.">
            <div className="space-y-3">
              {/* Preset swatches */}
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-lg transition-all hover:scale-110 ring-offset-2 dark:ring-offset-slate-900"
                    style={{
                      background: c,
                      boxShadow: color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : undefined,
                    }}
                  />
                ))}
              </div>
              {/* Custom color picker */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="sr-only"
                    id="color-picker"
                  />
                  <label
                    htmlFor="color-picker"
                    className="flex items-center gap-2 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-5 h-5 rounded-md border border-white/30 shadow-sm" style={{ background: color }} />
                    Custom color
                  </label>
                </div>
                <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
                  {color}
                </code>
              </div>
            </div>
          </Field>

          <Field
            label="Opening greeting"
            hint="The first message candidates see when they open the widget."
          >
            <textarea
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Hi! What's your full name?"
              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{greeting.length}/280</p>
          </Field>

          <div className="pt-1">
            <SaveButton loading={saving} saved={saved} />
          </div>
        </form>
      </Card>

      {/* Live preview */}
      <Card title="Preview" subtitle="This is how the widget looks to candidates">
        <WidgetPreview color={color} greeting={greeting} />
      </Card>
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotificationsTab({
  profile,
  authEmail,
  onSaved,
}: {
  profile: Profile
  authEmail: string
  onSaved: (u: Partial<Profile>) => void
}) {
  const [enabled, setEnabled] = useState(profile.notifications_enabled ?? true)
  const [email, setEmail] = useState(profile.notification_email ?? authEmail)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)

    const { error: err } = await supabase
      .from('profiles')
      .update({
        notifications_enabled: enabled,
        notification_email: email || null,
      })
      .eq('id', profile.id)

    if (err) {
      setError(err.message)
    } else {
      onSaved({ notifications_enabled: enabled, notification_email: email || null })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <Card title="Notifications" subtitle="Control when and where you receive alerts">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBanner msg={error} />}

        {/* Master toggle */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Email notifications</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Get notified when a candidate completes screening
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(v => !v)}
            className={[
              'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
              enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600',
            ].join(' ')}
            aria-pressed={enabled}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Notification types */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notify me when</p>
          {[
            { label: 'A candidate completes screening', always: true },
            { label: 'A candidate passes the score threshold', always: true },
            { label: 'A candidate is declined', always: false },
          ].map(item => (
            <label
              key={item.label}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              <input
                type="checkbox"
                defaultChecked={item.always}
                disabled={!enabled}
                className="w-4 h-4 accent-indigo-600 disabled:opacity-40 cursor-pointer"
              />
            </label>
          ))}
        </div>

        {/* Email address */}
        <Field
          label="Notification email"
          hint="We'll send alerts here. Leave blank to use your account email."
        >
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={authEmail}
            disabled={!enabled}
            className={!enabled ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </Field>

        <div className="pt-1">
          <SaveButton loading={saving} saved={saved} />
        </div>
      </form>
    </Card>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

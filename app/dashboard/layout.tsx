'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Home, Briefcase, Settings, LogOut, Bell, Moon, Sun, X, SearchCheck, Mail, MessageSquare, BarChart3 } from 'lucide-react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'

interface Profile {
  full_name: string
  company_name: string
  company_id: string
}

interface Notification {
  id: string
  name: string
  job_title: string
  status: string
  ts: number
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dark, setDark] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const jobIdsRef = useRef<Set<string>>(new Set())
  const jobTitlesRef = useRef<Map<string, string>>(new Map())

  // Dark mode init
  useEffect(() => {
    const saved = localStorage.getItem('mto-dark')
    if (saved === '1') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('mto-dark', '1')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('mto-dark', '0')
    }
  }

  // Load profile + setup realtime
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, company_id, companies(name)')
        .eq('id', user.id)
        .single()

      if (data) {
        const companyId = data.company_id
        setProfile({
          full_name: data.full_name || '',
          company_name: (data.companies as any)?.name || '',
          company_id: companyId,
        })

        // Load job ids for this company so we can filter realtime events
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title')
          .eq('company_id', companyId)

        ;(jobs || []).forEach((j: any) => {
          jobIdsRef.current.add(j.id)
          jobTitlesRef.current.set(j.id, j.title)
        })
      }
    }
    load()
  }, [router])

  // Realtime subscription for new candidates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'candidates',
      }, (payload: any) => {
        const c = payload.new
        if (!c || !jobIdsRef.current.has(c.job_id)) return
        const jobTitle = jobTitlesRef.current.get(c.job_id) || 'a job'
        setNotifs(prev => [{
          id: c.id,
          name: c.name,
          job_title: jobTitle,
          status: c.status || 'in_progress',
          ts: Date.now(),
        }, ...prev].slice(0, 20))
        setUnread(u => u + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'candidates',
      }, (payload: any) => {
        const c = payload.new
        if (!c || !jobIdsRef.current.has(c.job_id)) return
        if (c.status === 'passed' || c.status === 'declined' || c.status === 'booked') {
          const jobTitle = jobTitlesRef.current.get(c.job_id) || 'a job'
          setNotifs(prev => [{
            id: `${c.id}-${c.status}`,
            name: c.name,
            job_title: jobTitle,
            status: c.status,
            ts: Date.now(),
          }, ...prev].slice(0, 20))
          setUnread(u => u + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Close notif panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems: {
    href: string
    label: string
    icon: React.ComponentType<any>
    exact: boolean
    iconColor?: string
  }[] = [
    { href: '/dashboard', label: 'Overview', icon: Home, exact: true },
    { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase, exact: false },
    { href: '/dashboard/sourcing', label: 'Sourcing', icon: SearchCheck, exact: false },
    { href: '/dashboard/outreach', label: 'Outreach', icon: Mail, exact: false },
    { href: '/dashboard/screening', label: 'Screening', icon: MessageSquare, exact: false },
    { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, exact: false, iconColor: 'text-green-500' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, exact: false },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, exact: false },
  ]

  function statusLabel(s: string) {
    if (s === 'passed') return '✅ passed'
    if (s === 'declined') return '❌ declined'
    if (s === 'booked') return '📅 booked an interview'
    return '🔵 started screening'
  }

  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <p className="text-white font-bold text-[15px] leading-none">MTO</p>
                <p className="text-slate-500 text-[11px] mt-0.5">AI Recruiting</p>
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={17} className={item.iconColor} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(profile.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium leading-none truncate">{profile.full_name}</p>
                <p className="text-slate-500 text-xs mt-0.5 truncate">{profile.company_name}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with notification bell */}
        <header className="h-12 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-end px-6 flex-shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(o => !o); setUnread(0) }}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={15} />
                  </button>
                </div>
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">You&apos;ll see alerts here when candidates complete screening</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-700 max-h-72 overflow-y-auto">
                    {notifs.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{n.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel(n.status)} · {n.job_title}</p>
                        <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">{timeAgo(n.ts)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

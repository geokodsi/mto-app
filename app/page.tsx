'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Zap, BarChart3, Users, CheckCircle, ArrowRight, Star } from 'lucide-react'

// Animated widget demo chat messages
const DEMO_MESSAGES = [
  { role: 'ai',   text: 'Hi! What\'s your full name?',                          delay: 0 },
  { role: 'user', text: 'Sarah Johnson',                                         delay: 1200 },
  { role: 'ai',   text: 'Nice to meet you, Sarah! What\'s your email?',          delay: 2000 },
  { role: 'user', text: 'sarah@acme.com',                                        delay: 3200 },
  { role: 'ai',   text: 'Great! How many years of React experience do you have?', delay: 4200 },
  { role: 'user', text: '4 years, primarily with TypeScript.',                   delay: 5400 },
  { role: 'ai',   text: 'Excellent! Have you worked with REST APIs before?',     delay: 6400 },
  { role: 'user', text: 'Yes — designed and built several production APIs.',     delay: 7600 },
  { role: 'ai',   text: 'Perfect. You\'ve passed! Our team will be in touch 🎉', delay: 8600 },
]

function WidgetDemo() {
  const [shown, setShown] = useState<number[]>([])
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    DEMO_MESSAGES.forEach((msg, i) => {
      const t = setTimeout(() => setShown(prev => [...prev, i]), msg.delay)
      timers.push(t)
    })
    const restart = setTimeout(() => {
      setShown([])
      setCycle(c => c + 1)
    }, DEMO_MESSAGES[DEMO_MESSAGES.length - 1].delay + 3000)
    timers.push(restart)
    return () => timers.forEach(clearTimeout)
  }, [cycle])

  return (
    <div className="relative w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Widget header */}
      <div className="bg-indigo-600 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm">💻</div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Apply for this role</p>
            <p className="text-indigo-200 text-[11px] mt-0.5">Powered by MTO AI</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-700"
            style={{ width: shown.length >= 7 ? '100%' : shown.length >= 5 ? '66%' : shown.length >= 3 ? '33%' : '0%' }}
          />
        </div>
        <p className="text-indigo-200 text-[10px] mt-1">
          {shown.length >= 9 ? 'Screening complete ✓' : shown.length >= 5 ? 'Question 2 of 3' : shown.length >= 3 ? 'Question 1 of 3' : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="px-4 py-4 space-y-2.5 min-h-[220px] max-h-[220px] overflow-hidden">
        {DEMO_MESSAGES.slice(0, Math.max(...shown.concat([-1])) + 1).map((msg, i) => (
          shown.includes(i) ? (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'demo-slide-in 0.25s ease-out' }}
            >
              <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[75%] ${
                msg.role === 'ai'
                  ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  : 'bg-indigo-600 text-white rounded-tr-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ) : null
        ))}
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-400">
          Type your answer…
        </div>
        <div className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">Send</div>
      </div>

      <style>{`
        @keyframes demo-slide-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">MTO</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link>
              <a href="mailto:george@itaegypt.com" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                Request access
              </a>
            </div>
            <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600 py-1">Features</a>
            <a href="#how-it-works" className="block text-sm text-gray-600 py-1">How it works</a>
            <Link href="/login" className="block text-sm text-gray-600 py-1">Sign in</Link>
            <a href="mailto:george@itaegypt.com" className="block bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium text-center">
              Request access
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap size={13} />
            AI-powered candidate screening
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-tight">
            Screen smarter.<br />
            <span className="text-indigo-600">Hire faster.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            MTO automates candidate screening with AI conversations, intelligent scoring, and a visual pipeline — so your team only talks to the best fits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a href="mailto:george@itaegypt.com" className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              Request access <ArrowRight size={17} />
            </a>
            <Link href="/login" className="w-full sm:w-auto border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-gray-50 transition-colors text-center">
              Sign in
            </Link>
          </div>

          {/* Floating dashboard mockup */}
          <div className="mt-16 sm:mt-20" style={{ animation: 'float 5s ease-in-out infinite' }}>
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-5xl mx-auto">
              <div className="flex items-center gap-1.5 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <div className="ml-4 bg-white/10 rounded-md px-3 py-1 text-white/40 text-xs max-w-xs w-full">app.mto.ai/dashboard</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Screened this week', value: '47' },
                  { label: 'Pass rate', value: '34%' },
                  { label: 'Interviews booked', value: '16' },
                  { label: 'Active jobs', value: '5' },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 sm:p-4">
                    <p className="text-white/40 text-xs mb-1.5">{s.label}</p>
                    <p className="text-white text-xl sm:text-2xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['In Progress', 'Passed', 'Booked', 'Declined'].map((col, i) => (
                  <div key={col} className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs font-medium mb-2.5">{col}</p>
                    {[...Array(i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 2 : 1)].map((_, j) => (
                      <div key={j} className="bg-white/10 rounded-lg p-2.5 mb-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/50"></div>
                          <div className="w-14 h-2 bg-white/30 rounded"></div>
                        </div>
                        <div className="w-10 h-1.5 bg-white/15 rounded ml-7"></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>

      {/* Stats */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 bg-indigo-600">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Candidates screened' },
              { value: '62%',  label: 'Average pass rate' },
              { value: '3 min', label: 'Avg screening time' },
              { value: '10×',  label: 'Faster than manual review' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-indigo-200 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Three modules. One platform.</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">Everything you need to automate the top of your recruiting funnel.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <Zap size={26} className="text-indigo-600" />,
                iconBg: 'bg-indigo-50',
                title: 'AI Screening',
                desc: 'Your AI recruiting assistant holds natural, conversational interviews with every applicant — 24/7, completely automated.',
                points: ['Conversational AI interviews', 'One question at a time', 'Handles any volume'],
              },
              {
                icon: <BarChart3 size={26} className="text-purple-600" />,
                iconBg: 'bg-purple-50',
                title: 'Smart Scoring',
                desc: 'Claude evaluates every conversation against your custom pass criteria and scores candidates on a 100-point scale.',
                points: ['Custom pass criteria per job', '100-point AI scoring', 'One-line recruiter summaries'],
              },
              {
                icon: <Users size={26} className="text-pink-600" />,
                iconBg: 'bg-pink-50',
                title: 'Pipeline Management',
                desc: 'Every screened candidate lands in your visual Kanban pipeline — sorted by score, with full transcripts saved.',
                points: ['Visual Kanban board', 'Full transcripts saved', 'Instant embed widget'],
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 ${f.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 mb-6 leading-relaxed text-sm sm:text-base">{f.desc}</p>
                <ul className="space-y-2.5">
                  {f.points.map(p => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle size={15} className="text-indigo-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">Three steps from signup to your first screened candidate.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-indigo-100 z-0" />

            {[
              {
                step: '01',
                title: 'Post a job',
                desc: 'Create a job listing and add your screening questions with pass/fail criteria. Takes under 2 minutes.',
                icon: '📋',
              },
              {
                step: '02',
                title: 'Embed the widget',
                desc: 'Copy one line of code onto your careers page. The AI chat widget appears instantly for candidates.',
                icon: '🔌',
              },
              {
                step: '03',
                title: 'Watch candidates get screened',
                desc: 'MTO AI conducts interviews 24/7. Passed candidates land in your pipeline, scored and summarised.',
                icon: '🚀',
              },
            ].map((step, i) => (
              <div key={step.step} className="relative z-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 border-4 border-white shadow-sm">
                  {step.icon}
                </div>
                <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                  Step {step.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live demo */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-200 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live demo
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
                See MTO screen a candidate in real time
              </h2>
              <p className="text-indigo-200 text-lg leading-relaxed mb-8">
                This is exactly what candidates experience when they apply through your careers page — a natural, conversational AI interview that assesses their fit in minutes.
              </p>
              <ul className="space-y-3">
                {[
                  'One question at a time, no forms',
                  'Automatic scoring against your criteria',
                  'Passes to your pipeline when done',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-indigo-200 text-sm">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <WidgetDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — logos */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-gray-400 font-medium uppercase tracking-wider mb-8">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {['Nexara', 'Orbis Labs', 'Helix HQ', 'Veridian', 'Stratum', 'Cova Tech'].map(name => (
              <span key={name} className="text-gray-300 font-bold text-lg tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to screen smarter?</h2>
            <p className="text-indigo-100 text-lg mb-8 max-w-lg mx-auto">MTO is currently invite-only. Request access to get started.</p>
            <a href="mailto:george@itaegypt.com" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-50 transition-colors">
              Request access <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-bold text-gray-900">MTO</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 MTO. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Sign in</Link>
            <a href="mailto:george@itaegypt.com" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Request access</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

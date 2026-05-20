'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Zap, BarChart3, Users, CheckCircle, ArrowRight, Star } from 'lucide-react'

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

          {/* Dashboard mockup */}
          <div className="mt-16 sm:mt-20">
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

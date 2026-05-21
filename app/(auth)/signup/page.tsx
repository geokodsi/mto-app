import Link from 'next/link'
import { ArrowRight, Lock, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-800/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold">M</span>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">MTO</span>
        </div>
        <div className="relative space-y-5">
          <h2 className="text-white text-2xl font-bold">AI-powered candidate screening.</h2>
          {[
            'Conversational AI interviews with every applicant',
            'Custom scoring against your pass criteria',
            'Visual pipeline with full transcripts',
            'Embed on any career page in seconds',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={14} className="text-indigo-300" />
              </div>
              <span className="text-white/80 text-sm">{item}</span>
            </div>
          ))}
        </div>
        <p className="relative text-white/25 text-xs">© 2026 MTO. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-md text-center">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="text-xl font-bold">MTO</span>
          </div>

          {/* Lock icon */}
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-indigo-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">MTO is invite-only</h1>
          <p className="text-gray-500 leading-relaxed mb-8 max-w-sm mx-auto">
            We&apos;re currently in early access. Send us a quick message and we&apos;ll get you set up personally.
          </p>

          <a
            href="mailto:george@itaegypt.com?subject=MTO Access Request&body=Hi, I'd like to request access to MTO."
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Request access <ArrowRight size={16} />
          </a>

          <p className="mt-8 text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

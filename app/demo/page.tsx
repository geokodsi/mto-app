'use client'
import { useEffect } from 'react'
import { MapPin, Clock, Briefcase, DollarSign, CheckCircle } from 'lucide-react'

const JOB_ID = 'a8aa71c8-9b4c-46ff-9161-226f95c971bf'

export default function DemoPage() {
  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    ;(window as any).mtoWidgetConfig = {
      jobId: JOB_ID,
      color: '#2563eb',
      jobTitle: 'Senior Developer',
      baseUrl: appUrl,
    }
    const script = document.createElement('script')
    script.src = `${appUrl}/widget.js`
    document.body.appendChild(script)
    return () => {
      script.remove()
      delete (window as any).mtoWidgetConfig
      document.getElementById('mto-btn')?.remove()
      document.getElementById('mto-modal')?.remove()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">TechCorp</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">About</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Products</a>
            <a href="#" className="text-blue-600 font-medium">Careers</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-blue-300 text-sm font-medium mb-3 uppercase tracking-wider">Open position</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Senior Developer</h1>
          <div className="flex flex-wrap items-center gap-4 text-blue-200 text-sm">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> San Francisco, CA (Remote OK)</span>
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> Full-time</span>
            <span className="flex items-center gap-1.5"><DollarSign size={14} /> $140k – $180k</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> Posted 2 days ago</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-10">
          <Section title="About the role">
            <p className="text-gray-600 leading-relaxed">
              We&apos;re looking for a Senior Developer to join TechCorp&apos;s core engineering team. You&apos;ll work closely
              with product and design to ship features that reach millions of users. We value ownership, clear communication,
              and a pragmatic approach to building great software.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              This is a high-impact role with end-to-end ownership — you&apos;ll architect, build, and ship features
              independently while mentoring junior engineers on the team.
            </p>
          </Section>

          <Section title="What you'll do">
            <ul className="space-y-2.5">
              {[
                'Design and build scalable, production-grade systems and APIs',
                'Collaborate with design and product to translate ideas into working software',
                'Lead technical architecture decisions for new features',
                'Review code and mentor junior developers',
                'Contribute to our engineering culture and best practices',
                'Debug and resolve production incidents with speed and precision',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-gray-600 text-sm">
                  <CheckCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Requirements">
            <ul className="space-y-2.5">
              {[
                '5+ years of professional software engineering experience',
                'Strong proficiency in TypeScript, Python, or Go',
                'Experience building and scaling distributed systems',
                'Solid understanding of databases (SQL and NoSQL)',
                'Experience with cloud platforms (AWS, GCP, or Azure)',
                'Excellent communication and collaboration skills',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-gray-600 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Nice to have">
            <ul className="space-y-2.5">
              {[
                'Experience with Next.js or React',
                'Background in developer tools or B2B SaaS',
                'Open source contributions',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-gray-600 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Apply card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-1">Ready to apply?</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Click the button below to start a quick AI-powered screening — takes about 3 minutes.
            </p>
            <button
              onClick={() => { (window as any).mtoOpenWidget && (window as any).mtoOpenWidget() }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Apply now
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">Powered by MTO AI Screening</p>
          </div>

          {/* Company card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">TechCorp</p>
                <p className="text-xs text-gray-400">techcorp.io</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>Industry</span><span className="text-gray-700 font-medium">Software / SaaS</span></div>
              <div className="flex justify-between"><span>Company size</span><span className="text-gray-700 font-medium">50–200 employees</span></div>
              <div className="flex justify-between"><span>Founded</span><span className="text-gray-700 font-medium">2019</span></div>
              <div className="flex justify-between"><span>Location</span><span className="text-gray-700 font-medium">San Francisco, CA</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-10">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 TechCorp, Inc. All rights reserved.</span>
          <span>Screening powered by <a href="/" className="text-blue-500 hover:underline">MTO</a></span>
        </div>
      </footer>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

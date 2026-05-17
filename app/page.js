'use client';

import Link from 'next/link';
import { Shield, ArrowRight, Code, Zap, Package, Search, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col gap-4 p-8 glass-panel group hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 bg-white/50 text-blue-600 flex items-center justify-center rounded-2xl border border-gray-100/50 shadow-sm group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-black tracking-tight text-gray-900">SYNKRO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
              Go to Tool
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-300 to-transparent blur-[100px] rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">

          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] text-gray-900">
            Secure your codebase. <br className="hidden md:block" />
            <span className="text-gradient">
              Ship with absolute confidence.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            The ultimate static analysis and vulnerability scanner. Detect security flaws, code smells, and unsafe dependencies instantly. Powered by Gemini AI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 btn-gradient rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
              Start Scanning Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center">
              Explore Features
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-8 text-sm font-semibold text-gray-400">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Guest mode available</div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="max-w-6xl mx-auto mt-40 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-4">Enterprise-grade analysis in seconds.</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Everything you need to audit, secure, and fix your code repository before pushing to production.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon={Shield} title="Security Scanning" description="Detects SQL injection, XSS, hardcoded secrets, CORS misconfigurations, and prototype pollution instantly." />
            <FeatureCard icon={Code} title="Code Quality" description="Identifies dead code, empty catch blocks, code smells, anti-patterns, and cognitive complexity issues." />
            <FeatureCard icon={Zap} title="Performance" description="Finds memory leaks, N+1 queries, async anti-patterns, excessive DOM manipulation, and bottlenecks." />
            <FeatureCard icon={Package} title="Dependencies" description="Checks for compromised packages, unpinned versions, known CVEs, and supply chain risks via OSV integration." />
          </div>
        </div>

        {/* How it Works Section */}
        <div className="max-w-5xl mx-auto mt-40 mb-20 relative z-10">
          <div className="glass-panel p-10 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-4">How SYNKRO Works</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">A seamless workflow from code ingestion to AI-powered remediation.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-100 via-purple-100 to-emerald-100 -z-10" />
              
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl mb-6">1</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Connect Repository</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Paste any public or private GitHub repository URL. SYNKRO securely clones and prepares the codebase for deep analysis.</p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center text-purple-600 font-black text-xl mb-6">2</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Deep Scan Engine</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Our dual-engine architecture runs static AST analysis alongside dynamic OSV vulnerability lookups in milliseconds.</p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl mb-6">3</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI Auto-Remediation</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Review the findings in a beautiful IDE interface and let Gemini or Grok AI automatically write the secure fix for you.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Shield className="w-5 h-5 text-indigo-600" />
            SYNKRO
          </div>
          <p className="text-gray-400 text-sm font-medium">© {new Date().getFullYear()} Synkro Security. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

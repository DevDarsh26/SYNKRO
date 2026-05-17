'use client';

import Link from 'next/link';
import {
  Shield, ArrowRight, Code, Zap, Package,
  CheckCircle2, GitBranch, Lock, Globe,
  Sparkles, ChevronRight, Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function FeatureCard({ icon: Icon, title, description, accent = 'indigo' }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StepCard({ number, title, description }) {
  return (
    <Card className="text-center hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center font-bold text-lg mb-4">
          {number}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <header className="sticky top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SYNKRO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link href="/login">
                Start Free <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Ship code that's
            <br className="hidden md:block" />
            <span className="text-primary">actually secure.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SYNKRO scans your entire GitHub repository — public or private — for security
            vulnerabilities, code smells, and unsafe dependencies. Then AI fixes them for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8">
              <Link href="/login">
                <GitBranch className="w-4 h-4 mr-2" />
                Connect GitHub & Scan
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8">
              <Link href="/login">Try as Guest</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm font-medium text-muted-foreground">
            {[
              { icon: CheckCircle2, label: 'Free forever' },
              { icon: Lock, label: 'Private repos supported' },
              { icon: Globe, label: 'No install required' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Terminal preview */}
        <div className="max-w-3xl mx-auto mt-20">
          <Card className="overflow-hidden border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-mono bg-background px-3 py-1 rounded-md border">
                  synkro scan github.com/your-org/your-repo
                </span>
              </div>
            </div>
            <div className="p-6 font-mono text-sm space-y-3 bg-[#0a0a0a] text-gray-300">
              {[
                { t: '→', c: 'text-blue-400', msg: 'Cloning repository...' },
                { t: '✓', c: 'text-green-400', msg: '214 files discovered' },
                { t: '⚠', c: 'text-red-400',   msg: '[CRITICAL] SQL Injection — /api/users.js:47' },
                { t: '⚠', c: 'text-orange-400', msg: '[HIGH] Hardcoded secret — /config/db.js:12' },
                { t: '⚠', c: 'text-yellow-400', msg: '[MEDIUM] Unpinned dependency — lodash@^4.0.0' },
                { t: '✦', c: 'text-purple-400', msg: 'Gemini AI generating fixes...' },
                { t: '✓', c: 'text-green-400', msg: 'Scan complete · 23 issues · 3 auto-fixed' },
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`${line.c} font-bold shrink-0`}>{line.t}</span>
                  <span>{line.msg}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Enterprise-grade analysis.</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to audit, secure, and fix your codebase before pushing to production.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Shield}
              title="Security Scanning"
              description="SQL injection, XSS, hardcoded secrets, CORS misconfigs, and prototype pollution."
            />
            <FeatureCard
              icon={Code}
              title="Code Quality"
              description="Dead code, empty catch blocks, anti-patterns, and cognitive complexity issues."
            />
            <FeatureCard
              icon={Zap}
              title="Performance"
              description="Memory leaks, N+1 queries, async anti-patterns, and DOM bottlenecks."
            />
            <FeatureCard
              icon={Package}
              title="Dependencies"
              description="Vulnerable packages, unpinned versions, CVEs, and supply chain risks."
            />
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-5xl mx-auto mt-32 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Three steps to secure code.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard number="1" title="Connect Repo"
              description="Sign in with GitHub to access all your repos, or paste any public URL." />
            <StepCard number="2" title="Deep Scan"
              description="Our engine runs static AST analysis + OSV lookups across your codebase." />
            <StepCard number="3" title="AI Auto-Fix"
              description="Review findings in a beautiful IDE and let Gemini write the secure fix." />
          </div>
        </div>
      </main>

      <footer className="border-t py-8 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="w-5 h-5 text-primary" />
            SYNKRO
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Synkro Security. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

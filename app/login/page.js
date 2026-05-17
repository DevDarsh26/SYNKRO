'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/Auth/AuthProvider';
import { LoginForm } from '@/components/Auth/LoginForm';
import { Shield, GitBranch, Lock, Zap, BarChart } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const PERKS = [
  { icon: GitBranch,   label: 'Sync all GitHub repos', sub: 'Public and private, instantly.' },
  { icon: Lock,     label: 'Security scanning',      sub: 'OWASP Top 10 and beyond.' },
  { icon: Zap,      label: 'AI auto-fix',            sub: 'Gemini writes the patch.' },
  { icon: BarChart,label: 'Executive reports',      sub: 'PDF-ready audit summaries.' },
];

function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 bg-muted/30 border-r border-border">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-16">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SYNKRO</span>
          </Link>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Secure your code.<br />
            <span className="text-primary">Ship with confidence.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-12">
            AI-powered security analysis for every line of code you write — before it reaches production.
          </p>

          <div className="space-y-6">
            {PERKS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-background border border-border shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-medium">© {new Date().getFullYear()} Synkro Security</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">SYNKRO</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Sign in to your workspace or{' '}
              <Link href="/" className="text-primary hover:underline font-bold transition-colors">
                return to home
              </Link>
            </p>
          </div>

          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-8">
              <LoginForm onSuccess={() => router.push('/dashboard')} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}

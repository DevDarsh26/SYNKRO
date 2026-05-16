'use client';

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/Auth/AuthProvider';
import { LoginForm } from '@/components/Auth/LoginForm';
import { ScannerForm } from '@/components/Scanner/ScannerForm';
import { ResultsView } from '@/components/Results/ResultsView';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { RecentScans, saveScanToHistory } from '@/components/History/RecentScans';
import { Shield, LogOut, ArrowLeft, Scan, Zap, Lock, Settings as SettingsIcon, ChevronRight, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

function ScanProgressCard({ scanStatus }) {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-indigo-500/20 bg-card/40 backdrop-blur-md shadow-[0_0_30px_rgba(99,102,241,0.1)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <Scan className="w-6 h-6 animate-pulse text-indigo-400" />
          {scanStatus.status === 'cloning' && 'Cloning Repository...'}
          {scanStatus.status === 'scanning' && 'Analyzing Code...'}
          {scanStatus.status === 'started' && 'Initializing Scan...'}
          {scanStatus.status === 'failed' && 'Scan Failed'}
        </CardTitle>
        <CardDescription className="text-base">{scanStatus.message || 'Please wait while we process the repository.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-bold text-muted-foreground uppercase tracking-wider">
            <span>Progress</span>
            <span className="text-indigo-400">{scanStatus.progress || 0}%</span>
          </div>
          <Progress value={scanStatus.progress || 0} className="h-3 bg-secondary/50 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500" />
        </div>

        {scanStatus.totalFiles && (
          <p className="text-sm text-muted-foreground/80 text-center font-medium">
            Scanning {scanStatus.totalFiles} files from{' '}
            <span className="font-bold text-foreground">
              {scanStatus.repository?.owner}/{scanStatus.repository?.repo}
            </span>
          </p>
        )}

        {scanStatus.status === 'failed' && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500">
            <AlertDescription>{scanStatus.message || 'An unexpected error occurred.'}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function MainContent() {
  const { user, signOut } = useAuth();
  const [scanData, setScanData] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (scanData?.scanId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/scan?scanId=${scanData.scanId}`);
          const data = await response.json();

          setScanStatus(data);

          if (data.status === 'completed') {
            setResults(data.results);
            if (scanData.repoUrl) {
              saveScanToHistory(scanData.repoUrl, data.results);
            }
            clearInterval(interval);
          } else if (data.status === 'failed') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error fetching scan status:', error);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [scanData]);

  const handleScanStart = (data) => {
    setScanData(data);
    setScanStatus({ status: 'started', progress: 0 });
    setResults(null);
  };

  const handleQuickScan = async (repoUrl) => {
    try {
      const storedToken = localStorage.getItem('synkro_github_token');
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          githubToken: storedToken?.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scan');
      }

      handleScanStart({ ...data, repoUrl: repoUrl.trim() });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setScanData(null);
    setScanStatus(null);
    setResults(null);
    window.location.reload();
  };

  const handleNewScan = () => {
    setScanData(null);
    setScanStatus(null);
    setResults(null);
  };

  // Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-background to-background selection:bg-indigo-500/30 overflow-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 w-full border-b border-border/40 bg-background/50 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                SYNKRO
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="hidden sm:inline-flex hover:bg-secondary/50">Documentation</Button>
              <Button variant="ghost" className="hidden sm:inline-flex hover:bg-secondary/50">Features</Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Hero Copy */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
                <Sparkles className="h-4 w-4" /> Gemini 2.5 Flash Integrated
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
                Secure your code with <br className="hidden lg:block"/>
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                  AI-Powered Analysis
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Synkro is the next-generation static analysis tool. Instantly scan GitHub repositories for vulnerabilities, code smells, and performance bottlenecks, and get automated fixes generated by Google Gemini.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-lg">
                {[
                  { icon: Search, text: 'Instant Static Scanning' },
                  { icon: Shield, text: 'Enterprise Security Rules' },
                  { icon: Zap, text: 'AI Auto-Fix Generation' },
                  { icon: Lock, text: 'Local Token Privacy' }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {feature.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Login / Action Card */}
            <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
              <div className="backdrop-blur-xl bg-card/40 rounded-2xl border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.15)] overflow-hidden">
                <div className="p-1 bg-gradient-to-r from-indigo-500/50 to-purple-500/50" />
                <div className="p-6">
                  <LoginForm onSuccess={() => {}} />
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-background to-background selection:bg-indigo-500/30">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-40 supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
              SYNKRO
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block px-4">
              {user.email || 'Guest Session'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="hover:bg-indigo-500/10 hover:text-indigo-400" title="Settings">
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSignOut} className="hover:bg-red-500/10 hover:text-red-500 transition-colors ml-2">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        {!scanData && !results && (
          <div className="space-y-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4">
              <Badge variant="outline" className="px-3 py-1 text-indigo-400 border-indigo-500/30 bg-indigo-500/10 mb-4">
                Powered by Gemini 2.5 Flash
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Scan a Repository</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
                Enter a GitHub URL to instantly identify vulnerabilities, code smells, and get AI-powered automated fixes.
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <ScannerForm onScanStart={handleScanStart} />
              <RecentScans onSelectScan={handleQuickScan} />
            </div>
          </div>
        )}

        {scanStatus && scanStatus.status !== 'completed' && (
          <div className="flex flex-col items-center">
            <ScanProgressCard scanStatus={scanStatus} />
            {scanStatus.status === 'failed' && (
              <Button onClick={handleNewScan} variant="secondary" className="mt-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Another Scan
              </Button>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={handleNewScan} className="hover:bg-secondary/50">
                <ArrowLeft className="mr-2 h-4 w-4" />
                New Scan
              </Button>
            </div>
            <ResultsView results={results} repoUrl={scanData?.repoUrl || ''} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

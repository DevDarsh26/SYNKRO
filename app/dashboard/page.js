'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/Auth/AuthProvider';
import { ScannerForm } from '@/components/Scanner/ScannerForm';
import { ResultsView } from '@/components/Results/ResultsView';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { RecentScans, saveScanToHistory } from '@/components/History/RecentScans';
import { GitHubRepoPicker } from '@/components/GitHub/RepoPicker';
import {
  Shield, LogOut, Scan, Settings as SettingsIcon,
  Activity, ArrowLeft, GitBranch, User, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dashboard');

/* ── Animated Scan Progress ──────────────────────────────── */
function ScanProgressCard({ scanStatus }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!scanStatus) return;
    if (scanStatus.status === 'completed') { setDisplayProgress(100); return; }
    if (['started','cloning','scanning'].includes(scanStatus.status)) {
      const interval = setInterval(() => {
        setDisplayProgress(prev => {
          const inc = prev < 50 ? 2 : prev < 80 ? 1 : prev < 90 ? 0.4 : 0;
          return Math.min(90, prev + inc);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [scanStatus?.status]);

  const statusLabel = {
    started:  'Initializing Scanner...',
    cloning:  'Cloning Repository...',
    scanning: 'Deep Analysis in Progress...',
    failed:   'Scan Failed',
  }[scanStatus.status] || 'Working...';

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border shadow-lg relative overflow-hidden">
        {/* top accent border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

        <CardContent className="p-8 sm:p-10">
          <div className="flex items-center gap-5 mb-8">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <Scan className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{statusLabel}</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {scanStatus.message || 'Analyzing codebase for vulnerabilities…'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Progress</span>
              <span className="text-primary font-mono tabular-nums">{Math.round(displayProgress)}%</span>
            </div>
            <Progress value={displayProgress} className="h-2.5" />
          </div>

          {scanStatus.totalFiles && (
            <p className="text-sm text-muted-foreground text-center mt-6 font-medium">
              Scanning <span className="font-bold text-foreground">{scanStatus.totalFiles}</span> files
            </p>
          )}

          {scanStatus.status === 'failed' && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm text-destructive font-medium">{scanStatus.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Dashboard Content ────────────────────────────────────── */
function DashboardContent() {
  const { user, loading, signOut, isGitHubConnected, linkGitHubAccount } = useAuth();
  const router = useRouter();

  const [scanData,       setScanData]       = useState(null);
  const [scanStatus,     setScanStatus]     = useState(null);
  const [results,        setResults]        = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [repoUrl,        setRepoUrl]        = useState(''); // controlled by RepoPicker

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  /* Poll scan status */
  useEffect(() => {
    if (!scanData?.scanId) return;
    const startTime = Date.now();
    const minDuration = 2000;

    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/scan?scanId=${scanData.scanId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          const elapsed = Date.now() - startTime;
          const apply = () => {
            setScanStatus(data);
            setResults(data.results);
            if (scanData.repoUrl) saveScanToHistory(scanData.repoUrl, data.results, user);
          };
          elapsed < minDuration ? setTimeout(apply, minDuration - elapsed) : apply();
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setScanStatus(data);
          clearInterval(interval);
        } else {
          setScanStatus(data);
        }
      } catch (err) {
        logger.error('Scan poll error', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [scanData, user]);

  const handleScanStart = (data) => {
    setScanData(data);
    setScanStatus({ status: 'started', progress: 0 });
    setResults(null);
  };

  /* Called by RepoPicker — prefills URL and immediately starts scan */
  const handleRepoSelect = async (url) => {
    setRepoUrl(url);
    try {
      const storedToken = localStorage.getItem('synkro_github_token');
      const aiKey = localStorage.getItem('synkro_ai_key');
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: url, 
          githubToken: storedToken?.trim() || undefined,
          aiKey: aiKey?.trim() || undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start scan');
      handleScanStart({ ...data, repoUrl: url });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleNewScan  = () => { setScanData(null); setScanStatus(null); setResults(null); setRepoUrl(''); };
  const handleSignOut  = async () => { await signOut(); router.push('/'); };

  if (loading || !user) return null;

  const displayName = user.displayName || user.email?.split('@')[0] || 'Guest';
  const avatar      = user.photoURL;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              SYNKRO <span className="text-muted-foreground font-medium text-sm ml-1">Workspace</span>
            </span>
            {results && (
              <Badge variant="secondary" className="ml-3 hidden sm:flex items-center gap-1">
                <Activity className="w-3 h-3" /> Scan Complete
              </Badge>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isGitHubConnected && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-emerald-500 border-emerald-500/30">
                <GitBranch className="w-3.5 h-3.5" />
                GitHub Connected
              </Badge>
            )}
            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium text-muted-foreground bg-muted/20">
              {avatar
                ? <img src={avatar} alt="" className="w-5 h-5 rounded-full" />
                : <User className="w-4 h-4" />}
              {displayName}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <SettingsIcon className="h-4.5 w-4.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        {/* Scanner home */}
        {!scanData && !results && (
          <div className="flex flex-col items-center space-y-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Heading */}
            <div className="text-center space-y-4 max-w-2xl">
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Powered by WatsonX & Gemini AI
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                New Security Scan
              </h2>
              <p className="text-muted-foreground text-lg">
                {isGitHubConnected
                  ? 'Pick a repo below or paste any GitHub URL to start scanning.'
                  : 'Paste a GitHub URL or connect your GitHub account to pick from your repos.'}
              </p>
              {!isGitHubConnected && (
                <Button
                  onClick={async () => {
                    const res = await linkGitHubAccount();
                    if (!res.success && res.error) alert(res.error);
                  }}
                  variant="outline"
                  className="mt-6 font-semibold"
                >
                  <GitBranch className="h-4 w-4 mr-2 text-primary" />
                  Connect GitHub Account
                </Button>
              )}
            </div>

            {/* Scanner form card */}
            <div className="w-full max-w-2xl">
              <Card className="shadow-md">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <ScannerForm onScanStart={handleScanStart} prefillUrl={repoUrl} />
                  <GitHubRepoPicker onSelectRepo={handleRepoSelect} />
                </CardContent>
              </Card>
            </div>

            {/* Recent scans */}
            <div className="w-full max-w-2xl">
              <RecentScans onSelectScan={handleRepoSelect} />
            </div>
          </div>
        )}

        {/* Scanning progress */}
        {scanStatus && scanStatus.status !== 'completed' && (
          <div className="flex flex-col items-center pt-8">
            <ScanProgressCard scanStatus={scanStatus} />
            {scanStatus.status === 'failed' && (
              <Button onClick={handleNewScan} className="mt-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> Try Another Scan
              </Button>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between pb-4 border-b">
              <Button variant="outline" onClick={handleNewScan}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
              </Button>
            </div>
            <ResultsView results={results} repoUrl={scanData?.repoUrl || ''} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

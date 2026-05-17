'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/Auth/AuthProvider';
import { ScannerForm } from '@/components/Scanner/ScannerForm';
import { ResultsView } from '@/components/Results/ResultsView';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { RecentScans, saveScanToHistory } from '@/components/History/RecentScans';
import {
  Shield, LogOut, ArrowLeft, Scan, Settings as SettingsIcon,
  Activity, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ── Scan Progress Overlay ─────────────────────────────── */
function ScanProgressCard({ scanStatus }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!scanStatus) return;
    
    if (scanStatus.status === 'completed') {
      setDisplayProgress(100);
      return;
    }
    
    if (scanStatus.status === 'started' || scanStatus.status === 'cloning' || scanStatus.status === 'scanning') {
      const interval = setInterval(() => {
        setDisplayProgress(prev => {
          // Slow down as it gets closer to 90%
          const increment = prev < 50 ? 2 : prev < 80 ? 1 : prev < 90 ? 0.5 : 0;
          return Math.min(90, prev + increment);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [scanStatus?.status]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="flex items-center gap-5 mb-8">
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
            <Scan className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {scanStatus.status === 'cloning' && 'Cloning Repository...'}
              {scanStatus.status === 'scanning' && 'Deep Analysis in Progress...'}
              {scanStatus.status === 'started' && 'Initializing Scanner...'}
              {scanStatus.status === 'failed' && 'Scan Failed'}
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">{scanStatus.message || 'Analyzing codebase for vulnerabilities.'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold">Progress</span>
            <span className="text-indigo-600 font-mono font-bold">{displayProgress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-indigo-600"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {scanStatus.totalFiles && (
          <p className="text-sm text-gray-400 text-center mt-6 font-medium">
            Scanning <span className="font-bold text-gray-700">{scanStatus.totalFiles}</span> files
          </p>
        )}

        {scanStatus.status === 'failed' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600 font-medium">{scanStatus.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Tool Content ──────────────────────────────────────── */
function DashboardContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [scanData, setScanData] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (scanData?.scanId) {
      const startTime = Date.now();
      const minDuration = 2000; 

      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/scan?scanId=${scanData.scanId}`);
          const data = await response.json();
          
          if (data.status === 'completed') {
            const elapsed = Date.now() - startTime;
            if (elapsed < minDuration) {
              setTimeout(() => {
                setScanStatus(data);
                setResults(data.results);
                if (scanData.repoUrl) saveScanToHistory(scanData.repoUrl, data.results);
              }, minDuration - elapsed);
            } else {
              setScanStatus(data);
              setResults(data.results);
              if (scanData.repoUrl) saveScanToHistory(scanData.repoUrl, data.results);
            }
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setScanStatus(data);
            clearInterval(interval);
          } else {
            setScanStatus(data);
          }
        } catch (error) {
          console.error('Error fetching scan status:', error);
        }
      }, 500);
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
        body: JSON.stringify({ repoUrl: repoUrl.trim(), githubToken: storedToken?.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start scan');
      handleScanStart({ ...data, repoUrl: repoUrl.trim() });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleNewScan = () => {
    setScanData(null);
    setScanStatus(null);
    setResults(null);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl btn-gradient">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">SYNKRO <span className="text-gray-400 font-medium">Workspace</span></span>
            {results && (
              <Badge className="ml-4 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1">
                <Activity className="w-3.5 h-3.5 mr-1.5" /> Scan Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600 hidden sm:inline-block px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              {user.email || 'Guest Session'}
            </span>
            <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-xl border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-xl border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all font-bold">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        {/* Scanner Home */}
        {!scanData && !results && (
          <div className="space-y-10 flex flex-col items-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900">
                New Security Scan
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto text-lg">
                Enter a GitHub URL to identify vulnerabilities, unsafe packages, and generate AI-powered fixes.
              </p>
            </div>
            <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <ScannerForm onScanStart={handleScanStart} />
            </div>
            <div className="w-full max-w-2xl">
              <RecentScans onSelectScan={handleQuickScan} />
            </div>
          </div>
        )}

        {/* Scanning Progress */}
        {scanStatus && scanStatus.status !== 'completed' && (
          <div className="flex flex-col items-center pt-8">
            <ScanProgressCard scanStatus={scanStatus} />
            {scanStatus.status === 'failed' && (
              <Button onClick={handleNewScan} className="mt-8 rounded-xl bg-gray-900 hover:bg-gray-800 text-white shadow-lg h-12 px-6 font-bold">
                <ArrowLeft className="w-5 h-5 mr-2" /> Try Another Scan
              </Button>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <Button onClick={handleNewScan} className="rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm font-bold h-11 px-5 transition-all">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workspace
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

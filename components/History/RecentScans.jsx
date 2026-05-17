'use client';

import { useState, useEffect } from 'react';
import { History, GitBranch, ArrowRight, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/components/Auth/AuthProvider';
import { db, isConfigured } from '@/config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RecentScans({ onSelectScan }) {
  const [history, setHistory] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const saved = localStorage.getItem('synkro_scan_history');
        if (saved) setHistory(JSON.parse(saved));

        if (user && !user.isGuest && isConfigured && db) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists() && snap.data().recentScans) {
              const fsHistory = snap.data().recentScans;
              setHistory(fsHistory);
              localStorage.setItem('synkro_scan_history', JSON.stringify(fsHistory));
            }
          } catch (fsError) {
            // Ignore offline and permissions errors as we already have local storage loaded
            if (!fsError.message?.includes('offline') && !fsError.message?.includes('permissions')) {
              console.error('Failed to sync history from firestore', fsError);
            }
          }
        }
      } catch (e) { console.error('Failed to load history', e); }
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [user]);

  const clearHistory = async () => {
    localStorage.removeItem('synkro_scan_history');
    setHistory([]);
    if (user && !user.isGuest && isConfigured && db) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { recentScans: [] });
      } catch (e) { console.error('Failed to clear firestore', e); }
    }
  };

  if (history.length === 0) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          Recent Scans
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors h-auto p-1"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </Button>
      </div>

      <div className="space-y-2">
        {history.slice(0, 5).map((scan, i) => (
          <div
            key={i}
            onClick={() => onSelectScan(scan.repoUrl)}
            className="group flex items-center justify-between gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border border-border bg-card hover:bg-muted/50 hover:border-primary/20"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-muted border border-border group-hover:border-primary/20 group-hover:bg-primary/5 transition-all shrink-0">
                <GitBranch className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {scan.repoName || scan.repoUrl.replace('https://github.com/', '')}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {new Date(scan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {scan.stats.critical > 0 && (
                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5">
                  {scan.stats.critical} Crit
                </Badge>
              )}
              {scan.stats.high > 0 && (
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/10">
                  {scan.stats.high} High
                </Badge>
              )}
              {scan.stats.critical === 0 && scan.stats.high === 0 && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Secure
                </Badge>
              )}
              <div className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function saveScanToHistory(repoUrl, results, user) {
  try {
    const saved = localStorage.getItem('synkro_scan_history');
    let history = saved ? JSON.parse(saved) : [];
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    const repoName = match ? `${match[1]}/${match[2]}` : repoUrl;
    const stats = {
      critical: results.filter(i => i.severity === 'critical').length,
      high:     results.filter(i => i.severity === 'high').length,
      total:    results.length,
    };
    const newScan = { id: Date.now(), repoUrl, repoName, date: new Date().toISOString(), stats };
    history = history.filter(h => h.repoUrl !== repoUrl);
    history.unshift(newScan);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('synkro_scan_history', JSON.stringify(history));

    if (user && !user.isGuest && isConfigured && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { recentScans: history }, { merge: true });
      } catch (fsError) {
        if (!fsError.message?.includes('offline') && !fsError.message?.includes('permissions')) {
          console.error('Failed to save to firestore', fsError);
        }
      }
    }
  } catch (e) { console.error('Failed to save scan history', e); }
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, GitBranch, Shield, ArrowRight, Trash2 } from 'lucide-react';

export function RecentScans({ onSelectScan }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('synkro_scan_history');
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    
    loadHistory();
    // Re-load when focused
    window.addEventListener('focus', loadHistory);
    return () => window.removeEventListener('focus', loadHistory);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('synkro_scan_history');
    setHistory([]);
  };

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" /> Recent Scans
        </h3>
        <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 text-muted-foreground hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear History
        </Button>
      </div>
      
      <div className="space-y-3">
        {history.slice(0, 5).map((scan, index) => (
          <Card 
            key={index} 
            className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-indigo-500/30 transition-colors cursor-pointer group shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
            onClick={() => onSelectScan(scan.repoUrl)}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-md group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-indigo-300 transition-colors">
                    {scan.repoName || scan.repoUrl.replace('https://github.com/', '')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Scanned on {new Date(scan.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">{scan.stats.critical || 0} Crit</Badge>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">{scan.stats.high || 0} High</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Utility function to save a scan
export function saveScanToHistory(repoUrl, results) {
  try {
    const saved = localStorage.getItem('synkro_scan_history');
    let history = saved ? JSON.parse(saved) : [];
    
    // Extract owner/repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    const repoName = match ? `${match[1]}/${match[2]}` : repoUrl;

    // Calculate stats
    const stats = {
      critical: results.filter(i => i.severity === 'critical').length,
      high: results.filter(i => i.severity === 'high').length,
      total: results.length
    };

    const newScan = {
      id: Date.now(),
      repoUrl,
      repoName,
      date: new Date().toISOString(),
      stats
    };

    // Remove if it already exists (to push to top)
    history = history.filter(h => h.repoUrl !== repoUrl);
    
    // Add to top and keep max 10
    history.unshift(newScan);
    if (history.length > 10) history = history.slice(0, 10);
    
    localStorage.setItem('synkro_scan_history', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save scan history', e);
  }
}

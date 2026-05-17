'use client';

import { useState, useEffect } from 'react';
import { History, GitBranch, ArrowRight, Trash2 } from 'lucide-react';

export function RecentScans({ onSelectScan }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('synkro_scan_history');
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) { console.error('Failed to load history', e); }
    };
    loadHistory();
    window.addEventListener('focus', loadHistory);
    return () => window.removeEventListener('focus', loadHistory);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('synkro_scan_history');
    setHistory([]);
  };

  if (history.length === 0) return null;

  return (
    <div className="w-full mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <History className="h-4 w-4" /> Recent Scans
        </h3>
        <button onClick={clearHistory} className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 flex items-center gap-1.5 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      
      <div className="space-y-3">
        {history.slice(0, 5).map((scan, index) => (
          <div 
            key={index} 
            className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all duration-300"
            onClick={() => onSelectScan(scan.repoUrl)}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-gray-500 transition-colors">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors">
                  {scan.repoName || scan.repoUrl.replace('https://github.com/', '')}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{new Date(scan.date).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {scan.stats.critical > 0 && (
                  <div className="px-3 py-1 bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold rounded-full">{scan.stats.critical} Critical</div>
                )}
                {scan.stats.high > 0 && (
                  <div className="px-3 py-1 bg-orange-50 border border-orange-100 text-orange-700 text-[11px] font-bold rounded-full">{scan.stats.high} High</div>
                )}
                {scan.stats.critical === 0 && scan.stats.high === 0 && (
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full">Secure</div>
                )}
              </div>
              <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function saveScanToHistory(repoUrl, results) {
  try {
    const saved = localStorage.getItem('synkro_scan_history');
    let history = saved ? JSON.parse(saved) : [];
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    const repoName = match ? `${match[1]}/${match[2]}` : repoUrl;
    const stats = { critical: results.filter(i => i.severity === 'critical').length, high: results.filter(i => i.severity === 'high').length, total: results.length };
    const newScan = { id: Date.now(), repoUrl, repoName, date: new Date().toISOString(), stats };
    history = history.filter(h => h.repoUrl !== repoUrl);
    history.unshift(newScan);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('synkro_scan_history', JSON.stringify(history));
  } catch (e) { console.error('Failed to save scan history', e); }
}

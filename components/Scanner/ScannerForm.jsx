'use client';

import { useState } from 'react';
import { GitBranch, Loader2, AlertCircle, Shield, Code, Zap, Package, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ScannerForm({ onScanStart }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubPattern.test(repoUrl.trim())) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('synkro_github_token');
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), githubToken: storedToken?.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start scan');
      onScanStart?.({ ...data, repoUrl: repoUrl.trim() });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: 'Security', desc: 'XSS, injection, secrets', color: 'bg-red-50 text-red-600 border-red-100' },
    { icon: Code, label: 'Quality', desc: 'Smells, dead code', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { icon: Zap, label: 'Performance', desc: 'Memory leaks, async', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { icon: Package, label: 'Dependencies', desc: 'Vulnerable packages', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1 block">Repository URL</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <GitBranch className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <Input
            type="url"
            placeholder="https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            className="pl-12 h-14 bg-gray-50 border-gray-200 focus:bg-white text-base rounded-2xl transition-all w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            required
          />
        </div>
        <p className="text-xs text-gray-500 font-medium pl-1">For private repos, configure your GitHub Token in Settings first.</p>
      </div>

      <div>
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-3 block">Deep Analysis Engine</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className={`p-2.5 rounded-xl border ${f.color}`}>
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{f.label}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full h-14 rounded-2xl btn-gradient flex items-center justify-center gap-3 text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Scanning Repository...</>
        ) : (
          <><Search className="h-5 w-5" /> Start Security Scan <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" /></>
        )}
      </button>
    </form>
  );
}

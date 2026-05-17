'use client';

import { useState, useEffect } from 'react';
import {
  GitBranch, Loader2, AlertCircle, Shield, Code,
  Zap, Package, Search, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ScannerForm({ onScanStart, prefillUrl = '' }) {
  const [repoUrl, setRepoUrl] = useState(prefillUrl);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Update URL if parent changes prefill (e.g. RepoPicker selection)
  useEffect(() => {
    if (prefillUrl) setRepoUrl(prefillUrl);
  }, [prefillUrl]);

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
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), githubToken: storedToken?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start scan');
      onScanStart?.({ ...data, repoUrl: repoUrl.trim() });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield,  label: 'Security',     desc: 'XSS, injection, secrets',   color: 'text-destructive bg-destructive/10 border-destructive/20' },
    { icon: Code,    label: 'Quality',       desc: 'Smells, dead code',         color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { icon: Zap,     label: 'Performance',   desc: 'Memory leaks, async',       color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { icon: Package, label: 'Dependencies',  desc: 'CVEs, supply chain risks',  color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1 block">
          Repository URL
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <GitBranch className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            id="scanner-repo-url"
            type="url"
            placeholder="https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            className="pl-12 h-12 text-base"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground font-medium pl-1">
          For private repos, sign in with GitHub or add your token in Settings.
        </p>
      </div>

      {/* Feature pills */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-3 block">
          Analysis Engines Active
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {features.map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-2.5 p-3 rounded-lg border ${f.color} transition-all`}
            >
              <f.icon className={`h-4 w-4 shrink-0`} />
              <div>
                <p className="text-xs font-bold text-foreground leading-none">{f.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        id="scanner-submit"
        type="submit"
        className="w-full h-12 rounded-lg flex items-center justify-center gap-2 text-base font-bold group"
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Starting Scan...</>
        ) : (
          <>
            <Search className="h-5 w-5" />
            Start Security Scan
            <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>
    </form>
  );
}

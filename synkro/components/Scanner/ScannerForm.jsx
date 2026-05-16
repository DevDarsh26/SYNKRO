'use client';

import { useState } from 'react';
import { GitBranch, Loader2, AlertCircle, Shield, Code, Zap, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          githubToken: storedToken?.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scan');
      }

      onScanStart?.({ ...data, repoUrl: repoUrl.trim() });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: 'Security', desc: 'XSS, injection, secrets', color: 'text-red-500' },
    { icon: Code, label: 'Quality', desc: 'Smells, dead code', color: 'text-blue-500' },
    { icon: Zap, label: 'Performance', desc: 'Memory leaks', color: 'text-amber-500' },
    { icon: Package, label: 'Dependencies', desc: 'Vulnerable packages', color: 'text-emerald-500' },
  ];

  return (
    <Card className="w-full shadow-[0_0_40px_rgba(99,102,241,0.1)] border-indigo-500/20 bg-card/40 backdrop-blur-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 text-transparent bg-clip-text">Target Repository</CardTitle>
        <CardDescription className="text-base">Enter the GitHub URL to analyze the codebase for vulnerabilities and quality issues.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Repository URL</label>
            <div className="relative">
              <GitBranch className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="pl-12 h-12 text-base bg-background/50 focus-visible:ring-indigo-500/50"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground/70 pl-1">
              For private repositories, ensure you have configured your GitHub Token in Settings.
            </p>
          </div>

          <div className="bg-secondary/30 rounded-xl p-5 border border-border/50 shadow-inner">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Deep Analysis Engine</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 bg-background/40 p-3 rounded-lg border border-border/40 hover:border-border/80 transition-colors">
                  <f.icon className={`h-5 w-5 mt-0.5 ${f.color}`} />
                  <div>
                    <p className="text-sm font-bold text-foreground/90">{f.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full text-base font-bold h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border-0 transition-all hover:scale-[1.02]" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scanning Repository...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Start Security Scan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

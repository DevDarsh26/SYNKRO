'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';
import {
  GitBranch, Lock, Globe, Star, Search, RefreshCw,
  ChevronRight, AlertCircle, Code2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const LANGS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5',
  Java: '#b07219', Go: '#00add8', Rust: '#dea584', Ruby: '#701516',
  PHP: '#4f5d95', CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051',
  C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
};

function LangDot({ language }) {
  const color = LANGS[language] || '#8b949e';
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {language}
    </span>
  );
}

export function GitHubRepoPicker({ onSelectRepo }) {
  const { githubToken, isGitHubConnected } = useAuth();
  const [repos, setRepos] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | public | private

  const fetchRepos = useCallback(async () => {
    if (!githubToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/github/repos?type=all&sort=updated&per_page=100', {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch repos');
      setRepos(data.repos || []);
      setFiltered(data.repos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [githubToken]);

  useEffect(() => {
    if (isGitHubConnected) fetchRepos();
  }, [isGitHubConnected, fetchRepos]);

  useEffect(() => {
    let list = repos;
    if (filter === 'public') list = repos.filter((r) => !r.private);
    if (filter === 'private') list = repos.filter((r) => r.private);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.full_name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [search, filter, repos]);

  if (!isGitHubConnected) return null;

  return (
    <div className="mt-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Your Repositories</span>
          {repos.length > 0 && (
            <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-full">
              {repos.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchRepos}
          disabled={loading}
          className="rounded-full hover:bg-muted"
          title="Refresh repos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-medium"
          />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden bg-muted/50">
          {['all', 'public', 'private'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Repo list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectRepo(repo.html_url)}
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/20 hover:bg-muted/50 transition-all group text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {repo.private ? (
                    <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {repo.full_name}
                  </span>
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground truncate font-medium mb-2">{repo.description}</p>
                )}
                <div className="flex items-center gap-3">
                  {repo.language && <LangDot language={repo.language} />}
                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <Star className="w-3 h-3" /> {repo.stargazers_count}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="ml-3 p-2 rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && repos.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No repositories match your search.</p>
        </div>
      )}
    </div>
  );
}

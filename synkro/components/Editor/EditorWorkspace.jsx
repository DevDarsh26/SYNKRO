'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bot, UploadCloud, X, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';

export function EditorWorkspace({ issue, repoUrl, onClose }) {
  const [fileContent, setFileContent] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fixing, setFixing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Fix ${issue.title} in ${issue.file}`);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch the actual file from GitHub
  useEffect(() => {
    async function fetchFile() {
      try {
        const token = localStorage.getItem('synkro_github_token') || '';
        const res = await fetch(`/api/github/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(issue.file)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch file');
        
        setFileContent(data.content);
        setSha(data.sha);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFile();
  }, [issue, repoUrl]);

  const handleAIFix = async () => {
    setFixing(true);
    setError(null);
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          issue, 
          fullCode: fileContent,
          mode: 'full' // Request the full file fixed back
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setFileContent(data.fixedCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    setError(null);
    setSuccessMsg('');
    
    try {
      const token = localStorage.getItem('synkro_github_token');
      if (!token) throw new Error('GitHub token is required to push code. Please set it in Settings.');

      const res = await fetch('/api/github/file', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repoUrl,
          path: issue.file,
          content: fileContent,
          message: commitMessage,
          sha
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccessMsg(`Successfully committed! `);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
      cs: 'csharp', cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json'
    };
    return map[ext] || 'javascript';
  };

  return (
    <div className="fixed inset-0 z-100 flex bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="flex flex-col w-full h-full max-w-[1600px] mx-auto p-4 sm:p-6 gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <FileCode className="h-6 w-6 text-indigo-400" />
              Remediation Workspace
            </h2>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
              Editing <Badge variant="outline" className="font-mono">{issue.file}</Badge> from {(repoUrl || '').replace('https://github.com/', '')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-500/10 hover:text-red-500">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Issue Context Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pr-2">
            <Card className="bg-card/40 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-tight">{issue.title}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="destructive" className="capitalize">{issue.severity}</Badge>
                  <Badge variant="secondary" className="capitalize">{issue.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm leading-relaxed text-foreground/80">{issue.description}</p>
                </div>
                {issue.line && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Location</h4>
                    <p className="text-sm font-mono text-indigo-300">Line {issue.line}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <Button 
                    onClick={handleAIFix} 
                    disabled={fixing || loading || !fileContent}
                    className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] border-0"
                  >
                    {fixing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing & Fixing...</>
                    ) : (
                      <><Bot className="mr-2 h-4 w-4" /> AI Auto-Fix File</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
                  <UploadCloud className="h-4 w-4" /> Commit Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Commit Message</label>
                  <textarea 
                    className="w-full flex min-h-[80px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                {successMsg && (
                  <Alert className="py-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-xs ml-2">{successMsg}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleCommit} 
                  disabled={committing || loading || !fileContent}
                  variant="outline"
                  className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                >
                  {committing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pushing...</>
                  ) : (
                    'Push to GitHub'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Monaco Editor Area */}
          <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-2xl relative bg-[#1e1e1e]">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Fetching file from repository...</p>
              </div>
            ) : error && !fileContent ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                <div>
                  <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                  <p className="text-red-400 font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    Make sure the repository exists and your GitHub token in Settings has access to it.
                  </p>
                </div>
              </div>
            ) : null}

            <Editor
              height="100%"
              language={getLanguage(issue.file)}
              theme="vs-dark"
              value={fileContent}
              onChange={(val) => setFileContent(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 1.5,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                formatOnPaste: true,
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

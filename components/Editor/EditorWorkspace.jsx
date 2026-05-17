'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        body: JSON.stringify({ issue, fullCode: fileContent, mode: 'full' })
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repoUrl, path: issue.file, content: fileContent, message: commitMessage, sha })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccessMsg('Successfully committed changes to GitHub!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    const ext = filename.split('.').pop().toLowerCase();
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json' };
    return map[ext] || 'javascript';
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-gray-50/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="flex flex-col w-full h-full max-w-[1600px] mx-auto p-4 sm:p-6 gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                <FileCode className="h-5 w-5" />
              </div>
              Remediation Workspace
            </h2>
            <p className="text-gray-500 mt-1 text-sm flex items-center gap-2 font-medium">
              Editing <Badge variant="outline" className="font-mono bg-white border-gray-200 text-gray-700">{issue.file}</Badge> from {(repoUrl || '').replace('https://github.com/', '')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors h-10 w-10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Issue Context Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
            <Card className="bg-white border-indigo-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-gray-50">
                <CardTitle className="text-lg leading-tight text-gray-900">{issue.title}</CardTitle>
                <div className="flex gap-2 mt-3">
                  <Badge variant="destructive" className="capitalize bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-none">{issue.severity}</Badge>
                  <Badge variant="secondary" className="capitalize bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-none">{issue.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Description</h4>
                  <p className="text-sm leading-relaxed text-gray-700">{issue.description}</p>
                </div>
                {issue.line && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Location</h4>
                    <p className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100">Line {issue.line}</p>
                  </div>
                )}
                
                <div className="pt-5 border-t border-gray-100">
                  <button 
                    onClick={handleAIFix} 
                    disabled={fixing || loading || !fileContent}
                    className="w-full h-12 rounded-xl btn-gradient-primary flex items-center justify-center gap-2 font-bold disabled:opacity-50"
                  >
                    {fixing ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing & Fixing...</>
                    ) : (
                      <><Bot className="h-5 w-5" /> AI Auto-Fix File</>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-emerald-100 shadow-sm rounded-2xl mt-auto">
              <CardHeader className="pb-3 border-b border-emerald-50 bg-emerald-50/30 rounded-t-2xl">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <UploadCloud className="h-5 w-5" /> Commit Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Commit Message</label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-xl border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white transition-colors search-input resize-none"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive" className="py-2.5 bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-xs text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                {successMsg && (
                  <Alert className="py-2.5 bg-emerald-50 border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-xs ml-2 text-emerald-700 font-medium">{successMsg}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleCommit} 
                  disabled={committing || loading || !fileContent}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold disabled:opacity-50 transition-colors"
                >
                  {committing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Pushing...</>
                  ) : (
                    'Push to GitHub'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Monaco Editor Area */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative bg-white">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-10">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-900">Fetching file...</p>
              </div>
            ) : error && !fileContent ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                <div className="bg-red-50 p-8 rounded-2xl border border-red-100 max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-700 font-bold text-lg mb-2">{error}</p>
                  <p className="text-sm text-red-600/80">
                    Make sure the repository exists and your GitHub token in Settings has access to it.
                  </p>
                </div>
              </div>
            ) : null}

            <Editor
              height="100%"
              language={getLanguage(issue.file)}
              theme="vs" // Light theme!
              value={fileContent}
              onChange={(val) => setFileContent(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 1.6,
                padding: { top: 24, bottom: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                formatOnPaste: true,
                renderWhitespace: "selection"
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

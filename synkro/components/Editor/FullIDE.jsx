'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bot, UploadCloud, X, FileCode, CheckCircle2, AlertCircle, TerminalSquare, FolderGit2, File as FileIcon, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// --- Recursive File Tree Node ---
function FileTreeNode({ node, level, onSelect, activePath }) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isDir = node.type === 'tree';
  const isActive = activePath === node.path;

  const handleClick = () => {
    if (isDir) setIsOpen(!isOpen);
    else onSelect(node.path);
  };

  return (
    <div className="w-full">
      <div 
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-secondary/50 select-none ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-muted-foreground'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {isDir ? (isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : null}
        </span>
        {isDir ? (
          <Folder className="w-4 h-4 mr-2 text-blue-400" />
        ) : (
          <FileIcon className="w-4 h-4 mr-2 text-gray-400" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {isDir && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map((child, i) => (
            <FileTreeNode key={i} node={child} level={level + 1} onSelect={onSelect} activePath={activePath} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FullIDE({ issue, repoUrl, onClose }) {
  const [fileTree, setFileTree] = useState([]);
  const [activeFile, setActiveFile] = useState(issue?.file || '');
  const [fileContent, setFileContent] = useState('');
  const [sha, setSha] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fixing, setFixing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Fix security issue in ${activeFile}`);
  const [successMsg, setSuccessMsg] = useState('');

  const termCwdRef = useRef('');
  const repoUrlRef = useRef(repoUrl);
  const termRef = useRef(null);
  const xtermInstance = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    repoUrlRef.current = repoUrl;
  }, [repoUrl]);

  // 1. Fetch File Tree
  useEffect(() => {
    async function fetchTree() {
      try {
        const token = localStorage.getItem('synkro_github_token') || '';
        const res = await fetch(`/api/github/tree?repoUrl=${encodeURIComponent(repoUrl)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Build nested tree from flat list
        const root = { name: 'root', type: 'tree', children: [], path: '' };
        data.tree.forEach(item => {
          const parts = item.path.split('/');
          let current = root;
          parts.forEach((part, i) => {
            const isLast = i === parts.length - 1;
            let existing = current.children.find(c => c.name === part);
            if (!existing) {
              existing = { 
                name: part, 
                type: isLast ? item.type : 'tree', 
                path: parts.slice(0, i + 1).join('/'),
                children: [] 
              };
              current.children.push(existing);
            }
            current = existing;
          });
        });

        // Sort: directories first
        const sortTree = (node) => {
          if (node.children) {
            node.children.sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'tree' ? -1 : 1;
            });
            node.children.forEach(sortTree);
          }
        };
        sortTree(root);

        setFileTree(root.children);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchTree();
  }, [repoUrl]);

  // 2. Fetch Active File
  useEffect(() => {
    if (!activeFile) return;
    
    async function fetchFile() {
      setLoading(true);
      setSuccessMsg('');
      setError(null);
      try {
        const token = localStorage.getItem('synkro_github_token') || '';
        const res = await fetch(`/api/github/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(activeFile)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setFileContent(data.content);
        setSha(data.sha);
        setCommitMessage(`Fix issue in ${activeFile}`);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFile();
  }, [activeFile, repoUrl]);

  // 3. Initialize Terminal
  useEffect(() => {
    if (!termRef.current) return;
    
    const terminal = new Terminal({
      theme: { background: '#000000', foreground: '#ffffff', cursor: '#6366f1' },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(termRef.current);
    fitAddon.fit();
    xtermInstance.current = terminal;

    let currentInput = '';
    
    // Initial fetch to setup CWD
    fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: repoUrlRef.current })
    }).then(r => r.json()).then(data => {
      termCwdRef.current = data.cwd;
      terminal.write(data.output);
      terminal.write(`\r\n\x1b[32m${data.cwd}\x1b[0m $ `);
    });

    terminal.onData(async e => {
      switch (e) {
        case '\r': // Enter
          terminal.write('\r\n');
          if (currentInput.trim()) {
            try {
              const res = await fetch('/api/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: currentInput, cwd: termCwdRef.current })
              });
              const data = await res.json();
              terminal.write(data.output.replace(/\n/g, '\r\n'));
              if (!data.output.endsWith('\n')) terminal.write('\r\n');
            } catch (err) {
              terminal.write(`\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`);
            }
          }
          terminal.write(`\x1b[32m${termCwdRef.current}\x1b[0m $ `);
          currentInput = '';
          break;
        case '\u007F': // Backspace
          if (currentInput.length > 0) {
            terminal.write('\b \b');
            currentInput = currentInput.slice(0, -1);
          }
          break;
        default:
          if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
            currentInput += e;
            terminal.write(e);
          }
      }
    });

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(termRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const handleAIFix = async () => {
    setFixing(true);
    setError(null);
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          issue: { title: 'Auto-Fix', description: `Fix file ${activeFile}`, file: activeFile }, 
          fullCode: fileContent,
          mode: 'full'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFileContent(data.fixedCode);
      setSuccessMsg('AI successfully modified the file.');
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
        body: JSON.stringify({ repoUrl, path: activeFile, content: fileContent, message: commitMessage, sha })
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
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json' };
    return map[ext] || 'javascript';
  };

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-background/95 backdrop-blur-3xl animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="h-14 shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-md flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <FileCode className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-widest uppercase text-indigo-300/80">Synkro IDE</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-indigo-500/5 border-indigo-500/20 text-indigo-400">
                {repoUrl.replace('https://github.com/', '').split('/')[1] || 'repository'}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{activeFile}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-secondary/30 rounded-lg p-1 border border-border/50">
            <Button 
              onClick={handleAIFix} 
              disabled={fixing || loading || !fileContent} 
              variant="ghost"
              size="sm" 
              className="h-8 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 gap-2 transition-all duration-300"
            >
              {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              <span className="text-xs font-bold">AI Fix</span>
            </Button>
            <div className="w-px h-4 bg-border/50 mx-1"></div>
            <Button 
              onClick={handleCommit} 
              disabled={committing || loading || !fileContent}
              variant="ghost" 
              size="sm" 
              className="h-8 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 gap-2 transition-all duration-300"
            >
              {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              <span className="text-xs font-bold">Push</span>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="w-full h-full">
          {/* Left Sidebar (File Tree) */}
          <Panel defaultSize={18} minSize={12} maxSize={35} className="flex flex-col bg-card/20 backdrop-blur-sm border-r border-border/10">
            <div className="h-10 shrink-0 border-b border-border/10 flex items-center justify-between px-4">
              <span className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Explorer</span>
              <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
              {fileTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-30">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-medium">Cloning tree...</span>
                </div>
              ) : (
                fileTree.map((node, i) => (
                  <FileTreeNode key={i} node={node} level={0} onSelect={setActiveFile} activePath={activeFile} />
                ))
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 group relative flex items-center justify-center bg-transparent transition-all duration-300 hover:bg-indigo-500/20 active:bg-indigo-500/40 cursor-col-resize">
            <div className="w-[1px] h-full bg-border/20 group-hover:bg-indigo-500/40" />
          </PanelResizeHandle>

          {/* Right Area (Editor + Terminal) */}
          <Panel className="flex flex-col min-w-0 bg-[#0d0d0f]">
            <PanelGroup direction="vertical">
              {/* Top (Editor) */}
              <Panel defaultSize={72} minSize={20} className="flex flex-col relative group/editor">
                <div className="h-10 shrink-0 border-b border-white/5 flex items-center bg-[#151518] px-4 gap-4 overflow-x-auto custom-scrollbar">
                  {activeFile ? (
                    <div className="flex items-center gap-2 px-3 h-full border-t-2 border-t-indigo-500 bg-[#0d0d0f] text-[13px] font-semibold text-indigo-100 shadow-[0_-4px_10px_rgba(99,102,241,0.1)]">
                      <FileIcon className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="truncate">{activeFile.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="text-[12px] text-muted-foreground font-medium italic">Ready for input</div>
                  )}
                </div>
                
                <div className="flex-1 relative">
                  {loading && activeFile ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0f]/90 backdrop-blur-md z-50 gap-4">
                      <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                      </div>
                      <span className="text-sm font-bold text-indigo-300 animate-pulse uppercase tracking-widest">Hydrating Source</span>
                    </div>
                  ) : error && !fileContent && activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
                      <Card className="bg-red-500/5 border-red-500/20 max-w-md text-center p-8 backdrop-blur-xl">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                        <h3 className="text-xl font-bold text-red-400 mb-2">Sync Interrupted</h3>
                        <p className="text-red-300/60 text-sm leading-relaxed">{error}</p>
                      </Card>
                    </div>
                  ) : activeFile ? (
                    <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500">
                      <Editor
                        height="100%"
                        language={getLanguage(activeFile)}
                        theme="vs-dark"
                        value={fileContent}
                        onChange={(val) => setFileContent(val || '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          padding: { top: 20 },
                          smoothScrolling: true,
                          cursorBlink: "smooth",
                          cursorSmoothCaretAnimation: "on",
                          renderLineHighlight: "all",
                          lineNumbersMinChars: 4,
                          scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-[#0d0d0f]">
                      <div className="relative mb-8">
                        <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                        <Bot className="h-20 w-20 relative opacity-20" />
                      </div>
                      <p className="text-lg font-black tracking-widest uppercase opacity-30">Synkro Workspace</p>
                      <p className="text-sm mt-2 font-medium opacity-20">Select a file from the explorer to begin analysis</p>
                    </div>
                  )}
                  
                  {successMsg && (
                    <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-right-8 duration-300">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-xl shadow-2xl shadow-emerald-500/20">
                        <div className="p-1.5 bg-emerald-500/20 rounded-full">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">{successMsg}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <PanelResizeHandle className="h-1.5 group relative flex items-center justify-center bg-transparent transition-all duration-300 hover:bg-indigo-500/20 active:bg-indigo-500/40 cursor-row-resize">
                <div className="h-[1px] w-full bg-border/20 group-hover:bg-indigo-500/40" />
              </PanelResizeHandle>

              {/* Bottom (Terminal) */}
              <Panel defaultSize={28} minSize={10} className="flex flex-col bg-[#000000] border-t border-white/5">
                <div className="h-8 shrink-0 flex items-center justify-between px-6 bg-[#0a0a0c] border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <TerminalSquare className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Synkro Shell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-500/70 tracking-tighter uppercase">Local-Node-v1.0</span>
                  </div>
                </div>
                <div className="flex-1 relative p-4 overflow-hidden" ref={termRef}></div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

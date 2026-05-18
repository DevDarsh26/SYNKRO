'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, Bot, UploadCloud, X, FileCode, CheckCircle2, 
  AlertCircle, TerminalSquare, FolderGit2, File as FileIcon, 
  Folder, ChevronRight, ChevronDown, Code, Zap, GitBranch,
  Settings, Wand2, Save, ExternalLink, Eye, EyeOff, Key, ShieldCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
        className={`flex items-center py-2 px-3 cursor-pointer transition-all duration-200 select-none rounded-lg mb-0.5 mx-1 ${
          isActive 
            ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-sm border border-primary/10' 
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
        }`}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={handleClick}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1.5">
          {isDir ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : null}
        </span>
        {isDir ? (
          <Folder className={`w-4 h-4 mr-2 ${isActive ? 'text-primary' : 'text-primary/70'}`} />
        ) : (
          <FileIcon className={`w-4 h-4 mr-2 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
        )}
        <span className={`text-[13px] truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{node.name}</span>
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

export function FullIDE({ issue, repoUrl, onClose, allIssues = [] }) {
  const [fileTree, setFileTree] = useState([]);
  const [activeFile, setActiveFile] = useState(issue?.file || '');
  const [fileContent, setFileContent] = useState('');
  const [sha, setSha] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fixing, setFixing] = useState(false);
  const [fixingAll, setFixingAll] = useState(false);
  const [fixAllProgress, setFixAllProgress] = useState('');
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Fix security issue in ${activeFile}`);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPatPopup, setShowPatPopup] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [showPatValue, setShowPatValue] = useState(false);

  const termCwdRef = useRef('');
  const repoUrlRef = useRef(repoUrl);
  const termRef = useRef(null);
  const xtermInstance = useRef(null);
  const [termMounted, setTermMounted] = useState(false);

  // Group issues by file for the sidebar
  const issuesByFile = useMemo(() => {
    const map = {};
    for (const i of allIssues) {
      if (!i.file) continue;
      if (!map[i.file]) map[i.file] = [];
      map[i.file].push(i);
    }
    return map;
  }, [allIssues]);

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

        const root = { name: 'root', type: 'tree', children: [], path: '' };
        for (const item of data.tree) {
          const parts = item.path.split('/');
          let current = root;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
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
          }
        }

        const sortTree = (node) => {
          if (node.children) {
            node.children.sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'tree' ? -1 : 1;
            });
            for (const child of node.children) {
              sortTree(child);
            }
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

  // 3. Initialize Terminal — deferred until container is mounted & sized
  useEffect(() => {
    if (!termRef.current || !termMounted) return;
    const container = termRef.current;
    // Wait for the container to have real dimensions before xterm opens
    const raf = requestAnimationFrame(() => {
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) return;

      const terminal = new Terminal({
        theme: { background: '#09090b', foreground: '#fafafa', cursor: '#3b82f6', selectionBackground: '#3b82f640' },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        cursorBlink: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      const safeFit = () => {
        try {
          if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
            fitAddon.fit();
          }
        } catch (_) { /* swallow */ }
      };

      terminal.open(container);
      setTimeout(safeFit, 50);
      xtermInstance.current = terminal;

      let currentInput = '';

      fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrlRef.current })
      }).then(r => r.json()).then(data => {
        termCwdRef.current = data.cwd;
        terminal.write(data.output);
        terminal.write(`\r\n\x1b[35m${data.cwd}\x1b[0m $ `);
        setTimeout(safeFit, 150);
      }).catch(() => {
        terminal.write('\x1b[33mTerminal session unavailable.\x1b[0m\r\n');
      });

      terminal.onData(async e => {
        switch (e) {
          case '\r':
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
            terminal.write(`\x1b[35m${termCwdRef.current}\x1b[0m $ `);
            currentInput = '';
            break;
          case '\u007F':
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

      const resizeObserver = new ResizeObserver(() => safeFit());
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        terminal.dispose();
      };
    });

    return () => cancelAnimationFrame(raf);
  }, [termMounted]);

  const handleAIFix = async () => {
    setFixing(true);
    setError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key') || '';
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          issue: { title: 'Auto-Fix', description: `Fix file ${activeFile}`, file: activeFile }, 
          fullCode: fileContent,
          mode: 'full',
          customKey: aiKey || undefined,
          allIssues: issuesByFile[activeFile] || []
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

  const handleFixAll = async () => {
    const filesToFix = Object.keys(issuesByFile);
    if (filesToFix.length === 0) { setError('No issues to fix.'); return; }
    setFixingAll(true);
    setError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key') || '';
      for (const [idx, filePath] of filesToFix.entries()) {
        setFixAllProgress(`Fixing ${idx + 1}/${filesToFix.length}: ${filePath.split('/').pop()}`);
        setActiveFile(filePath);
        // Fetch the file
        const token = localStorage.getItem('synkro_github_token') || '';
        const fileRes = await fetch(`/api/github/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(filePath)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const fileData = await fileRes.json();
        if (!fileRes.ok) continue;
        // Fix it
        const fixRes = await fetch('/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue: { title: 'Fix All Issues', description: `Fix all issues in ${filePath}`, file: filePath },
            fullCode: fileData.content,
            mode: 'full',
            customKey: aiKey || undefined,
            allIssues: issuesByFile[filePath]
          })
        });
        const fixData = await fixRes.json();
        if (fixRes.ok) {
          setFileContent(fixData.fixedCode);
          setSha(fileData.sha);
        }
      }
      setSuccessMsg(`Fixed all ${filesToFix.length} files with AI!`);
      setFixAllProgress('');
    } catch (err) {
      setError(err.message);
    } finally {
      setFixingAll(false);
      setFixAllProgress('');
    }
  };

  const handleSaveAndPush = () => {
    const token = localStorage.getItem('synkro_github_token');
    if (!token) {
      setPatInput('');
      setShowPatPopup(true);
      return;
    }
    handleCommit();
  };

  const handlePatSave = () => {
    if (patInput.trim()) {
      localStorage.setItem('synkro_github_token', patInput.trim());
      setShowPatPopup(false);
      setPatInput('');
      // Now proceed with commit
      handleCommit();
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
      
      setSuccessMsg('Successfully committed! Changes pushed to GitHub.');
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="h-16 shrink-0 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-xl flex items-center justify-between px-6 shadow-2xl relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 shadow-inner">
            <FileCode className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">Synkro IDE</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-zinc-900 border-zinc-700 text-zinc-300">
                {repoUrl.replace('https://github.com/', '').split('/')[1] || 'repository'}
              </Badge>
              <span className="text-xs text-zinc-500 font-mono truncate max-w-[300px]">{activeFile}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-zinc-800 rounded-xl p-1 border border-zinc-700 shadow-inner">
            {/* Fix Current File with AI */}
            <Button 
              onClick={handleAIFix} 
              disabled={fixing || fixingAll || loading || !fileContent} 
              size="sm" 
              className="relative h-9 bg-blue-600 text-white hover:bg-blue-700 gap-2 transition-all duration-300 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              <span>{fixing ? 'Fixing...' : 'Fix with AI'}</span>
            </Button>
            
            <div className="w-px h-5 bg-zinc-700 mx-2"></div>
            
            {/* Fix ALL Files with AI */}
            <Button 
              onClick={handleFixAll} 
              disabled={fixing || fixingAll || loading || Object.keys(issuesByFile).length === 0}
              size="sm" 
              className="relative h-9 bg-amber-600 text-white hover:bg-amber-700 gap-2 transition-all duration-300 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fixingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              <span>{fixingAll ? fixAllProgress || 'Fixing All...' : 'Fix All with AI'}</span>
            </Button>

            <div className="w-px h-5 bg-zinc-700 mx-2"></div>

            {/* Save & Push */}
            <Button 
              onClick={handleSaveAndPush} 
              disabled={committing || loading || !fileContent}
              size="sm" 
              className="relative h-9 bg-emerald-600 text-white hover:bg-emerald-700 gap-2 transition-all duration-300 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              <span>{committing ? 'Pushing...' : 'Save & Push'}</span>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
          >
            <X className="h-5 w-5 text-zinc-400 hover:text-destructive" />
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="w-full h-full">
          {/* Left Sidebar (File Tree) */}
          <Panel defaultSize={20} minSize={15} maxSize={35} className="flex flex-col bg-[#09090b] border-r border-zinc-800">
            <div className="h-12 shrink-0 border-b border-zinc-800 flex items-center justify-between px-5 bg-zinc-900/30">
              <span className="font-bold text-[11px] tracking-widest text-zinc-500 uppercase">Explorer</span>
              <FolderGit2 className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
              {fileTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-zinc-600">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-semibold">Fetching tree...</span>
                </div>
              ) : (
                fileTree.map((node, i) => (
                  <FileTreeNode key={i} node={node} level={0} onSelect={setActiveFile} activePath={activeFile} />
                ))
              )}
            </div>

            {/* Issues Found Panel */}
            {Object.keys(issuesByFile).length > 0 && (
              <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/30 max-h-[40%] overflow-y-auto">
                <div className="h-10 sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-5 border-b border-zinc-800">
                  <span className="font-bold text-[11px] tracking-widest text-zinc-500 uppercase">Issues Found</span>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="py-1">
                  {Object.entries(issuesByFile).map(([file, issues]) => (
                    <button
                      key={file}
                      onClick={() => setActiveFile(file)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-zinc-800/50 transition-all ${
                        activeFile === file ? 'bg-gradient-to-r from-destructive/10 to-transparent border-l-2 border-destructive' : ''
                      }`}
                    >
                      <FileIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-200 truncate">{file.split('/').pop()}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issues.slice(0, 3).map((iss, idx) => {
                            const dotColor = iss.severity === 'critical' ? 'bg-destructive' : iss.severity === 'high' ? 'bg-orange-500' : iss.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500';
                            return (
                              <span key={idx} className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800 rounded-md px-1.5 py-0.5 border border-zinc-700/50">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                <span className="truncate max-w-[100px]">{iss.title}</span>
                              </span>
                            );
                          })}
                          {issues.length > 3 && <span className="text-[10px] text-zinc-500 px-1">+{issues.length - 3}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <PanelResizeHandle className="w-1.5 group relative flex items-center justify-center bg-[#050505] transition-all duration-200 hover:bg-primary/20 cursor-col-resize">
            <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-primary/50" />
          </PanelResizeHandle>

          {/* Right Area (Editor + Terminal) */}
          <Panel className="flex flex-col min-w-0 bg-[#050505]">
            <PanelGroup direction="vertical">
              {/* Top (Editor) */}
              <Panel defaultSize={75} minSize={30} className="flex flex-col relative">
                <div className="h-11 shrink-0 border-b border-zinc-800 flex items-center bg-[#09090b] px-2 gap-2 overflow-x-auto custom-scrollbar">
                  {activeFile ? (
                    <div className="flex items-center gap-2 px-4 h-full border-t-2 border-primary bg-[#050505] text-[13px] font-bold text-primary shadow-sm">
                      <FileIcon className="h-4 w-4 text-primary" />
                      <span className="truncate">{activeFile.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="text-[12px] text-zinc-600 font-semibold italic px-4">Select a file to start editing</div>
                  )}
                </div>
                
                <div className="flex-1 relative bg-[#050505]">
                  {loading && activeFile ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505]/80 backdrop-blur-xl z-50 gap-4">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <span className="text-sm font-bold text-primary tracking-widest uppercase">Loading File...</span>
                    </div>
                  ) : error && !fileContent && activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
                      <Card className="bg-destructive/10 border-destructive/20 max-w-md text-center shadow-2xl">
                        <CardContent className="p-8">
                          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-destructive mb-2">Sync Error</h3>
                          <p className="text-destructive/80 text-sm">{error}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : activeFile ? (
                    <div className="w-full h-full animate-in fade-in duration-300">
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
                          padding: { top: 16, bottom: 16 },
                          smoothScrolling: true,
                          cursorBlink: "smooth",
                          cursorSmoothCaretAnimation: "on",
                          renderLineHighlight: "all",
                          lineNumbersMinChars: 4,
                          scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 bg-[#050505]">
                      <div className="p-8 rounded-2xl bg-zinc-900/50 shadow-2xl border border-zinc-800 mb-6 flex items-center justify-center">
                        <Code className="h-16 w-16 text-zinc-700" />
                      </div>
                      <p className="text-lg font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-zinc-500 to-zinc-700">Synkro Editor</p>
                      <p className="text-sm mt-2 font-medium text-zinc-600">Select a file from the explorer to begin analysis</p>
                    </div>
                  )}
                  
                  {error && fileContent && (
                    <div className="absolute top-6 right-6 z-50 animate-in slide-in-from-top-6 duration-300 max-w-sm">
                      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/40 text-destructive shadow-2xl shadow-black backdrop-blur-xl">
                        <div className="p-1.5 bg-destructive/20 rounded-full shrink-0 mt-0.5">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-bold truncate">Action Failed</span>
                          <span className="text-xs font-medium text-destructive/90 break-words mt-0.5 leading-relaxed">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="shrink-0 p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {successMsg && (
                    <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-6 duration-300">
                      <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-2xl shadow-black">
                        <div className="p-1.5 bg-emerald-500/20 rounded-full">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-bold">{successMsg}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <PanelResizeHandle className="h-1.5 group relative flex items-center justify-center bg-[#050505] transition-all duration-200 hover:bg-primary/20 cursor-row-resize">
                <div className="h-[1px] w-full bg-zinc-800 group-hover:bg-primary/50" />
              </PanelResizeHandle>

              {/* Bottom (Terminal) */}
              <Panel defaultSize={25} minSize={10} className="flex flex-col bg-[#09090b] border-t border-zinc-800">
                <div className="h-10 shrink-0 flex items-center justify-between px-5 bg-zinc-900/50 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <TerminalSquare className="h-4 w-4 text-primary" />
                    <span className="font-bold text-[11px] tracking-widest text-zinc-400 uppercase">Synkro Shell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider">Node Active</span>
                  </div>
                </div>
                <div className="flex-1 relative p-4 overflow-hidden bg-[#050505]" ref={(el) => { termRef.current = el; if (el && !termMounted) setTermMounted(true); }}></div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* ── GitHub PAT Configuration Popup ── */}
      {showPatPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowPatPopup(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200 bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <GitBranch className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">GitHub Token Required</h2>
                  <p className="text-xs text-zinc-400 font-medium">Configure your PAT to push code changes</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPatPopup(false)} className="rounded-full hover:bg-zinc-800">
                <X className="h-4 w-4 text-zinc-400" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  A GitHub Personal Access Token with <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded">repo</code> scope is required to save and push code changes.
                </p>
              </div>

              <div className="relative group">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  type={showPatValue ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={patInput}
                  onChange={e => setPatInput(e.target.value)}
                  className="pl-9 pr-12 font-mono h-10 bg-zinc-900 border-zinc-700 text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPatValue(!showPatValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPatValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* How-to */}
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">How to get a token</h4>
                <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside font-medium">
                  <li>
                    Go to{' '}
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1">
                      GitHub Settings → Tokens <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Click <span className="font-semibold text-white">Generate new token (classic)</span></li>
                  <li>Check the <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">repo</code> scope</li>
                  <li>Copy and paste the token above</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
              <Button variant="outline" onClick={() => setShowPatPopup(false)} className="font-semibold border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button onClick={handlePatSave} disabled={!patInput.trim()} className="font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                <ShieldCheck className="h-4 w-4 mr-2" /> Save & Push
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

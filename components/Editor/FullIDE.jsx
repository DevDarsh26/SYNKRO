'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Loader2, Bot, UploadCloud, X, FileCode, CheckCircle2, 
  AlertCircle, TerminalSquare, FolderGit2, File as FileIcon, 
  Folder, ChevronRight, ChevronDown 
} from 'lucide-react';
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
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors select-none ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {isDir ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : null}
        </span>
        {isDir ? (
          <Folder className="w-4 h-4 mr-2 text-indigo-400" />
        ) : (
          <FileIcon className="w-4 h-4 mr-2 text-gray-400" />
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
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Fix security issue in ${activeFile}`);
  const [successMsg, setSuccessMsg] = useState('');

  const termCwdRef = useRef('');
  const repoUrlRef = useRef(repoUrl);
  const termRef = useRef(null);
  const xtermInstance = useRef(null);
  const [termMounted, setTermMounted] = useState(false);

  // Group issues by file for the sidebar
  const issuesByFile = useMemo(() => {
    const map = {};
    allIssues.forEach(i => {
      if (!i.file) return;
      if (!map[i.file]) map[i.file] = [];
      map[i.file].push(i);
    });
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

  // 3. Initialize Terminal — deferred until container is mounted & sized
  useEffect(() => {
    if (!termRef.current || !termMounted) return;
    const container = termRef.current;
    // Wait for the container to have real dimensions before xterm opens
    const raf = requestAnimationFrame(() => {
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) return;

      const terminal = new Terminal({
        theme: { background: '#ffffff', foreground: '#111827', cursor: '#4f46e5', selectionBackground: '#e0e7ff' },
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="h-16 shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <FileCode className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-widest uppercase text-gray-900">Synkro IDE</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-indigo-50 border-indigo-200 text-indigo-700">
                {repoUrl.replace('https://github.com/', '').split('/')[1] || 'repository'}
              </Badge>
              <span className="text-xs text-gray-500 font-mono truncate max-w-[300px]">{activeFile}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100/80 rounded-xl p-1 border border-gray-200">
            <Button 
              onClick={handleAIFix} 
              disabled={fixing || loading || !fileContent} 
              variant="ghost"
              size="sm" 
              className="h-9 hover:bg-indigo-50 text-indigo-600 gap-2 transition-all duration-200 rounded-lg font-bold"
            >
              {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              AI Fix
            </Button>
            <div className="w-px h-5 bg-gray-300 mx-1"></div>
            <Button 
              onClick={handleCommit} 
              disabled={committing || loading || !fileContent}
              variant="ghost" 
              size="sm" 
              className="h-9 hover:bg-emerald-50 text-emerald-600 gap-2 transition-all duration-200 rounded-lg font-bold"
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Push to GitHub
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="w-full h-full">
          {/* Left Sidebar (File Tree) */}
          <Panel defaultSize={20} minSize={15} maxSize={35} className="flex flex-col bg-white border-r border-gray-200">
            <div className="h-12 shrink-0 border-b border-gray-100 flex items-center justify-between px-5 bg-gray-50/50">
              <span className="font-bold text-[11px] tracking-widest text-gray-500 uppercase">Explorer</span>
              <FolderGit2 className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
              {fileTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
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
              <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 max-h-[40%] overflow-y-auto">
                <div className="h-10 sticky top-0 z-10 bg-gray-50 flex items-center justify-between px-5 border-b border-gray-100">
                  <span className="font-bold text-[11px] tracking-widest text-gray-500 uppercase">Issues Found</span>
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
                <div className="py-2">
                  {Object.entries(issuesByFile).map(([file, issues]) => (
                    <button
                      key={file}
                      onClick={() => setActiveFile(file)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-white transition-colors ${activeFile === file ? 'bg-white border-l-2 border-red-400' : ''}`}
                    >
                      <FileIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{file.split('/').pop()}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issues.slice(0, 3).map((iss, idx) => {
                            const dotColor = iss.severity === 'critical' ? 'bg-red-500' : iss.severity === 'high' ? 'bg-orange-500' : iss.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500';
                            return (
                              <span key={idx} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                <span className="truncate max-w-[100px]">{iss.title}</span>
                              </span>
                            );
                          })}
                          {issues.length > 3 && <span className="text-[10px] text-gray-400 px-1">+{issues.length - 3} more</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <PanelResizeHandle className="w-1.5 group relative flex items-center justify-center bg-gray-50 transition-all duration-200 hover:bg-indigo-100 cursor-col-resize">
            <div className="w-[1px] h-full bg-gray-200 group-hover:bg-indigo-300" />
          </PanelResizeHandle>

          {/* Right Area (Editor + Terminal) */}
          <Panel className="flex flex-col min-w-0 bg-white">
            <PanelGroup direction="vertical">
              {/* Top (Editor) */}
              <Panel defaultSize={75} minSize={30} className="flex flex-col relative">
                <div className="h-11 shrink-0 border-b border-gray-200 flex items-center bg-gray-50 px-2 gap-2 overflow-x-auto custom-scrollbar">
                  {activeFile ? (
                    <div className="flex items-center gap-2 px-4 h-full border-b-2 border-indigo-600 bg-white text-[13px] font-bold text-indigo-900 shadow-sm">
                      <FileIcon className="h-4 w-4 text-indigo-500" />
                      <span className="truncate">{activeFile.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="text-[12px] text-gray-500 font-semibold italic px-4">Select a file to start editing</div>
                  )}
                </div>
                
                <div className="flex-1 relative">
                  {loading && activeFile ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-50 gap-4">
                      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                      <span className="text-sm font-bold text-indigo-900 tracking-widest uppercase">Loading File...</span>
                    </div>
                  ) : error && !fileContent && activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
                      <Card className="bg-red-50 border-red-200 max-w-md text-center p-8">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700 mb-2">Sync Error</h3>
                        <p className="text-red-600/80 text-sm">{error}</p>
                      </Card>
                    </div>
                  ) : activeFile ? (
                    <div className="w-full h-full animate-in fade-in duration-300">
                      <Editor
                        height="100%"
                        language={getLanguage(activeFile)}
                        theme="vs" // Light theme!
                        value={fileContent}
                        onChange={(val) => setFileContent(val || '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          padding: { top: 24, bottom: 24 },
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                      <div className="p-8 rounded-full bg-white shadow-sm border border-gray-100 mb-6">
                        <Code className="h-16 w-16 text-gray-300" />
                      </div>
                      <p className="text-lg font-black tracking-widest uppercase text-gray-400">Synkro Editor</p>
                      <p className="text-sm mt-2 font-medium">Select a file from the explorer to begin analysis</p>
                    </div>
                  )}
                  
                  {successMsg && (
                    <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-6 duration-300">
                      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xl shadow-emerald-100/50">
                        <div className="p-1.5 bg-emerald-100 rounded-full">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold">{successMsg}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <PanelResizeHandle className="h-1.5 group relative flex items-center justify-center bg-gray-50 transition-all duration-200 hover:bg-indigo-100 cursor-row-resize">
                <div className="h-[1px] w-full bg-gray-200 group-hover:bg-indigo-300" />
              </PanelResizeHandle>

              {/* Bottom (Terminal) */}
              <Panel defaultSize={25} minSize={10} className="flex flex-col bg-white border-t border-gray-200">
                <div className="h-10 shrink-0 flex items-center justify-between px-5 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <TerminalSquare className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold text-[11px] tracking-widest text-gray-600 uppercase">Synkro Shell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase tracking-wider">Node Active</span>
                  </div>
                </div>
                <div className="flex-1 relative p-4 overflow-hidden bg-white" ref={(el) => { termRef.current = el; if (el && !termMounted) setTermMounted(true); }}></div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

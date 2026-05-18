'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield, Code, Zap, TestTube, Package, ChevronDown, ChevronUp,
  FileCode, CheckCircle2, Filter, Sparkles, Loader2, Bot, AlertCircle,
  Search as SearchIcon, Download, PieChart, Info, Copy
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const EditorWorkspace = dynamic(
  () => import('@/components/Editor/FullIDE').then(m => m.FullIDE),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initializing Workspace</span>
        </div>
      </div>
    ),
  }
);

const severityConfig = {
  critical: { label: 'Critical', color: '#ef4444', tw: 'bg-destructive/10 text-destructive border-destructive/20' },
  high:     { label: 'High',     color: '#f97316', tw: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium:   { label: 'Medium',   color: '#f59e0b', tw: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  low:      { label: 'Low',      color: '#22c55e', tw: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

const typeConfig = {
  security:    { icon: Shield,   label: 'Security',    tw: 'text-red-500 bg-red-500/10 border-red-500/20' },
  quality:     { icon: Code,     label: 'Quality',     tw: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  performance: { icon: Zap,      label: 'Performance', tw: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  testing:     { icon: TestTube, label: 'Testing',     tw: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  dependency:  { icon: Package,  label: 'Dependency',  tw: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
};

/* ── Donut Chart ─────────────────────────────────────── */
function DonutChart({ data, size = 110, thickness = 14 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return (
    <div className="flex items-center justify-center text-muted-foreground" style={{ width: size, height: size }}>
      <PieChart className="w-8 h-8 opacity-30" />
    </div>
  );
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth={thickness} />
        {data.map((seg, i) => {
          if (!seg.value) return null;
          const pct = seg.value / total;
          const dash = Math.max(pct * circ - 2, 1);
          const cur = offset;
          offset += pct * circ;
          return <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none" stroke={seg.color} strokeWidth={thickness} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-cur} strokeLinecap="round" className="transition-all duration-1000" />;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{total}</span>
      </div>
    </div>
  );
}

/* ── Issue Card ──────────────────────────────────────── */
function IssueCard({ issue, onOpenEditor, index, allIssues = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [fixing,   setFixing]   = useState(false);
  const [fixedCode,setFixedCode]= useState(null);
  const [error,    setError]    = useState(null);

  const tc = typeConfig[issue.type]  || typeConfig.quality;
  const sc = severityConfig[issue.severity] || severityConfig.low;
  const TypeIcon = tc.icon;

  const handleFix = async () => {
    setFixing(true); setError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key');
      const res  = await fetch('/api/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issue, fullCode: issue.code, aiKey, allIssues }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFixedCode(data.fixedCode);
    } catch (e) { setError(e.message); } finally { setFixing(false); }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${expanded ? 'border-primary/50' : 'border-border'} hover:border-primary/30`}>
      {/* Header row */}
      <div className="p-5 flex items-start gap-4 cursor-pointer select-none group" onClick={() => setExpanded(!expanded)}>
        <div className={`mt-0.5 p-2.5 rounded-lg border shrink-0 group-hover:scale-110 transition-transform ${tc.tw}`}>
          <TypeIcon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold leading-snug group-hover:text-primary transition-colors text-sm">{issue.title}</h4>
            <div className="p-1.5 rounded-md text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`gap-1.5 px-2.5 py-0.5 border ${sc.tw}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
              {sc.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-muted/50 text-muted-foreground">{tc.label}</Badge>
            {issue.file && (
              <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-muted-foreground flex items-center gap-1 max-w-[200px]">
                <FileCode className="h-3 w-3 shrink-0" />
                <span className="truncate">{issue.file}</span>
                {issue.line && <span className="shrink-0">:{issue.line}</span>}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 sm:px-14 pb-6 space-y-4 border-t border-border bg-muted/10">
          <div className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Description</p>
            <p className="text-sm text-foreground/80 leading-relaxed p-4 rounded-lg bg-background border border-border">{issue.description}</p>
          </div>

          {issue.code && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Problematic Code</p>
              <div className="p-4 rounded-lg bg-[#0a0a0a] border border-border overflow-x-auto">
                <code className="text-sm font-mono text-gray-300 leading-relaxed block whitespace-pre">{issue.code}</code>
              </div>
            </div>
          )}

          {(issue.fix || fixedCode) && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {fixedCode ? 'AI Generated Fix' : 'Suggested Fix'}
              </p>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-x-auto">
                <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400 leading-relaxed block whitespace-pre">{fixedCode || issue.fix}</code>
              </div>
            </div>
          )}

          {issue.recommendation && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-widest">Recommendation</p>
                <p className="text-sm text-primary/80 leading-relaxed">{issue.recommendation}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={handleFix}
              disabled={fixing || !!fixedCode}
              className="font-semibold w-full sm:w-auto"
            >
              {fixing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                : fixedCode ? <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Fix Generated</>
                : <><Bot className="h-4 w-4 mr-2" /> AI Auto-Fix</>}
            </Button>
            <Button
              onClick={() => onOpenEditor(issue)}
              className="font-semibold w-full sm:w-auto"
            >
              <FileCode className="h-4 w-4 mr-2" /> Open in Workspace
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Main ResultsView ────────────────────────────────── */
export function ResultsView({ results, repoUrl }) {
  const [filter,          setFilter]          = useState('all');
  const [severityFilter,  setSeverityFilter]  = useState('all');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [generatingReport,setGeneratingReport]= useState(false);
  const [report,          setReport]          = useState(null);
  const [reportError,     setReportError]     = useState(null);
  const [activeIssue,     setActiveIssue]     = useState(null);
  const [copied,          setCopied]          = useState(false);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = useMemo(() => {
    if (!results) return [];
    const q = searchQuery.toLowerCase().trim();
    return results.filter(i => {
      const ok = (filter === 'all' || i.type === filter) && (severityFilter === 'all' || i.severity === severityFilter);
      if (!ok) return false;
      if (!q) return true;
      return [i.title, i.description, i.file, i.code, i.recommendation].some(f => f?.toLowerCase().includes(q));
    });
  }, [results, filter, severityFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!results) return { total:0, critical:0, high:0, medium:0, low:0, security:0, quality:0, dependencies:0 };
    return {
      total:        results.length,
      critical:     results.filter(i => i.severity === 'critical').length,
      high:         results.filter(i => i.severity === 'high').length,
      medium:       results.filter(i => i.severity === 'medium').length,
      low:          results.filter(i => i.severity === 'low').length,
      security:     results.filter(i => i.type === 'security').length,
      quality:      results.filter(i => i.type === 'quality').length,
      dependencies: results.filter(i => i.type === 'dependency').length,
    };
  }, [results]);

  const severityData = [
    { name:'Critical', value:stats.critical, color:'#ef4444' },
    { name:'High',     value:stats.high,     color:'#f97316' },
    { name:'Medium',   value:stats.medium,   color:'#f59e0b' },
    { name:'Low',      value:stats.low,      color:'#22c55e' },
  ];
  const typeData = [
    { name:'Security',     value:stats.security,                                                      color:'#ef4444' },
    { name:'Quality',      value:stats.quality,                                                       color:'#3b82f6' },
    { name:'Dependencies', value:stats.dependencies,                                                  color:'#10b981' },
    { name:'Other',        value:stats.total - stats.security - stats.quality - stats.dependencies,   color:'#8b5cf6' },
  ];

  const handleGenerateReport = async () => {
    setGeneratingReport(true); setReportError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key');
      const res  = await fetch('/api/report', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ results, aiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (e) { setReportError(e.message); } finally { setGeneratingReport(false); }
  };

  const downloadBlob = (content, filename, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (!results?.length) {
    return (
      <div className="w-full mt-8 animate-in fade-in">
        <Card className="p-16 text-center border-border">
          <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h3 className="text-3xl font-extrabold mb-2">Immaculate Codebase</h3>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">No vulnerabilities, code smells, or dependency risks were detected.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk profile */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Risk Profile</p>
              <div className="space-y-2.5">
                {severityData.map(s => s.value > 0 && (
                  <div key={s.name} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="font-semibold text-muted-foreground">{s.name}</span>
                    <span className="font-mono text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <DonutChart data={severityData} />
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Categories</p>
              <div className="space-y-2.5">
                {typeData.map(t => t.value > 0 && (
                  <div key={t.name} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="font-semibold text-muted-foreground">{t.name}</span>
                    <span className="font-mono text-foreground ml-auto">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <DonutChart data={typeData} />
          </CardContent>
        </Card>

        {/* Dependency status */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">Dependency Audit</p>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${stats.dependencies === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                {stats.dependencies === 0
                  ? <Shield className="w-8 h-8 text-emerald-500" />
                  : <AlertCircle className="w-8 h-8 text-destructive" />}
              </div>
              <div>
                <p className={`font-bold text-lg ${stats.dependencies === 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {stats.dependencies === 0 ? 'Verified Safe' : `${stats.dependencies} Alerts`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.dependencies === 0 ? 'No malicious packages.' : 'Vulnerable packages found.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Report ── */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                Executive AI Report
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg">Professional security audit summary with risk assessment and remediation plan — powered by Gemini.</p>
            </div>
            {!report && (
              <Button onClick={handleGenerateReport} disabled={generatingReport} className="font-semibold shrink-0">
                {generatingReport ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <><Bot className="h-4 w-4 mr-2" /> Generate Report</>}
              </Button>
            )}
          </div>

          {reportError && (
            <div className="mt-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{reportError}
            </div>
          )}

          {report && (
            <div className="mt-6 border-t pt-6 space-y-4 animate-in fade-in">
              <div className="flex justify-end gap-3 print:hidden">
                <Button variant="outline" size="sm" onClick={handleCopyReport} className="font-semibold">
                  {copied ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? <span className="text-emerald-500">Copied!</span> : 'Copy Report'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="font-semibold text-primary border-primary/30 hover:bg-primary/10">
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadBlob(report, `synkro-audit-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown')} className="font-semibold">
                  <Download className="h-4 w-4 mr-2" /> Download Markdown
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg p-6 overflow-x-auto border bg-muted/20">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Example of further controlling what gets rendered if needed
                  }}
                >
                  {DOMPurify.sanitize(report, { USE_PROFILES: { html: true } })}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Search</p>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search files, code snippets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {['all', ...Object.keys(typeConfig)].map(k => {
                  const active = filter === k;
                  const cfg = typeConfig[k];
                  return (
                    <Button
                      key={k}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(k)}
                    >
                      {cfg && <cfg.icon className="h-3.5 w-3.5 mr-1.5" />}
                      {cfg ? cfg.label : 'All'}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Severity */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Severity</p>
              <div className="flex flex-wrap gap-2">
                {['all', ...Object.keys(severityConfig)].map(k => {
                  const active = severityFilter === k;
                  return (
                    <Button
                      key={k}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSeverityFilter(k)}
                    >
                      {k === 'all' ? 'All' : severityConfig[k].label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Issues list ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between pb-5 mb-5 border-b">
            <h3 className="font-bold text-xl flex items-center gap-3">
              Audit Findings
              <Badge variant="secondary" className="text-sm px-2">
                {filtered.length}
              </Badge>
            </h3>
            <Button variant="outline" size="sm" onClick={() => downloadBlob(JSON.stringify({ repository: repoUrl, timestamp: new Date().toISOString(), summary: stats, findings: filtered }, null, 2), `synkro-findings-${new Date().toISOString().split('T')[0]}.json`, 'application/json')} className="font-semibold">
              <Download className="h-4 w-4 mr-2" /> Export JSON
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No issues match your filters.</p>
              <button onClick={() => { setFilter('all'); setSeverityFilter('all'); setSearchQuery(''); }}
                className="mt-3 text-primary font-bold hover:underline transition-colors text-sm">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((issue, i) => (
                <IssueCard key={`${issue.file}-${i}`} issue={issue} index={i} onOpenEditor={setActiveIssue} allIssues={results} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeIssue && typeof window !== 'undefined' && createPortal(
        <EditorWorkspace issue={activeIssue} repoUrl={repoUrl} onClose={() => setActiveIssue(null)} allIssues={results} />,
        document.body
      )}
    </div>
  );
}

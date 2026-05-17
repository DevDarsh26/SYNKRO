'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Shield, Code, Zap, TestTube, Package, ChevronDown, ChevronUp, 
  FileCode, CheckCircle2, Filter, Sparkles, Loader2, Bot, AlertCircle, 
  Search as SearchIcon, Download, PieChart, Info
} from 'lucide-react';

import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const EditorWorkspace = dynamic(() => import('@/components/Editor/FullIDE').then(mod => mod.FullIDE), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-2xl">
      <div className="flex flex-col items-center gap-4 animate-float-up">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Initializing Workspace</span>
      </div>
    </div>
  )
});

const severityConfig = {
  critical: { label: 'Critical', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', color: '#ef4444' },
  high: { label: 'High', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', color: '#f97316' },
  medium: { label: 'Medium', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', color: '#f59e0b' },
  low: { label: 'Low', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', color: '#3b82f6' },
};

const typeConfig = {
  security: { icon: Shield, label: 'Security', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  quality: { icon: Code, label: 'Quality', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  performance: { icon: Zap, label: 'Performance', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  testing: { icon: TestTube, label: 'Testing', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  dependency: { icon: Package, label: 'Dependency', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};

/* ── Donut Chart ───────────────────────────────────────── */
function DonutChart({ data, size = 120, thickness = 16 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center text-gray-300" style={{ width: size, height: size }}>
      <PieChart className="w-8 h-8 opacity-30" />
    </div>
  );

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={thickness} />
        {data.map((segment, i) => {
          if (segment.value === 0) return null;
          const pct = segment.value / total;
          const dashLength = Math.max(pct * circumference - 2, 1);
          const currentOffset = offset;
          offset += pct * circumference;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={segment.color} strokeWidth={thickness} strokeDasharray={`${dashLength} ${circumference - dashLength}`} strokeDashoffset={-currentOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-gray-900">{total}</span>
      </div>
    </div>
  );
}

/* ── Issue Card ────────────────────────────────────────── */
function IssueCard({ issue, onOpenEditor, index }) {
  const [expanded, setExpanded] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixedCode, setFixedCode] = useState(null);
  const [error, setError] = useState(null);

  const TypeIcon = typeConfig[issue.type]?.icon || Code;
  const tc = typeConfig[issue.type] || typeConfig.quality;
  const sc = severityConfig[issue.severity] || severityConfig.low;

  const handleFix = async () => {
    setFixing(true);
    setError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key');
      const res = await fetch('/api/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issue, fullCode: issue.code, aiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFixedCode(data.fixedCode);
    } catch (err) { setError(err.message); } finally { setFixing(false); }
  };

  return (
    <div
      className="issue-card animate-float-up"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <div className="p-5 flex items-start gap-4 cursor-pointer select-none group" onClick={() => setExpanded(!expanded)}>
        <div className={`mt-0.5 p-2.5 rounded-xl ${tc.bg} border ${tc.border} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          <TypeIcon className={`h-5 w-5 ${tc.color}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors duration-300">{issue.title}</h4>
            <div className="shrink-0 p-1.5 rounded-lg bg-white/50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all duration-300 border border-transparent group-hover:border-indigo-100">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </div>
            <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase px-2.5 py-1 bg-white/60 backdrop-blur rounded-full border border-gray-100">{tc.label}</span>
            {issue.file && (
              <span className="text-xs text-gray-600 flex items-center gap-1.5 bg-white/60 backdrop-blur border border-gray-100 px-2.5 py-1 rounded-full truncate max-w-[200px] sm:max-w-xs font-medium">
                <FileCode className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="truncate">{issue.file}</span>
                {issue.line && <span className="text-gray-400 shrink-0">:{issue.line}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 sm:px-16 pb-6 border-t border-gray-100/80 space-y-5 bg-gradient-to-b from-gray-50/30 to-transparent animate-slide-up">
          <div className="pt-5">
            <h5 className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-widest">Description</h5>
            <p className="text-sm text-gray-700 leading-relaxed bg-white/50 border border-gray-100/50 p-4 rounded-xl">{issue.description}</p>
          </div>

          {issue.code && (
            <div>
              <h5 className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-widest">Problematic Code</h5>
              <div className="p-4 rounded-xl bg-[#0f0f14] border border-gray-800/50 overflow-x-auto shadow-inner">
                <code className="text-sm font-mono text-gray-300 leading-relaxed block whitespace-pre">{issue.code}</code>
              </div>
            </div>
          )}

          {(issue.fix || fixedCode) && (
            <div>
              <h5 className="text-[11px] font-bold mb-2 flex items-center gap-2 text-emerald-600 uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" /> {fixedCode ? 'AI Generated Fix' : 'Suggested Fix'}
              </h5>
              <div className="p-4 rounded-xl bg-[#051f13] border border-emerald-900/30 overflow-x-auto shadow-inner">
                <code className="text-sm font-mono text-emerald-400 leading-relaxed block whitespace-pre">{fixedCode || issue.fix}</code>
              </div>
            </div>
          )}

          {issue.recommendation && (
            <div className="p-4 rounded-xl bg-white/50 border border-gray-100/50 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[11px] font-bold text-blue-800 mb-1 uppercase tracking-widest">Recommendation</h5>
                <p className="text-sm text-blue-700/90 leading-relaxed">{issue.recommendation}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50/80 border border-red-100 text-red-600 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <Button onClick={handleFix} disabled={fixing || fixedCode} variant="outline" className="bg-white/60 backdrop-blur border-indigo-200/60 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all">
              {fixing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Fix...</> : fixedCode ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Fix Generated</> : <><Bot className="mr-2 h-4 w-4" /> AI Auto-Fix</>}
            </Button>
            <button onClick={() => onOpenEditor(issue)} className="px-5 py-2.5 rounded-xl btn-gradient flex items-center justify-center text-sm font-semibold text-white">
              <FileCode className="mr-2 h-4 w-4" /> Open in Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Results View ──────────────────────────────────────── */
export function ResultsView({ results, repoUrl }) {
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [activeWorkspaceIssue, setActiveWorkspaceIssue] = useState(null);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    const query = searchQuery.toLowerCase().trim();
    return results.filter(issue => {
      const typeMatch = filter === 'all' || issue.type === filter;
      const severityMatch = severityFilter === 'all' || issue.severity === severityFilter;
      let searchMatch = true;
      if (query) {
        searchMatch = [issue.title, issue.description, issue.file, issue.code, issue.recommendation]
          .some(field => field && field.toLowerCase().includes(query));
      }
      return typeMatch && severityMatch && searchMatch;
    });
  }, [results, filter, severityFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!results) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, security: 0, quality: 0, dependencies: 0 };
    return {
      total: results.length,
      critical: results.filter(i => i.severity === 'critical').length,
      high: results.filter(i => i.severity === 'high').length,
      medium: results.filter(i => i.severity === 'medium').length,
      low: results.filter(i => i.severity === 'low').length,
      security: results.filter(i => i.type === 'security').length,
      quality: results.filter(i => i.type === 'quality').length,
      dependencies: results.filter(i => i.type === 'dependency').length,
    };
  }, [results]);

  const severityData = [
    { name: 'Critical', value: stats.critical, color: '#ef4444' },
    { name: 'High', value: stats.high, color: '#f97316' },
    { name: 'Medium', value: stats.medium, color: '#f59e0b' },
    { name: 'Low', value: stats.low, color: '#3b82f6' },
  ];

  const typeData = [
    { name: 'Security', value: stats.security, color: '#dc2626' },
    { name: 'Quality', value: stats.quality, color: '#2563eb' },
    { name: 'Dependencies', value: stats.dependencies, color: '#059669' },
    { name: 'Other', value: stats.total - stats.security - stats.quality - stats.dependencies, color: '#8b5cf6' },
  ];

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);
    try {
      const aiKey = localStorage.getItem('synkro_ai_key');
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, aiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (err) { setReportError(err.message); } finally { setGeneratingReport(false); }
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `synkro-audit-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    if (!results) return;
    const exportData = {
      repository: repoUrl,
      timestamp: new Date().toISOString(),
      summary: stats,
      findings: filteredResults
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `synkro-findings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (!results || results.length === 0) {
    return (
      <div className="w-full mt-8 animate-in fade-in">
        <div className="bg-white rounded-3xl p-16 text-center border border-gray-200 shadow-sm">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Immaculate Codebase</h3>
          <p className="text-gray-500 max-w-md mx-auto text-lg">No vulnerabilities, code quality issues, or dependency risks were detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Dashboard Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Risk Profile</h3>
            <div className="space-y-2.5">
              {severityData.map(s => s.value > 0 && (
                <div key={s.name} className="flex items-center gap-3 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-semibold text-gray-700">{s.name}</span>
                  <span className="text-gray-500 font-mono ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <DonutChart data={severityData} size={110} thickness={14} />
        </div>

        {/* Categories */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Categories</h3>
            <div className="space-y-2.5">
              {typeData.map(t => t.value > 0 && (
                <div key={t.name} className="flex items-center gap-3 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-semibold text-gray-700">{t.name}</span>
                  <span className="text-gray-500 font-mono ml-auto">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
          <DonutChart data={typeData} size={110} thickness={14} />
        </div>

        {/* Dependency Status */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Dependency Audit</h3>
          {stats.dependencies === 0 ? (
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Verified Safe</p>
                <p className="text-sm text-gray-500">No malicious packages.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-4 bg-red-50 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-700 text-lg">{stats.dependencies} Alerts</p>
                <p className="text-sm text-red-600/80">Vulnerable packages found.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Report (Moved to Top) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-400 opacity-5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-2 tracking-tight">
              <Sparkles className="w-6 h-6 text-blue-500" /> 
              <span className="text-gradient">Executive AI Report</span>
            </h3>
            <p className="text-gray-500 font-medium max-w-2xl">Generate a professional summary of the repository health, risk assessment, and recommended next steps using Gemini AI.</p>
          </div>
          {!report && (
            <button onClick={handleGenerateReport} disabled={generatingReport} className="px-8 py-4 rounded-2xl btn-gradient font-bold flex items-center disabled:opacity-70 transition-all shrink-0">
              {generatingReport ? <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Analyzing...</> : <><Bot className="mr-3 h-5 w-5" /> Generate Report</>}
            </button>
          )}
        </div>

        {reportError && <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-start gap-3"><AlertCircle className="w-5 h-5 shrink-0" />{reportError}</div>}
        
        {report && (
          <div className="mt-8 space-y-4 animate-in fade-in border-t border-gray-100 pt-8 relative z-10">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleDownloadReport} className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold h-10 px-5 transition-colors">
                <Download className="w-4 h-4 mr-2" /> Download Markdown
              </Button>
            </div>
            <div className="prose prose-sm max-w-none bg-[#f8fafc] rounded-2xl p-6 sm:p-8 overflow-x-auto border border-gray-100 shadow-inner prose-headings:text-gray-900 prose-headings:tracking-tight prose-p:text-gray-700 prose-strong:text-gray-800 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-pre:bg-[#0f0f14] prose-pre:text-gray-300 prose-pre:rounded-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-table:border-collapse prose-th:bg-gray-100 prose-th:text-xs prose-th:uppercase prose-th:tracking-widest prose-th:text-gray-500 prose-td:text-sm prose-td:border-gray-200 prose-li:text-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Global Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input type="text" placeholder="Search files, code snippets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-medium w-full transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Category</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>All</button>
              {Object.entries(typeConfig).map(([key, config]) => (
                <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${filter === key ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  <config.icon className="h-4 w-4" />{config.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Severity</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSeverityFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${severityFilter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>All</button>
              {Object.entries(severityConfig).map(([key, config]) => (
                <button key={key} onClick={() => setSeverityFilter(key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${severityFilter === key ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{config.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Issues List ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
          <h3 className="font-black text-2xl text-gray-900 flex items-center gap-3">
            Audit Findings
            <Badge variant="outline" className="text-sm bg-gray-50 border-gray-200 text-gray-700 px-3 py-1 rounded-full font-bold shadow-sm">
              {filteredResults.length}
            </Badge>
          </h3>
          <Button onClick={handleExportData} variant="outline" className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-bold h-10 px-5 transition-colors">
            <Download className="w-4 h-4 mr-2" /> Export JSON
          </Button>
        </div>

        {filteredResults.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No issues match your current filters.</p>
            <button onClick={() => { setFilter('all'); setSeverityFilter('all'); setSearchQuery(''); }} className="mt-4 text-blue-600 font-bold hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredResults.map((issue, index) => (
              <IssueCard key={`${issue.file}-${index}`} issue={issue} index={index} onOpenEditor={setActiveWorkspaceIssue} />
            ))}
          </div>
        )}
      </div>

      {activeWorkspaceIssue && <EditorWorkspace issue={activeWorkspaceIssue} repoUrl={repoUrl} onClose={() => setActiveWorkspaceIssue(null)} allIssues={results} />}
    </div>
  );
}

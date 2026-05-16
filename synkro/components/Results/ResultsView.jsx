'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Code, Zap, TestTube, Package, ChevronDown, ChevronUp, FileCode, CheckCircle2, Filter, Sparkles, Loader2, Bot, AlertCircle } from 'lucide-react';

import dynamic from 'next/dynamic';

const EditorWorkspace = dynamic(() => import('@/components/Editor/FullIDE').then(mod => mod.FullIDE), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-black tracking-[0.3em] uppercase text-indigo-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">Initializing</span>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Environment Setup</span>
        </div>
      </div>
    </div>
  )
});

const severityConfig = {
  critical: { label: 'Critical', variant: 'destructive', textClass: 'text-red-500' },
  high: { label: 'High', variant: 'default', textClass: 'text-orange-500' },
  medium: { label: 'Medium', variant: 'secondary', textClass: 'text-amber-500' },
  low: { label: 'Low', variant: 'outline', textClass: 'text-blue-500' },
};

const typeConfig = {
  security: { icon: Shield, label: 'Security', color: 'text-red-500', bg: 'bg-red-500/10' },
  quality: { icon: Code, label: 'Quality', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  performance: { icon: Zap, label: 'Performance', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  testing: { icon: TestTube, label: 'Testing', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  dependency: { icon: Package, label: 'Dependency', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

function IssueCard({ issue, onOpenEditor }) {
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
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, fullCode: issue.code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFixedCode(data.fixedCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] border-border/50 bg-card/50 backdrop-blur-sm">
      <div 
        className="p-4 md:p-5 flex items-start gap-4 cursor-pointer select-none group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-1 p-2.5 rounded-xl ${tc.bg} shrink-0 group-hover:scale-110 transition-transform`}>
          <TypeIcon className={`h-5 w-5 ${tc.color}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{issue.title}</h4>
            <div className="shrink-0 pt-0.5">
              {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={sc.variant} className="capitalize">
              {sc.label}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{tc.label}</span>
            {issue.file && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-full">
                <FileCode className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{issue.file}</span>
                {issue.line && <span>:{issue.line}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-5 px-5 md:px-16 border-t border-border/20 mt-4 space-y-6">
          <div className="pt-4">
            <h5 className="text-sm font-semibold mb-2 text-foreground/90 uppercase tracking-wide">Description</h5>
            <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
          </div>

          {issue.code && (
            <div>
              <h5 className="text-sm font-semibold mb-2 text-foreground/90 uppercase tracking-wide">Problematic Code</h5>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 overflow-x-auto shadow-inner">
                <code className="text-sm font-mono text-gray-300">{issue.code}</code>
              </div>
            </div>
          )}

          {(issue.fix || fixedCode) && (
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2 text-emerald-400 uppercase tracking-wide">
                <Sparkles className="h-4 w-4" /> 
                {fixedCode ? 'AI Generated Snippet' : 'Suggested Fix'}
              </h5>
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 overflow-x-auto shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                <code className="text-sm font-mono text-emerald-300">{fixedCode || issue.fix}</code>
              </div>
            </div>
          )}

          {issue.recommendation && (
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20">
              <h5 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide">Recommendation</h5>
              <p className="text-sm text-blue-200/80">{issue.recommendation}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleFix} 
              disabled={fixing || fixedCode}
              variant="outline"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              {fixing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Fix...</>
              ) : fixedCode ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Snippet Generated</>
              ) : (
                <><Bot className="mr-2 h-4 w-4" /> Generate Snippet</>
              )}
            </Button>
            
            <Button 
              onClick={() => onOpenEditor(issue)}
              className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] border-0"
            >
              <FileCode className="mr-2 h-4 w-4" /> Open in IDE
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function ResultsView({ results, repoUrl }) {
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [activeWorkspaceIssue, setActiveWorkspaceIssue] = useState(null);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter(issue => {
      const typeMatch = filter === 'all' || issue.type === filter;
      const severityMatch = severityFilter === 'all' || issue.severity === severityFilter;
      return typeMatch && severityMatch;
    });
  }, [results, filter, severityFilter]);

  const stats = useMemo(() => {
    if (!results) return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    return {
      total: results.length,
      critical: results.filter(i => i.severity === 'critical').length,
      high: results.filter(i => i.severity === 'high').length,
      medium: results.filter(i => i.severity === 'medium').length,
      low: results.filter(i => i.severity === 'low').length,
    };
  }, [results]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synkro-security-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!results || results.length === 0) {
    return (
      <Card className="w-full border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] bg-emerald-950/10">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-emerald-500/20 mb-6 animate-pulse">
            <CheckCircle2 className="h-20 w-20 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-extrabold mb-3 text-emerald-50">Repository is Secure!</h3>
          <p className="text-emerald-200/70 max-w-md mx-auto text-lg">
            No security vulnerabilities or code quality issues were detected. Your codebase is in excellent health.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Issues', value: stats.total, color: 'text-primary', glow: 'shadow-[0_0_20px_rgba(124,58,237,0.15)]' },
          { label: 'Critical', value: stats.critical, color: 'text-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
          { label: 'High', value: stats.high, color: 'text-orange-500', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]' },
          { label: 'Medium', value: stats.medium, color: 'text-amber-500', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
          { label: 'Low', value: stats.low, color: 'text-blue-500', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
        ].map((s, i) => (
          <Card key={i} className={`bg-card/40 backdrop-blur-md border-border/40 ${s.glow}`}>
            <CardHeader className="pb-2 text-center">
              <CardTitle className={`text-4xl font-black ${s.color}`}>{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Report Section */}
      <Card className="bg-linear-to-br from-indigo-950/40 to-purple-950/40 border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Executive AI Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!report ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-indigo-200/70">
                Generate a professional executive summary of these findings using Gemini 2.5 Flash.
              </p>
              <Button 
                onClick={handleGenerateReport} 
                disabled={generatingReport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
              >
                {generatingReport ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Bot className="mr-2 h-4 w-4" /> Generate Report</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleDownloadReport} className="border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300">
                  <FileCode className="w-4 h-4 mr-2" /> Download Markdown
                </Button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none prose-indigo">
                <div className="bg-black/20 rounded-xl p-6 border border-indigo-500/10 whitespace-pre-wrap font-sans text-indigo-100/90 leading-relaxed">
                  {report}
                </div>
              </div>
            </div>
          )}
          
          {reportError && (
            <Alert variant="destructive" className="bg-red-950/50 border-red-500/30">
              <AlertTitle>Report Generation Failed</AlertTitle>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide text-muted-foreground">
            <Filter className="h-4 w-4" /> Filter Results
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Category</label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={filter === 'all' ? 'default' : 'secondary'} 
                  size="sm" 
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'shadow-[0_0_10px_rgba(255,255,255,0.2)]' : ''}
                >
                  All Categories
                </Button>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <Button 
                    key={key} 
                    variant={filter === key ? 'default' : 'secondary'} 
                    size="sm" 
                    onClick={() => setFilter(key)}
                    className={filter === key ? `bg-primary shadow-[0_0_10px_rgba(124,58,237,0.3)]` : 'opacity-80 hover:opacity-100'}
                  >
                    <config.icon className="h-3.5 w-3.5 mr-2" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Severity</label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={severityFilter === 'all' ? 'default' : 'secondary'} 
                  size="sm" 
                  onClick={() => setSeverityFilter('all')}
                >
                  All Severities
                </Button>
                {['critical', 'high', 'medium', 'low'].map((severity) => (
                  <Button 
                    key={severity} 
                    variant={severityFilter === severity ? 'default' : 'secondary'} 
                    size="sm" 
                    onClick={() => setSeverityFilter(severity)}
                    className="capitalize"
                  >
                    {severity}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
          Found Issues <Badge variant="secondary" className="ml-2">{filteredResults.length}</Badge>
        </h3>
        {filteredResults.length === 0 ? (
          <Card className="bg-card/30 border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              No issues match your selected filters. Try adjusting them.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredResults.map((issue, index) => (
              <IssueCard 
                key={index} 
                issue={issue} 
                onOpenEditor={setActiveWorkspaceIssue} 
              />
            ))}
          </div>
        )}
      </div>

      {activeWorkspaceIssue && (
        <EditorWorkspace 
          issue={activeWorkspaceIssue} 
          repoUrl={repoUrl} 
          onClose={() => setActiveWorkspaceIssue(null)} 
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Settings, X, GitBranch, ExternalLink, ShieldCheck, Bot, Key, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsModal({ isOpen, onClose }) {
  const [token,        setToken]        = useState('');
  const [aiKey,        setAiKey]        = useState('');
  const [showToken,    setShowToken]    = useState(false);
  const [showAiKey,    setShowAiKey]    = useState(false);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToken(localStorage.getItem('synkro_github_token') || '');
      setAiKey(localStorage.getItem('synkro_ai_key') || '');
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (token.trim()) localStorage.setItem('synkro_github_token', token.trim());
    else localStorage.removeItem('synkro_github_token');

    if (aiKey.trim()) localStorage.setItem('synkro_ai_key', aiKey.trim());
    else localStorage.removeItem('synkro_ai_key');

    setSaved(true);
    setTimeout(onClose, 800);
  };

  if (!isOpen) return null;

  const providers = [
    { label: 'Gemini',    key: 'AIza...',   color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { label: 'OpenAI',    key: 'sk-...',    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Anthropic', key: 'sk-ant-...', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { label: 'Grok',      key: 'xai-...',   color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg animate-in zoom-in-95 duration-200 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent gradient */}
        <div className="h-1 w-full bg-primary" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Settings</h2>
              <p className="text-xs text-muted-foreground font-medium">API tokens &amp; preferences</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* ── AI API Key ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Custom AI API Key</h3>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/50 border border-border">
              Override the server AI. We auto-detect the provider from your key format.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {providers.map(p => (
                <div key={p.label} className={`flex items-center justify-between px-3 py-1.5 rounded-md border text-xs font-semibold ${p.color}`}>
                  <span>{p.label}</span>
                  <code className="font-mono opacity-70">{p.key}</code>
                </div>
              ))}
            </div>

            <div className="relative group">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <Input
                type={showAiKey ? 'text' : 'password'}
                placeholder="AIza... / sk-... / sk-ant-... / xai-..."
                value={aiKey}
                onChange={e => setAiKey(e.target.value)}
                className="pl-9 pr-12 font-mono h-10"
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {aiKey && <ShieldCheck className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── GitHub PAT ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">GitHub Personal Access Token</h3>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Needed for <span className="text-orange-500 font-semibold">private repositories</span> if you signed in via email/guest.
                If you signed in with GitHub OAuth, your token is already synced automatically.
              </p>
            </div>

            <div className="relative group">
              <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="pl-9 pr-12 font-mono h-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {token && <ShieldCheck className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
            </div>

            {/* How to get token */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">How to get a token</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside font-medium">
                <li>
                  Go to{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    GitHub Settings → Tokens <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Click <span className="font-semibold text-foreground">Generate new token (classic)</span></li>
                <li>Check the <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">repo</code> scope</li>
                <li>Copy and paste the token above</li>
              </ol>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant={saved ? "secondary" : "default"}
            className="font-semibold"
          >
            {saved ? (
              <><ShieldCheck className="h-4 w-4 mr-2" /> Saved!</>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

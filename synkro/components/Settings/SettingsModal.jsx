'use client';

import { useState, useEffect } from 'react';
import { Settings, X, GitBranch, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function SettingsModal({ isOpen, onClose }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      setToken(localStorage.getItem('synkro_github_token') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (token.trim()) {
      localStorage.setItem('synkro_github_token', token.trim());
    } else {
      localStorage.removeItem('synkro_github_token');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-[0_0_50px_rgba(99,102,241,0.15)] border-indigo-500/30 bg-card/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <CardHeader className="relative pb-4 border-b border-border/50">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Application Settings</CardTitle>
              <CardDescription>Configure your API tokens and preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <h3 className="text-sm font-semibold">GitHub Personal Access Token</h3>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Required only for scanning <strong>private repositories</strong>. Public repositories can be scanned without a token. This token is stored securely in your browser's local storage and is never saved to our database.
            </p>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm bg-background/50 focus-visible:ring-indigo-500/50"
              />
            </div>

            <div className="bg-secondary/40 rounded-lg p-4 border border-border/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">How to get a token:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center">GitHub Settings <ExternalLink className="h-3 w-3 ml-1"/></a></li>
                <li>Click <strong>Generate new token (classic)</strong></li>
                <li>Give it a descriptive name (e.g., "SYNKRO Scanner")</li>
                <li>Check the <strong>`repo`</strong> scope (Full control of private repositories)</li>
                <li>Click Generate and paste the token above</li>
              </ol>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

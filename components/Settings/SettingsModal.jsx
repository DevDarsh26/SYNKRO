'use client';

import { useState, useEffect } from 'react';
import { Settings, X, GitBranch, ExternalLink, ShieldCheck, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsModal({ isOpen, onClose }) {
  const [token, setToken] = useState('');
  const [aiKey, setAiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setToken(localStorage.getItem('synkro_github_token') || '');
      setAiKey(localStorage.getItem('synkro_ai_key') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (token.trim()) localStorage.setItem('synkro_github_token', token.trim());
    else localStorage.removeItem('synkro_github_token');
    
    if (aiKey.trim()) localStorage.setItem('synkro_ai_key', aiKey.trim());
    else localStorage.removeItem('synkro_ai_key');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-md" />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="glass-panel">
            
            {/* Header */}
            <div className="px-7 py-6 border-b border-gray-100/50">
              <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-xl bg-white/50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-300">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/50 rounded-2xl shadow-sm">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Settings</h2>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">API tokens & preferences</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-7 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* AI API KEY */}
                <div className="flex items-center gap-2.5 text-gray-900">
                  <Bot className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-sm font-bold">Custom AI API Key</h3>
                </div>
                
                <p className="text-sm text-gray-500 leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-100/50">
                  Provide your own API key for AI-powered reports and fixes. We auto-detect the provider from the key format:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">Gemini — <code>AIza...</code></span>
                  <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100">OpenAI — <code>sk-...</code></span>
                  <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-100">Anthropic — <code>sk-ant-...</code></span>
                  <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100">Grok — <code>xai-...</code></span>
                </div>

                <div className="relative group">
                  <Input type="password" placeholder="AIza... / sk-... / sk-ant-... / xai-..." value={aiKey} onChange={(e) => setAiKey(e.target.value)} className="font-mono text-sm pl-4 pr-12 h-13 rounded-xl bg-white/60 border-gray-200/80 focus:bg-white transition-all" />
                  {aiKey && <ShieldCheck className="absolute right-4 top-3.5 h-5 w-5 text-emerald-500 animate-fade-in" />}
                </div>

                <div className="h-px bg-gray-200/50 my-6" />

                {/* GITHUB TOKEN */}
                <div className="flex items-center gap-2.5 text-gray-900">
                  <GitBranch className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-bold">GitHub Personal Access Token</h3>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-100/50">
                  Required only for <strong>private repositories</strong>. Stored securely in your browser's local storage — never sent to our servers.
                </p>

                <div className="relative group">
                  <Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={token} onChange={(e) => setToken(e.target.value)} className="font-mono text-sm pl-4 pr-12 h-13 rounded-xl bg-white/60 border-gray-200/80 focus:bg-white transition-all" />
                  {token && <ShieldCheck className="absolute right-4 top-3.5 h-5 w-5 text-emerald-500 animate-fade-in" />}
                </div>

                <div className="bg-white/50 border border-gray-100/50 rounded-xl p-5">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">How to get a token</h4>
                  <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside font-medium marker:text-gray-400">
                    <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">GitHub Settings <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Click <strong>Generate new token (classic)</strong></li>
                    <li>Check the <strong>`repo`</strong> scope</li>
                    <li>Paste the generated token above</li>
                  </ol>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} className="rounded-xl font-semibold bg-white/60 backdrop-blur border-gray-200/60 text-gray-700 hover:bg-white h-11 px-5 transition-all">Cancel</Button>
                <button onClick={handleSave} className="rounded-xl btn-gradient h-11 px-7 font-bold text-sm shadow-sm text-white">Save Settings</button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

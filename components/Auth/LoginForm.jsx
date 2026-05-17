'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { isConfigured } from '@/config/firebase';
import {
  Mail, Lock, AlertCircle, User, ArrowRight,
  Eye, EyeOff, GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm({ onSuccess }) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  const { signIn, signUp, signInWithGoogle, signInWithGitHub, signInAsGuest } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingProvider('email');
    setLoading(true);

    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);
    setLoadingProvider('');
    if (result.success) { onSuccess?.(); }
    else { setError(result.error); }
  };

  const handleGitHub = async () => {
    setError('');
    setLoadingProvider('github');
    const result = await signInWithGitHub();
    setLoadingProvider('');
    if (result.success) { onSuccess?.(); }
    else { setError(result.error); }
  };

  const handleGoogle = async () => {
    setError('');
    setLoadingProvider('google');
    const result = await signInWithGoogle();
    setLoadingProvider('');
    if (result.success) { onSuccess?.(); }
    else { setError(result.error); }
  };

  const handleGuest = () => {
    signInAsGuest();
    onSuccess?.();
  };

  const busy = loading || !!loadingProvider;

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/15 border border-destructive/30 rounded-lg text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span className="font-medium leading-snug">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleGitHub}
          disabled={busy || !isConfigured}
          className="w-full h-12 text-sm font-semibold relative"
        >
          {loadingProvider === 'github' ? <Spinner /> : <GitBranch className="h-4 w-4 mr-2" />}
          Continue with GitHub
          <span className="absolute right-3 text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full border border-primary-foreground/20">
            Recommended
          </span>
        </Button>

        {isConfigured && (
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full h-12 text-sm font-semibold"
          >
            {loadingProvider === 'google' ? <Spinner /> : <GoogleIcon />}
            <span className="ml-2">Continue with Google</span>
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground uppercase tracking-wider font-semibold">
            {isConfigured ? 'or continue with email' : 'or try without an account'}
          </span>
        </div>
      </div>

      {isConfigured ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11"
                required
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 h-11"
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 mt-2 font-semibold">
            {loadingProvider === 'email' ? <Spinner /> : (isSignUp ? 'Create Account' : 'Sign In')}
            {!busy && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>

          <p className="text-center text-sm font-medium text-muted-foreground pt-2">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-bold transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      ) : (
        <Button
          type="button"
          onClick={handleGuest}
          className="w-full h-12 font-semibold"
        >
          <User className="h-4 w-4 mr-2" />
          Continue as Guest
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {isConfigured && (
        <p className="text-center text-sm text-muted-foreground font-medium mt-6">
          Just exploring?{' '}
          <button
            onClick={handleGuest}
            className="text-foreground hover:underline underline-offset-4 transition-colors font-semibold"
          >
            Continue as Guest
          </button>
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

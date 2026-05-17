'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { isConfigured } from '@/config/firebase';
import { Mail, Lock, AlertCircle, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  const handleGuestMode = () => {
    signInAsGuest();
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      {/* Guest Mode — Primary CTA */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-black tracking-tight text-gray-900 mb-1.5">Get started instantly</h3>
          <p className="text-sm text-gray-500 font-medium">No account needed — jump right in.</p>
        </div>
        <button
          onClick={handleGuestMode}
          className="w-full h-14 rounded-2xl btn-gradient flex items-center justify-center gap-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <User className="h-5 w-5" />
          Continue as Guest
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      {/* Divider */}
      {isConfigured && (
        <>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 backdrop-blur-sm px-4 rounded-full text-gray-400 font-bold tracking-widest border border-gray-100 py-1 shadow-sm">Or sign in</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-medium leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 tracking-wide uppercase">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 tracking-wide uppercase">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-[15px] shadow-md transition-all hover:shadow-lg"
              disabled={loading}
            >
              {loading ? <span className="flex items-center gap-2"><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...</span> : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          {/* Google Sign In */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-[15px] shadow-sm transition-all"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="pt-6 border-t border-gray-100/50 mt-6">
            <p className="text-center text-sm font-medium text-gray-500">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

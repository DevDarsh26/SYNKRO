'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { isConfigured } from '@/config/firebase';
import { Mail, Lock, AlertCircle, User, LogIn, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <Card className="bg-card/40 backdrop-blur-md border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
        <CardHeader>
          <CardTitle className="text-xl">Try without an account</CardTitle>
          <CardDescription>Experience the scanner right away</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="default" 
            size="lg" 
            className="w-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-100 hover:bg-indigo-500/30 hover:border-indigo-500/50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] h-14" 
            onClick={handleGuestMode}
          >
            <User className="mr-2 h-5 w-5 text-indigo-400" />
            Continue as Guest
            <ArrowRight className="ml-2 h-4 w-4 text-indigo-400" />
          </Button>
        </CardContent>
      </Card>

      {isConfigured && (
        <Card className="bg-card/40 backdrop-blur-md border-border/40">
          <CardHeader>
            <CardTitle>{isSignUp ? 'Create an Account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Save your scan history by creating an account' : 'Sign in to access your saved scans'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

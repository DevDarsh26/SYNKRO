'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/Auth/AuthProvider';
import { LoginForm } from '@/components/Auth/LoginForm';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null; // Or a sleek loader

  return (
    <div className="min-h-screen text-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center p-3 rounded-2xl btn-gradient hover:scale-105 transition-transform shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </Link>
        </div>
        <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-gray-900">
          Welcome to SYNKRO
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-gray-500">
          Sign in to your workspace or <Link href="/" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">return to home</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-4 sm:rounded-[2rem] sm:px-10">
          <LoginForm onSuccess={() => router.push('/dashboard')} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}

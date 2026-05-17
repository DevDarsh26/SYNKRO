'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isConfigured } from '@/config/firebase';

let firebaseAuth = null;

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest session first
    if (typeof window !== 'undefined' && localStorage.getItem('synkro_guest_session')) {
      setUser({
        email: 'guest@synkro.dev',
        displayName: 'Guest User',
        isGuest: true,
      });
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Dynamically import firebase auth to avoid issues when not configured
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('@/config/firebase').then(({ auth }) => {
        if (!auth) {
          setLoading(false);
          return;
        }
        firebaseAuth = auth;

        const unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
        });

        return () => unsubscribe();
      });
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const signIn = async (email, password) => {
    if (!isConfigured || !firebaseAuth) {
      return { success: false, error: 'Firebase is not configured.' };
    }
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password) => {
    if (!isConfigured || !firebaseAuth) {
      return { success: false, error: 'Firebase is not configured.' };
    }
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    if (!isConfigured || !firebaseAuth) {
      return { success: false, error: 'Firebase is not configured.' };
    }
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('synkro_guest_session');
    }
    if (!isConfigured || !firebaseAuth) {
      // For guest mode, just clear the user
      setUser(null);
      return { success: true };
    }
    try {
      const { signOut: fbSignOut } = await import('firebase/auth');
      await fbSignOut(firebaseAuth);
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signInAsGuest = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('synkro_guest_session', 'true');
    }
    setUser({
      email: 'guest@synkro.dev',
      displayName: 'Guest User',
      isGuest: true,
    });
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    signInAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

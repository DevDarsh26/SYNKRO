'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isConfigured } from '@/config/firebase';

let firebaseAuth = null;

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // GitHub OAuth token (stored in localStorage after GitHub sign-in)
  const [githubToken, setGithubToken] = useState(null);

  // Restore GitHub token from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synkro_github_token');
      if (stored) setGithubToken(stored);
    }
  }, []);

  useEffect(() => {
    // Check for guest session first
    if (typeof window !== 'undefined' && localStorage.getItem('synkro_guest_session')) {
      setUser({
        email: 'guest@synkro.dev',
        displayName: 'Guest User',
        photoURL: null,
        isGuest: true,
      });
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('@/config/firebase').then(({ auth }) => {
        if (!auth) { setLoading(false); return; }
        firebaseAuth = auth;

        const unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          // When Firebase reports a user, check if we have a stored GitHub token
          if (u && typeof window !== 'undefined') {
            const stored = localStorage.getItem('synkro_github_token');
            if (stored) setGithubToken(stored);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      });
    }).catch(() => setLoading(false));
  }, []);

  /* ── Email / Password ─────────────────────────────────── */
  const signIn = async (email, password) => {
    if (!isConfigured || !firebaseAuth) return { success: false, error: 'Firebase is not configured.' };
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password) => {
    if (!isConfigured || !firebaseAuth) return { success: false, error: 'Firebase is not configured.' };
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /* ── Google OAuth ─────────────────────────────────────── */
  const signInWithGoogle = async () => {
    if (!isConfigured || !firebaseAuth) return { success: false, error: 'Firebase is not configured.' };
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /* ── GitHub OAuth ─────────────────────────────────────── */
  /**
   * Signs in with GitHub via Firebase and captures the OAuth access token.
   * The token is stored so we can call the GitHub API for private repos.
   * Requires the GithubAuthProvider scopes: user, repo.
   */
  const signInWithGitHub = async () => {
    if (!isConfigured || !firebaseAuth) return { success: false, error: 'Firebase is not configured.' };
    try {
      const { GithubAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GithubAuthProvider();
      // Request access to public + private repos
      provider.addScope('repo');
      provider.addScope('read:user');

      const result = await signInWithPopup(firebaseAuth, provider);

      // Extract the OAuth GitHub token from the credential
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        localStorage.setItem('synkro_github_token', token);
        setGithubToken(token);
      }

      return { success: true, user: result.user, githubToken: token };
    } catch (error) {
      // Handle account-exists-with-different-credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in with Google or email/password first.',
        };
      }
      return { success: false, error: error.message };
    }
  };

  /* ── Link GitHub Account ──────────────────────────────── */
  const linkGitHubAccount = async () => {
    if (!isConfigured || !firebaseAuth || !firebaseAuth.currentUser) {
      return { success: false, error: 'User must be signed in to link accounts.' };
    }
    try {
      const { GithubAuthProvider, linkWithPopup } = await import('firebase/auth');
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');

      const result = await linkWithPopup(firebaseAuth.currentUser, provider);
      
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        localStorage.setItem('synkro_github_token', token);
        setGithubToken(token);
      }

      return { success: true, user: result.user, githubToken: token };
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/account-exists-with-different-credential') {
        try {
          const { GithubAuthProvider } = await import('firebase/auth');
          const credential = GithubAuthProvider.credentialFromError(error);
          const token = credential?.accessToken;
          if (token) {
            localStorage.setItem('synkro_github_token', token);
            setGithubToken(token);
            return { success: true, githubToken: token };
          }
        } catch (e) {
          console.error('Failed to recover credential from error', e);
        }
        return { success: false, error: 'This GitHub account is linked to another user, but we could not recover the access token. Try logging out and logging in with GitHub directly.' };
      }
      return { success: false, error: error.message };
    }
  };

  /* ── Guest Mode ───────────────────────────────────────── */
  const signInAsGuest = () => {
    if (typeof window !== 'undefined') localStorage.setItem('synkro_guest_session', 'true');
    setUser({
      email: 'guest@synkro.dev',
      displayName: 'Guest User',
      photoURL: null,
      isGuest: true,
    });
  };

  /* ── Sign Out ─────────────────────────────────────────── */
  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('synkro_guest_session');
      // Note: we keep the GitHub token across sessions intentionally,
      // but clear it on explicit sign-out.
      localStorage.removeItem('synkro_github_token');
    }
    setGithubToken(null);

    if (!isConfigured || !firebaseAuth) {
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

  const value = {
    user,
    loading,
    githubToken,
    isGitHubConnected: !!githubToken,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGitHub,
    linkGitHubAccount,
    signOut,
    signInAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

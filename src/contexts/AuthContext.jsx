/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses Supabase Auth with GitHub OAuth.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, onAuthStateChange, signInWithGitHub, signOut as supabaseSignOut, getUserByEmail } from '../utils/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null); // User from our users table
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        loadAppUser(session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const subscription = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        loadAppUser(session.user.email);
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load user from our users table
  async function loadAppUser(email) {
    try {
      const { data, error } = await getUserByEmail(email);
      if (error) {
        console.error('Error loading app user:', error);
        setError('Your email is not registered in the system. Please contact an administrator.');
        setAppUser(null);
      } else {
        setAppUser(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading app user:', err);
      setError('Failed to load user data.');
    }
    setLoading(false);
  }

  // Sign in with GitHub
  async function signIn() {
    setError(null);
    const { error } = await signInWithGitHub();
    if (error) {
      console.error('Sign in error:', error);
      setError(error.message);
    }
  }

  // Sign out
  async function signOut() {
    const { error } = await supabaseSignOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    setSession(null);
    setUser(null);
    setAppUser(null);
  }

  const value = {
    session,
    user,           // Supabase auth user (GitHub account)
    appUser,        // Our app's user (from users table)
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!session,
    isAuthorized: !!appUser,
    isAssigner: appUser?.role === 'assigner',
    isUnderwriter: appUser?.role === 'underwriter'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

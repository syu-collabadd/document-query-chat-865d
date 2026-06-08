import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface DemoUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | DemoUser | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  demoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check demo session
    const demoUser = localStorage.getItem('docquery_demo_user');
    if (demoUser) {
      setUser(JSON.parse(demoUser));
      setIsDemo(true);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured. Use Demo Mode.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, _name: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured. Use Demo Mode.') };
    }
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (isDemo) {
      localStorage.removeItem('docquery_demo_user');
      setUser(null);
      setIsDemo(false);
      return;
    }
    if (supabase) await supabase.auth.signOut();
  };

  const demoLogin = () => {
    const demo: DemoUser = { id: 'demo-user', email: 'demo@docquery.ai', name: 'Demo User' };
    localStorage.setItem('docquery_demo_user', JSON.stringify(demo));
    setUser(demo);
    setIsDemo(true);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemo, signIn, signUp, signOut, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

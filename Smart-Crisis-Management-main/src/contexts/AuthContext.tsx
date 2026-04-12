import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'volunteer' | 'citizen' | null;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata: { name: string; role: string; phone?: string; latitude?: number; longitude?: number; address?: string }) => Promise<{ error: string | null; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resendOtp: (email: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(supabaseUser: SupabaseUser): Promise<User | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', supabaseUser.id)
    .maybeSingle();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supabaseUser.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: supabaseUser.id,
    name: profile.name,
    email: profile.email,
    role: (roleData?.role as UserRole) || 'citizen',
    phone: profile.phone || undefined,
    latitude: profile.latitude ?? undefined,
    longitude: profile.longitude ?? undefined,
    address: profile.address ?? undefined,
  };
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  return `${platform} - ${ua.substring(0, 100)}`;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginLogId, setLoginLogId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const recordLogin = async (userId: string, role: string, status: string) => {
    try {
      const { data } = await supabase.from('login_logs').insert({
        user_id: userId,
        role,
        login_status: status,
        device_info: getDeviceInfo(),
        ip_address: 'client-side',
      } as any).select('id').maybeSingle();
      if (data) setLoginLogId(data.id);
    } catch (e) {
      // Non-critical, don't block auth flow
    }
  };

  const signUp = async (email: string, password: string, metadata: { name: string; role: string; phone?: string; latitude?: number; longitude?: number; address?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    if (!error && data.user) {
      // Update profile with location if provided
      if (metadata.latitude || metadata.longitude || metadata.address) {
        await supabase.from('profiles').update({
          phone: metadata.phone,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          address: metadata.address,
        } as any).eq('user_id', data.user.id);
      }
      await recordLogin(data.user.id, metadata.role, 'success');
    }
    // Return needsVerification flag when email confirmation is pending
    const needsVerification = !error && data.user && !data.session;
    return { error: error?.message || null, needsVerification: !!needsVerification };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) return { error: error.message };
    if (data.user) {
      const profile = await fetchUserProfile(data.user);
      setUser(profile);
    }
    return { error: null };
  };

  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error: error?.message || null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const profile = await fetchUserProfile(data.user);
      await recordLogin(data.user.id, profile?.role || 'unknown', 'success');
    } else if (error) {
      // Log failed attempt - can't record user_id since auth failed
    }
    return { error: error?.message || null };
  };

  const logout = async () => {
    // Update logout time
    if (loginLogId) {
      await supabase.from('login_logs').update({
        logout_time: new Date().toISOString(),
      } as any).eq('id', loginLogId);
      setLoginLogId(null);
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        signUp,
        signIn,
        verifyOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

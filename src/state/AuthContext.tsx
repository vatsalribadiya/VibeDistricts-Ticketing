import { Session } from '@supabase/supabase-js';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { StaffPermissions, UserRole } from '../types';

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthResult {
  ok: boolean;
  message: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: AuthProfile | null;
  staffPermissions: StaffPermissions | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const mapPermissions = (row: Record<string, boolean>): StaffPermissions => ({
  canViewEvents: row.can_view_events ?? false,
  canCreateEvents: row.can_create_events ?? false,
  canEditEvents: row.can_edit_events ?? false,
  canDeleteEvents: row.can_delete_events ?? false,
  canPublishEvents: row.can_publish_events ?? false,
  canManageInventory: row.can_manage_inventory ?? false,
  canViewGuestList: row.can_view_guest_list ?? false,
  canScanTickets: row.can_scan_tickets ?? false,
  canIssueRefunds: row.can_issue_refunds ?? false,
  scopeAllEvents: row.scope_all_events ?? false,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions | null>(null);

  const loadAccess = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!supabase || !nextSession) {
      setProfile(null);
      setStaffPermissions(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', nextSession.user.id)
      .single();
    if (error) throw error;

    const nextProfile: AuthProfile = {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isActive: data.is_active,
    };
    setProfile(nextProfile);

    if (nextProfile.role === 'staff') {
      const { data: permissions, error: permissionError } = await supabase
        .from('staff_permissions')
        .select('*')
        .eq('staff_id', nextSession.user.id)
        .maybeSingle();
      if (permissionError) throw permissionError;
      setStaffPermissions(permissions ? mapPermissions(permissions) : null);
    } else {
      setStaffPermissions(null);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession()
      .then(({ data }) => loadAccess(data.session))
      .catch(() => loadAccess(null))
      .finally(() => setLoading(false));

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => loadAccess(nextSession).catch(() => undefined), 0);
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, [loadAccess]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    profile,
    staffPermissions,
    signIn: async (email, password) => {
      if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      return error ? { ok: false, message: error.message } : { ok: true, message: 'Welcome back.' };
    },
    signUp: async (fullName, email, password) => {
      if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) return { ok: false, message: error.message };
      const requiresEmailConfirmation = !data.session;
      return {
        ok: true,
        requiresEmailConfirmation,
        message: requiresEmailConfirmation ? 'Check your email to confirm your account.' : 'Your account is ready.',
      };
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      setSession(null); setProfile(null); setStaffPermissions(null);
    },
    refreshAccess: async () => loadAccess(session),
  }), [loading, session, profile, staffPermissions, loadAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

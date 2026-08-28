"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import * as authService from "@/services/auth.service";
import type { Profile } from "@/types/user";

interface UseAuthState {
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    profile: null,
    initializing: true,
    loading: false,
    error: null,
  });

  const loadProfile = useCallback(async () => {
    try {
      const { user, profile } = await authService.getCurrentUser();
      setState((s) => ({ ...s, user, profile, initializing: false, error: null }));
    } catch (err) {
      setState((s) => ({
        ...s,
        user: null,
        profile: null,
        initializing: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const {
      data: { subscription },
    } = authService.onAuthStateChange(() => {
      loadProfile();
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.login(email, password);
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
      throw err;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const register = useCallback(async (input: authService.RegisterInput) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      return await authService.register(input);
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
      throw err;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  return { ...state, login, register, logout };
}

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isCloudEnabled } from "./supabase";

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
}

/**
 * Subscribes to Supabase auth changes. Returns `{ loading: false, session: null }`
 * forever in local-only mode.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: isCloudEnabled,
    session: null,
    user: null,
  });

  useEffect(() => {
    if (!isCloudEnabled || !supabase) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        session,
        user: session?.user ?? null,
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Cloud is not configured.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Cloud is not configured.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error("Cloud is not configured.");
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Profile } from "@/types/user";

type Client = SupabaseClient<Database>;

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: "buyer" | "seller";
}

export async function register(
  { email, password, displayName, role }: RegisterInput,
  supabase: Client = createClient(),
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, role },
    },
  });
  if (error) throw error;
  return data;
}

export async function login(
  email: string,
  password: string,
  supabase: Client = createClient(),
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout(supabase: Client = createClient()) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Único archivo que conoce onAuthStateChange: los hooks no importan
// lib/supabase directo, pasan siempre por services/ (regla de capas).
export function onAuthStateChange(
  callback: () => void,
  supabase: Client = createClient(),
) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getCurrentUserId(
  supabase: Client = createClient(),
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCurrentUser(supabase: Client = createClient()) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  return { user, profile: profile as Profile };
}

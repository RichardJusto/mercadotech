import { describe, expect, it } from "vitest";
import { register, login, logout, getCurrentUserId, getCurrentUser } from "@/services/auth.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("auth.service.register", () => {
  it("caso feliz: pasa display_name y role como metadata", async () => {
    const signUpData = { user: { id: "u1" }, session: null };
    const supabase = createSupabaseMock({
      auth: { signUp: async () => ({ data: signUpData, error: null }) },
    });

    const result = await register(
      { email: "a@test.com", password: "12345678", displayName: "Comprador", role: "buyer" },
      supabase as never,
    );
    expect(result).toBe(signUpData);
  });

  it("propaga el error", async () => {
    const boom = new Error("email ya registrado");
    const supabase = createSupabaseMock({
      auth: { signUp: async () => ({ data: null, error: boom }) },
    });

    await expect(
      register(
        { email: "a@test.com", password: "12345678", displayName: "Comprador", role: "buyer" },
        supabase as never,
      ),
    ).rejects.toBe(boom);
  });
});

describe("auth.service.login", () => {
  it("caso feliz", async () => {
    const data = { user: { id: "u1" }, session: {} };
    const supabase = createSupabaseMock({
      auth: { signInWithPassword: async () => ({ data, error: null }) },
    });

    await expect(login("a@test.com", "12345678", supabase as never)).resolves.toBe(data);
  });

  it("propaga el error de credenciales inválidas", async () => {
    const boom = new Error("Credenciales inválidas");
    const supabase = createSupabaseMock({
      auth: { signInWithPassword: async () => ({ data: null, error: boom }) },
    });

    await expect(login("a@test.com", "mala-pass", supabase as never)).rejects.toBe(boom);
  });
});

describe("auth.service.logout", () => {
  it("caso feliz", async () => {
    const supabase = createSupabaseMock({ auth: { signOut: async () => ({ error: null }) } });
    await expect(logout(supabase as never)).resolves.toBeUndefined();
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ auth: { signOut: async () => ({ error: boom }) } });
    await expect(logout(supabase as never)).rejects.toBe(boom);
  });
});

describe("auth.service.getCurrentUserId", () => {
  it("devuelve el id cuando hay sesión", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    });
    await expect(getCurrentUserId(supabase as never)).resolves.toBe("u1");
  });

  it("devuelve null sin sesión", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });
    await expect(getCurrentUserId(supabase as never)).resolves.toBeNull();
  });
});

describe("auth.service.getCurrentUser", () => {
  it("caso feliz: user + profile", async () => {
    const profile = { id: "u1", role: "buyer" };
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      tables: { profiles: { data: profile, error: null } },
    });

    const result = await getCurrentUser(supabase as never);
    expect(result).toEqual({ user: { id: "u1" }, profile });
  });

  it("sin sesión: user y profile null, sin consultar profiles", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });

    await expect(getCurrentUser(supabase as never)).resolves.toEqual({ user: null, profile: null });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("propaga el error del perfil", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      tables: { profiles: { data: null, error: boom } },
    });

    await expect(getCurrentUser(supabase as never)).rejects.toBe(boom);
  });
});

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm, type LoginFormValues } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, error } = useAuth();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  async function handleSubmit(values: LoginFormValues) {
    try {
      await login(values.email, values.password);
      router.push(redirectTo);
    } catch {
      // el error ya queda expuesto por useAuth() y se muestra en el form
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <LoginForm onSubmit={handleSubmit} loading={loading} error={error} />
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}

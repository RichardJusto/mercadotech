"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { RegisterForm, type RegisterFormValues } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, loading, error } = useAuth();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  async function handleSubmit(values: RegisterFormValues) {
    try {
      // Supabase local tiene enable_confirmations = false: el registro
      // inicia sesión de inmediato. En un proyecto hosted con confirmación
      // por email activa, `session` vendría null y habría que mostrar
      // "revisa tu correo" en vez de redirigir.
      const { session } = await register(values);
      if (session) {
        router.push(redirectTo);
      }
    } catch {
      // el error ya queda expuesto por useAuth() y se muestra en el form
    }
  }

  return (
    <div className="animate-rise space-y-4">
      <Card className="glow-ring">
        <CardHeader>
          <h1 className="font-heading text-xl font-semibold">Crear cuenta</h1>
        </CardHeader>
        <CardContent>
          <RegisterForm onSubmit={handleSubmit} loading={loading} error={error} />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

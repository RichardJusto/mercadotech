"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateRegister, type FieldErrors } from "@/lib/validators/auth";

export interface RegisterFormValues {
  email: string;
  password: string;
  displayName: string;
  role: "buyer" | "seller";
}

interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => void;
  loading?: boolean;
  error?: string | null;
}

const ROLE_OPTIONS: { value: "buyer" | "seller"; label: string; description: string }[] = [
  { value: "buyer", label: "Quiero comprar", description: "Explora y compra productos" },
  { value: "seller", label: "Quiero vender", description: "Publica y administra productos" },
];

export function RegisterForm({ onSubmit, loading = false, error }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
    displayName: "",
    role: "buyer",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateRegister(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      onSubmit(values);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="register-name">Nombre</Label>
        <Input
          id="register-name"
          value={values.displayName}
          onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
          aria-invalid={!!fieldErrors.displayName}
        />
        {fieldErrors.displayName ? (
          <p className="text-sm text-destructive">{fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email ? (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      <fieldset className="space-y-1.5" role="radiogroup" aria-label="Tipo de cuenta">
        <legend className="text-sm font-medium">Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                values.role === option.value && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={values.role === option.value}
                onChange={() => setValues((v) => ({ ...v, role: option.value }))}
                className="sr-only"
              />
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </div>
        {fieldErrors.role ? (
          <p className="text-sm text-destructive">{fieldErrors.role}</p>
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}

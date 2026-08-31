import type { Role } from "@/lib/constants/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Exportadas para que los tests (Fase 6.2) anclen los casos límite a estos
// valores reales, no a números copiados — cero cambio de comportamiento.
export const PASSWORD_MIN = 8;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 60;
export const REGISTER_ROLES: Role[] = ["buyer", "seller"];

export interface FieldErrors {
  [field: string]: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!EMAIL_RE.test(input.email)) {
    errors.email = "Ingresa un email válido.";
  }
  if (input.password.length < PASSWORD_MIN) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }

  return errors;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: string;
}

export function validateRegister(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!EMAIL_RE.test(input.email)) {
    errors.email = "Ingresa un email válido.";
  }
  if (input.password.length < PASSWORD_MIN) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (
    input.displayName.trim().length < DISPLAY_NAME_MIN ||
    input.displayName.trim().length > DISPLAY_NAME_MAX
  ) {
    errors.displayName = `El nombre debe tener entre ${DISPLAY_NAME_MIN} y ${DISPLAY_NAME_MAX} caracteres.`;
  }
  if (!REGISTER_ROLES.includes(input.role as Role)) {
    errors.role = "Elige si quieres comprar o vender.";
  }

  return errors;
}

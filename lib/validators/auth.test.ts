import { describe, expect, it } from "vitest";
import {
  validateLogin,
  validateRegister,
  PASSWORD_MIN,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
} from "@/lib/validators/auth";

describe("validateLogin", () => {
  it("rechaza un email inválido", () => {
    const errors = validateLogin({ email: "no-es-un-email", password: "MercadoTech123!" });
    expect(errors.email).toBeDefined();
  });

  it(`rechaza un password de menos de ${PASSWORD_MIN} caracteres`, () => {
    const errors = validateLogin({ email: "buyer1@mercadotech.test", password: "a".repeat(PASSWORD_MIN - 1) });
    expect(errors.password).toBeDefined();
  });

  it("caso feliz: sin errores con email y password válidos", () => {
    const errors = validateLogin({
      email: "buyer1@mercadotech.test",
      password: "a".repeat(PASSWORD_MIN),
    });
    expect(errors).toEqual({});
  });
});

describe("validateRegister", () => {
  const base = {
    email: "buyer1@mercadotech.test",
    password: "a".repeat(PASSWORD_MIN),
    displayName: "Comprador Uno",
    role: "buyer",
  };

  it("rechaza un email inválido", () => {
    const errors = validateRegister({ ...base, email: "no-es-un-email" });
    expect(errors.email).toBeDefined();
  });

  it(`rechaza un password de menos de ${PASSWORD_MIN} caracteres`, () => {
    const errors = validateRegister({ ...base, password: "a".repeat(PASSWORD_MIN - 1) });
    expect(errors.password).toBeDefined();
  });

  it(`rechaza displayName de menos de ${DISPLAY_NAME_MIN} caracteres`, () => {
    const errors = validateRegister({ ...base, displayName: "a".repeat(DISPLAY_NAME_MIN - 1) });
    expect(errors.displayName).toBeDefined();
  });

  it(`rechaza displayName de más de ${DISPLAY_NAME_MAX} caracteres`, () => {
    const errors = validateRegister({ ...base, displayName: "a".repeat(DISPLAY_NAME_MAX + 1) });
    expect(errors.displayName).toBeDefined();
  });

  it("rechaza el rol 'admin' (no es un rol registrable)", () => {
    const errors = validateRegister({ ...base, role: "admin" });
    expect(errors.role).toBeDefined();
  });

  it("rechaza un rol desconocido", () => {
    const errors = validateRegister({ ...base, role: "lo-que-sea" });
    expect(errors.role).toBeDefined();
  });

  it.each(["buyer", "seller"])("caso feliz: sin errores con role='%s'", (role) => {
    const errors = validateRegister({ ...base, role });
    expect(errors).toEqual({});
  });
});

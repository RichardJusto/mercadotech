import { NextResponse } from "next/server";

// Respuesta de error consistente para los 3 endpoints de la sesión 4
// (reindex, search/semantic, chat).
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

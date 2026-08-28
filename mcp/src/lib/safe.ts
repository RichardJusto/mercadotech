// Wrapper try/catch uniforme: TODA tool y TODO resource del servidor pasa
// por acá (lección 7 — "resources/list nunca falla completo": cada
// resource captura sus propios errores en vez de tumbar el listado
// entero). El error se loggea a stderr (console.error ya está redirigido
// en index.ts) y se transforma en el valor de "está todo bien pero esto
// falló" que le corresponda a cada caller — nunca un stack trace crudo.
export async function safe<T>(
  fn: () => Promise<T>,
  onError: (message: string) => T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = errorMessage(err);
    console.error(message);
    return onError(message);
  }
}

// Los errores de @supabase/supabase-js (PostgrestError, o un TypeError de
// fetch cuando la API ni siquiera responde, ej. Supabase detenido) no
// siempre son instancias de Error pero sí traen `.message` — sin este
// chequeo, safe() los convertía en el inútil "[object Object]".
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

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
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return onError(message);
  }
}

// Errores tipados del servidor MCP. safe.ts los distingue de errores
// inesperados para dar un mensaje accionable en vez de un stack trace crudo
// (ver tabla "Cómo verificar" de la Fase 5.3: "id inexistente -> error
// tipado claro, no stack trace").

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} no encontrado: ${id}`);
    this.name = "NotFoundError";
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

// Cubre los tres casos que ya distingue lib/ai/completion.ts y
// lib/ai/embeddings.ts (token ausente/inválido, cuota agotada, modelo
// rotado): el MCP no reinterpreta esos mensajes, los reenvía tal cual bajo
// este tipo para que las tools #4/#5/#7/#8 degraden con gracia.
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export function isKnownError(
  err: unknown,
): err is NotFoundError | InvalidInputError | ProviderError {
  return (
    err instanceof NotFoundError ||
    err instanceof InvalidInputError ||
    err instanceof ProviderError
  );
}

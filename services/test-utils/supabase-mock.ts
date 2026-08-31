import { vi } from "vitest";

// Fábrica del mock encadenable del cliente Supabase (Fase 6.3, único helper
// compartido de la fase). NO filtra datos de verdad: cada `.from(tabla)`
// devuelve la respuesta programada para esa tabla, consumida en el orden en
// que el código bajo prueba la llama — así una misma tabla puede
// responder distinto en llamadas sucesivas (ej. cart_items: primero el
// SELECT que busca el ítem existente, después el UPDATE/INSERT).
export interface MockResponse {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

type TableResponses = MockResponse | MockResponse[];

export interface SupabaseMockOptions {
  tables?: Record<string, TableResponses>;
  rpc?: Record<string, MockResponse | ((args: unknown) => MockResponse)>;
  auth?: Record<string, unknown>;
  storage?: Record<string, unknown>;
}

const EMPTY_RESPONSE: MockResponse = { data: null, error: null };

export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const callIndexByTable: Record<string, number> = {};

  function nextResponse(table: string): MockResponse {
    const configured = options.tables?.[table];
    if (!configured) return EMPTY_RESPONSE;
    if (!Array.isArray(configured)) return configured;

    const i = callIndexByTable[table] ?? 0;
    callIndexByTable[table] = i + 1;
    return configured[Math.min(i, configured.length - 1)];
  }

  function buildQuery(table: string) {
    const response = nextResponse(table);
    const resolved = Promise.resolve(response);

    const query = {
      select: vi.fn(() => query),
      insert: vi.fn(() => query),
      update: vi.fn(() => query),
      upsert: vi.fn(() => query),
      delete: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      or: vi.fn(() => query),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(() => query),
      limit: vi.fn(() => query),
      single: vi.fn(() => resolved),
      maybeSingle: vi.fn(() => resolved),
      // Chains que se await-ean directo (sin single/maybeSingle) también
      // resuelven, porque el objeto en sí es then-able.
      then: (onFulfilled: (value: MockResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
        resolved.then(onFulfilled, onRejected),
    };
    return query;
  }

  const rpc = vi.fn((name: string, args: unknown) => {
    const configured = options.rpc?.[name];
    const response =
      typeof configured === "function" ? configured(args) : configured ?? EMPTY_RESPONSE;
    return Promise.resolve(response);
  });

  const auth = {
    getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...options.auth,
  };

  const storage = {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } })),
      ...options.storage,
    })),
  };

  return {
    from: vi.fn((table: string) => buildQuery(table)),
    rpc,
    auth,
    storage,
  };
}

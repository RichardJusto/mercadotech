// Todos los tunables de la capa de IA. Decisiones heredadas de ReadHub
// (packages/ai/), documentadas acá con su porqué — ver Guía Hugging Face en
// MercadoTech_sesion4.md para el detalle completo de cada lección.

export const EMBEDDING_DIMENSIONS = 384;

export const EMBEDDING_MODEL_DEFAULT = "sentence-transformers/all-MiniLM-L6-v2";

// MiniLM acepta máximo 256 tokens (~1000 caracteres) y trunca en SILENCIO lo
// que sobra. El texto a vectorizar se arma con las señales más valiosas
// primero (título, marca, categoría) y el contenido largo al final: si algo
// se corta, que se corte lo menos importante.
export const MAX_EMBEDDING_INPUT_CHARS = 1000;

// Resultados por defecto / máximos de una búsqueda semántica: suficiente
// para no saturar el contexto del LLM (5) sin bloquear casos que pidan más
// explícitamente (tope duro en 20 para no golpear la cuota gratuita).
export const VECTOR_SEARCH_DEFAULT_TOP_K = 5;
export const VECTOR_SEARCH_MAX_TOP_K = 20;

// Provisional (lección 7): pares de texto NO relacionados ya rondan 0.1–0.2
// de similitud coseno (comparten idioma); los relacionados suelen superar
// 0.4. Se parte de 0.3 y se calibra con datos reales en la Fase 4.8.
export const VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD = 0.3;

// Cuántas fuentes entran de verdad al contexto del LLM, como máximo — más
// que esto diluye la atención del modelo sin aportar precisión.
export const CONTEXT_BUILDER_DEFAULT_MAX_SOURCES = 5;
export const CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY = 0.3;
// Fuentes con menos contenido que esto (ej. una ficha corrupta o casi
// vacía) no aportan nada al contexto y se descartan antes de contarlas.
export const CONTEXT_BUILDER_MIN_CONTENT_LENGTH = 20;
// Presupuesto de caracteres del contexto que se manda al LLM (no de tokens:
// más simple de razonar y suficientemente conservador para el modelo elegido).
export const CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS = 8000;
// Si a la última fuente que entraría le quedan menos caracteres que esto,
// se descarta ENTERA en vez de truncarla a la mitad: media frase confunde
// más al modelo de lo que aporta.
export const CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS = 200;

// El nivel gratuito de Hugging Face rota qué modelos de chat están
// disponibles (lección 3): este es el elegido HOY, pero SIEMPRE se lee de
// la variable de entorno primero — cambiarlo nunca debe tocar código.
export const HUGGINGFACE_CHAT_MODEL_DEFAULT = "meta-llama/Llama-3.1-8B-Instruct";
export const HUGGINGFACE_CHAT_MAX_TOKENS = 1024;

// Límite de la pregunta del usuario (búsqueda semántica y chat): evita
// abusos de la cuota gratuita con inputs desproporcionados.
export const CHAT_QUERY_MAX_CHARS = 4000;

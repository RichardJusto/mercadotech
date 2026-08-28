export type ChatMode = "compras" | "soporte";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  source_type: "producto" | "articulo_soporte";
  source_id: string;
  title: string;
  similarity: number;
  price?: number;
  image_url?: string | null;
  category?: string;
}

export interface ChatResult {
  query: string;
  answer: string;
  hasRelevantContext: boolean;
  sources: ChatSource[];
  metadata: {
    model: string;
    retrievedCount: number;
    usedSourceCount: number;
    contextTruncated: boolean;
  };
}

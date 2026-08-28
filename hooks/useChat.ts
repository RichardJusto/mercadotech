"use client";

import { useCallback, useState } from "react";
import type { ChatMode, ChatSource } from "@/types/chat";

export interface DisplayChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

// Parametrizado por modo ('compras' | 'soporte'): historial en memoria, sin
// persistencia (llega con el agente de la sesión 8). Los errores del server
// se convierten en un mensaje inline del asistente — la conversación NUNCA
// se rompe, ni siquiera sin token de IA configurado.
export function useChat(mode: ChatMode) {
  const [messages, setMessages] = useState<DisplayChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);
      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, mode }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error?.message ?? "No pude procesar tu consulta.");
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: body.answer, sources: body.sources },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `No pude procesar tu consulta: ${(err as Error).message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [mode, loading],
  );

  return { messages, loading, sendMessage };
}

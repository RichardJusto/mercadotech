"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";
import { useProcessLabel } from "@/hooks/useProcessLabel";

// Páginas que ya son un chat de página completa — el widget flotante ahí
// sería un segundo chat encima del primero.
const HIDDEN_ON = ["/asistente", "/soporte"];

const SUGGESTIONS = [
  "¿cómo devuelvo un producto?",
  "¿cuánto tarda en llegar mi pedido?",
  "¿qué métodos de pago aceptan?",
];

// Disponible en toda la app autenticada (app/(shop)/layout.tsx y
// app/(seller)/layout.tsx) — reutiliza el mismo useChat("soporte") y
// ChatWindow que ya usa /soporte, no duplica lógica de chat. La diferencia
// es contextual: la etiqueta de arriba muestra en qué proceso está el
// usuario sin que tenga que salir de la pantalla para preguntar.
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const { messages, loading, sendMessage } = useChat("soporte");
  const processLabel = useProcessLabel();
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[340px] overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-br from-primary to-glow px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <span className="glow-pulse relative inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">Asistente MercadoTech</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 opacity-85 hover:bg-white/15 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="bg-gradient-to-br from-primary to-glow px-4 pb-3 text-primary-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Ayuda en: {processLabel}
            </span>
          </div>

          <ChatWindow
            messages={messages}
            loading={loading}
            onSend={sendMessage}
            inputPlaceholder="Escribe tu pregunta…"
            emptyTitle={`¿En qué te ayudo con "${processLabel}"?`}
            emptyDescription="Preguntame y busco en nuestros artículos de ayuda."
            suggestions={SUGGESTIONS}
            className="h-[420px] rounded-none border-0"
          />
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat de soporte" : "Abrir chat de soporte"}
        className="size-14 rounded-full shadow-lg shadow-glow-soft"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </Button>
    </div>
  );
}

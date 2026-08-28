"use client";

import { Sparkles } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";

const STARTER_SUGGESTIONS = [
  "¿qué laptop me recomiendas para diseño por menos de S/ 3,500?",
  "necesito audífonos con cancelación de ruido",
  "algo para conectar mi casa a internet",
];

export default function AssistantPage() {
  const { messages, loading, sendMessage } = useChat("compras");

  return (
    <Container className="space-y-4 py-8">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">Asistente de compras</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Preguntame qué producto necesitas y te recomiendo del catálogo de MercadoTech.
      </p>

      <ChatWindow
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        inputPlaceholder="Ej: laptop liviana para la universidad"
        emptyTitle="¿Qué estás buscando?"
        emptyDescription="Contame qué necesitas y te sugiero productos reales del catálogo."
        suggestions={STARTER_SUGGESTIONS}
      />
    </Container>
  );
}

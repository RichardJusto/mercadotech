"use client";

import { LifeBuoy } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useMyTickets } from "@/hooks/useMyTickets";

const STARTER_SUGGESTIONS = [
  "¿cómo devuelvo un producto?",
  "¿cuánto tarda en llegar mi pedido?",
  "¿qué métodos de pago aceptan?",
];

export default function SupportPage() {
  const { messages, loading, sendMessage } = useChat("soporte");
  const { user } = useAuth();
  const { tickets, loading: ticketsLoading, error: ticketsError, retry } = useMyTickets(
    user?.id ?? null,
  );

  return (
    <Container className="space-y-8 py-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Soporte</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Preguntame sobre pedidos, pagos, devoluciones o tu cuenta.
        </p>

        {/* Espacio reservado para el botón de micrófono de la sesión 8 (voz). */}
        <ChatWindow
          messages={messages}
          loading={loading}
          onSend={sendMessage}
          inputPlaceholder="Ej: ¿cómo rastreo mi pedido?"
          emptyTitle="¿En qué te ayudo?"
          emptyDescription="Preguntame y busco en nuestros artículos de ayuda."
          suggestions={STARTER_SUGGESTIONS}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Mis tickets</h2>
        {ticketsLoading ? (
          <LoadingState rows={2} />
        ) : ticketsError ? (
          <ErrorState onRetry={retry} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No tienes tickets"
            description="Si el asistente no resuelve tu consulta, te va a sugerir crear uno."
          />
        ) : (
          <div className="divide-y rounded-lg border">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 text-sm">
                <span>{ticket.subject}</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

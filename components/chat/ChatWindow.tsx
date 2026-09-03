"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import type { DisplayChatMessage } from "@/hooks/useChat";

interface ChatWindowProps {
  messages: DisplayChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  inputPlaceholder?: string;
  emptyTitle: string;
  emptyDescription: string;
  suggestions?: string[];
  // Default h-[70vh] para las páginas completas (/asistente, /soporte); el
  // widget flotante pasa una altura fija más chica.
  className?: string;
}

export function ChatWindow({
  messages,
  loading,
  onSend,
  inputPlaceholder,
  emptyTitle,
  emptyDescription,
  suggestions,
  className,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className={cn("flex h-[70vh] flex-col rounded-lg border", className)}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              suggestions && suggestions.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onSend(suggestion)}
                      className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          />
        ) : (
          messages.map((message, i) => <ChatMessage key={i} message={message} />)
        )}
        {loading ? <LoadingMessage /> : null}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3">
        <ChatInput onSend={onSend} disabled={loading} placeholder={inputPlaceholder} />
      </div>
    </div>
  );
}

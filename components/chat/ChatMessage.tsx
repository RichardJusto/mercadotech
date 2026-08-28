import { cn } from "@/lib/utils";
import { SourcesList } from "@/components/chat/SourcesList";
import type { DisplayChatMessage } from "@/hooks/useChat";

interface ChatMessageProps {
  message: DisplayChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {message.content}
        </div>
        {!isUser && message.sources ? <SourcesList sources={message.sources} /> : null}
      </div>
    </div>
  );
}

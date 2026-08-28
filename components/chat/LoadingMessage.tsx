export function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <span className="animate-pulse">Escribiendo…</span>
      </div>
    </div>
  );
}

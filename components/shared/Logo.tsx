import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  markClassName?: string;
  size?: "sm" | "default";
}

// Marca pura: sin <Link>, para poder envolverla distinto según el layout
// (Navbar navega a "/", el panel de auth no navega a ningún lado).
export function Logo({ className, markClassName, size = "default" }: LogoProps) {
  const isSmall = size === "sm";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-glow text-primary-foreground",
          isSmall ? "size-5" : "size-7",
          markClassName,
        )}
        aria-hidden="true"
      >
        <span className="glow-pulse absolute inset-0 rounded-md" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={cn("relative", isSmall ? "size-3" : "size-4")}
        >
          <path
            d="M4 12L10 6M4 12L10 18M4 12H14M20 6V18"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "text-gradient-brand font-bold tracking-tight",
          isSmall ? "text-base" : "text-lg",
        )}
      >
        MercadoTech
      </span>
    </span>
  );
}

"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}

const STAR_COUNT = 5;

export function RatingStars({
  value,
  onChange,
  size = 16,
  className,
}: RatingStarsProps) {
  const editable = typeof onChange === "function";
  const stars = Array.from({ length: STAR_COUNT }, (_, i) => i + 1);

  if (!editable) {
    return (
      <div
        className={cn("flex items-center gap-0.5", className)}
        role="img"
        aria-label={`${value} de ${STAR_COUNT} estrellas`}
      >
        {stars.map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            className={cn(
              star <= value
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="radiogroup"
      aria-label="Calificación"
    >
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} de ${STAR_COUNT} estrellas`}
          onClick={() => onChange(star)}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            width={size}
            height={size}
            className={cn(
              star <= value
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/shared/RatingStars";
import type { Review } from "@/types/review";

interface ReviewsSectionProps {
  reviews: Review[];
  average: number;
  count: number;
  canReview: boolean;
  onSubmit: (rating: number, comment?: string) => void;
}

export function ReviewsSection({
  reviews,
  average,
  count,
  canReview,
  onSubmit,
}: ReviewsSectionProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(rating, comment.trim() || undefined);
    setComment("");
    setRating(5);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Reseñas</h2>
        {count > 0 ? (
          <>
            <RatingStars value={Math.round(average)} />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1)} ({count})
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin reseñas todavía</span>
        )}
      </div>

      {canReview ? (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Deja tu reseña</p>
          <RatingStars value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)"
          />
          <Button type="submit" size="sm">
            Publicar reseña
          </Button>
        </form>
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sé el primero en reseñar este producto.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="space-y-1 border-b pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <RatingStars value={review.rating} size={14} />
                <span className="text-xs text-muted-foreground">Comprador verificado</span>
              </div>
              {review.comment ? <p className="text-sm">{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

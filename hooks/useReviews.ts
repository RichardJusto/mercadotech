"use client";

import { useCallback, useEffect, useState } from "react";
import * as reviewService from "@/services/review.service";
import type { Review } from "@/types/review";
import type { CanReviewResult } from "@/services/review.service";

export function useReviews(productId: string, userId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [canReview, setCanReview] = useState<CanReviewResult>({
    allowed: false,
    orderId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      reviewService.listByProduct(productId),
      reviewService.getAverage(productId),
      userId ? reviewService.canReview(productId, userId) : Promise.resolve({ allowed: false, orderId: null }),
    ])
      .then(([reviewsData, averageData, canReviewData]) => {
        setReviews(reviewsData);
        setAverage(averageData.average);
        setCount(averageData.count);
        setCanReview(canReviewData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(rating: number, comment?: string) {
    if (!canReview.orderId) throw new Error("No puedes reseñar este producto");
    await reviewService.create({
      productId,
      orderId: canReview.orderId,
      rating,
      comment,
    });
    load();
  }

  return { reviews, average, count, canReview, loading, error, submit, retry: load };
}

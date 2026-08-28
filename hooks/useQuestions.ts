"use client";

import { useCallback, useEffect, useState } from "react";
import * as questionService from "@/services/question.service";
import type { Question } from "@/types/question";

export function useQuestions(productId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    questionService
      .listByProduct(productId)
      .then(setQuestions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function ask(userId: string, question: string) {
    const created = await questionService.create(productId, userId, question);
    setQuestions((prev) => [created, ...prev]);
  }

  async function answer(questionId: string, answerText: string) {
    const previous = questions;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, answer: answerText, answered_at: new Date().toISOString() }
          : q,
      ),
    );
    try {
      const updated = await questionService.answer(questionId, answerText);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
    } catch (err) {
      setQuestions(previous);
      throw err;
    }
  }

  return { questions, loading, error, ask, answer, retry: load };
}

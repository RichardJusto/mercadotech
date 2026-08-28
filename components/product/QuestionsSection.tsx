"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/types/question";

interface QuestionsSectionProps {
  questions: Question[];
  hasSession: boolean;
  isOwner: boolean;
  onAsk: (question: string) => void;
  onAnswer: (questionId: string, answer: string) => void;
}

// Sin nombres de otros usuarios (profiles solo lo lee su dueño o admin):
// se muestra "Usuario" en vez del autor real. Mostrar el nombre del
// vendedor/autor requeriría una vista public_profiles, fuera de alcance.
function AnswerForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu respuesta..."
        className="min-h-16"
      />
      <Button type="submit" size="sm">
        Responder
      </Button>
    </form>
  );
}

export function QuestionsSection({
  questions,
  hasSession,
  isOwner,
  onAsk,
  onAnswer,
}: QuestionsSectionProps) {
  const [newQuestion, setNewQuestion] = useState("");

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newQuestion.trim()) return;
    onAsk(newQuestion.trim());
    setNewQuestion("");
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Preguntas y respuestas</h2>

      {hasSession ? (
        <form onSubmit={handleAsk} className="flex gap-2">
          <Textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="min-h-16"
          />
          <Button type="submit" size="sm">
            Preguntar
          </Button>
        </form>
      ) : (
        <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
          Inicia sesión para preguntar
        </Button>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay preguntas.</p>
      ) : (
        <ul className="space-y-4">
          {questions.map((question) => (
            <li key={question.id} className="space-y-1 border-b pb-3 last:border-0">
              <p className="text-sm">
                <span className="font-medium">Usuario:</span> {question.question}
              </p>
              {question.answer ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Vendedor:</span> {question.answer}
                </p>
              ) : isOwner ? (
                <AnswerForm onSubmit={(text) => onAnswer(question.id, text)} />
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin responder</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

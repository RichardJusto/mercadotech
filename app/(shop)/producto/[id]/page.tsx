"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Container } from "@/components/shared/Container";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { BuyBox } from "@/components/product/BuyBox";
import { QuestionsSection } from "@/components/product/QuestionsSection";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/useProduct";
import { useQuestions } from "@/hooks/useQuestions";
import { useReviews } from "@/hooks/useReviews";
import { useFavorite } from "@/hooks/useFavorite";
import { useCart } from "@/hooks/useCart";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { product, images, loading, error } = useProduct(id);
  const questionsState = useQuestions(id);
  const reviewsState = useReviews(id, user?.id ?? null);
  const favoriteState = useFavorite(id, user?.id ?? null);
  const cart = useCart(user?.id ?? null);

  if (loading) {
    return (
      <Container className="py-10">
        <LoadingState rows={6} />
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-10">
        <ErrorState onRetry={() => router.refresh()} />
      </Container>
    );
  }

  const isOwner = profile?.id === product.seller_id;

  function requireSession(action: () => void) {
    if (!user) {
      router.push(`/login?redirectTo=/producto/${id}`);
      return;
    }
    action();
  }

  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-2">
      <ProductGallery images={images} alt={product.title} />

      <div className="space-y-6">
        <ProductInfo product={product} />
        <BuyBox
          product={product}
          isOwner={isOwner}
          isFavorite={favoriteState.isFavorite}
          onToggleFavorite={() => requireSession(favoriteState.toggle)}
          onAddToCart={(quantity) =>
            requireSession(() => {
              cart
                .add(product.id, quantity)
                .then(() => toast.success("Agregado al carrito"))
                .catch((err: Error) => toast.error(err.message));
            })
          }
        />
      </div>

      <div className="lg:col-span-2">
        <QuestionsSection
          questions={questionsState.questions}
          hasSession={!!user}
          isOwner={isOwner}
          onAsk={(question) => {
            if (!user) return;
            questionsState.ask(user.id, question).catch(() =>
              toast.error("No se pudo enviar la pregunta"),
            );
          }}
          onAnswer={(questionId, answer) => {
            questionsState.answer(questionId, answer).catch(() =>
              toast.error("No se pudo enviar la respuesta"),
            );
          }}
        />
      </div>

      <div className="lg:col-span-2">
        <ReviewsSection
          reviews={reviewsState.reviews}
          average={reviewsState.average}
          count={reviewsState.count}
          canReview={reviewsState.canReview.allowed}
          onSubmit={(rating, comment) =>
            reviewsState.submit(rating, comment).catch(() =>
              toast.error("No se pudo publicar la reseña"),
            )
          }
        />
      </div>
    </Container>
  );
}

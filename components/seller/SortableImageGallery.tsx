"use client";

import { useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/hooks/useProductForm";

function imageUrl(image: GalleryImage): string {
  return image.kind === "local" ? image.previewUrl : image.imageUrl;
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

interface SortableThumbnailProps {
  image: GalleryImage;
  isCover: boolean;
  onRemove: () => void;
}

function SortableThumbnail({ image, isCover, onRemove }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.key });
  const standard = image.kind === "local" ? image.standard : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex shrink-0 touch-none flex-col gap-1", isDragging && "opacity-50")}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "relative rounded-md border-2",
          isCover ? "border-primary" : "border-transparent",
        )}
      >
        <ProductImage
          src={imageUrl(image)}
          alt=""
          width={80}
          height={80}
          className="size-20 rounded object-cover"
        />
        {isCover ? (
          <span className="absolute bottom-0 left-0 rounded-tr bg-primary px-1 text-[10px] text-primary-foreground">
            Portada
          </span>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          className="absolute -top-2 -right-2 rounded-full"
          aria-label="Quitar imagen"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
        >
          <X className="size-3" />
        </Button>
      </div>
      {standard ? (
        <div className="w-20 text-center text-[10px] leading-tight text-muted-foreground">
          <p>
            {standard.width}×{standard.height}px
          </p>
          <p>{formatBytes(standard.sizeBytes)}</p>
          {standard.warnings.length > 0 ? (
            <p className="text-amber-600 dark:text-amber-400">No cuadrada</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SortableImageGalleryProps {
  images: GalleryImage[];
  onReorder: (images: GalleryImage[]) => void;
  onAddFiles: (files: File[]) => void;
  onRemove: (image: GalleryImage) => void;
  maxImages: number;
}

// Drag & drop #1: reordena miniaturas (@dnd-kit/sortable). La primera es la
// portada. KeyboardSensor habilitado para reorden por teclado; distance:8 en
// PointerSensor evita que un simple click en "quitar" dispare un drag.
export function SortableImageGallery({
  images,
  onReorder,
  onAddFiles,
  onRemove,
  maxImages,
}: SortableImageGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img.key === active.id);
    const newIndex = images.findIndex((img) => img.key === over.id);
    onReorder(arrayMove(images, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={images.map((img) => img.key)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-3" role="list" aria-label="Galería de imágenes del producto">
            {images.map((image, index) => (
              <SortableThumbnail
                key={image.key}
                image={image}
                isCover={index === 0}
                onRemove={() => onRemove(image)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {images.length < maxImages ? (
        <div>
          <input
            ref={inputRef}
            data-testid="product-image-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onAddFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Agregar imágenes
          </Button>
        </div>
      ) : null}
    </div>
  );
}

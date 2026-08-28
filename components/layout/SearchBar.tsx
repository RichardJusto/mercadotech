"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  defaultValue?: string;
  className?: string;
}

// Búsqueda por texto (ilike). La pestaña "Resultados con IA" vive en
// /buscar (Fase 4.4) y reusa esta misma consulta — este componente no la
// conoce, solo navega a /buscar?q=.
export function SearchBar({ onSearch, defaultValue = "", className }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn("flex w-full max-w-md items-center gap-2", className)}
    >
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar productos..."
        aria-label="Buscar productos"
      />
      <Button type="submit" size="icon" aria-label="Buscar">
        <Search />
      </Button>
    </form>
  );
}

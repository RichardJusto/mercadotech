"use client";

import { useCallback, useEffect, useState } from "react";
import * as ticketService from "@/services/ticket.service";
import type { SupportTicket } from "@/types/ticket";

export function useMyTickets(userId: string | null) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    ticketService
      .listMine(userId)
      .then(setTickets)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { tickets, loading, error, retry: load };
}

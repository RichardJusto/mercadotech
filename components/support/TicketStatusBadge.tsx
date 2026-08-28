import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_BADGE_VARIANT, TICKET_STATUS_LABELS } from "@/lib/constants/support";
import type { TicketStatus } from "@/lib/constants/roles";

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return <Badge variant={TICKET_STATUS_BADGE_VARIANT[status]}>{TICKET_STATUS_LABELS[status]}</Badge>;
}

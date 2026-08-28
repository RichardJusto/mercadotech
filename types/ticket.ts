import type { Database } from "@/types/database";
import type { TicketStatus } from "@/lib/constants/roles";

type SupportTicketRow = Database["public"]["Tables"]["support_tickets"]["Row"];

export interface SupportTicket extends Omit<SupportTicketRow, "status"> {
  status: TicketStatus;
}

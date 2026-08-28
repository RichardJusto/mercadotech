import type { Database } from "@/types/database";
import type { Role } from "@/lib/constants/roles";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface Profile extends Omit<ProfileRow, "role"> {
  role: Role;
}

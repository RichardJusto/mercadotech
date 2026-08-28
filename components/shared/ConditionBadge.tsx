import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductCondition } from "@/lib/constants/roles";

interface ConditionBadgeProps {
  condition: ProductCondition;
  className?: string;
}

const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

const CONDITION_CLASSES: Record<ProductCondition, string> = {
  nuevo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  usado: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  reacondicionado: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
  return (
    <Badge variant="outline" className={cn(CONDITION_CLASSES[condition], "border-transparent", className)}>
      {CONDITION_LABELS[condition]}
    </Badge>
  );
}

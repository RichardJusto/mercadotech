import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortOption } from "@/lib/constants/catalog";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

export interface FiltersValue {
  sort: SortOption;
  condition: ProductCondition[];
  minPrice?: number;
  maxPrice?: number;
}

interface FiltersPanelProps {
  value: FiltersValue;
  onChange: (patch: Partial<FiltersValue>) => void;
  className?: string;
}

const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

export function FiltersPanel({ value, onChange, className }: FiltersPanelProps) {
  function toggleCondition(condition: ProductCondition) {
    const next = value.condition.includes(condition)
      ? value.condition.filter((c) => c !== condition)
      : [...value.condition, condition];
    onChange({ condition: next });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="filters-sort">Ordenar por</Label>
        <Select value={value.sort} onValueChange={(v) => onChange({ sort: v as SortOption })}>
          <SelectTrigger id="filters-sort" className="w-full">
            {/* Select.Value de Base UI no resuelve la etiqueta sola: hay
                que mapearla explícitamente desde el value crudo. */}
            <SelectValue>
              {(v: string | null) => SORT_OPTIONS.find((o) => o.value === v)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Condición</legend>
        {PRODUCT_CONDITIONS.map((condition) => (
          <label key={condition} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.condition.includes(condition)}
              onChange={() => toggleCondition(condition)}
              className="size-4 rounded border-input"
            />
            {CONDITION_LABELS[condition]}
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <Label>Precio (S/)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Mín"
            aria-label="Precio mínimo"
            value={value.minPrice ?? ""}
            onChange={(e) =>
              onChange({ minPrice: e.target.value ? Number(e.target.value) : 0 })
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Máx"
            aria-label="Precio máximo"
            value={value.maxPrice ?? ""}
            onChange={(e) =>
              onChange({
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

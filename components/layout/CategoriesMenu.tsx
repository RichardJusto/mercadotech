import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface CategoriesMenuProps {
  categories: CategoryOption[];
}

export function CategoriesMenu({ categories }: CategoriesMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-1">
            Categorías
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {categories.length === 0 ? (
          <DropdownMenuItem disabled>Sin categorías</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuItem key={category.id} render={<Link href={`/categoria/${category.slug}`} />}>
              {category.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

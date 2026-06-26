import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchBarProps) => {
  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-input bg-background pl-4 pr-11 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      />
      <button
        type="button"
        className="absolute right-0.5 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
};

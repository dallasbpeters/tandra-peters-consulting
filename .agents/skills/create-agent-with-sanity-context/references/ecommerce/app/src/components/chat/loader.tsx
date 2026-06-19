import { Loader2 } from "lucide-react";

export function Loader() {
  return (
    <div className="flex items-center gap-2 text-neutral-500 text-xs">
      <Loader2 className="h-3 w-3 animate-spin" />

      <span>Thinking...</span>
    </div>
  );
}

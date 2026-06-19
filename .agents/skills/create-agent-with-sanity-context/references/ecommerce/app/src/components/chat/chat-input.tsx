import { Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled: boolean;
  input: string;
  onSubmit: (e: React.FormEvent) => void;
  setInput: (value: string) => void;
}

export function ChatInput(props: ChatInputProps) {
  const { input, setInput, onSubmit, disabled } = props;

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <input
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        disabled={disabled}
        onChange={(e) => setInput(e.target.value)}
        placeholder="How can I help?"
        type="text"
        value={input}
      />

      <Button disabled={disabled || !input.trim()} size="icon" type="submit">
        {disabled ? (
          <Square className="h-3 w-3" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}

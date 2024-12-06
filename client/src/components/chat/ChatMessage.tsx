import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
}

export default function ChatMessage({ content, role }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8">
        <span className="text-xs">
          {role === "user" ? "U" : "AI"}
        </span>
      </Avatar>
      <Card className={cn(
        "p-4 max-w-[80%]",
        role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {content}
      </Card>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
  isLoading?: boolean;
}

export default function ChatMessage({ content, role, isLoading }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn(
        "h-8 w-8",
        role === "assistant" ? "bg-background border" : "bg-muted"
      )}>
        {role === "assistant" ? (
          <img 
            src="./logo.png" 
            alt="AI" 
            className="h-full w-full object-contain p-1"
            onError={(e) => {
              console.error("Image failed to load:", e);
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'%3E%3C/path%3E%3C/svg%3E";
            }}
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </Avatar>
      <Card className={cn(
        "p-4 max-w-[80%]",
        role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isLoading ? (
          <div className="flex gap-1 h-6 items-center">
            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}
      </Card>
    </div>
  );
}

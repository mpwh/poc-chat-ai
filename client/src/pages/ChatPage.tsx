import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";

export default function ChatPage() {
  const { id } = useParams();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetch(`/api/chats/${id}/messages`).then(res => res.json()),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/chats/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message: any) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            role={message.role}
          />
        ))}
      </ScrollArea>
      <div className="p-4 border-t">
        <ChatInput onSend={(content) => sendMessage.mutate(content)} />
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ChatInterface from "../components/chat/ChatInterface";
import { Loader2 } from "lucide-react";

interface Document {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const { toast } = useToast();
  const token = localStorage.getItem("token");

  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/documents", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch documents");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load documents",
      variant: "destructive",
    });
    return <div>Error loading documents</div>;
  }

  return (
    <div className="container py-8">
      <ChatInterface documents={documents || []} />
    </div>
  );
}

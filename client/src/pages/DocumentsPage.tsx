import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DocumentUpload from "../components/documents/DocumentUpload";
import DocumentList from "../components/documents/DocumentList";
import { Loader2 } from "lucide-react";

export default function DocumentsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/documents", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch documents");
      }
      return res.json();
    },
    enabled: isAuthenticated, // Only run query if authenticated
  });

  if (!isAuthenticated) {
    return <div>Please log in to view documents</div>;
  }

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
    <div className="max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Upload Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload your documents to get started with AI-powered knowledge retrieval
        </p>
      </div>
      <div className="mt-8 space-y-8">
        <DocumentUpload />
        <DocumentList documents={documents || []} />
      </div>
    </div>
  );
}

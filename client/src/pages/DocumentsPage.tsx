import { useQuery } from "@tanstack/react-query";
import DocumentUpload from "../components/documents/DocumentUpload";
import DocumentList from "../components/documents/DocumentList";
import { Loader2 } from "lucide-react";

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/documents", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#666666]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center text-red-600">
        Error loading documents
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[#333333]">Upload Knowledge Base</h1>
        <p className="text-[#666666]">
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

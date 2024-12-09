import { useState } from "react";
import { FileText, Calendar, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: number;
  title: string;
  file_type: string;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents = [] }: DocumentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete document");
      }

      // Optimistically update the cache
      queryClient.setQueryData<Document[]>(["documents"], (old) => 
        old?.filter(doc => doc.id !== id) ?? []
      );

      await queryClient.invalidateQueries({ queryKey: ["documents"] });

      toast({
        title: "Document Deleted",
        description: "The document has been removed successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-background border rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{doc.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{doc.file_type.split('/')[1].toUpperCase()}</span>
                <span>•</span>
                <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
            className="text-muted-foreground hover:text-destructive"
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

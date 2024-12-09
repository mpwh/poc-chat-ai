import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default function DocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);

    try {
      // File validation
      const allowedTypes = {
        'text/plain': 'TXT',
        'application/pdf': 'PDF',
        'application/msword': 'DOC',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
      };

      if (!Object.keys(allowedTypes).includes(file.type)) {
        throw new Error(`Please upload a ${Object.values(allowedTypes).join(', ')} file.`);
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit`);
      }

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_\s]/g, ''));

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      // Update cache
      queryClient.setQueryData(["documents"], (old: any[]) => [...(old || []), data]);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      
      if (error instanceof Error && error.message.includes("Authentication required")) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset input
    }
  }, [toast, queryClient]);

  return (
    <Card className="border-dashed">
      <div className="p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="flex flex-col items-center gap-2">
            <Input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              PDF, DOC, TXT up to 10MB
            </p>
            {isUploading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  Uploading document...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
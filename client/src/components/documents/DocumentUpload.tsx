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
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow uploading the same file again
    event.target.value = '';

    // Detailed file type validation
    const allowedTypes = {
      'text/plain': 'TXT',
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
    };

    if (!Object.keys(allowedTypes).includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a ${Object.values(allowedTypes).join(', ')} file.`,
        variant: "destructive"
      });
      return;
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 10) {
      toast({
        title: "File Too Large",
        description: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds 10MB limit`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      // Create a clean title from the filename
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_\s]/g, '');
      formData.append("title", title);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to upload documents");
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      // Invalidate and refetch documents list
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      toast({
        title: "Upload Successful",
        description: `${title} has been uploaded successfully`,
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
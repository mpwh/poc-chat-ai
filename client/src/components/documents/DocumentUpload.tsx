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
    try {
      const file = event.target.files?.[0];
      if (!file) {
        toast({
          title: "No File Selected",
          description: "Please select a file to upload",
          variant: "destructive"
        });
        return;
      }

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

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      // Create a clean title from the filename
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_\s]/g, '');
      formData.append("title", title);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please log in to upload documents.");
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
        if (res.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error(data.error || "Failed to upload document. Please try again.");
      }

      // Optimistically update the cache
      queryClient.setQueryData(["documents"], (old: any[]) => [...(old || []), data]);

      // Then invalidate to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      toast({
        title: "Upload Successful",
        description: `${title} has been uploaded successfully`,
      });

    } catch (error) {
      console.error("Upload error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("session has expired")) {
          // Clear token and redirect to login
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
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

import { useState } from "react";
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Success", description: "Document uploaded successfully" });
      event.target.value = '';
      
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Upload failed", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

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
              <p className="text-sm text-muted-foreground">
                Uploading...
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
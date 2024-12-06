import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  file: z.instanceof(FileList).refine(
    (files) => files?.length === 1,
    "Please select a file"
  ).transform(files => files[0]).refine(
    (file) => file.size <= MAX_FILE_SIZE,
    "File size should be less than 10MB"
  ).refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    "File type not supported. Please upload a PDF, DOC, DOCX, or TXT file."
  )
});

type UploadForm = z.infer<typeof uploadSchema>;

export default function DocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  });

  const upload = useMutation({
    mutationFn: async (data: FormData) => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadForm) => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("title", data.title);
    upload.mutate(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Title</FormLabel>
              <Input {...field} placeholder="Enter document title" />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <Input
                type="file"
                onChange={(e) => onChange(e.target.files)}
                accept=".pdf,.doc,.docx,.txt"
                {...field}
              />
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
              </p>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

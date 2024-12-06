import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export default function DocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  const upload = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw new Error("Upload failed");
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const formData = new FormData();
    formData.append("file", data.file[0]);
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
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <Input
                type="file"
                onChange={(e) => onChange(e.target.files)}
                accept=".pdf,.doc,.docx,.txt"
              />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={upload.isPending}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </form>
    </Form>
  );
}

import { useQuery } from "@tanstack/react-query";
import DocumentUpload from "../components/documents/DocumentUpload";
import DocumentList from "../components/documents/DocumentList";

export default function DocumentsPage() {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetch("/api/documents").then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Documents</h1>
        <DocumentUpload />
      </div>
      <DocumentList documents={documents} />
    </div>
  );
}

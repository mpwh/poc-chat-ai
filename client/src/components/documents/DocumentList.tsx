import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: number;
  title: string;
  created_at: string;
  file_type: string;
}

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents = [] }: DocumentListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.isArray(documents) && documents.map((doc) => (
        <Link key={doc.id} href={`/chat/${doc.id}`}>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {doc.title}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                {format(new Date(doc.created_at), "MMM d, yyyy")}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

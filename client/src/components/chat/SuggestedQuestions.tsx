import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const questions = [
    "Bagaimana langkah awal mengoperasikan Mesin MMS-i Fico?",
    "Apa saja yang perlu diperiksa sebelum menggunakan Mesin Double Action Press?",
    "Bagaimana cara menggunakan alat Friability Tester?",
    "Apa saja perawatan rutin yang diperlukan untuk Genset?",
    "Bagaimana prosedur membersihkan saringan udara pada Genset?"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pertanyaan Umum</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start text-left h-auto whitespace-normal"
              onClick={() => onSelect(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 
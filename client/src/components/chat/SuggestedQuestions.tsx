import { MessageSquare } from "lucide-react";

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

export default function SuggestedQuestions({ onSelectQuestion }: SuggestedQuestionsProps) {
  const questions = [
    "Bagaimana langkah awal mengoperasikan Mesin MMS-i Fico?",
    "Apa saja yang perlu diperiksa sebelum menggunakan Mesin Double Action Press?",
    "Bagaimana cara menggunakan alat Friability Tester?",
    "Apa saja perawatan rutin yang diperlukan untuk Genset?",
    "Bagaimana prosedur membersihkan saringan udara pada Genset?"
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4" />
        <span className="font-medium">Pertanyaan Umum</span>
      </div>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(question)}
            className="w-full text-left p-2 text-sm hover:bg-[#F3F4F6] rounded-md transition-colors duration-200"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
} 
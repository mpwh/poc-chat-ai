import ChatInterface from "../components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[#333333]">Chat with AI</h1>
        <p className="text-[#666666]">
          Ask questions about your documents and get instant answers
        </p>
      </div>
      <div className="mt-8">
        <ChatInterface />
      </div>
    </div>
  );
}

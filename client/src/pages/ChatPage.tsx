import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ChatInput from "@/components/chat/ChatInput";
import SuggestedQuestions from "@/components/chat/SuggestedQuestions";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Message {
  content: string;
  role: "user" | "assistant";
}

const WELCOME_MESSAGE = "Halo! Saya adalah asisten AI PT. Lucky Indah Keramik yang akan membantu Anda mencari informasi dari knowledge base perusahaan. Apa yang ingin Anda ketahui?";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Set initial welcome message
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = { content: message, role: "user" as const };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let assistantMessage = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5);
            if (data === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(data);
              assistantMessage += parsed.chunk;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.content = assistantMessage;
                  return newMessages;
                } else {
                  return [...newMessages, { role: "assistant", content: assistantMessage }];
                }
              });
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setMessage("");
      setIsLoading(false);
    }
  };

  const handleSelectQuestion = (question: string) => {
    setMessage(question);
  };

  if (!isAuthenticated) {
    return <div>Please log in to use the chat</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="container max-w-[1400px]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Chat Area */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">Chat with AI</h1>
              <p className="text-muted-foreground">
                Ask questions about your documents and get instant answers
              </p>
            </div>

            {/* Template Questions - Mobile Only */}
            <div className="lg:hidden">
              <Card className="p-6 bg-white shadow-sm">
                <SuggestedQuestions onSelectQuestion={handleSelectQuestion} />
              </Card>
            </div>

            <Card className="p-6 min-h-[600px] flex flex-col bg-white shadow-sm">
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-white border mr-2 flex items-center justify-center">
                        <img src="/logo.png" alt="AI" className="w-6 h-6" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-[#818CF8] text-white"
                          : "bg-[#F3F4F6]"
                      }`}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        className="prose prose-sm max-w-none dark:prose-invert"
                        components={{
                          h1: ({children}) => <h1 className="text-2xl font-bold my-4">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold my-3">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-semibold my-2">{children}</h3>,
                          p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-4 mb-4">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-4 mb-4">{children}</ol>,
                          li: ({children}) => <li className="mb-1">{children}</li>,
                          strong: ({children}) => <strong className="font-bold">{children}</strong>,
                          code: ({inline, children}) => 
                            inline ? 
                              <code className="bg-gray-100 rounded px-1 py-0.5">{children}</code> :
                              <pre className="bg-gray-100 rounded p-3 my-2 overflow-x-auto">
                                <code>{children}</code>
                              </pre>,
                          blockquote: ({children}) => 
                            <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic">
                              {children}
                            </blockquote>,
                        }}
                      >
                        {msg.content || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#F3F4F6] rounded-lg p-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSend={handleSendMessage}
                disabled={isLoading}
              />
            </Card>
          </div>

          {/* Suggested Questions Sidebar - Desktop Only */}
          <div className="hidden lg:block w-80">
            <Card className="p-6 bg-white shadow-sm">
              <SuggestedQuestions onSelectQuestion={handleSelectQuestion} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

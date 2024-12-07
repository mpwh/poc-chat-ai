import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedQuestions from "./SuggestedQuestions";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Halo! Saya adalah asisten AI yang akan membantu Anda mencari informasi dari dokumen-dokumen Anda. Apa yang ingin Anda ketahui?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      // Immediately add user message without loading state
      setMessages(prev => [...prev, { role: "user", content }]);
      setIsLoading(true);

      // Add an empty assistant message that will be streamed
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: content })
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response reader");

      let currentContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            if (data === '[DONE]') continue;

            try {
              const { chunk: textChunk } = JSON.parse(data);
              currentContent += textChunk;
              
              // Update the last message (assistant's message) with accumulated content
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = currentContent;
                return newMessages;
              });
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      });
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Maaf, terjadi kesalahan dalam memproses pertanyaan Anda." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (question: string) => {
    setInputValue(question);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 flex flex-col p-4 gap-4">
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-4 pb-4">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    content={message.content}
                    role={message.role}
                    isLoading={index === messages.length - 1 && message.role === "assistant" && isLoading}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="flex-none pt-2 border-t">
              <ChatInput 
                onSend={handleSendMessage}
                value={inputValue}
                onChange={setInputValue}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:w-80 order-first lg:order-last">
        <Card className="sticky top-4">
          <CardContent className="p-4">
            <SuggestedQuestions onSelect={handleQuestionSelect} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
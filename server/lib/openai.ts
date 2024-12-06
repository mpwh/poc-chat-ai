import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeDocument(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Analyze and extract key information from this document. Maintain important details and context.",
      },
      {
        role: "user",
        content,
      },
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error("Failed to get response from OpenAI");
  }

  return messageContent;
}

export async function getChatResponse(
  question: string,
  documentContent: string,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant analyzing a document. Use the following document content to answer questions: ${documentContent}`,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error("Failed to get response from OpenAI");
  }

  return messageContent;
}

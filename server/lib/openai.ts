import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false
});

interface AnalysisResponse {
  summary: string;
  keywords: string[];
}

export async function analyzeDocument(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze and extract key information from this document. Provide a JSON response with a 'summary' field containing a concise summary.",
        },
        {
          role: "user",
          content,
        },
      ],
      response_format: { type: "json_object" },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No response content");
    }

    const result = JSON.parse(messageContent);
    return result.summary || "No summary available";
  } catch (error) {
    console.error("Error analyzing document:", error);
    return "Failed to analyze document";
  }
}

export async function getChatResponse(
  question: string,
  documentContent: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant analyzing a document. Use the following document content to answer questions. Provide a JSON response with an 'answer' field containing your response: ${documentContent}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      response_format: { type: "json_object" },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No response content");
    }

    const result = JSON.parse(messageContent);
    return result.answer || "No answer available";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "Failed to generate response";
  }
}

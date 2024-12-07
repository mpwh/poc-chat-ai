import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false
});

const ASSISTANT_ID = "asst_33BdjRU7SJuIraNfXxoFv6aQ";

export async function* streamChatResponse(
  question: string,
  documents: { id: number; content: string }[]
): AsyncGenerator<string> {
  try {
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: question
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    while (true) {
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];

        if (lastMessage.content[0].type === 'text') {
          // Split the response into sentences or chunks
          const text = lastMessage.content[0].text.value;
          const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
          
          for (const chunk of chunks) {
            yield chunk.trim();
            // Add a small delay between chunks for natural feeling
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return;
        }
        yield "I couldn't process the response format.";
        return;
      } else if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Error generating chat response:", error);
    yield "I apologize, but I encountered an error while processing your request.";
  }
}

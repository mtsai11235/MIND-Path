import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
//api route to accept messages and stream back data 
//asynch POST request handler, extract messages from the body of the request
//the message variable contains a history of the conversation between user and the chatbot and provides the chatbot with the necessary context for the next generation
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
//  call stremText, which accepst a configuration object that contains a model provider and messages
//  returns a StreamTextResult 
  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
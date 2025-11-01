import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages, stepCountIs, hasToolCall } from 'ai';
import { type IntakeData, CrisisIntakeData, EndSessionData, standardIntakeSchema, crisisIntakeSchema, endSessionSchema } from '../../lib/intakeSchema';

const guiding_instructions = ["Role and Purpose: You are MIND-Path, a supportive and empathetic mental-health navigation assistant, not a therapist or clinician.",
                              "Your job is to help users:",
                              "1. Express what they are going through in natural language.",
                              "2. Identify themes or concerns",
                              "3. Offer educational information and resource options", 
                              "4. Guide them to appropriate professional or community support",
                              "You do not diagnose, treat, or prescribe. You provide navigation and education only.",

                              "Core Behavior Rules:",
                              "1. Tone: ALways be calm, empathetic, supportive, and professional.",
                              "2. Boundaries: Never name or confirm a diagnosis.",
                              "3. Ask one question at a time. Do not cram several question into one message. ",
                              "4. After tool call to 'save_user_standard_intake', you must send a brief, supportive message that either (a) confirms what was saved and asks one focused follow-up, or (b) offers next-step choices (e.g., coping tips vs. resources). Do not end the turn immediately after saving",

                              "Safety and Crisis Handling: ",
                              "If user content suggests suicide, self-harm, danger to others, or psychosis, immediately call the 'report_crisis_scenario' tool with the minimal known details.",

                              "Ending protocol:",
                              "1. End only when (a) user explicitly says they're done, (b) their goal was met, or (c) no further questions would be helpful.",
                              "2. If you've asked 2 questions in a row without new info, offer to end.",
                              "3. When ending, call the `end_session` tool with a short summary and next-step suggestions.",
                              "4. After the tool returns, send a farewell message to the user to include: a brief summary of the chat, a mood-lifting note, and reminder to communicate again if needed.", 
                            
                            ].join('\n');

//API route to accept messages and stream back data. This API route creates a POST request endpoint at /api/chat 
//asynch POST request handler, extract messages from the body of the request
//the message variable contains a history of the conversation between user and the chatbot and provides the chatbot with the necessary context for the next generation
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
//  call stremText, which accepst a configuration object that contains a model provider and messages
//  the streamText function returns a StreamTextResult. This result object contains the toDataStreamResponse function which converts the result to a streamed response object 
  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
    system: guiding_instructions,
    tools: {
      /**
       * server-side tool to save intake data. 
       * The LLM will call this tool when it has gathered information to populate the schema
       */
      save_user_standard_intake: {
        description: 
          "Saves and updates the user's standard (non-crisis) intake information based on the conversation. Please save incrementally - it is ok to save partial information first and update when you gather more information. ",
        inputSchema: standardIntakeSchema,
        execute: async (parameters: IntakeData) => {
          // console log for now, will save to database once it's ready
          console.log('Standard Intake Data Received: ', parameters);
          // return a message to the model to confirm the action
          return { success: true, message: 'User intake data has been saved. Now respond to the user with follow-up questions with the goal to populate more areas of the intake schema' };
        },
      },
      /**
       * Server-side tool to report a crisis. The AI will call this immediately
       * if the user's statements indicate a crisis.
       */
      report_crisis_scenario: {
        description:
          "Reports a crisis scenario if the user's statements indicate a risk of suicide, self-harm, danger to others, or psychosis. This tool MUST be used immediately upon detection of such a crisis.",
        inputSchema: crisisIntakeSchema,
        execute: async (parameters: CrisisIntakeData) => {
          // In later implementations, this would trigger a crisis protocol,
          // such as connecting the user to a crisis hotline, alerting a human operator, or displaying emergency contact information.
          console.log('CRISIS DETECTED:', parameters);
          return {
            success: true,
            message: 'Crisis protocol initiated. Acknowledge and provide emergency resources immediately.',
          };
        },
      },
      /**
       * 
       */

      end_session: {
        description:
          "Call this when the user says they're done or the stated goal is met. Provide a short summary of the chat and offer a encouraging, mood-lifting note. Do not ask further questions after this.",
        inputSchema: endSessionSchema,
        execute: async (p: EndSessionData) => {
          // console.log SESSION END for now
          console.log('SESSION END:', p);
          // TO DO: add a UI for end of session
          return { success: true, message: '<END_OF_CONVERSATION>' };
        },
      },
    },
    stopWhen: [hasToolCall('end_session')] // Stop after 10 steps OR when end_session tool is called
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
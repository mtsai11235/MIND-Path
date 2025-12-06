import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages, stepCountIs, hasToolCall } from 'ai';
import { type IntakeData, CrisisIntakeData, EndSessionData, standardIntakeSchema, crisisIntakeSchema, endSessionSchema } from '../../lib/intakeSchema';
import { matchResources } from '@/lib/rag/matching';
import { generateActionPlan } from '@/lib/triage';
import { guiding_instructions } from './system-prompt';
import { z } from 'zod';
import { supabase } from '../../lib/supabaseClient'

//API route to accept messages and stream back data. This API route creates a POST request endpoint at /api/chat 
//asynch POST request handler, extract messages from the body of the request
//the message variable contains a history of the conversation between user and the chatbot and provides the chatbot with the necessary context for the next generation
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  let latestIntakeData: IntakeData | null = null;
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
          // Store the latest intake data
          latestIntakeData = parameters;
          // console log for now, will save to database once it's ready
          console.log('Standard Intake Data Received: ', parameters);
          // return a message to the model to confirm the action
          return { success: true, saved_fields: Object.keys(parameters) };
        },
      },
      /**
       * Server-side tool to report a crisis. The AI will call this immediately
       * if the user's statements indicate a crisis.
       */
      report_crisis_scenario: {
              description: "URGENT: Reports suicide/self-harm risk.",
              inputSchema: crisisIntakeSchema,
              execute: async (parameters) => {
                console.log('!!! CRISIS REPORTED !!!', parameters);
                return { 
                  success: true, 
                  crisis_protocol: "active", 
                  instruction: "Provide 988 number and urge user to call immediately." 
                };
              },
            },
      /**
       * 
       */

end_session: {
        description:
          "Generates the Action Plan. You MUST pass the full collected intake summary here.",
        inputSchema: endSessionSchema,
        execute: async ({ intake_summary }: EndSessionData) => {
          console.log('Generating plan for summary:', intake_summary);
        try {
            // 1. Run Triage Logic
            const actionPlan = await generateActionPlan(intake_summary);

            // 2. Format for the LLM to read
            return {
              success: true,
              // The LLM will read this JSON and turn it into the nice response defined in System Prompt
              data: {
                assessment: actionPlan.assessment ? {
                  title: actionPlan.assessment.title,
                  why: "Matches your primary concern.",
                  link: actionPlan.assessment.url
                } : "No specific assessment needed.",
                
                coping_skill: actionPlan.coping_skills[0] ? {
                  title: actionPlan.coping_skills[0].title,
                  // Use short_desc as fallback if 'content' is missing in DB
                  instructions: actionPlan.coping_skills[0].short_desc 
                } : null,
                
                reading: actionPlan.educational_resources.map(r => ({
                  title: r.title,
                  url: r.url
                }))
              }
            };
          } catch (error) {
            console.error('Error generating plan:', error);
            return { 
              success: false, 
              error: 'Failed to generate plan. Please offer general support.' 
            };
          }
        },
      },

  administerAssessment: {
        description: 
        'Fetches the questions for a standardized assessment so the CLIENT APP can render the questionnaire. ' +
        'Do NOT print the questions or ask the user to answer them in chat. ' +
        'After calling this tool, wait for the score via the analyzeAssessmentScore tool.',
        inputSchema: z.object({
          assessmentName: z.string().describe('The precise name or ID of the assessment to administer (e.g., "GAD-7", "PHQ-9")'),
        }),
        execute: async ({ assessmentName }) => {
          // 1. Fetch the actual questions from DB
          const { data, error } = await supabase
            .from('resources')
            .select('title, content') // content contains the questions JSON
            .ilike('title', `%${assessmentName}%`)
            .eq('type', 'assessment')
            .limit(1)
            .single();

          if (error || !data) {
            return { 
              success: false, 
              error: `Could not find assessment: ${assessmentName}` 
            };
          }

          // 2. Return the questions to the client
          // the UI will intercept it.
          return {
            success: true,
            isUiTrigger: true, // Flag for frontend
            data: {
              title: data.title,
              ...data.content
            }
          };
        },
      },
      
      /**
       * NEW TOOL: Receive Score
       * The LLM waits for this tool to be called by the CLIENT after the quiz is done.
       */
      analyzeAssessmentScore: {
        description: 'Analyzes the calculated score from the assessment to determine severity.',
        inputSchema: z.object({
          assessmentName: z.string(),
          score: z.number(),
          severityLabel: z.string().describe('The calculated severity (e.g., Mild, Severe)'),
        }),
        execute: async ({ assessmentName, score, severityLabel }) => {
            // Now the LLM knows the result and can recommend professionals
            return {
                info: `User scored ${score} on ${assessmentName}, which indicates ${severityLabel} symptoms.`
            };
        }
      }
  },
  stopWhen: [stepCountIs(25)] // adjust end condition later
});

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
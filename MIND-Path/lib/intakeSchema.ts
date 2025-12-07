import { z } from 'zod';

const trimmed = z.string().trim().min(1)

/**
 * Defines a standard intake schema (for non-emergency scenarios)  
 */

export const standardIntakeSchema = z.object({
    schema_version: z.literal('1.0').default('1.0'),
    primary_concern: trimmed.max(40)
        .describe("The user's primary reported concern, e.g., 'anxiety', 'depression', 'stress', 'insomnia', 'trauma', 'ptsd', etc.. You can extrapolate the primary concern keyword from user's input. For example, 'no motivation' could be a sign of depression; 'excess worry' could be a sign of anxiety."),

    key_symptoms: z.array(trimmed.max(60)) //array of 1-12 specific symptoms (each <= 60 chars)
        .min(1, 'Provide at least one symptom')
        .max(12, 'Keep it concise (<= 12).')
        .describe(
        [
            "Specific symptoms the user mentions. Examples include but not limited to:",
            "• anxiety: 'racing thoughts', 'restlessness', 'feeling on edge', 'excess worry and rumination', 'racing heart rate'",
            "• depression: 'low energy', 'flat affect', 'no motivation', 'feeling empty', 'persistent sadness', 'hopelessness', 'loss of interest or pleasure in activities once enjoyed', 'feeling guilt or worthlessness'",
            "• trauma: 'rumination', 'nightmares', 'flashbacks', 'intrusive thoughts', 'feeling disconnected', 'excess guilt', 'excess shame'",
            "• eating concerns: 'overeating', 'binging', 'purging', 'undereating'",
        ].join('\n')
        ),

    sleep_quality: z.enum(['poor sleep', 'fair sleep', 'good sleep'])
        .optional()
        .describe("The user's self-reported quality of sleep"),
    
    goals: z.string()
        .optional()
        .describe("What the user wishes to get out of this session. For example: "+
                "'coping technique', 'talk to a professional', 'education materials', etc."  
        ),
})
const limitedText = (max=400) => z.string().trim().min(1).max(max);
/**
 * Defines a schema for crisis scenarios
 */
export const crisisIntakeSchema = z.object({
    schema_version: z.literal('1.0').default('1.0'),
    crisis_type: z.enum(['suicide', 'self_harm', 'danger_to_others', 'psychosis'])
        .describe("Detected crisis type"),

    triggering_statement: limitedText(500)
        .describe("The exact user statement that triggered this report."),
})

export const endSessionSchema = z.object({
intake_summary: standardIntakeSchema
    .describe("The final, complete set of intake data collected from the conversation. This is required to generate the action plan."),
  
  reason: z.enum(['user_request', 'goal_met', 'max_turns_reached'])
    .describe("Why the session is moving to the planning phase."),
    
  user_confirmation: z.boolean()
    .describe("True if the user explicitly said 'yes' or 'show me the plan'."),
});


export type IntakeData = z.infer<typeof standardIntakeSchema>;
export type CrisisIntakeData = z.infer<typeof crisisIntakeSchema>;
export type EndSessionData = z.infer<typeof endSessionSchema>;

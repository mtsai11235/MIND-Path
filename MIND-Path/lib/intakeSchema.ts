import { z } from 'zod';

const trimmed = z.string().trim().min(1)

/**
 * Defines a standard intake schema (for non-emergency scenarios)  
 */

export const standardIntakeSchema = z.object({
    schema_version: z.literal('1.0').default('1.0'),
    primary_mood: trimmed.max(40)
        .describe("The user's primary reported mood, e.g., 'anxious', 'depressed', 'stressed', 'sleep-deprived',  or 'okay', etc.."),

    key_symptoms: z.array(trimmed.max(60)) //array of 1-12 specific symptoms (each <= 60 chars)
        .min(1, 'Provide at least one symptom')
        .max(12, 'Keep it concise (<= 12).')
        .describe(
        [
            "Specific symptoms the user mentions. Examples include:",
            "• anxiety: 'racing thoughts', 'restlessness', 'feeling on edge', 'excess worry and rumination', 'racing heart rate'",
            "• depression: 'low energy', 'flat affect', 'no motivation', 'feeling empty', 'persistent sadness', 'hopelessness', 'loss of interest or pleasure in activities once enjoyed', 'feeling guilt or worthlessness'",
            "• trauma: 'rumination', 'nightmares', 'flashbacks', 'intrusive thoughts', 'feeling disconnected', 'excess guilt', 'excess shame'",
            "• eating concerns: 'overeating', 'binging', 'purging', 'undereating'",
        ].join('\n')
        ),

    sleep_quality: z.enum(['poor', 'fair', 'good'])
        .optional()
        .describe("The user's self-reported quality of sleep"),
    
    goals: z.string()
        .optional()
        .describe("What the user wishes to get out of this session. For example: "+
                "'vent', 'coping technique', 'talk to a professional', 'education materials', etc."  
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
  reason: z.enum(['user_said_done','goal_met','no_more_useful_questions']),
  summary: z.string().trim().min(1).max(600)
    .describe('Provide a short summary of the chat and offer a encouraging, mood-lifting note.'),
  suggested_next: z.array(z.string().trim().min(1)).max(5).optional(),
  follow_up_ok: z.boolean().optional()
});


export type IntakeData = z.infer<typeof standardIntakeSchema>;
export type CrisisIntakeData = z.infer<typeof crisisIntakeSchema>;
export type EndSessionData = z.infer<typeof endSessionSchema>;

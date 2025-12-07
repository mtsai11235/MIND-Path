import { matchResources, MatchedResource } from './rag/matching'; 
import { type IntakeData } from './intakeSchema';

export interface ActionPlan {
  assessment?: MatchedResource;         
  coping_skills: MatchedResource[];     
  educational_resources: MatchedResource[]; 
}

export async function generateActionPlan(intake: IntakeData): Promise<ActionPlan> {
  const plan: ActionPlan = {
    coping_skills: [],
    educational_resources: []
  };

  // 1. SINGLE SEARCH: Fetch top 20 items regardless of type
  // We use a lower threshold (0.25) to ensure we don't accidentally filter out 
  // a good match that was just slightly imperfect.
  const allMatches = await matchResources(intake, {
    limit: 20, 
    similarityThreshold: 0.25, 
  });

  // 2. IN-MEMORY FILTERING
  // Sort the raw list into specific buckets based on their 'type'
  
  const assessments = allMatches.filter(r => r.type === 'assessment');
  
  const coping = allMatches.filter(r => r.type === 'coping_skill');
  
  const education = allMatches.filter(r => 
    ['website', 'article', 'directory', 'hotline', 'guideline'].includes(r.type || '')
  );

  // 3. POPULATE PLAN
  
  // Pick the single best assessment (highest score)
  if (assessments.length > 0) {
    plan.assessment = assessments[0];
  }

  // Pick top 3 coping skills
  plan.coping_skills = coping.slice(0, 3);

  // Pick top 3 educational resources
  plan.educational_resources = education.slice(0, 3);

  // --- SAFETY OVERRIDE ---
  if (isCrisis(intake)) {
     plan.coping_skills.unshift({
        id: 'crisis-988',
        title: '988 Suicide & Crisis Lifeline',
        type: 'crisis_resource',
        similarity: 1.0,
        short_desc: 'Immediate support for distress.',
        tags_all: ['crisis', 'suicide', 'help'] 
     });
  }

  return plan;
}

function isCrisis(intake: IntakeData): boolean {
  const combinedText = `${intake.primary_concern} ${intake.key_symptoms?.join(' ')}`.toLowerCase();
  return /suicide|kill myself|hurt myself|end it all/i.test(combinedText);
}
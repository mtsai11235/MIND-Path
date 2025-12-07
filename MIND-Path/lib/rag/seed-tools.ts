import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_CONTENT_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_CONTENT_URL');
}
if (!supabaseServiceKey) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_CONTENT_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TOOLS = [
  {
    id: 'tool-gad7',
    type: 'assessment',
    title: 'GAD-7 Anxiety Check',
    short_desc: 'A rapid screening tool for Generalized Anxiety Disorder.',
    org: 'National Health Service', // or Public Domain
    country: 'Global',
    language: 'en',
    tags_all: ['anxiety', 'worry', 'assessment', 'screening'],
    content: {
      questions: [
        { id: "q1", text: "Feeling nervous, anxious, or on edge", options: [0, 1, 2, 3] },
        { id: "q2", text: "Not being able to stop or control worrying", options: [0, 1, 2, 3] },
        { id: "q3", text: "Worrying too much about different things", options: [0, 1, 2, 3] },
        { id: "q4", text: "Trouble relaxing", options: [0, 1, 2, 3] },
        { id: "q5", text: "Being so restless that it is hard to sit still", options: [0, 1, 2, 3] },
        { id: "q6", text: "Becoming easily annoyed or irritable", options: [0, 1, 2, 3] },
        { id: "q7", "text": "Feeling afraid, as if something awful might happen", options: [0, 1, 2, 3] }
      ],
      scale: {
        "0": "Not at all",
        "1": "Several days",
        "2": "More than half the days",
        "3": "Nearly every day"
      },
      scoring: {
        "0-4": "Minimal anxiety",
        "5-9": "Mild anxiety",
        "10-14": "Moderate anxiety",
        "15-21": "Severe anxiety"
      }
    }
  },
  {
    id: 'tool-phq9',
    type: 'assessment',
    title: 'PHQ-9 Depression Screen',
    short_desc: 'Standard tool to monitor the severity of depression symptoms.',
    org: 'Pfizer / Public Domain',
    country: 'Global',
    language: 'en',
    tags_all: ['depression', 'mood', 'sadness', 'assessment', 'hopelessness'],
    content: {
      questions: [
        { id: "q1", text: "Little interest or pleasure in doing things", options: [0, 1, 2, 3] },
        { id: "q2", text: "Feeling down, depressed, or hopeless", options: [0, 1, 2, 3] },
        { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much", options: [0, 1, 2, 3] },
        { id: "q4", text: "Feeling tired or having little energy", options: [0, 1, 2, 3] },
        { id: "q5", text: "Poor appetite or overeating", options: [0, 1, 2, 3] },
        { id: "q6", text: "Feeling bad about yourself — or that you are a failure", options: [0, 1, 2, 3] },
        { id: "q7", text: "Trouble concentrating on things", options: [0, 1, 2, 3] },
        { id: "q8", text: "Moving or speaking so slowly that other people could have noticed", options: [0, 1, 2, 3] },
        { id: "q9", text: "Thoughts that you would be better off dead or of hurting yourself", options: [0, 1, 2, 3] }
      ],
      scale: {
        "0": "Not at all",
        "1": "Several days",
        "2": "More than half the days",
        "3": "Nearly every day"
      },
      scoring: {
        "0-4": "None-minimal",
        "5-9": "Mild",
        "10-14": "Moderate",
        "15-19": "Moderately Severe",
        "20-27": "Severe"
      }
    }
  },
  {
    id: 'skill-box-breathing',
    type: 'coping_skill',
    title: 'Box Breathing',
    short_desc: 'A simple technique to stop panic attacks and regain control.',
    org: 'Clinical Curated',
    country: 'Global',
    language: 'en',
    tags_all: ['panic', 'anxiety', 'breathing', 'calm', 'skill'],
    content: {
      instructions: "Use this whenever you feel overwhelming panic or stress.",
      duration_minutes: 2,
      steps: [
        "Inhale through your nose slowly for 4 seconds.",
        "Hold your breath for 4 seconds.",
        "Exhale through your mouth slowly for 4 seconds.",
        "Hold your breath again for 4 seconds.",
        "Repeat this cycle 4 times."
      ]
    }
  },
  {
    id: 'skill-grounding-54321',
    type: 'coping_skill',
    title: '5-4-3-2-1 Grounding',
    short_desc: 'A powerful sensory exercise to stop a panic attack by reconnecting with your surroundings.',
    org: 'Mayo Clinic / Clinical Curated',
    country: 'Global',
    language: 'en',
    tags_all: ['panic', 'anxiety', 'dissociation', 'grounding', 'sensory'],
    content: {
      instructions: "Look around you right now and name these things out loud or in your head.",
      duration_minutes: 3,
      steps: [
        "Acknowledge 5 things you see around you.",
        "Acknowledge 4 things you can touch.",
        "Acknowledge 3 things you can hear.",
        "Acknowledge 2 things you can smell.",
        "Acknowledge 1 thing you can taste."
      ]
    }
  },
  {
    id: 'skill-pmr-sleep',
    type: 'coping_skill',
    title: 'Progressive Muscle Relaxation',
    short_desc: 'A body-scan technique to release physical tension and help you fall asleep.',
    org: 'Sleep Foundation',
    country: 'Global',
    language: 'en',
    tags_all: ['sleep', 'insomnia', 'tension', 'rest', 'relaxation'],
    content: {
      instructions: "Lie down in a comfortable position. You will tense muscle groups for 5 seconds, then release them suddenly.",
      duration_minutes: 5,
      steps: [
        "Curl your toes downward tightly. Hold for 5... Release.",
        "Tighten your calf muscles. Hold for 5... Release.",
        "Squeeze your thighs. Hold for 5... Release.",
        "Clench your hands into fists. Hold for 5... Release.",
        "Raise your shoulders to your ears. Hold for 5... Release.",
        "Scrunch your face muscles. Hold for 5... Release.",
        "Take a deep breath and feel the heaviness in your body."
      ]
    }
  },{
    id: 'skill-cbt-3cs',
    type: 'coping_skill',
    title: 'Catch, Check, Change',
    short_desc: 'A classic CBT exercise to challenge negative thoughts.',
    org: 'Clinical Curated',
    country: 'Global',
    language: 'en',
    tags_all: ['depression', 'negative thoughts', 'cbt', 'cognitive', 'worry'],
    content: {
      instructions: "Use this when you feel stuck in a negative thought loop.",
      duration_minutes: 5,
      steps: [
        "CATCH: What is the thought? (e.g., 'I am going to fail everything').",
        "CHECK: Is this 100% true? What evidence do you have against it? Would you say this to a friend?",
        "CHANGE: Reframe it to be more accurate. (e.g., 'I am struggling right now, but I have handled hard things before')."
      ]
    }
  },{
    id: 'skill-dbt-stop',
    type: 'coping_skill',
    title: 'The STOP Technique',
    short_desc: 'A quick DBT skill to prevent impulsive actions when you are angry or overwhelmed.',
    org: 'DBT Curated',
    country: 'Global',
    language: 'en',
    tags_all: ['anger', 'impulse control', 'dbt', 'overwhelm', 'stress'],
    content: {
      instructions: "Do not react immediately. Follow these steps first.",
      duration_minutes: 1,
      steps: [
        "S: Stop! Freeze. Do not move a muscle. Do not speak.",
        "T: Take a step back. Physically step away from the situation. Take a deep breath.",
        "O: Observe. Notice what is happening inside you and outside you. What is the fact vs. the feeling?",
        "P: Proceed Mindfully. Ask yourself: 'What action will make this better, not worse?'"
      ]
    }
  },{
    id: 'skill-5-minute-rule',
    type: 'coping_skill',
    title: 'The 5-Minute Rule',
    short_desc: 'A trick to overcome lack of motivation or "paralysis".',
    org: 'Clinical Curated',
    country: 'Global',
    language: 'en',
    tags_all: ['depression', 'motivation', 'procrastination', 'energy', 'fatigue'],
    content: {
      instructions: "Use this when you can't bring yourself to start a task (like showering or cleaning).",
      duration_minutes: 5,
      steps: [
        "Pick the task you are avoiding.",
        "Tell yourself: 'I will do this for only 5 minutes. After that, I have full permission to stop.'",
        "Set a timer for 5 minutes.",
        "Start. Usually, once you break the initial seal of resistance, you will keep going."
      ]
    }
  }
];

async function seedTools() {
  console.log('🛠️  Seeding Assessment Tools & Skills...');

  for (const tool of TOOLS) {
    const { error } = await supabase
      .from('resources')
      .upsert({
        id: tool.id,
        title: tool.title,
        type: tool.type,
        short_desc: tool.short_desc,
        org: tool.org,
        country: tool.country,
        language: tool.language,
        tags_all: tool.tags_all,
        content: tool.content, // Using the JSONB column
        is_published: true,
        created_at: new Date()
      });

    if (error) {
      console.error(`❌ Error saving ${tool.title}:`, error.message);
    } else {
      console.log(`✅ Saved: ${tool.title}`);
    }
  }
}

seedTools();
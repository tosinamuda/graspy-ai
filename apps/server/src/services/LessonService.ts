import { ChatOpenAI } from '@langchain/openai';
import { Annotation, StateGraph } from '@langchain/langgraph';

const LessonState = Annotation.Root({
  country: Annotation<string>,
  language: Annotation<string>,
  gradeLevel: Annotation<string>,
  subject: Annotation<string>,
  topic: Annotation<string>,
  topicIndex: Annotation<number>,
  totalTopics: Annotation<number>,
  explanation: Annotation<string>,
  practiceQuestion: Annotation<string>,
  practiceOptions: Annotation<string[]>,
  correctOptionIndex: Annotation<number>,
  correctFeedback: Annotation<string>,
  incorrectFeedback: Annotation<string>,
  learningObjectives: Annotation<string[]>,
  currentStep: Annotation<string>,
  error: Annotation<string | null>,
});

type LessonStateType = typeof LessonState.State;

function createModel() {
  return new ChatOpenAI({
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      // eslint-disable-next-line n/no-process-env
      apiKey: process.env.OPENROUTER_API_KEY,
    },
    model: 'meta-llama/llama-4-scout',
    streaming: false,
    temperature: 0.6,
    modelKwargs: {
      response_format: { type: 'json_object' },
    },
  });
}

async function generateExplanation(state: LessonStateType): Promise<Partial<LessonStateType>> {
  const model = createModel();

  const prompt = `You are an experienced instructional designer creating a lesson overview for a student in ${state.country}.\nThe student speaks ${state.language} and is currently studying ${state.subject}.\nThe current topic is \"${state.topic}\" and the expected grade level is ${state.gradeLevel || 'middle school'}.\n\nRespond ONLY with a JSON object that satisfies this TypeScript type:\n{\n  "explanation": string;\n  "learning_objectives": string[];\n}\n\nGuidelines:\n- Write the explanation in ${state.language}.\n- Provide 3 concise learning objectives focused on ${state.topic}.\n- Keep the explanation to 3-4 sentences, clear and encouraging, grounded in the context of ${state.country}.`;

  try {
    const response = await model.invoke(prompt);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const parsed = JSON.parse(content) as {
      explanation: string;
      learning_objectives: string[];
    };

    if (!parsed.explanation || !Array.isArray(parsed.learning_objectives)) {
      throw new Error('Invalid explanation payload');
    }

    return {
      explanation: parsed.explanation.trim(),
      learningObjectives: parsed.learning_objectives.slice(0, 3).map((obj) => obj.trim()),
      currentStep: 'explanation_generated',
      error: null,
    };
  } catch (error) {
    return {
      explanation: '',
      learningObjectives: [],
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function generatePractice(state: LessonStateType): Promise<Partial<LessonStateType>> {
  const model = createModel();

  const prompt = `You are generating a quick formative assessment question for ${state.subject} on the topic \"${state.topic}\".\nThe learner is in ${state.country}, speaks ${state.language}, and is around ${state.gradeLevel || 'middle school'} level.\nHere is the lesson explanation to reference:\n"""\n${state.explanation}\n"""\nLearning objectives:\n${state.learningObjectives.join('\n')}\n\nReturn ONLY a JSON object matching this TypeScript type:\n{\n  "question": string;\n  "options": string[]; // exactly 3 or 4 options in ${state.language}\n  "correct_option_index": number; // zero-based index\n  "correct_feedback": string; // positive, specific to ${state.topic}\n  "incorrect_feedback": string; // constructive guidance in ${state.language}\n}\n\nEnsure:\n- The question is answerable from the explanation above.\n- Options are short, distinct, and culturally relevant to ${state.country}.\n- Feedback references the correct reasoning.`;

  try {
    const response = await model.invoke(prompt);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const parsed = JSON.parse(content) as {
      question: string;
      options: string[];
      correct_option_index: number;
      correct_feedback: string;
      incorrect_feedback: string;
    };

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 3) {
      throw new Error('Invalid practice payload');
    }

    const boundedIndex = Math.max(0, Math.min(parsed.options.length - 1, parsed.correct_option_index));

    return {
      practiceQuestion: parsed.question.trim(),
      practiceOptions: parsed.options.map((option) => option.trim()),
      correctOptionIndex: boundedIndex,
      correctFeedback: parsed.correct_feedback.trim(),
      incorrectFeedback: parsed.incorrect_feedback.trim(),
      currentStep: 'practice_generated',
      error: null,
    };
  } catch (error) {
    return {
      practiceQuestion: '',
      practiceOptions: [],
      correctOptionIndex: 0,
      correctFeedback: '',
      incorrectFeedback: '',
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildWorkflow() {
  const workflow = new StateGraph(LessonState)
    .addNode('generate_explanation', generateExplanation)
    .addNode('generate_practice', generatePractice)
    .addEdge('__start__', 'generate_explanation')
    .addEdge('generate_explanation', 'generate_practice')
    .addEdge('generate_practice', '__end__');

  return workflow.compile();
}

export interface LessonRequest {
  country: string;
  language: string;
  gradeLevel?: string;
  subject: string;
  topic: string;
  topicIndex: number;
  totalTopics: number;
}

export interface LessonResponse {
  session: LearningSessionPayload;
}

export interface LearningSessionPayload {
  id: string;
  subject: string;
  topic: string;
  topicIndex: number;
  totalTopics: number;
  explanation: string;
  practice: {
    question: string;
    options: string[];
    answerIndex: number;
    correctFeedback: string;
    incorrectFeedback: string;
  };
  phase: 'explanation';
  metadata: {
    country: string;
    language: string;
    gradeLevel?: string;
    generator: string;
    learningObjectives: string[];
  };
}

export async function generateLesson(request: LessonRequest): Promise<LessonResponse> {
  const gradeLevel = request.gradeLevel?.trim() || 'middle school';
  const workflow = buildWorkflow();

  const result = await workflow.invoke({
    country: request.country,
    language: request.language,
    gradeLevel,
    subject: request.subject,
    topic: request.topic,
    topicIndex: request.topicIndex,
    totalTopics: request.totalTopics,
    explanation: '',
    practiceQuestion: '',
    practiceOptions: [],
    correctOptionIndex: 0,
    correctFeedback: '',
    incorrectFeedback: '',
    learningObjectives: [],
    currentStep: 'initialized',
    error: null,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.explanation || result.practiceOptions.length === 0) {
    throw new Error('Failed to generate lesson content');
  }

  const session: LearningSessionPayload = {
    id: `lesson-${Date.now()}`,
    subject: request.subject,
    topic: request.topic,
    topicIndex: request.topicIndex,
    totalTopics: Math.max(1, request.totalTopics),
    explanation: result.explanation,
    practice: {
      question: result.practiceQuestion,
      options: result.practiceOptions,
      answerIndex: result.correctOptionIndex,
      correctFeedback: result.correctFeedback,
      incorrectFeedback: result.incorrectFeedback,
    },
    phase: 'explanation',
    metadata: {
      country: request.country,
      language: request.language,
      gradeLevel: request.gradeLevel,
      generator: 'langgraph_lesson_v1',
    learningObjectives: result.learningObjectives ?? [],
    },
  };

  return { session };
}

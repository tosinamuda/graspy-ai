import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation } from '@langchain/langgraph';

// Define workflow state
const WorkflowState = Annotation.Root({
  country: Annotation<string>,
  language: Annotation<string>,
  subjects: Annotation<string[]>,
  topics: Annotation<Record<string, string[]>>,
  currentStep: Annotation<string>,
  error: Annotation<string | null>,
});

type WorkflowStateType = typeof WorkflowState.State;

// Initialize OpenRouter with Cerebras Llama model
function createModel() {
  return new ChatOpenAI({
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      // eslint-disable-next-line n/no-process-env
      apiKey: process.env.OPENROUTER_API_KEY,
    },
    model: 'meta-llama/llama-4-scout',
    streaming: true,
    temperature: 0.7,
    modelKwargs: {
      response_format: { type: 'json_object' },
    },
  });
}

// Node: Generate subjects
async function generateSubjects(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const model = createModel();

  const prompt = `You are an educational curriculum expert. Generate exactly 2-3 educational subjects relevant for students in ${state.country} who speak ${state.language}.

Return ONLY a JSON object with this exact structure:
{
  "subjects": ["subject1", "subject2", "subject3"]
}

The subjects should be:
- Age-appropriate for middle/high school students
- Culturally relevant to ${state.country}
- Practical and engaging
- In ${state.language} language

Example for Nigeria/English: {"subjects": ["Mathematics", "English Language", "Basic Science"]}
Example for France/French: {"subjects": ["Mathématiques", "Sciences", "Histoire"]}`;

  try {
    const response = await model.invoke(prompt);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const parsed = JSON.parse(content);

    if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
      throw new Error('Invalid response format');
    }

    // Limit to 2-3 subjects
    const subjects = parsed.subjects.slice(0, 3);

    return {
      subjects,
      currentStep: 'subjects_generated',
      error: null,
    };
  } catch (error) {
    return {
      subjects: [],
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Node: Generate topics for each subject
async function generateTopics(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const model = createModel();
  const topics: Record<string, string[]> = {};

  try {
    for (const subject of state.subjects) {
      const prompt = `You are an educational curriculum expert. Generate exactly 5-7 key topics for the subject "${subject}" for students in ${state.country} who speak ${state.language}.

Return ONLY a JSON object with this exact structure:
{
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

The topics should be:
- Age-appropriate for middle/high school students
- Core concepts within ${subject}
- Progressive in difficulty
- In ${state.language} language

Example for Mathematics: {"topics": ["Algebra Basics", "Geometry", "Equations", "Graphs", "Statistics"]}`;

      const response = await model.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = JSON.parse(content);

      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        throw new Error(`Invalid topics format for ${subject}`);
      }

      // Limit to 5-7 topics
      topics[subject] = parsed.topics.slice(0, 7);
    }

    return {
      topics,
      currentStep: 'topics_generated',
      error: null,
    };
  } catch (error) {
    return {
      topics: {},
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Build the graph
function buildWorkflow() {
  const workflow = new StateGraph(WorkflowState)
    .addNode('generate_subjects', generateSubjects)
    .addNode('generate_topics', generateTopics)
    .addEdge('__start__', 'generate_subjects')
    .addEdge('generate_subjects', 'generate_topics')
    .addEdge('generate_topics', '__end__');

  return workflow.compile();
}

export interface CurriculumRequest {
  country: string;
  language: string;
}

export interface CurriculumResponse {
  subjects: string[];
  topics?: Record<string, string[]>;
  currentStep: string;
  error?: string;
}

// Main service function
export async function generateCurriculum(
  request: CurriculumRequest,
): Promise<CurriculumResponse> {
  const app = buildWorkflow();

  const result = await app.invoke({
    country: request.country,
    language: request.language,
    subjects: [],
    topics: {},
    currentStep: 'initialized',
    error: null,
  });

  return {
    subjects: result.subjects,
    topics: result.topics,
    currentStep: result.currentStep,
    error: result.error || undefined,
  };
}

// Streaming version for future SSE implementation
export async function* generateCurriculumStream(
  request: CurriculumRequest,
): AsyncGenerator<CurriculumResponse> {
  const app = buildWorkflow();

  const stream = await app.stream({
    country: request.country,
    language: request.language,
    subjects: [],
    topics: {},
    currentStep: 'initialized',
    error: null,
  });

  for await (const event of stream) {
    const values = Object.values(event)[0] as WorkflowStateType;
    yield {
      subjects: values.subjects,
      topics: values.topics,
      currentStep: values.currentStep,
      error: values.error || undefined,
    };
  }
}

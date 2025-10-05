import type { LearningSession } from '@/lib/curriculum-db';

/**
 * Curriculum API Client
 * Connects Next.js frontend to the curriculum generation backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface CurriculumRequest {
  country: string;
  language: string;
  gradeLevel?: string;
}

export interface CurriculumResponse {
  subjects: string[];
  topics?: Record<string, string[]>;
  currentStep: string;
  error?: string;
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

export interface LessonContentPayload {
  title: string;
  content: string;
  keyPoints: string[];
  examples: string[];
  practice: {
    question: string;
    options: string[];
    answerIndex: number;
    correctFeedback: string;
    incorrectFeedback: string;
  };
  progress: {
    current: number;
    total: number;
  };
}

export interface LessonResponse {
  success: boolean;
  lesson: LessonContentPayload;
  session: LearningSession;
}

/**
 * Generate curriculum (non-streaming)
 */
export async function generateCurriculum(
  request: CurriculumRequest
): Promise<CurriculumResponse> {
  const response = await fetch(`${API_BASE_URL}/curriculum/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Failed to generate curriculum');
  }

  return response.json();
}

export async function generateLessonSession(
  request: LessonRequest,
): Promise<LessonResponse> {
  const params = new URLSearchParams({
    country: request.country,
    language: request.language,
    subject: request.subject,
    topic: request.topic,
    index: String(Math.max(0, request.topicIndex)),
    totalTopics: String(Math.max(1, request.totalTopics)),
  });

  if (request.gradeLevel) {
    params.set('grade', request.gradeLevel);
  }

  const response = await fetch(`${API_BASE_URL}/curriculum/lesson?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Failed to generate lesson');
  }

  return response.json();
}

export async function fetchLesson(
  request: LessonRequest,
): Promise<LessonResponse> {
  return generateLessonSession(request);
}

/**
 * Generate curriculum with streaming (SSE)
 */
export async function* streamCurriculum(
  request: CurriculumRequest
): AsyncGenerator<CurriculumResponse> {
  const url = new URL(`${API_BASE_URL}/curriculum/generate-stream`);
  url.searchParams.set('country', request.country);
  url.searchParams.set('language', request.language);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to start curriculum stream');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';

  const findDelimiter = (source: string): { index: number; length: number } | null => {
    const newlineIndex = source.indexOf('\n\n');
    const carriageIndex = source.indexOf('\r\n\r\n');

    if (newlineIndex === -1 && carriageIndex === -1) {
      return null;
    }

    if (newlineIndex !== -1 && (carriageIndex === -1 || newlineIndex < carriageIndex)) {
      return { index: newlineIndex, length: 2 };
    }

    return { index: carriageIndex, length: 4 };
  };

  const extractEvents = () => {
    const events: CurriculumResponse[] = [];
    let doneSignal = false;

    while (true) {
      const delimiter = findDelimiter(buffer);

      if (!delimiter) {
        break;
      }

      const rawEvent = buffer.slice(0, delimiter.index);
      buffer = buffer.slice(delimiter.index + delimiter.length);

      const dataPayload = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');

      if (!dataPayload) {
        continue;
      }

      if (dataPayload === '[DONE]') {
        doneSignal = true;
        break;
      }

      try {
        events.push(JSON.parse(dataPayload) as CurriculumResponse);
      } catch {
        // Ignore malformed chunks and wait for the next complete event
      }
    }

    return { events, doneSignal } as const;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const { events, doneSignal } = extractEvents();
      for (const event of events) {
        yield event;
      }

      if (doneSignal) {
        return;
      }

      if (done) {
        buffer += decoder.decode();
        const finalResult = extractEvents();
        for (const event of finalResult.events) {
          yield event;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

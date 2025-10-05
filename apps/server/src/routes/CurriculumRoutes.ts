import { Request, Response } from 'express';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import {
  generateCurriculum,
  generateCurriculumStream,
  type CurriculumRequest,
} from '@src/services/CurriculumService';
import {
  generateLesson,
  type LessonRequest,
  type LearningSessionPayload,
} from '@src/services/LessonService';

const CACHE_CONTROL_HEADER = 'public, max-age=3600';

interface LessonSuccessPayload {
  lesson: {
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
  };
  session: LearningSessionPayload;
}

const mapSessionToLesson = (
  session: LearningSessionPayload,
): LessonSuccessPayload['lesson'] => {
  const { topicIndex, totalTopics, topic, explanation, practice, metadata } = session;

  const examples = practice.options.map((option, index) => {
    const label = String.fromCharCode('A'.charCodeAt(0) + index);
    return `${label}. ${option}`;
  });

  return {
    title: topic,
    content: explanation,
    keyPoints: metadata?.learningObjectives ?? [],
    examples,
    practice: {
      question: practice.question,
      options: practice.options,
      answerIndex: practice.answerIndex,
      correctFeedback: practice.correctFeedback,
      incorrectFeedback: practice.incorrectFeedback,
    },
    progress: {
      current: topicIndex + 1,
      total: Math.max(1, totalTopics),
    },
  };
};

async function buildLessonPayload(request: LessonRequest): Promise<LessonSuccessPayload> {
  const { session } = await generateLesson(request);
  return {
    session,
    lesson: mapSessionToLesson(session),
  };
}

function sendLessonResponse(res: Response, payload: LessonSuccessPayload) {
  res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
  res.setHeader('X-Cache', 'MISS');

  return res.status(HttpStatusCodes.OK).json({
    success: true,
    ...payload,
  });
}

/**
 * Generate curriculum (non-streaming)
 */
async function generate(req: Request, res: Response) {
  const { country, language } = req.body as CurriculumRequest;

  if (!country || !language) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'country and language are required',
    });
  }

  try {
    const result = await generateCurriculum({ country, language });

    if (result.error) {
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        error: result.error,
      });
    }

    return res.status(HttpStatusCodes.OK).json(result);
  } catch (error) {
    return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate curriculum with streaming (SSE)
 */
async function generateStream(req: Request, res: Response) {
  const { country, language } = req.query;

  if (!country || !language) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'country and language query parameters are required',
    });
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const stream = generateCurriculumStream({
      country: country as string,
      language: language as string,
    });

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}\n\n`,
    );
    res.end();
  }
}

/**
 * Generate a single lesson session
 */
async function generateLessonSession(req: Request, res: Response) {
  const {
    country,
    language,
    gradeLevel,
    subject,
    topic,
    topicIndex,
    totalTopics,
  } = req.body as LessonRequest;

  if (!country || !language || !subject || !topic) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'country, language, subject, and topic are required',
    });
  }

  try {
    const result = await buildLessonPayload({
      country,
      language,
      gradeLevel,
      subject,
      topic,
      topicIndex: typeof topicIndex === 'number' ? topicIndex : 0,
      totalTopics: typeof totalTopics === 'number' ? totalTopics : 1,
    });

    return sendLessonResponse(res, result);
  } catch (error) {
    return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Retrieve a lesson via query params (GET)
 */
async function getLessonSession(req: Request, res: Response) {
  const {
    country,
    language,
    grade: gradeLevel,
    subject,
    topic,
    index,
    totalTopics,
  } = req.query;

  if (!country || !language || !subject || !topic) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'country, language, subject, and topic query parameters are required',
    });
  }

  const parsedIndex = Number.parseInt((index as string) ?? '0', 10);
  const parsedTotal = Number.parseInt((totalTopics as string) ?? '1', 10);

  const lessonRequest: LessonRequest = {
    country: country as string,
    language: language as string,
    gradeLevel: typeof gradeLevel === 'string' && gradeLevel.length > 0 ? (gradeLevel as string) : undefined,
    subject: subject as string,
    topic: topic as string,
    topicIndex: Number.isNaN(parsedIndex) ? 0 : parsedIndex,
    totalTopics: Number.isNaN(parsedTotal) ? 1 : parsedTotal,
  };

  try {
    const result = await buildLessonPayload(lessonRequest);
    return sendLessonResponse(res, result);
  } catch (error) {
    return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default {
  generate,
  generateStream,
  generateLessonSession,
  getLessonSession,
} as const;

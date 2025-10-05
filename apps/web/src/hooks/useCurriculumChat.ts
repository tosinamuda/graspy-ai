'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchLesson,
  generateLessonSession,
  streamCurriculum,
  type CurriculumRequest,
  type LessonRequest,
  type LessonResponse,
  type LessonContentPayload,
} from '@/lib/curriculum-api';
import {
  saveCurriculum,
  getCurriculum,
  deleteCurriculum,
  saveChatMessage,
  getChatHistory,
  clearChatHistory,
  updateCurriculum,
  type ChatMessage,
  type CurriculumData,
  type LearningSession,
} from '@/lib/curriculum-db';
import {
  loadSubjectStatuses,
  setTopicStatus,
  getTopicStatus,
  clearSubjectStatuses,
  resetAllTopicStatuses,
  type TopicStatusRecord,
  type TopicStatusValue,
} from '@/lib/topic-progress';
import {
  getCachedLesson,
  setCachedLesson,
  clearLessonCacheForSubject,
  resetLessonCache,
} from '@/lib/lesson-cache';

const CURRICULUM_SETUP_COMPONENT = 'curriculum_setup';

interface TopicStatusMap {
  [subject: string]: TopicStatusRecord[];
}

interface ActiveLessonState {
  subject: string;
  topic: string;
  topicIndex: number;
  totalTopics: number;
  lesson: LessonContentPayload;
  session: LearningSession;
}

function createSetupPlaceholderMessage(): ChatMessage {
  return {
    id: `temp-setup-${Date.now()}`,
    type: 'component',
    content: '',
    timestamp: Number.MAX_SAFE_INTEGER,
    sender: 'ai',
    metadata: { component: CURRICULUM_SETUP_COMPONENT, placeholder: true },
  };
}

interface UseCurriculumChatResult {
  messages: ChatMessage[];
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  error: string | null;
  generate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  regenerate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  loadExistingData: () => Promise<void>;
  nextSubject: string | null;
  sendUserMessage: (content: string) => Promise<void>;
  startLesson: (subject: string, t?: (key: string, params?: any) => string) => Promise<void>;
  continueSession: () => Promise<void>;
  submitSessionAnswer: (
    answerIndex: number,
    t?: (key: string, params?: any) => string,
  ) => Promise<void>;
  finishSession: () => Promise<void>;
}

export function useCurriculumChat(): UseCurriculumChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createSetupPlaceholderMessage()]);
  const [curriculum, setCurriculum] = useState<CurriculumData | null>({
    id: 'current',
    country: '',
    language: '',
    gradeLevel: '',
    subjects: [],
    topics: {},
    assessment: {
      nextSubject: null,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextSubject, setNextSubject] = useState<string | null>(null);
  const nextSubjectRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const ensureSetupMessage = useCallback(async () => {
    const exists = messagesRef.current.some(
      (message) =>
        message.type === 'component' &&
        message.metadata?.component === CURRICULUM_SETUP_COMPONENT &&
        !message.metadata?.placeholder,
    );

    if (exists) {
      return;
    }

    const setupMessage = await saveChatMessage({
      type: 'component',
      content: '',
      sender: 'ai',
      metadata: { component: CURRICULUM_SETUP_COMPONENT },
    });

    setMessages((prev) => {
      const withoutPlaceholders = prev.filter(
        (message) =>
          !(
            message.type === 'component' &&
            message.metadata?.component === CURRICULUM_SETUP_COMPONENT &&
            message.metadata?.placeholder
          ),
      );

      const nextMessages = [...withoutPlaceholders, setupMessage].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      messagesRef.current = nextMessages;
      return nextMessages;
    });
  }, []);

  // Load existing data from IndexedDB
  const loadExistingData = useCallback(async () => {
    try {
      console.log('📂 Loading data from IndexedDB...');
      const [savedCurriculum, chatHistory] = await Promise.all([
        getCurriculum(),
        getChatHistory(),
      ]);

      console.log('📋 Loaded curriculum:', savedCurriculum);
      console.log('💬 Loaded chat history:', chatHistory.length, 'messages');

      if (savedCurriculum) {
        setCurriculum(savedCurriculum);
        const savedNextSubject = savedCurriculum.assessment?.nextSubject ?? null;
        setNextSubject(savedNextSubject);
        nextSubjectRef.current = savedNextSubject;
      }

      const normalized = chatHistory
        .map((message) => ({ ...message, sender: message.sender ?? 'ai' }))
        .filter((message) => !(message.type === 'status' && !message.metadata));

      const hasSetupMessage = normalized.some(
        (message) =>
          message.type === 'component' &&
          message.metadata?.component === CURRICULUM_SETUP_COMPONENT,
      );

      const historyWithSetup = hasSetupMessage
        ? normalized
        : [...normalized, createSetupPlaceholderMessage()];

      const sortedHistory = historyWithSetup.sort((a, b) => a.timestamp - b.timestamp);
      messagesRef.current = sortedHistory;
      setMessages(sortedHistory);

      if (!hasSetupMessage && normalized.length > 0) {
        await ensureSetupMessage();
      }
    } catch (err) {
      console.error('❌ Failed to load data from IndexedDB:', err);
    }
  }, [ensureSetupMessage]);

  // Add message helper
  const addMessage = useCallback(
    async (message: Omit<ChatMessage, 'id' | 'timestamp'> & { sender?: 'ai' | 'user' }) => {
      const savedMessage = await saveChatMessage({
        ...message,
        sender: message.sender ?? 'ai',
      });
      setMessages((prev) => [...prev, savedMessage].sort((a, b) => a.timestamp - b.timestamp));
      return savedMessage;
    },
    [],
  );

  // Generate curriculum
  const generate = useCallback(
    async (request: CurriculumRequest, t?: (key: string, params?: any) => string) => {
      setIsGenerating(true);
      setError(null);
      setNextSubject(null);
      nextSubjectRef.current = null;

      try {
        // Add welcome message
        await addMessage({
          type: 'system',
          content: t
            ? t('chat.welcomeMessage', { country: request.country, language: request.language })
            : `👋 Welcome! Let me create your personalized learning plan for ${request.country} in ${request.language}...`,
        });

        await ensureSetupMessage();

        const stream = streamCurriculum(request);
        const subjects: string[] = [];
        const topics: Record<string, string[]> = {};
        for await (const chunk of stream) {
          if (chunk.error) {
            setError(chunk.error);
            await addMessage({
              type: 'error',
              content: t
                ? t('chat.errorMessage', { error: chunk.error })
                : `❌ Error: ${chunk.error}`,
            });
            break;
          }

          // Handle new subjects
          if (chunk.subjects && chunk.subjects.length > 0) {
            const newSubjects = chunk.subjects.filter((s) => !subjects.includes(s));

            for (const subject of newSubjects) {
              subjects.push(subject);

              if (!nextSubjectRef.current) {
                nextSubjectRef.current = subject;
                setNextSubject(subject);
              }
            }
          }

          // Handle topics
          if (chunk.topics && Object.keys(chunk.topics).length > 0) {
            for (const [subject, subjectTopics] of Object.entries(chunk.topics)) {
              if (subjectTopics.length > 0) {
                topics[subject] = subjectTopics;
              }
            }
          }

          // Update curriculum in state (real-time)
          setCurriculum((prev) => ({
            id: 'current',
            country: request.country,
            language: request.language,
            gradeLevel: (request as any).gradeLevel || prev.gradeLevel || 'middle',
            subjects: [...subjects],
            topics: { ...topics },
        activeSession: prev.activeSession,
        assessment: {
          nextSubject: nextSubjectRef.current,
        },
            createdAt: prev.createdAt || Date.now(),
            updatedAt: Date.now(),
          }));
        }

        // Save final curriculum to IndexedDB
        if (subjects.length > 0) {
          console.log('💾 Saving curriculum to IndexedDB:', { subjects, topics });
          await saveCurriculum({
            country: request.country,
            language: request.language,
            gradeLevel: (request as any).gradeLevel || 'middle',
            subjects,
            topics,
            assessment: {
              nextSubject: nextSubjectRef.current,
            },
          });
          console.log('✅ Curriculum saved successfully');

          // Success state reflected in curriculum setup card; no additional chat message needed
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        await addMessage({
          type: 'error',
          content: t
            ? t('chat.errorMessage', { error: errorMsg })
            : `❌ Error: ${errorMsg}`,
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [addMessage, ensureSetupMessage],
  );

  const sendUserMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      try {
        await addMessage({
          type: 'user',
          content: trimmed,
          sender: 'user',
        });
      } catch (err) {
        console.error('❌ Failed to persist user message:', err);
      }
    },
    [addMessage],
  );

  const startLesson = useCallback(
    async (subject: string, t?: (key: string, params?: any) => string) => {
      if (!curriculum || curriculum.subjects.length === 0) {
        return;
      }

      const topicsForSubject = curriculum.topics?.[subject] ?? [];
      if (topicsForSubject.length === 0) {
        await addMessage({
          type: 'status',
          content: `Topics for ${subject} are still loading. Try again soon!`,
        });
        return;
      }

      await ensureSetupMessage();

      await addMessage({
        type: 'status',
        content: t
          ? t('chat.startingLesson', { subject })
          : `▶️ Creating a personalized path for ${subject}...`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const firstTopic = topicsForSubject[0] ?? subject;
      const topicIndex = Math.max(0, topicsForSubject.indexOf(firstTopic));
      const totalTopics = Math.max(topicsForSubject.length, 1);

      setNextSubject(null);
      nextSubjectRef.current = null;

      const lessonRequest: LessonRequest = {
        country: curriculum.country,
        language: curriculum.language,
        gradeLevel: curriculum.gradeLevel,
        subject,
        topic: firstTopic,
        topicIndex,
        totalTopics,
      };

      try {
        const { session } = await generateLessonSession(lessonRequest);

        const sessionWithPhase: LearningSession = {
          ...session,
          phase: 'explanation',
          metadata: {
            ...session.metadata,
            country: curriculum.country,
            language: curriculum.language,
            gradeLevel: curriculum.gradeLevel,
            generator: session.metadata?.generator ?? 'langgraph_lesson_v1',
          },
        };

        const updatedCurriculum: CurriculumData = {
          ...(curriculum ?? {
            id: 'current',
            country: '',
            language: '',
            gradeLevel: '',
            subjects: [],
            topics: {},
            assessment: { nextSubject: null },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
          activeSession: sessionWithPhase,
          assessment: {
            nextSubject: null,
          },
          updatedAt: Date.now(),
        };

        setCurriculum(updatedCurriculum);
        await updateCurriculum({
          activeSession: sessionWithPhase,
          assessment: { nextSubject: null },
        });

        await addMessage({
          type: 'component',
          content: '',
          sender: 'ai',
          metadata: { component: 'learning_session', sessionId: sessionWithPhase.id },
        });
      } catch (err) {
        console.error('❌ Failed to generate lesson:', err);
        const fallbackError =
          t?.('chat.errorMessage', { error: 'Lesson generation failed' }) ??
          '❌ Lesson generation failed';
        const errorMsg =
          err instanceof Error && err.message ? `❌ ${err.message}` : fallbackError;

        setError(errorMsg);

        await addMessage({
          type: 'error',
          content: errorMsg,
        });
      }
    },
    [addMessage, curriculum, ensureSetupMessage],
  );

  const continueSession = useCallback(async () => {
    if (!curriculum?.activeSession || curriculum.activeSession.phase !== 'explanation') {
      return;
    }

    const updatedSession: LearningSession = {
      ...curriculum.activeSession,
      phase: 'practice',
    };

    setCurriculum((prev) => (prev ? { ...prev, activeSession: updatedSession, updatedAt: Date.now() } : prev));
    await updateCurriculum({ activeSession: updatedSession });
  }, [curriculum]);

  const submitSessionAnswer = useCallback(
    async (answerIndex: number, t?: (key: string, params?: any) => string) => {
      if (!curriculum?.activeSession || curriculum.activeSession.phase !== 'practice') {
        return;
      }

      const isCorrect = answerIndex === curriculum.activeSession.practice.answerIndex;

      const updatedSession: LearningSession = {
        ...curriculum.activeSession,
        phase: 'feedback',
        answerIndex,
        isCorrect,
      };

      setCurriculum((prev) => (prev ? { ...prev, activeSession: updatedSession, updatedAt: Date.now() } : prev));
      await updateCurriculum({ activeSession: updatedSession });

      await addMessage({
        type: 'status',
        content: isCorrect
          ? t?.('chat.practiceCorrect') ?? 'Great work! You nailed that question.'
          : t?.('chat.practiceIncorrect') ?? "Let's review that together.",
      });
    },
    [addMessage, curriculum],
  );

  const finishSession = useCallback(async () => {
    if (!curriculum?.activeSession || curriculum.activeSession.phase === 'complete') {
      return;
    }

    const updatedSession: LearningSession = {
      ...curriculum.activeSession,
      phase: 'complete',
    };

    setCurriculum((prev) => (prev ? { ...prev, activeSession: updatedSession, updatedAt: Date.now() } : prev));
    await updateCurriculum({ activeSession: updatedSession });
  }, [curriculum]);

  // Regenerate curriculum
  const regenerate = useCallback(
    async (request: CurriculumRequest, t?: (key: string, params?: any) => string) => {
      // Clear UI immediately
      setCurriculum({
        id: 'current',
        country: '',
        language: '',
        gradeLevel: '',
        subjects: [],
        topics: {},
        activeSession: undefined,
        assessment: {
          nextSubject: null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const placeholder = createSetupPlaceholderMessage();
      messagesRef.current = [placeholder];
      setMessages([placeholder]);
      setNextSubject(null);
      nextSubjectRef.current = null;

      // Clear chat history in IndexedDB
      await clearChatHistory();

      // Add regeneration message
      await addMessage({
        type: 'system',
        content: t ? t('chat.regeneratingMessage') : '♻️ Regenerating your curriculum...',
      });

      // Generate new curriculum (will clear DB after success)
      await generate(request, t);

      // Delete old curriculum from IndexedDB only after successful generation
      if (!error) {
        await deleteCurriculum();
      }
    },
    [generate, addMessage, error]
  );

  return {
    messages,
    curriculum,
    isGenerating,
    error,
    generate,
    regenerate,
    loadExistingData,
    nextSubject,
    sendUserMessage,
    startLesson,
    continueSession,
    submitSessionAnswer,
    finishSession,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  generateLessonSession,
  streamCurriculum,
  type CurriculumRequest,
  type LessonRequest,
  askTutor,
  type TutorChatHistoryEntry,
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
  type CurriculumSubject,
  type LearningSession,
} from '@/lib/curriculum-db';
import { setCachedLesson } from '@/lib/lesson-cache';
import { loadTopicProgress, saveTopicProgress } from '@/lib/topic-progress';
import { createSlug, normalizeSubjectList } from '@/lib/slug';

export interface LearningContext {
  subject: CurriculumSubject | null;
  topic: string | null;
  relatedTopics: string[];
}

interface UseCurriculumChatResult {
  messages: ChatMessage[];
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  isPrimingLesson: boolean;
  error: string | null;
  generate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  regenerate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  loadExistingData: () => Promise<void>;
  nextSubject: CurriculumSubject | null;
  sendUserMessage: (
    content: string,
    t?: (key: string, params?: any) => string,
  ) => Promise<void>;
  startLesson: (subject: CurriculumSubject, t?: (key: string, params?: any) => string) => Promise<void>;
  continueSession: () => Promise<void>;
  submitSessionAnswer: (
    answerIndex: number,
    t?: (key: string, params?: any) => string,
  ) => Promise<void>;
  finishSession: () => Promise<void>;
  learningContext: LearningContext;
  setLearningContext: (context: Partial<LearningContext>) => void;
}

export function useCurriculumChat(): UseCurriculumChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const [isPrimingLesson, setIsPrimingLesson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextSubject, setNextSubject] = useState<CurriculumSubject | null>(null);
  const nextSubjectRef = useRef<CurriculumSubject | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const [learningContext, setLearningContextState] = useState<LearningContext>({
    subject: null,
    topic: null,
    relatedTopics: [],
  });

  const setLearningContext = useCallback((context: Partial<LearningContext>) => {
    setLearningContextState((prev) => ({
      subject: context.subject !== undefined ? context.subject : prev.subject,
      topic: context.topic !== undefined ? context.topic : prev.topic,
      relatedTopics: context.relatedTopics !== undefined ? context.relatedTopics : prev.relatedTopics,
    }));
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearPendingMessages = useCallback(() => {
    if (pendingMessagesRef.current.length === 0) {
      return;
    }

    const pendingIds = new Set(pendingMessagesRef.current.map((message) => message.id));
    pendingMessagesRef.current = [];

    setMessages((prev) => {
      const filtered = prev.filter((message) => !pendingIds.has(message.id));
      messagesRef.current = filtered;
      return filtered;
    });
  }, [setMessages]);

  const persistPendingMessages = useCallback(async () => {
    if (pendingMessagesRef.current.length === 0) {
      return;
    }

    const tempMessages = pendingMessagesRef.current;
    pendingMessagesRef.current = [];
    const idsToReplace = new Set(tempMessages.map((message) => message.id));
    const persisted: ChatMessage[] = [];

    for (const message of tempMessages) {
      const saved = await saveChatMessage({
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        sender: message.sender,
      });
      persisted.push(saved);
    }

    setMessages((prev) => {
      const retained = prev.filter((message) => !idsToReplace.has(message.id));
      const next = [...retained, ...persisted].sort((a, b) => a.timestamp - b.timestamp);
      messagesRef.current = next;
      return next;
    });
  }, [setMessages]);

  const removeMessageById = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const next = prev.filter((message) => message.id !== id);
        messagesRef.current = next;
        return next;
      });
      pendingMessagesRef.current = pendingMessagesRef.current.filter((message) => message.id !== id);
    },
    [setMessages],
  );

  const updateMessage = useCallback(
    (id: string, updates: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === id
            ? {
                ...message,
                ...updates,
                metadata: updates.metadata
                  ? { ...message.metadata, ...updates.metadata }
                  : message.metadata,
              }
            : message,
        );
        messagesRef.current = next;
        return next;
      });
    },
    [setMessages],
  );

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
        const savedNextSubjectSlug = savedCurriculum.assessment?.nextSubject ?? null;
        const savedNextSubject =
          savedNextSubjectSlug
            ? savedCurriculum.subjects.find((subject) => subject.slug === savedNextSubjectSlug) ??
              savedCurriculum.subjects.find((subject) => subject.name === savedNextSubjectSlug)
            : null;
        setNextSubject(savedNextSubject ?? null);
        nextSubjectRef.current = savedNextSubject ?? null;
      }

      const normalized = chatHistory
        .map((message) => ({ ...message, sender: message.sender ?? 'ai' }))
        .filter((message) => message.type !== 'component' && message.type !== 'status');

      const sortedHistory = normalized.sort((a, b) => a.timestamp - b.timestamp);
      messagesRef.current = sortedHistory;
      setMessages(sortedHistory);
    } catch (err) {
      console.error('❌ Failed to load data from IndexedDB:', err);
    }
  }, []);

  // Add message helper
  const addMessage = useCallback(
    async (
      message: Omit<ChatMessage, 'id' | 'timestamp'> & { sender?: 'ai' | 'user' },
      options: { persist?: boolean } = {},
    ) => {
      const { persist = true } = options;

      if (persist) {
        const savedMessage = await saveChatMessage({
          ...message,
          sender: message.sender ?? 'ai',
        });
        setMessages((prev) => {
          const next = [...prev, savedMessage].sort((a, b) => a.timestamp - b.timestamp);
          messagesRef.current = next;
          return next;
        });
        return savedMessage;
      }

      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        sender: message.sender ?? 'ai',
        timestamp: Date.now(),
      };

      pendingMessagesRef.current = [...pendingMessagesRef.current, tempMessage];
      setMessages((prev) => {
        const next = [...prev.filter((existing) => existing.id !== tempMessage.id), tempMessage].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        messagesRef.current = next;
        return next;
      });
      return tempMessage;
    },
    [setMessages],
  );

  // Generate curriculum
  const generate = useCallback(
    async (request: CurriculumRequest, t?: (key: string, params?: any) => string) => {
      setIsGenerating(true);
      setError(null);
      setNextSubject(null);
      nextSubjectRef.current = null;
      clearPendingMessages();

      let generationFailed = false;

      try {

        const preferredSubjects = (request.subjects ?? [])
          .map((subject) => subject.trim())
          .filter((subject) => subject.length > 0);

        const { subjects: initialSubjects } = normalizeSubjectList(preferredSubjects);
        const subjectMap = new Map<string, CurriculumSubject>();
        const topics: Record<string, string[]> = {};

        for (const subject of initialSubjects) {
          subjectMap.set(subject.slug, subject);
        }

        if (initialSubjects.length > 0) {
          const firstSubject = initialSubjects[0];
          nextSubjectRef.current = firstSubject;
          setNextSubject(firstSubject);
        }

        setCurriculum({
          id: 'current',
          country: request.country,
          language: request.language,
          gradeLevel: (request as any).gradeLevel || 'middle school learners',
          subjects: initialSubjects,
          topics: {},
          activeSession: undefined,
          assessment: {
            nextSubject: initialSubjects[0]?.slug ?? null,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const findSubjectByName = (name: string) => {
          for (const subject of subjectMap.values()) {
            if (subject.name === name) {
              return subject;
            }
          }
          return null;
        };

        const stream = streamCurriculum(request);
        for await (const chunk of stream) {
          if (chunk.error) {
            generationFailed = true;
            setError(chunk.error);
            await addMessage({
              type: 'error',
              content: t
                ? t('chat.errorMessage', { error: chunk.error })
                : `❌ Error: ${chunk.error}`,
              sender: 'ai',
            }, { persist: false });
            break;
          }

          let subjectsChanged = false;
          let topicsChanged = false;

          if (Array.isArray(chunk.subjects) && chunk.subjects.length > 0) {
            for (const entry of chunk.subjects as Array<CurriculumSubject | string>) {
              if (typeof entry === 'string') {
                const name = entry.trim();
                if (!name) {
                  continue;
                }
                if (findSubjectByName(name)) {
                  continue;
                }
                const slug = createSlug(name, new Set(subjectMap.keys()));
                if (subjectMap.has(slug)) {
                  continue;
                }
                const subject: CurriculumSubject = { name, slug };
                subjectMap.set(subject.slug, subject);
                subjectsChanged = true;
                if (!nextSubjectRef.current) {
                  nextSubjectRef.current = subject;
                  setNextSubject(subject);
                }
                continue;
              }

              const name = entry.name.trim();
              const slug = entry.slug.trim();
              const existing = subjectMap.get(slug);
              if (existing) {
                if (existing.name !== name) {
                  existing.name = name;
                  subjectsChanged = true;
                }
                continue;
              }

              const subject: CurriculumSubject = { name, slug };
              subjectMap.set(slug, subject);
              subjectsChanged = true;

              if (!nextSubjectRef.current) {
                nextSubjectRef.current = subject;
                setNextSubject(subject);
              }
            }
          }

          if (chunk.topics && Object.keys(chunk.topics).length > 0) {
            for (const [key, subjectTopics] of Object.entries(chunk.topics)) {
              if (!Array.isArray(subjectTopics) || subjectTopics.length === 0) {
                continue;
              }
              const subject =
                subjectMap.get(key) ??
                findSubjectByName(key);
              const targetKey = subject ? subject.slug : key;
              topics[targetKey] = [...subjectTopics];
              topicsChanged = true;
            }
          }

          if (subjectsChanged || topicsChanged) {
            const orderedSubjects = Array.from(subjectMap.values());
            setCurriculum((prev) => ({
              id: 'current',
              country: request.country,
              language: request.language,
              gradeLevel: (request as any).gradeLevel || prev?.gradeLevel || 'middle school learners',
              subjects: orderedSubjects,
              topics: { ...topics },
              activeSession: prev?.activeSession,
              assessment: {
                nextSubject: nextSubjectRef.current?.slug ?? null,
              },
              createdAt: prev?.createdAt || Date.now(),
              updatedAt: Date.now(),
            }));
          }
        }

        const orderedSubjects = Array.from(subjectMap.values());

        // Save final curriculum to IndexedDB and prime first lesson content
        if (!generationFailed && orderedSubjects.length > 0) {
          const primeSubject = nextSubjectRef.current ?? orderedSubjects[0];
          const subjectTopics = primeSubject ? topics[primeSubject.slug] ?? [] : [];
          const contextRelated = subjectTopics.slice(1, 4);
          if (primeSubject) {
            setLearningContext({
              subject: primeSubject,
              topic: subjectTopics[0] ?? null,
              relatedTopics: contextRelated,
            });
          } else {
            setLearningContext({ subject: null, topic: null, relatedTopics: [] });
          }

          let sessionWithPhase: LearningSession | null = null;

          if (primeSubject && subjectTopics.length > 0) {
            setIsPrimingLesson(true);
            try {
              const lessonResponse = await generateLessonSession({
                country: request.country,
                language: request.language,
                gradeLevel: (request as any).gradeLevel || curriculum?.gradeLevel || 'middle school learners',
                subject: primeSubject.name,
                topic: subjectTopics[0],
                topicIndex: 0,
                totalTopics: subjectTopics.length,
              });

              sessionWithPhase = {
                ...lessonResponse.session,
                phase: 'explanation',
                metadata: {
                  ...lessonResponse.session.metadata,
                  country: request.country,
                  language: request.language,
                  gradeLevel: (request as any).gradeLevel || curriculum?.gradeLevel || 'middle school learners',
                  generator: lessonResponse.session.metadata?.generator ?? 'strands_lesson_v1',
                },
              };

              setCachedLesson(primeSubject.slug, 0, {
                subjectSlug: primeSubject.slug,
                subjectName: primeSubject.name,
                topic: subjectTopics[0],
                topicIndex: 0,
                lesson: lessonResponse.lesson,
                session: lessonResponse.session,
                savedAt: Date.now(),
              }, primeSubject.name);

              const statuses = loadTopicProgress(primeSubject.slug, subjectTopics.length, primeSubject.name);
              statuses[0] = 'generated';
              saveTopicProgress(primeSubject.slug, statuses, primeSubject.name);
            } catch (primeError) {
              generationFailed = true;
              const errorMsg = primeError instanceof Error ? primeError.message : 'Lesson priming failed';
              setError(errorMsg);
              await addMessage({
                type: 'error',
                content: t
                  ? t('chat.errorMessage', { error: errorMsg })
                  : `❌ Error: ${errorMsg}`,
                sender: 'ai',
              }, { persist: false });
            } finally {
              setIsPrimingLesson(false);
            }
          }

          if (!generationFailed) {
            const createdAt = curriculum?.createdAt ?? Date.now();
            const updatedCurriculum: CurriculumData = {
              id: 'current',
              country: request.country,
              language: request.language,
              gradeLevel: (request as any).gradeLevel || curriculum?.gradeLevel || 'middle school learners',
              subjects: orderedSubjects,
              topics: { ...topics },
              activeSession: sessionWithPhase ?? undefined,
              assessment: {
                nextSubject: nextSubjectRef.current?.slug ?? null,
              },
              createdAt,
              updatedAt: Date.now(),
            };

            setCurriculum(updatedCurriculum);

            await persistPendingMessages();
            console.log('💾 Saving curriculum to IndexedDB:', {
              subjects: updatedCurriculum.subjects,
              topics: updatedCurriculum.topics,
            });
            await saveCurriculum({
              country: updatedCurriculum.country,
              language: updatedCurriculum.language,
              gradeLevel: updatedCurriculum.gradeLevel,
              subjects: updatedCurriculum.subjects,
              topics: updatedCurriculum.topics,
              activeSession: updatedCurriculum.activeSession,
              assessment: updatedCurriculum.assessment,
            });
            console.log('✅ Curriculum saved successfully');
          }
        }
      } catch (err) {
        generationFailed = true;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        await addMessage({
          type: 'error',
          content: t
            ? t('chat.errorMessage', { error: errorMsg })
            : `❌ Error: ${errorMsg}`,
          sender: 'ai',
        }, { persist: false });
      } finally {
        setIsGenerating(false);
      }
    },
    [addMessage, clearPendingMessages, persistPendingMessages, curriculum, setLearningContext],
  );

  const sendUserMessage = useCallback(
    async (content: string, t?: (key: string, params?: any) => string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      let userMessage: ChatMessage | null = null;

      try {
        userMessage = await addMessage({
          type: 'user',
          content: trimmed,
          sender: 'user',
        });
      } catch (err) {
        console.error('❌ Failed to persist user message:', err);
        return;
      }

      const subjectsList = curriculum?.subjects ?? [];
      const assessmentSubject = curriculum?.assessment?.nextSubject
        ? subjectsList.find((subject) => subject.slug === curriculum.assessment?.nextSubject) ?? null
        : null;
      const activeSubject = curriculum?.activeSession?.subject
        ? subjectsList.find((subject) => subject.name === curriculum.activeSession?.subject) ?? null
        : null;

      const fallbackSubject =
        nextSubjectRef.current ??
        learningContext.subject ??
        activeSubject ??
        assessmentSubject ??
        subjectsList[0] ??
        null;

      const currentSubject = learningContext.subject ?? fallbackSubject;
      const subjectTopics = currentSubject ? curriculum?.topics?.[currentSubject.slug] ?? [] : [];
      const activeSession = curriculum?.activeSession;

      let currentTopic = learningContext.topic ?? null;

      if (!currentTopic) {
        if (activeSession?.subject === currentSubject?.name && activeSession?.topic) {
          currentTopic = activeSession.topic;
        } else if (subjectTopics.length > 0) {
          currentTopic = subjectTopics[0];
        }
      }

      const relatedTopics =
        learningContext.subject?.slug === currentSubject?.slug && learningContext.relatedTopics.length > 0
          ? learningContext.relatedTopics
          : subjectTopics.filter((topic) => topic !== currentTopic).slice(0, 3);

      const history: TutorChatHistoryEntry[] = messagesRef.current
        .filter((message) => message.id !== userMessage?.id)
        .filter((message) => message.type !== 'component' && message.type !== 'status')
        .filter((message) => message.sender === 'user' || message.sender === 'ai')
        .slice(-8)
        .map((message) => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.content,
        }));

      const thinkingMessage = await addMessage(
        {
          type: 'status',
          content: t?.('chat.tutorThinking') ?? 'Thinking through your question...',
          sender: 'ai',
        },
        { persist: false },
      );

      try {
        const response = await askTutor({
          message: trimmed,
          subject: currentSubject?.name ?? t?.('chat.fallbackSubject') ?? 'General Studies',
          topic: currentTopic,
          relatedTopics,
          language: curriculum?.language || 'English',
          country: curriculum?.country,
          gradeLevel: curriculum?.gradeLevel || undefined,
          history,
        });

        if (thinkingMessage) {
          removeMessageById(thinkingMessage.id);
        }

        const metadata = {
          subject: currentSubject?.name ?? undefined,
          topic: currentTopic ?? undefined,
          relatedTopics,
          followUps: response.followUps,
          navigationTip: response.navigationTip,
        };

        const streamingMessage = await addMessage(
          {
            type: 'system',
            content: '',
            sender: 'ai',
            metadata,
          },
          { persist: false },
        );

        if (streamingMessage) {
          const chunkSize = Math.max(4, Math.round(response.answer.length / 120));
          const chunks: string[] = [];
          for (let index = 0; index < response.answer.length; index += chunkSize) {
            chunks.push(response.answer.slice(index, index + chunkSize));
          }

          let buffer = '';
          for (const chunk of chunks) {
            buffer += chunk;
            updateMessage(streamingMessage.id, { content: buffer, metadata });
            // Throttle updates so the UI appears to stream the response
            await new Promise((resolve) => setTimeout(resolve, 18));
          }

          const savedMessage = await saveChatMessage({
            type: 'system',
            content: response.answer,
            sender: 'ai',
            metadata,
          });

          setMessages((prev) => {
            const remaining = prev.filter((message) => message.id !== streamingMessage.id);
            const next = [...remaining, savedMessage].sort((a, b) => a.timestamp - b.timestamp);
            messagesRef.current = next;
            return next;
          });
          pendingMessagesRef.current = pendingMessagesRef.current.filter(
            (message) => message.id !== streamingMessage.id,
          );
        }
      } catch (err) {
        if (thinkingMessage) {
          removeMessageById(thinkingMessage.id);
        }
        console.error('❌ Tutor response failed:', err);
        await addMessage({
          type: 'error',
          content: `❌ ${t?.('chat.tutorError') ?? "I'm having trouble responding right now. Please try again in a moment."}`,
          sender: 'ai',
        });
      }
    },
    [addMessage, curriculum, learningContext, removeMessageById, updateMessage],
  );

  const startLesson = useCallback(
    async (subject: CurriculumSubject, t?: (key: string, params?: any) => string) => {
      if (!curriculum || curriculum.subjects.length === 0) {
        return;
      }

      const topicsForSubject = curriculum.topics?.[subject.slug] ?? [];
      if (topicsForSubject.length === 0) {
        await addMessage({
          type: 'status',
          content: `Topics for ${subject.name} are still loading. Try again soon!`,
          sender: 'ai',
        });
        return;
      }

      await addMessage({
        type: 'status',
        content: t
          ? t('chat.startingLesson', { subject: subject.name })
          : `▶️ Creating a personalized path for ${subject.name}...`,
        sender: 'ai',
      });

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const firstTopic = topicsForSubject[0] ?? subject.name;
      const topicIndex = Math.max(0, topicsForSubject.indexOf(firstTopic));
      const totalTopics = Math.max(topicsForSubject.length, 1);

      setNextSubject(null);
      nextSubjectRef.current = null;

      const lessonRequest: LessonRequest = {
        country: curriculum.country,
        language: curriculum.language,
        gradeLevel: curriculum.gradeLevel,
        subject: subject.name,
        topic: firstTopic,
        topicIndex,
        totalTopics,
      };

      setLearningContext({
        subject,
        topic: firstTopic,
        relatedTopics: topicsForSubject.filter((topic) => topic !== firstTopic).slice(0, 3),
      });

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
          sender: 'ai',
        });
      }
    },
    [addMessage, curriculum, setLearningContext],
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
        sender: 'ai',
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
      clearPendingMessages();
      const { subjects: preferredSubjects } = normalizeSubjectList(
        (request.subjects ?? []).map((subject) => subject.trim()).filter(Boolean),
      );
      setCurriculum({
        id: 'current',
        country: request.country || '',
        language: request.language || '',
        gradeLevel: (request as any).gradeLevel || '',
        subjects: preferredSubjects,
        topics: {},
        activeSession: undefined,
        assessment: {
          nextSubject: preferredSubjects[0]?.slug ?? null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      messagesRef.current = [];
      setMessages([]);
      const initialSubject = preferredSubjects[0] ?? null;
      setNextSubject(initialSubject);
      nextSubjectRef.current = initialSubject;
      setLearningContext({
        subject: initialSubject,
        topic: null,
        relatedTopics: [],
      });

      // Clear chat history in IndexedDB
      await clearChatHistory();

      // Generate new curriculum (will clear DB after success)
      await generate(request, t);

      // Delete old curriculum from IndexedDB only after successful generation
      if (!error) {
        await deleteCurriculum();
      }
    },
    [generate, clearPendingMessages, error, setLearningContext]
  );

  return {
    messages,
    curriculum,
    isGenerating,
     isPrimingLesson,
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
    learningContext,
    setLearningContext,
  };
}

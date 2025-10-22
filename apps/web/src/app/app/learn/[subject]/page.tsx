'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getUserProfile } from '@/lib/user-storage';
import { useDashboardContext } from '../dashboard-context';
import { loadTopicProgress, saveTopicProgress, type TopicStatus } from '@/lib/topic-progress';
import { getCachedLesson, setCachedLesson } from '@/lib/lesson-cache';
import { streamLessonSession, type LessonResponse, type LessonStreamPhase } from '@/lib/curriculum-api';

const PHASE_MESSAGES: Record<LessonStreamPhase, string> = {
  initializing: 'Preparing lesson…',
  generating_slides: 'Designing lesson structure…',
  slides_ready: 'Slides ready. Finishing touches…',
  generating_practice: 'Crafting practice question…',
  complete: 'Lesson ready!',
  error: 'We hit a snag. Please try again.',
};

const FALLBACK_LESSON_ERROR = 'We couldn’t generate this lesson right now. Please try again.';

const resolvePhaseMessage = (phase?: LessonStreamPhase, provided?: string | null): string => {
  if (provided && provided.trim().length > 0) {
    return provided;
  }
  if (phase && PHASE_MESSAGES[phase]) {
    return PHASE_MESSAGES[phase];
  }
  return 'Creating lesson…';
};

const formatErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    const trimmed = err.message.trim();
    if (trimmed.length > 0) {
      const normalized = trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
      return `${FALLBACK_LESSON_ERROR} (${normalized})`;
    }
  }
  return FALLBACK_LESSON_ERROR;
};

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const userProfile = getUserProfile();
  const { curriculum, setLearningContext } = useDashboardContext();

  const subjectSlug = params?.subject as string ?? '';

  const subject = useMemo(() => {
    if (!curriculum?.subjects) {
      return null;
    }
    const decoded = decodeURIComponent(subjectSlug);
    return (
      curriculum.subjects.find((item) => item.slug === decoded) ??
      curriculum.subjects.find((item) => item.slug === subjectSlug) ??
      curriculum.subjects.find((item) => item.name === decoded) ??
      null
    );
  }, [curriculum?.subjects, subjectSlug]);

  const subjectName = subject?.name ?? decodeURIComponent(subjectSlug);
  const subjectKey = subject?.slug ?? decodeURIComponent(subjectSlug);

  const topics = useMemo(() => {
    if (!curriculum?.topics) {
      return [];
    }
    return curriculum.topics[subjectKey] ?? curriculum.topics[subjectName] ?? [];
  }, [curriculum?.topics, subjectKey, subjectName]);

  const [topicStatuses, setTopicStatuses] = useState<TopicStatus[]>(() => []);
  const [topicErrors, setTopicErrors] = useState<Record<number, string>>({});
  const [topicPhases, setTopicPhases] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  const showToast = (message: string, tone: 'error' | 'success' = 'error') => {
    setToast({ id: Date.now(), message, tone });
  };

  useEffect(() => {
    const stored = loadTopicProgress(subjectKey, topics.length || 5, subjectName);
    const normalized: TopicStatus[] = topics.map((_, index) => {
      const existingStatus = stored[index];
      if (existingStatus === 'generated' || existingStatus === 'generating') {
        return existingStatus;
      }
      const cached = getCachedLesson(subjectKey, index, subjectName);
      return cached ? 'generated' : existingStatus ?? 'not-generated';
    });
    setTopicStatuses(normalized);
    setTopicErrors({});
    setTopicPhases({});
  }, [subjectKey, subjectName, topics]);

  useEffect(() => {
    if (!subjectKey) {
      setLearningContext({ subject: null, topic: null, relatedTopics: [] });
      return;
    }

    setLearningContext({
      subject,
      topic: null,
      relatedTopics: topics.slice(0, 3),
    });

    return () => {
      setLearningContext({ subject: null, topic: null, relatedTopics: [] });
    };
  }, [setLearningContext, subject, topics]);

  const handleTopicClick = async (topicIndex: number) => {
    if (!userProfile || !curriculum) return;

    const topic = topics[topicIndex];
    if (!topic) return;

    // Check if already generated (in cache)
    const cached = getCachedLesson(subjectKey, topicIndex, subjectName);
    if (cached) {
      setTopicStatuses((prev) => {
        const next = [...prev];
        next[topicIndex] = 'generated';
        saveTopicProgress(subjectKey, next, subjectName);
        return next;
      });
      setTopicErrors((prev) => {
        if (!prev[topicIndex]) {
          return prev;
        }
        const next = { ...prev };
        delete next[topicIndex];
        return next;
      });
      setTopicPhases((prev) => {
        if (!prev[topicIndex]) {
          return prev;
        }
        const next = { ...prev };
        delete next[topicIndex];
        return next;
      });
      setLearningContext({
        subject,
        topic,
        relatedTopics: topics.filter((item) => item !== topic).slice(0, 3),
      });
      router.push(`/app/learn/${encodeURIComponent(subjectKey)}/lesson/${topicIndex}`);
      return;
    }

    setTopicErrors((prev) => {
      if (!prev[topicIndex]) {
        return prev;
      }
      const next = { ...prev };
      delete next[topicIndex];
      return next;
    });

    setTopicPhases((prev) => ({
      ...prev,
      [topicIndex]: PHASE_MESSAGES.initializing,
    }));

    setTopicStatuses((prev) => {
      const next = [...prev];
      next[topicIndex] = 'generating';
      saveTopicProgress(subjectKey, next, subjectName);
      return next;
    });

    const lessonRequest = {
      country: curriculum.country,
      language: curriculum.language,
      gradeLevel: curriculum.gradeLevel,
      subject: subjectName,
      topic,
      topicIndex,
      totalTopics: topics.length,
    };

    try {
      let streamCompleted = false;
      let lessonResponse: LessonResponse | null = null;

      for await (const event of streamLessonSession(lessonRequest)) {
        if (event.type === 'status') {
          const message = resolvePhaseMessage(event.phase, event.message ?? null);
          setTopicPhases((prev) => ({
            ...prev,
            [topicIndex]: message,
          }));
        } else if (event.type === 'error') {
          throw new Error(event.message || FALLBACK_LESSON_ERROR);
        } else if (event.type === 'complete') {
          lessonResponse = event.payload ?? null;
          streamCompleted = true;
          break;
        }
      }

      if (!streamCompleted || !lessonResponse) {
        throw new Error('Lesson stream ended unexpectedly.');
      }

      setCachedLesson(subjectKey, topicIndex, {
        subjectSlug: subjectKey,
        subjectName,
        topic,
        topicIndex,
        lesson: lessonResponse.lesson,
        session: lessonResponse.session,
        savedAt: Date.now(),
      }, subjectName);

      setLearningContext({
        subject,
        topic,
        relatedTopics: topics.filter((item) => item !== topic).slice(0, 3),
      });

      setTopicStatuses((prev) => {
        const next = [...prev];
        next[topicIndex] = 'generated';
        saveTopicProgress(subjectKey, next, subjectName);
        return next;
      });

      setTopicPhases((prev) => {
        if (!prev[topicIndex]) {
          return prev;
        }
        const next = { ...prev };
        delete next[topicIndex];
        return next;
      });

      setTopicErrors((prev) => {
        if (!prev[topicIndex]) {
          return prev;
        }
        const next = { ...prev };
        delete next[topicIndex];
        return next;
      });

      router.push(`/app/learn/${encodeURIComponent(subjectKey)}/lesson/${topicIndex}`);
    } catch (error) {
      console.error('Failed to generate lesson:', error);
      const errorMessage = formatErrorMessage(error);

      setTopicStatuses((prev) => {
        const next = [...prev];
        next[topicIndex] = 'error';
        saveTopicProgress(subjectKey, next, subjectName);
        return next;
      });

      setTopicPhases((prev) => ({
        ...prev,
        [topicIndex]: PHASE_MESSAGES.error,
      }));

      setTopicErrors((prev) => ({
        ...prev,
        [topicIndex]: errorMessage,
      }));

      showToast(FALLBACK_LESSON_ERROR, 'error');
    }
  };

  const generatedCount = topicStatuses.filter((s) => s === 'generated').length;

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/app/learn')}
          className="text-sm text-sky-600 hover:text-sky-700 mb-4 flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span>📚</span>
          <span>{subjectName}</span>
        </h1>
        <p className="text-gray-600">Click any topic to generate and start your lesson</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{generatedCount}/{topics.length}</span>
        </div>
        <div className="w-full bg-sky-100 rounded-full h-3">
          <div
            className="bg-sky-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${topics.length > 0 ? (generatedCount / topics.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {topics.map((topic, index) => {
          const status = topicStatuses[index] || 'not-generated';
          const isGenerating = status === 'generating';
          const isGenerated = status === 'generated';
          const isError = status === 'error';
          const phaseMessage = topicPhases[index];
          const errorMessage = topicErrors[index];

          const cardClasses = [
            'rounded-xl border-2 transition-all overflow-hidden',
            isGenerated
              ? 'border-sky-200 bg-sky-50 hover:shadow-md'
              : isGenerating
              ? 'border-blue-200 bg-blue-50'
              : isError
              ? 'border-red-200 bg-red-50 hover:border-red-300'
              : 'border-gray-200 bg-white hover:border-sky-300 hover:shadow-md',
          ].join(' ');

          const statusIcon = isGenerated ? '✓' : isGenerating ? '⏳' : isError ? '⚠️' : '→';
          const statusText = isGenerated
            ? 'Ready to learn'
            : isGenerating
            ? phaseMessage ?? 'Creating lesson…'
            : isError
            ? 'We hit a snag. Check the details below.'
            : 'Click to generate lesson';

          return (
            <div key={topic} className={cardClasses}>
              <button
                type="button"
                onClick={() => handleTopicClick(index)}
                disabled={isGenerating}
                className="w-full text-left p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`text-2xl flex-shrink-0 ${isError ? 'text-red-500' : ''}`}>
                      {statusIcon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-base">
                        {index + 1}. {topic}
                      </p>
                      <p className={`mt-1 text-sm ${isError ? 'text-red-700' : 'text-gray-600'}`}>
                        {statusText}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
              {isError && errorMessage ? (
                <div className="mx-5 mb-5 mt-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>
                        <p className="font-medium">We hit a snag</p>
                        <p className="mt-1 leading-snug text-red-700">{errorMessage}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleTopicClick(index);
                      }}
                      className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {topics.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Topics are being generated...</p>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Guide</h3>
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">→</span>
            <span className="text-gray-600">Not generated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="text-gray-600">Generating...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span className="text-gray-600">Ready to learn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-red-600">⚠️</span>
            <span className="text-gray-600">Needs attention</span>
          </div>
        </div>
      </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-lg border px-4 py-3 shadow-xl transition-opacity ${
              toast.tone === 'error'
                ? 'border-red-200 bg-white text-red-700'
                : 'border-emerald-200 bg-white text-emerald-700'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getUserProfile } from '@/lib/user-storage';
import { useDashboardContext } from '../../../dashboard-context';
import { getCachedLesson, setCachedLesson } from '@/lib/lesson-cache';
import { completeTopic } from '@/lib/topic-progress';
import LessonContent from '@/components/LessonContent';
import type { LessonContentPayload } from '@/lib/curriculum-api';
import { fetchLesson } from '@/lib/curriculum-api';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { curriculum, setLearningContext } = useDashboardContext();

  const subjectSlugParam = params?.subject as string ?? '';
  const topicIndexStr = params?.topicIndex as string ?? '0';

  const subject = useMemo(() => {
    if (!curriculum?.subjects) {
      return null;
    }
    const decoded = decodeURIComponent(subjectSlugParam);
    return (
      curriculum.subjects.find((item) => item.slug === decoded) ??
      curriculum.subjects.find((item) => item.slug === subjectSlugParam) ??
      curriculum.subjects.find((item) => item.name === decoded) ??
      null
    );
  }, [curriculum?.subjects, subjectSlugParam]);

  const subjectName = subject?.name ?? decodeURIComponent(subjectSlugParam);
  const subjectKey = subject?.slug ?? decodeURIComponent(subjectSlugParam);
  const topicIndex = useMemo(() => parseInt(topicIndexStr, 10), [topicIndexStr]);

  const [hasUser, setHasUser] = useState(false);

  const [lesson, setLesson] = useState<LessonContentPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topics = useMemo(() => {
    if (!curriculum?.topics) {
      return [];
    }
    return curriculum.topics[subjectKey] ?? curriculum.topics[subjectName] ?? [];
  }, [curriculum?.topics, subjectKey, subjectName]);

  const topic = topics[topicIndex] || '';

  useEffect(() => {
    if (!subjectKey) {
      setLearningContext({ subject: null, topic: null, relatedTopics: [] });
      return;
    }

    setLearningContext({
      subject,
      topic: topic || null,
      relatedTopics: topics.filter((item) => item !== topic).slice(0, 3),
    });

    return () => {
      setLearningContext({ subject: null, topic: null, relatedTopics: [] });
    };
  }, [subject, subjectKey, topic, topics, setLearningContext]);

  useEffect(() => {
    const profile = getUserProfile();
    setHasUser(!!profile);
  }, []);

  useEffect(() => {
    async function ensureLesson() {
      if (!hasUser) {
        return;
      }

      setIsLoading(true);

      try {
        const cached = getCachedLesson(subjectKey, topicIndex, subjectName);
        if (cached) {
          setLesson(cached.lesson);
          setError(null);
          return;
        }

        if (!curriculum) {
          setLesson(null);
          setError('Lesson not found in cache. Return to dashboard to regenerate it.');
          return;
        }

        if (!topic) {
          setLesson(null);
          setError('Topic details are missing. Return to the subject overview and try again.');
          return;
        }

        const response = await fetchLesson({
          country: curriculum.country,
          language: curriculum.language,
          gradeLevel: curriculum.gradeLevel,
          subject: subjectName,
          topic,
          topicIndex,
          totalTopics: topics.length || 1,
        });

        setLesson(response.lesson);
        setError(null);

        setCachedLesson(subjectKey, topicIndex, {
          subjectSlug: subjectKey,
          subjectName,
          topic,
          topicIndex,
          lesson: response.lesson,
          session: response.session,
          savedAt: Date.now(),
        }, subjectName);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load lesson';
        setLesson(null);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void ensureLesson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum, hasUser, subjectName, topicIndex, topic, topics]);

  const handleBack = () => {
    router.push(`/app/learn/${encodeURIComponent(subjectKey)}`);
  };

  const handleComplete = () => {
    completeTopic(subjectKey, topicIndex, topics.length, subjectName);
    router.push(`/app/learn/${encodeURIComponent(subjectKey)}`);
  };

  if (!hasUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
      >
        ← Back to {subjectName}
      </button>

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading lesson...</h2>
          <p className="text-gray-600">{topic}</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-800">
          <h2 className="text-lg font-semibold mb-2">Could not load lesson</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={handleBack}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700"
          >
            Back to Topics
          </button>
        </div>
      )}

      {!isLoading && !error && lesson && (
        <LessonContent
          lesson={lesson}
          subject={subjectName}
          topicIndex={topicIndex}
          totalTopics={topics.length}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

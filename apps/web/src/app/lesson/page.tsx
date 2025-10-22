'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LessonContent from '@/components/LessonContent';
import { fetchLesson, type LessonContentPayload } from '@/lib/curriculum-api';
import { completeTopic } from '@/lib/topic-progress';

export default function LessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lesson, setLesson] = useState<LessonContentPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const country = searchParams?.get('country') ?? '';
  const language = searchParams?.get('language') ?? '';
  const grade = searchParams?.get('grade') ?? '';
  const subjectSlug = searchParams?.get('subject') ?? '';
  const subjectNameParam = searchParams?.get('subjectName') ?? '';
  const topic = searchParams?.get('topic') ?? '';
  const topicIndex = Number.parseInt(searchParams?.get('index') ?? '0', 10);
  const totalTopics = Number.parseInt(searchParams?.get('totalTopics') ?? '1', 10);

  const subjectKey = useMemo(() => decodeURIComponent(subjectSlug), [subjectSlug]);
  const sanitizedSubject = useMemo(() => {
    const source = subjectNameParam || subjectSlug;
    return decodeURIComponent(source);
  }, [subjectNameParam, subjectSlug]);
  const sanitizedTopic = useMemo(() => decodeURIComponent(topic), [topic]);
  const normalizedIndex = Number.isNaN(topicIndex) ? 0 : topicIndex;
  const normalizedTotal = Number.isNaN(totalTopics) ? 1 : Math.max(1, totalTopics);

  useEffect(() => {
    const missing = [country, language, sanitizedSubject, sanitizedTopic].some((value) => !value);
    if (missing) {
      setError('Missing lesson details. Please return to topics and try again.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadLesson() {
      try {
        const response = await fetchLesson({
          country,
          language,
          gradeLevel: grade || undefined,
          subject: sanitizedSubject,
          topic: sanitizedTopic,
          topicIndex: normalizedIndex,
          totalTopics: normalizedTotal,
        });

        if (!isMounted) {
          return;
        }

        setLesson(response.lesson);
        setError(null);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load lesson';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLesson();

    return () => {
      isMounted = false;
    };
  }, [country, language, grade, normalizedIndex, normalizedTotal, sanitizedSubject, sanitizedTopic]);

  const handleBack = () => {
    router.back();
  };

  const handleComplete = () => {
    completeTopic(subjectKey || sanitizedSubject, normalizedIndex, normalizedTotal, sanitizedSubject);
    router.push(`/app/learn/${encodeURIComponent(subjectKey || sanitizedSubject)}`);
  };

  const renderLoading = () => (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <div className="text-5xl mb-4">🧠</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Creating your lesson...</h2>
      <p className="text-gray-600">{sanitizedTopic}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ← Back to Topics
        </button>

        {isLoading && renderLoading()}

        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            <h2 className="text-lg font-semibold mb-2">We could not load this lesson</h2>
            <p className="text-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/app/learn')}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Return to dashboard
            </button>
          </div>
        )}

        {!isLoading && !error && lesson && (
          <LessonContent
            lesson={lesson}
            subject={sanitizedSubject}
            topicIndex={normalizedIndex}
            totalTopics={normalizedTotal}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}

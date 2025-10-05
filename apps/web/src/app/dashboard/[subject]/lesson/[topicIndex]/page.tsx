'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getUserProfile } from '@/lib/user-storage';
import { useDashboardContext } from '../../../dashboard-context';
import { getCachedLesson } from '@/lib/lesson-cache';
import { completeTopic } from '@/lib/topic-progress';
import LessonContent from '@/components/LessonContent';
import type { LessonContentPayload } from '@/lib/curriculum-api';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { curriculum } = useDashboardContext();

  const subjectSlug = params?.subject as string ?? '';
  const topicIndexStr = params?.topicIndex as string ?? '0';

  const subjectName = useMemo(() => decodeURIComponent(subjectSlug), [subjectSlug]);
  const topicIndex = useMemo(() => parseInt(topicIndexStr, 10), [topicIndexStr]);

  const [hasUser, setHasUser] = useState(false);

  const [lesson, setLesson] = useState<LessonContentPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topics = useMemo(() => {
    return curriculum?.topics?.[subjectName] || [];
  }, [curriculum?.topics, subjectName]);

  const topic = topics[topicIndex] || '';

  useEffect(() => {
    const profile = getUserProfile();
    setHasUser(!!profile);
  }, []);

  useEffect(() => {
    if (!hasUser) {
      return;
    }

    // Load from cache
    const cached = getCachedLesson(subjectName, topicIndex);
    if (cached) {
      setLesson(cached.lesson);
      setError(null);
      setIsLoading(false);
    } else {
      setLesson(null);
      setError('Lesson not found. Please generate it first.');
      setIsLoading(false);
    }
  }, [subjectName, topicIndex, hasUser]);

  const handleBack = () => {
    router.push(`/dashboard/${encodeURIComponent(subjectName)}`);
  };

  const handleComplete = () => {
    completeTopic(subjectName, topicIndex, topics.length);
    router.push(`/dashboard/${encodeURIComponent(subjectName)}`);
  };

  if (!hasUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
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
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700"
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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TopicCard from '@/components/TopicCard';
import { getCurriculum } from '@/lib/curriculum-db';
import {
  loadTopicProgress,
  saveTopicProgress,
  type TopicStatus,
} from '@/lib/topic-progress';

interface SubjectParams {
  subject: string;
  [key: string]: string | string[];
}

export default function SubjectTopicsPage() {
  const router = useRouter();
  const params = useParams<SubjectParams>();
  const searchParams = useSearchParams();

  const subjectSlugParam = params?.subject ?? '';

  const [subjectKey, subjectName] = useMemo(() => {
    const decoded = decodeURIComponent(subjectSlugParam);
    return [decoded, decoded];
  }, [subjectSlugParam]);

  const queryCountry = searchParams?.get('country') ?? '';
  const queryLanguage = searchParams?.get('language') ?? '';
  const queryGrade = searchParams?.get('grade') ?? '';

  const [resolvedSubjectKey, setResolvedSubjectKey] = useState(subjectKey);
  const [resolvedSubjectName, setResolvedSubjectName] = useState(subjectName);
  const [topics, setTopics] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TopicStatus[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [loadingTopicIndex, setLoadingTopicIndex] = useState<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const [country, setCountry] = useState(queryCountry);
  const [language, setLanguage] = useState(queryLanguage);
  const [grade, setGrade] = useState(queryGrade);

  useEffect(() => {
    let isMounted = true;

    async function loadCurriculum() {
      try {
        const curriculum = await getCurriculum();

        if (!isMounted) {
          return;
        }

        const subject = curriculum?.subjects?.find((item) => item.slug === subjectKey || item.name === subjectName) ?? null;
        const effectiveSlug = subject?.slug ?? subjectKey;
        const effectiveName = subject?.name ?? subjectName;
        const subjectTopics = curriculum?.topics?.[effectiveSlug] ?? curriculum?.topics?.[effectiveName] ?? [];
        setTopics(subjectTopics);
        setResolvedSubjectKey(effectiveSlug);
        setResolvedSubjectName(effectiveName);

        const initialStatuses = loadTopicProgress(effectiveSlug, subjectTopics.length || 5, effectiveName);
        setStatuses(initialStatuses);
        saveTopicProgress(effectiveSlug, initialStatuses, effectiveName);

        setCountry(queryCountry || curriculum?.country || '');
        setLanguage(queryLanguage || curriculum?.language || '');
        setGrade(queryGrade || curriculum?.gradeLevel || '');
      } catch (error) {
        console.warn('Failed to load curriculum for topics', error);
        setTopics([]);
        setStatuses([]);
      } finally {
        if (isMounted) {
          setIsLoadingTopics(false);
        }
      }
    }

    loadCurriculum();

    return () => {
      isMounted = false;
    };
  }, [subjectKey, subjectName, queryCountry, queryLanguage, queryGrade]);

  useEffect(() => {
    setLoadingTopicIndex(null);
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, [subjectName]);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleTopicSelect = (index: number, status: TopicStatus) => {
    if (status === 'locked') {
      return;
    }

    setLoadingTopicIndex(index);

    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
    }

    pendingTimeoutRef.current = window.setTimeout(() => {
      const topicName = topics[index] ?? `Topic ${index + 1}`;
      const params = new URLSearchParams({
        country,
        language,
        subject: resolvedSubjectKey,
        subjectName: resolvedSubjectName,
        topic: topicName,
        index: String(index),
        totalTopics: String(topics.length || 5),
      });

      if (grade) {
        params.set('grade', grade);
      }

      router.push(`/lesson?${params.toString()}`);
    }, 2000);
  };

  const renderLoading = (topicTitle?: string) => (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <div className="text-5xl mb-4">🧠</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Creating your lesson...</h2>
      <p className="text-gray-600">
        {topicTitle ? topicTitle : 'Just a moment'}
      </p>
    </div>
  );

  const showLoadingState = loadingTopicIndex !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ← Back
        </button>

        <header className="space-y-2">
          <p className="text-sm text-gray-500">Curriculum subject</p>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <span>📚</span>
            <span>{resolvedSubjectName}</span>
          </h1>
          <p className="text-gray-600">Choose a topic to start your lesson</p>
        </header>

        {isLoadingTopics && renderLoading()}

        {!isLoadingTopics && showLoadingState && renderLoading(topics[loadingTopicIndex ?? 0])}

        {!isLoadingTopics && !showLoadingState && (
          <div className="space-y-4">
            {topics.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-gray-600">Topics will appear here once your curriculum is ready.</p>
              </div>
            )}

            {topics.map((topic, index) => (
              <TopicCard
                key={`${resolvedSubjectKey}-topic-${index}`}
                index={index}
                title={topic}
                status={statuses[index] ?? (index === 0 ? 'unlocked' : 'locked')}
                onClick={() => handleTopicSelect(index, statuses[index] ?? 'locked')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

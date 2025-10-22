'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/lib/user-storage';
import { useI18n } from '@/lib/i18n-context';
import SubjectGrid from '@/components/SubjectGrid';
import { loadTopicProgress } from '@/lib/topic-progress';
import type { CurriculumSubject } from '@/lib/curriculum-db';
import CurriculumSetupCard from '@/components/CurriculumSetupCard';
import { useDashboardContext } from './dashboard-context';
import { resolveGradeLevelDescriptor } from '@/lib/grade-level';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const userProfile = getUserProfile();
  const gradeLevelDescriptor = userProfile
    ? resolveGradeLevelDescriptor({
        gradeLevel: userProfile.gradeLevel || userProfile.gradeLevelBand,
        schoolGrade: userProfile.schoolGrade,
        ageRange: userProfile.ageRange,
      })
    : null;

  const {
    curriculum,
    isGenerating,
    isPrimingLesson,
    error,
    regenerate,
    nextSubject,
    generate,
    setLearningContext,
  } = useDashboardContext();

  const handleRegenerate = () => {
    if (userProfile) {
      regenerate(
        {
          country: userProfile.country,
          language: userProfile.language,
          gradeLevel: gradeLevelDescriptor ?? 'middle school learners',
          subjects: userProfile.preferredSubjects,
        },
        t
      );
    }
  };

  const handleRetry = () => {
    if (userProfile) {
      generate(
        {
          country: userProfile.country,
          language: userProfile.language,
          gradeLevel: gradeLevelDescriptor ?? 'middle school learners',
          subjects: userProfile.preferredSubjects,
        },
        t
      );
    }
  };

  const handleSubjectSelect = (subject: CurriculumSubject) => {
    if (!userProfile) {
      return;
    }

    router.push(`/app/learn/${encodeURIComponent(subject.slug)}`);
  };

  const activeSessionSubject: CurriculumSubject | null = useMemo(() => {
    if (!curriculum?.activeSession?.subject || !curriculum?.subjects) {
      return null;
    }
    return (
      curriculum.subjects.find((subject) => subject.name === curriculum.activeSession?.subject) ?? null
    );
  }, [curriculum?.activeSession?.subject, curriculum?.subjects]);

  const highlightedSubject: CurriculumSubject | null =
    nextSubject ?? activeSessionSubject ?? curriculum?.subjects[0] ?? null;

  const highlightedTopics = useMemo(() => {
    if (!highlightedSubject) {
      return [];
    }
    return curriculum?.topics?.[highlightedSubject.slug] ?? [];
  }, [highlightedSubject?.slug, curriculum?.topics]);

  const highlightedStatuses = highlightedSubject
    ? loadTopicProgress(highlightedSubject.slug, highlightedTopics.length, highlightedSubject.name)
    : [];

  const highlightedCompleted = highlightedStatuses.filter(
    (status) => status === 'generated' || status === 'completed',
  ).length;

  const highlightedProgress =
    highlightedTopics.length > 0
      ? Math.round((highlightedCompleted / highlightedTopics.length) * 100)
      : 0;

  const activeSession = curriculum?.activeSession;
  const activeLessonIsHighlighted =
    Boolean(activeSession?.subject) && activeSession.subject === highlightedSubject?.name;
  const nextTopic =
    (activeLessonIsHighlighted && activeSession?.topic) || highlightedTopics[0] || null;
  const nextLessonTitle =
    (activeLessonIsHighlighted && activeSession?.practice?.question) || null;
  const canStartHighlightedLesson =
    Boolean(highlightedSubject) &&
    !isGenerating &&
    (highlightedTopics.length > 0 || activeLessonIsHighlighted);

  const handleStartHighlightedLesson = () => {
    if (!highlightedSubject || isGenerating) {
      return;
    }

    const encodedSlug = encodeURIComponent(highlightedSubject.slug);

    if (activeLessonIsHighlighted && typeof activeSession?.topicIndex === 'number') {
      router.push(`/app/learn/${encodedSlug}/lesson/${activeSession.topicIndex}`);
      return;
    }

    if (highlightedTopics.length > 0) {
      router.push(`/app/learn/${encodedSlug}/lesson/0`);
    } else {
      router.push(`/app/learn/${encodedSlug}`);
    }
  };

  useEffect(() => {
    if (isGenerating) {
      return;
    }

    if (!highlightedSubject) {
      setLearningContext({ subject: null, topic: null, relatedTopics: [] });
      return;
    }

    setLearningContext({
      subject: highlightedSubject,
      topic: nextTopic,
      relatedTopics: highlightedTopics.filter((topic) => topic !== nextTopic).slice(0, 3),
    });
  }, [highlightedSubject, highlightedTopics, nextTopic, isGenerating, setLearningContext]);

  if (!userProfile) {
    return null;
  }

  const headerSection = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            {t('dashboard.welcome')}
          </h1>
        </div>
      </div>
    </div>
  );

  const errorAlert = error ? (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="font-medium">{t('dashboard.errorGenerating')}</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isGenerating}
          className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('dashboard.tryAgain')}
        </button>
      </div>
    </div>
  ) : null;

  if (isGenerating) {
    return (
      <div className="space-y-8">
        {headerSection}
        {errorAlert}
        <CurriculumSetupCard
          curriculum={curriculum}
          isGenerating={isGenerating}
          nextSubject={nextSubject}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isPrimingLesson
                  ? t('dashboard.preparingFirstLesson')
                  : t('dashboard.generatingCurriculum')}
              </p>
              <p className="text-sm text-slate-500">
                {isPrimingLesson
                  ? t('dashboard.preparingFirstLessonDescription')
                  : t('dashboard.generatingCurriculumDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {headerSection}
      {errorAlert}

      {highlightedSubject ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-600 to-indigo-600 p-8 text-white shadow-xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-6 md:w-2/3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-sky-100 uppercase tracking-wide">
                    {t('dashboard.weeksFocus')}
                  </p>
                  <h2 className="text-3xl font-bold md:text-4xl">{highlightedSubject.name}</h2>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <button
                    type="button"
                    onClick={handleStartHighlightedLesson}
                    disabled={!canStartHighlightedLesson}
                    className="w-full text-left rounded-xl bg-white/5 p-4 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <p className="text-xs font-semibold uppercase text-sky-100">
                      {t('dashboard.nextUp')}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white underline-offset-2 hover:underline">
                      {nextTopic ?? t('dashboard.topicsComingSoon')}
                    </h3>
                  </button>
                  {nextLessonTitle && (
                    <p className="mt-3 text-sm text-sky-100">{nextLessonTitle}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleStartHighlightedLesson}
                    disabled={!canStartHighlightedLesson}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-sky-200"
                  >
                    <span>
                      {activeLessonIsHighlighted && activeSession?.phase !== 'complete'
                        ? t('dashboard.continueLesson')
                        : t('dashboard.startLesson')}
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl bg-white/10 p-6 text-sky-100 md:min-w-[220px]">
                <div>
                  <p className="text-xs font-medium uppercase text-sky-200">
                    {t('dashboard.totalTopics')}
                  </p>
                  <p className="text-3xl font-bold text-white">{highlightedTopics.length}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-sky-200">
                    {t('dashboard.weeklyProgress')}
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/20">
                    <div
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${highlightedProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">
                    {t('dashboard.lessonsCompleted', {
                      completed: highlightedCompleted,
                      total: highlightedTopics.length || 0,
                    })}
                  </p>
                </div>

                {highlightedTopics.length > 1 && (
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-semibold uppercase text-sky-200">
                      {t('dashboard.comingUp')}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-white/90">
                      {highlightedTopics.slice(1, 4).map((topic) => (
                        <li key={topic}>• {topic}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t('dashboard.allSubjects')}
            </h2>
            <p className="text-sm text-slate-500">{t('dashboard.clickToStart')}</p>
          </div>

        </div>

        <SubjectGrid
          curriculum={curriculum}
          isGenerating={isGenerating}
          recommendedSubject={highlightedSubject}
          onSubjectSelect={handleSubjectSelect}
        />
      </div>
    </div>
  );
}

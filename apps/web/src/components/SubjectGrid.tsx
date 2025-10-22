'use client';

import { type CurriculumData, type CurriculumSubject } from '@/lib/curriculum-db';
import { useI18n } from '@/lib/i18n-context';
import { loadTopicProgress } from '@/lib/topic-progress';
import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';

interface SubjectGridProps {
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  recommendedSubject?: CurriculumSubject | null;
  onSubjectSelect?: (subject: CurriculumSubject) => void;
}

const COMPLETED_STATUSES = new Set(['generated', 'completed']);

export default function SubjectGrid({
  curriculum,
  isGenerating,
  recommendedSubject,
  onSubjectSelect,
}: SubjectGridProps) {
  const { t } = useI18n();

  // Calculate progress for each subject based on generated lessons
  const subjectsToRender = useMemo(() => {
    if (!curriculum) {
      return [];
    }

    const recommendedSlug = recommendedSubject?.slug ?? null;
    return curriculum.subjects.filter((subject) => subject.slug !== recommendedSlug);
  }, [curriculum, recommendedSubject]);

  if (!curriculum || curriculum.subjects.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        {isGenerating ? (
          <>
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('dashboard.generatingCurriculum')}
            </h3>
            <p className="text-gray-600">
              {t('dashboard.watchChat')}
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.noSubjectsYet')}</h3>
            <p className="text-gray-600">
              {t('dashboard.willGenerateCurriculum')}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjectsToRender.map((subject) => {
          const topics = curriculum.topics?.[subject.slug] || [];
          const topicStatuses = loadTopicProgress(subject.slug, topics.length, subject.name);
          const completedTopics = topicStatuses.filter((status) => COMPLETED_STATUSES.has(status)).length;
          const totalTopics = topics.length;
          const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
          const canStartLesson = Boolean(onSubjectSelect) && !isGenerating;

          return (
            <button
              key={subject.slug}
              type="button"
              onClick={() => {
                if (canStartLesson) {
                  onSubjectSelect?.(subject);
                }
              }}
              disabled={!canStartLesson}
              className={`relative flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-lg ${canStartLesson ? 'cursor-pointer' : 'cursor-default opacity-90'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{subject.name}</h3>
                    <p className="text-sm text-slate-500">
                      {totalTopics > 0 ? `${totalTopics} ${t('dashboard.topics')}` : t('dashboard.topicsLoading')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2 text-sm">
                  {topics.slice(0, 3).map((topic, index) => {
                    const status = topicStatuses[index] ?? 'not-generated';
                    const isComplete = COMPLETED_STATUSES.has(status);
                    return (
                      <div key={topic} className="flex items-center gap-2 text-left">
                        <span
                          className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                        >
                          &nbsp;
                        </span>
                        <span className={`text-slate-600 ${isComplete ? 'font-medium text-slate-800' : ''}`}>
                          {topic}
                        </span>
                      </div>
                    );
                  })}

                  {topics.length > 3 && (
                    <span className="text-xs font-medium text-sky-600">{t('dashboard.moreTopics')}</span>
                  )}
                  {topics.length === 0 && (
                    <span className="text-xs text-slate-500">{t('dashboard.topicsComingSoon')}</span>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
                    style={{
                      background: `conic-gradient(#0ea5e9 ${progressPercent * 3.6}deg, #e2e8f0 ${progressPercent * 3.6}deg)`,
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                      {progressPercent}%
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-500">
                    {completedTopics}/{totalTopics || 0} {t('dashboard.topics')}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}

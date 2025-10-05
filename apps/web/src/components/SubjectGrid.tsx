'use client';

import { type CurriculumData } from '@/lib/curriculum-db';
import { useI18n } from '@/lib/i18n-context';
import { loadTopicProgress } from '@/lib/topic-progress';
import { useMemo } from 'react';

interface SubjectGridProps {
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  recommendedSubject?: string | null;
  onSubjectSelect?: (subject: string) => void;
}

const SUBJECT_GRADIENTS = [
  'from-teal-500 to-teal-600',
  'from-teal-500 to-teal-700',
  'from-teal-400 to-teal-600',
  'from-teal-600 to-teal-800',
];

const SUBJECT_ICONS = ['🔢', '🔬', '📚', '🌍', '🎨', '⚡', '🧪', '📖'];

export default function SubjectGrid({
  curriculum,
  isGenerating,
  onRegenerate,
  recommendedSubject,
  onSubjectSelect,
}: SubjectGridProps) {
  const { t } = useI18n();

  // Calculate progress for each subject based on generated lessons
  const subjectProgress = useMemo(() => {
    if (!curriculum) return {};

    const progress: Record<string, { generated: number; total: number }> = {};

    curriculum.subjects.forEach((subject) => {
      const topics = curriculum.topics?.[subject] || [];
      const statuses = loadTopicProgress(subject, topics.length);
      const generatedCount = statuses.filter((s) => s === 'generated').length;

      progress[subject] = {
        generated: generatedCount,
        total: topics.length,
      };
    });

    return progress;
  }, [curriculum]);

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
    <div className="space-y-4">
      {/* Regenerate Button */}
      <div className="flex justify-end">
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>🔄</span>
          <span>{t('dashboard.regenerateCurriculum')}</span>
        </button>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {curriculum.subjects.map((subject, index) => {
          const gradient = SUBJECT_GRADIENTS[index % SUBJECT_GRADIENTS.length];
          const icon = SUBJECT_ICONS[index % SUBJECT_ICONS.length];
          const topics = curriculum.topics?.[subject] || [];
          const topicCount = topics.length;
          const isNextSubject = subject === recommendedSubject;
          const activeSession = curriculum.activeSession;
          const isActiveSession =
            activeSession?.subject === subject && activeSession.phase !== 'complete';
          const isLessonComplete =
            activeSession?.subject === subject && activeSession.phase === 'complete';
          const canStartLesson = Boolean(onSubjectSelect) && !isGenerating;

          return (
            <button
              key={subject}
              type="button"
              onClick={() => {
                if (canStartLesson) {
                  onSubjectSelect?.(subject);
                }
              }}
              disabled={!canStartLesson}
              className={`bg-white rounded-xl p-6 text-left shadow-sm border transition-shadow ${
                isNextSubject
                  ? 'border-teal-200 shadow-lg shadow-teal-100/50'
                  : 'border-gray-200 hover:shadow-md'
              } ${canStartLesson ? 'cursor-pointer' : 'cursor-default opacity-95'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-2xl text-white`}
                  >
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{subject}</h3>
                    <p className="text-sm text-gray-500">
                      {topicCount > 0 ? `${topicCount} ${t('dashboard.topics')}` : t('dashboard.topicsLoading')}
                    </p>
                  </div>
                </div>
                {isActiveSession && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700">
                    <span>⚡</span>
                    <span>{t('dashboard.lessonInProgress')}</span>
                  </span>
                )}
                {!isActiveSession && isLessonComplete && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    <span>✓</span>
                    <span>{t('dashboard.lessonComplete')}</span>
                  </span>
                )}
                {!isActiveSession && !isLessonComplete && isNextSubject && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    <span>🎯</span>
                    <span>{t('dashboard.startLesson')}</span>
                  </span>
                )}
              </div>

              {/* Topics List */}
              {topics.length > 0 && (
                <div className="mb-4">
                  <div className="space-y-1">
                    {topics.map((topic, idx) => {
                      const topicStatuses = loadTopicProgress(subject, topics.length);
                      const topicStatus = topicStatuses[idx] || 'not-generated';
                      const isGenerated = topicStatus === 'generated' || topicStatus === 'completed';

                      return (
                        <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                          {isGenerated ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          )}
                          <span className={isGenerated ? 'text-gray-900 font-medium' : ''}>
                            {topic}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('dashboard.progress')}</span>
                  <span className="text-gray-900 font-medium">
                    {subjectProgress[subject]?.generated || 0}/{subjectProgress[subject]?.total || topicCount}
                  </span>
                </div>
                <div className="w-full bg-teal-100 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{
                      width: topicCount > 0
                        ? `${Math.min(100, ((subjectProgress[subject]?.generated || 0) / topicCount) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Study Plan Timeline Placeholder */}
      {curriculum.subjects.length > 0 && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">{t('dashboard.thisWeeksPlan')}</h3>
          <div className="text-center py-8 text-gray-500">
            <p>{t('dashboard.dailyPlanComingSoon')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

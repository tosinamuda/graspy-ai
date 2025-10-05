'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { type CurriculumData } from '@/lib/curriculum-db';

type SetupState = 'complete' | 'active' | 'pending';

interface SetupStep {
  key: 'generate' | 'diagnostic' | 'path' | 'session';
  title: string;
  description: string;
  state: SetupState;
  hint?: string;
}

interface CurriculumSetupCardProps {
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  nextSubject: string | null;
  className?: string;
}

const STATE_STYLES: Record<SetupState, { indicator: string; title: string; chip?: string }> = {
  complete: {
    indicator: 'bg-teal-600 text-white border-teal-600',
    title: 'text-gray-900',
    chip: 'bg-teal-100 text-teal-700',
  },
  active: {
    indicator: 'border-2 border-teal-600 text-teal-700',
    title: 'text-teal-700',
    chip: 'bg-teal-600 text-white',
  },
  pending: {
    indicator: 'border border-gray-300 text-gray-400',
    title: 'text-gray-500',
    chip: 'bg-gray-200 text-gray-600',
  },
};

export default function CurriculumSetupCard({
  curriculum,
  isGenerating,
  nextSubject,
  className,
}: CurriculumSetupCardProps) {
  const { t } = useI18n();

  const subjectEntries = useMemo(
    () =>
      (curriculum?.subjects ?? []).map((subject) => ({
        subject,
        topics: curriculum?.topics?.[subject] ?? [],
      })),
    [curriculum],
  );

  const steps = useMemo<SetupStep[]>(() => {
    const hasSubjects = subjectEntries.length > 0;
    const lessonPhase = curriculum?.activeSession?.phase;
    const hasLesson = Boolean(curriculum?.activeSession);

    const generateState: SetupState = isGenerating
      ? 'active'
      : hasSubjects
        ? 'complete'
        : 'pending';

    const pathState: SetupState = hasSubjects
      ? hasLesson
        ? lessonPhase === 'complete'
          ? 'complete'
          : 'active'
        : nextSubject
          ? 'active'
          : 'complete'
      : 'pending';

    const sessionState: SetupState = hasLesson
      ? lessonPhase === 'complete'
        ? 'complete'
        : 'active'
      : 'pending';

    return [
      {
        key: 'generate',
        title: t('dashboard.setup.generate'),
        description: t('dashboard.setup.generateDescription'),
        state: generateState,
        hint: subjectEntries.length > 0 ? t('dashboard.setup.subjectsReady', { count: subjectEntries.length }) : undefined,
      },
      {
        key: 'path',
        title: t('dashboard.setup.path'),
        description: t('dashboard.setup.pathDescription'),
        state: pathState,
        hint:
          hasLesson && lessonPhase === 'explanation'
            ? t('dashboard.setup.lessonReady')
            : nextSubject
              ? t('dashboard.startLesson')
              : undefined,
      },
      {
        key: 'session',
        title: t('dashboard.setup.session'),
        description: t('dashboard.setup.sessionDescription'),
        state: sessionState,
        hint:
          hasLesson && lessonPhase !== 'complete'
            ? t('dashboard.setup.lessonInProgress')
            : undefined,
      },
    ];
  }, [curriculum, isGenerating, nextSubject, subjectEntries.length, t]);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dashboard.setup.title')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('dashboard.setup.subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const styles = STATE_STYLES[step.state];
          return (
            <div
              key={step.key}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${styles.indicator}`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${styles.title}`}>{step.title}</h3>
                  {step.state !== 'pending' && styles.chip && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.chip}`}>
                      {step.state === 'complete'
                        ? t('dashboard.setup.complete')
                        : t('dashboard.setup.inProgress')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-snug">{step.description}</p>
                {step.hint && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-teal-50 px-2.5 py-1 text-[11px] text-teal-700">
                    <span>✨</span>
                    <span>{step.hint}</span>
                  </div>
                )}

                {step.key === 'generate' && subjectEntries.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {subjectEntries.map((entry) => (
                      <details
                        key={entry.subject}
                        className="group rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2"
                      >
                        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-medium text-teal-900 marker:content-none select-none">
                          <span className="truncate">{entry.subject}</span>
                          <span className="flex items-center gap-2 text-xs text-teal-700">
                            {t('dashboard.setup.topicsCount', { count: entry.topics.length })}
                            <span className="text-teal-600 transition-transform duration-200 group-open:rotate-180">
                              ▾
                            </span>
                          </span>
                        </summary>
                        {entry.topics.length > 0 && (
                          <ul className="mt-2 space-y-1 border-l border-teal-200 pl-3 text-xs text-teal-900">
                            {entry.topics.map((topic, idx) => (
                              <li key={`${entry.subject}-topic-${idx}`} className="leading-relaxed">
                                {topic}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

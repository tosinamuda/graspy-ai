'use client';

import { useMemo } from 'react';
import { type LearningSession } from '@/lib/curriculum-db';

interface LearningSessionCardProps {
  session: LearningSession | undefined;
  onContinue: () => void;
  onSubmitAnswer: (answerIndex: number) => void;
  onFinish: () => void;
}

export default function LearningSessionCard({
  session,
  onContinue,
  onSubmitAnswer,
  onFinish,
}: LearningSessionCardProps) {
  const answerOptions = useMemo(() => session?.practice.options ?? [], [session]);

  if (!session) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          <span>Lesson will start once diagnostic is ready.</span>
        </div>
      </div>
    );
  }

  const { subject, topic, topicIndex, totalTopics, phase, explanation, practice, isCorrect } = session;

  return (
    <div className="w-full rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-600">Current Lesson</p>
          <h3 className="text-lg font-semibold text-gray-900">
            {topic} <span className="text-sm text-gray-500">({topicIndex + 1}/{Math.max(totalTopics, 1)})</span>
          </h3>
          <p className="text-sm text-gray-600">Subject: {subject}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-semibold">
          📘
        </div>
      </div>

      {phase === 'explanation' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
            <p className="font-medium">What you need to know</p>
            <p className="mt-2 leading-relaxed text-teal-800">{explanation}</p>
            {session.metadata?.learningObjectives?.length ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Learning goals</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-teal-800">
                  {session.metadata.learningObjectives.map((objective, index) => (
                    <li key={`${session.id}-objective-${index}`}>{objective}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            onClick={onContinue}
          >
            Continue to quick practice
          </button>
        </div>
      )}

      {phase === 'practice' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
            <p className="font-medium">Quick check</p>
            <p className="mt-2 text-teal-800">{practice.question}</p>
          </div>
          <div className="space-y-2">
            {answerOptions.map((option, index) => (
              <button
                type="button"
                key={`${session.id}-option-${index}`}
                className="w-full rounded-lg border border-teal-200 px-3 py-2 text-left text-sm text-teal-900 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                onClick={() => onSubmitAnswer(index)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'feedback' && (
        <div className="space-y-4">
          <div
            className={`rounded-lg px-4 py-3 text-sm ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}
          >
            <p className="font-medium mb-2">{isCorrect ? 'Great job!' : 'Let’s review.'}</p>
            <p className="leading-relaxed">
              {isCorrect ? practice.correctFeedback : practice.incorrectFeedback}
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            onClick={onFinish}
          >
            Finish lesson
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
          <p className="font-medium">Lesson complete</p>
          <p className="mt-2 text-teal-800">Nice work! We’ll unlock the next topic soon.</p>
        </div>
      )}
    </div>
  );
}

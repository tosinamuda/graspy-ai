'use client';

import { useState } from 'react';
import type { LessonContentPayload } from '@/lib/curriculum-api';

interface LessonContentProps {
  lesson: LessonContentPayload;
  subject: string;
  topicIndex: number;
  totalTopics: number;
  onComplete?: () => void;
}

export default function LessonContent({
  lesson,
  subject,
  topicIndex,
  totalTopics,
  onComplete,
}: LessonContentProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(false);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;
    setShowFeedback(true);
  };

  const isCorrect = selectedAnswer === lesson.practice.answerIndex;
  const hasAnswered = selectedAnswer !== null;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-teal-600">{subject}</p>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span>📖</span>
          <span>{lesson.title}</span>
        </h1>
        <p className="text-sm text-gray-500">
          Topic {topicIndex + 1} of {Math.max(totalTopics, 1)}
        </p>
        <div className="w-full h-2 rounded-full bg-teal-100">
          <div
            className="h-2 rounded-full bg-teal-500 transition-all"
            style={{
              width: `${Math.min(100, ((topicIndex + 1) / Math.max(totalTopics, 1)) * 100)}%`,
            }}
          />
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">What is {lesson.title}?</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>

        {lesson.keyPoints.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Key strategies</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-sm text-gray-700">
              {lesson.keyPoints.map((point, index) => (
                <li key={`key-point-${index}`}>{point}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-teal-200 bg-teal-50 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-teal-900 uppercase tracking-wide">Quick practice</h3>
        <p className="text-teal-800 font-medium leading-relaxed">{lesson.practice.question}</p>

        <div className="space-y-2">
          {lesson.practice.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === lesson.practice.answerIndex;
            const showAsCorrect = showFeedback && isCorrectAnswer;
            const showAsIncorrect = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={`practice-option-${index}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                  showAsCorrect
                    ? 'border-green-500 bg-green-50'
                    : showAsIncorrect
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-teal-600 bg-teal-100'
                    : 'border-teal-200 bg-white hover:border-teal-400'
                } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    showAsCorrect
                      ? 'border-green-600 bg-green-600'
                      : showAsIncorrect
                      ? 'border-red-600 bg-red-600'
                      : isSelected
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-gray-300'
                  }`}>
                    {showAsCorrect && <span className="text-white text-sm">✓</span>}
                    {showAsIncorrect && <span className="text-white text-sm">✗</span>}
                    {!showFeedback && isSelected && <span className="text-white text-sm">●</span>}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700">{String.fromCharCode(65 + index)}. </span>
                    <span className="text-gray-900">{option}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!showFeedback && hasAnswered && (
          <button
            onClick={handleCheckAnswer}
            className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Check Answer
          </button>
        )}

        {showFeedback && (
          <div className={`rounded-lg p-4 ${
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p className={`text-sm ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? lesson.practice.correctFeedback : lesson.practice.incorrectFeedback}
            </p>
          </div>
        )}
      </section>

      <footer className="flex justify-end">
        <button
          type="button"
          onClick={onComplete}
          disabled={!showFeedback}
          className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
            showFeedback
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          ✓ Complete & Continue →
        </button>
      </footer>
    </div>
  );
}

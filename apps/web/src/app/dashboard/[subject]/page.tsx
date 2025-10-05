'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getUserProfile } from '@/lib/user-storage';
import { useI18n } from '@/lib/i18n-context';
import { useDashboardContext } from '../dashboard-context';
import { loadTopicProgress, saveTopicProgress, type TopicStatus } from '@/lib/topic-progress';
import { getCachedLesson, setCachedLesson } from '@/lib/lesson-cache';
import { fetchLesson } from '@/lib/curriculum-api';

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const userProfile = getUserProfile();
  const { curriculum } = useDashboardContext();

  const subjectSlug = params?.subject as string ?? '';
  const subjectName = useMemo(() => decodeURIComponent(subjectSlug), [subjectSlug]);

  const topics = useMemo(() => {
    return curriculum?.topics?.[subjectName] || [];
  }, [curriculum?.topics, subjectName]);

  const [topicStatuses, setTopicStatuses] = useState<TopicStatus[]>(() => {
    return loadTopicProgress(subjectName, topics.length || 5);
  });

  const handleTopicClick = async (topicIndex: number) => {
    if (!userProfile || !curriculum) return;

    const topic = topics[topicIndex];
    if (!topic) return;

    // Check if already generated (in cache)
    const cached = getCachedLesson(subjectName, topicIndex);
    if (cached) {
      // Navigate to lesson view
      router.push(`/dashboard/${encodeURIComponent(subjectName)}/lesson/${topicIndex}`);
      return;
    }

    // Mark as generating
    const updatedStatuses = [...topicStatuses];
    updatedStatuses[topicIndex] = 'generating';
    setTopicStatuses(updatedStatuses);
    saveTopicProgress(subjectName, updatedStatuses);

    try {
      // Generate lesson
      const lessonResponse = await fetchLesson({
        country: curriculum.country,
        language: curriculum.language,
        gradeLevel: curriculum.gradeLevel,
        subject: subjectName,
        topic,
        topicIndex,
        totalTopics: topics.length,
      });

      // Cache the lesson
      setCachedLesson(subjectName, topicIndex, {
        subject: subjectName,
        topic,
        topicIndex,
        lesson: lessonResponse.lesson,
        session: lessonResponse.session,
        savedAt: Date.now(),
      });

      // Mark as generated
      updatedStatuses[topicIndex] = 'generated';
      setTopicStatuses(updatedStatuses);
      saveTopicProgress(subjectName, updatedStatuses);

      // Navigate to lesson view
      router.push(`/dashboard/${encodeURIComponent(subjectName)}/lesson/${topicIndex}`);
    } catch (error) {
      console.error('Failed to generate lesson:', error);
      // Revert to not-generated on error
      updatedStatuses[topicIndex] = 'not-generated';
      setTopicStatuses(updatedStatuses);
      saveTopicProgress(subjectName, updatedStatuses);
      alert('Failed to generate lesson. Please try again.');
    }
  };

  const generatedCount = topicStatuses.filter((s) => s === 'generated').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-teal-600 hover:text-teal-700 mb-4 flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span>📚</span>
          <span>{subjectName}</span>
        </h1>
        <p className="text-gray-600">Click any topic to generate and start your lesson</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{generatedCount}/{topics.length}</span>
        </div>
        <div className="w-full bg-teal-100 rounded-full h-3">
          <div
            className="bg-teal-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${topics.length > 0 ? (generatedCount / topics.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {topics.map((topic, index) => {
          const status = topicStatuses[index] || 'not-generated';
          const isGenerating = status === 'generating';
          const isGenerated = status === 'generated';

          return (
            <button
              key={index}
              onClick={() => handleTopicClick(index)}
              disabled={isGenerating}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                isGenerated
                  ? 'border-teal-200 bg-teal-50 hover:shadow-md'
                  : isGenerating
                  ? 'border-blue-200 bg-blue-50 cursor-wait'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl flex-shrink-0">
                    {isGenerated ? '✓' : isGenerating ? '⏳' : '→'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-base">
                      {index + 1}. {topic}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {isGenerated
                        ? 'Ready to learn'
                        : isGenerating
                        ? 'Creating lesson...'
                        : 'Click to generate lesson'}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {topics.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Topics are being generated...</p>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Guide</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">→</span>
            <span className="text-gray-600">Not generated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="text-gray-600">Generating...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span className="text-gray-600">Ready to learn</span>
          </div>
        </div>
      </div>
    </div>
  );
}

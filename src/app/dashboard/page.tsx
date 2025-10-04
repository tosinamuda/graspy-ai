'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/lib/user-storage';
import { getCountryName, getLanguageInfo } from '@/lib/constants';
import { useI18n } from '@/lib/i18n-context';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Subject {
  id: string;
  name: string;
  icon: string;
  topicCount: number;
  completedTopics: number;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const profile = getUserProfile();
    if (!profile || !profile.onboardingCompleted) {
      router.push('/onboarding');
      return;
    }

    setUserProfile(profile);

    // Simulate loading curriculum (we'll implement AI generation later)
    setTimeout(() => {
      // Mock subjects - names will be translated by t()
      setSubjects([
        { id: '1', name: 'mathematics', icon: '🔢', topicCount: 12, completedTopics: 0, color: 'bg-blue-500' },
        { id: '2', name: 'science', icon: '🔬', topicCount: 10, completedTopics: 0, color: 'bg-green-500' },
        { id: '3', name: 'languageArts', icon: '📚', topicCount: 8, completedTopics: 0, color: 'bg-purple-500' },
        { id: '4', name: 'socialStudies', icon: '🌍', topicCount: 9, completedTopics: 0, color: 'bg-orange-500' },
      ]);
      setIsLoading(false);
    }, 3000);
  }, [router]);

  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Learning Plan (80%) */}
      <div className="w-4/5 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('dashboard.welcome')}
            </h1>
            <p className="text-gray-600">
              {t('dashboard.learningIn', {
                language: getLanguageInfo(userProfile.language).nativeName,
                country: getCountryName(userProfile.country),
              })}
            </p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Learning Plan Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('dashboard.yourLearningPlan')}</h2>

          {isLoading ? (
            // Skeleton Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="h-6 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Subject Cards
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${subject.color} rounded-lg flex items-center justify-center text-2xl`}>
                        {subject.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{t(`subjects.${subject.name}`)}</h3>
                        <p className="text-sm text-gray-500">{subject.topicCount} {t('dashboard.topics')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('dashboard.progress')}</span>
                      <span className="text-gray-900 font-medium">
                        {subject.completedTopics}/{subject.topicCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${subject.color} h-2 rounded-full transition-all`}
                        style={{
                          width: `${(subject.completedTopics / subject.topicCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Study Plan Timeline (Placeholder) */}
          {!isLoading && (
            <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">{t('dashboard.thisWeeksPlan')}</h3>
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                  <div key={day} className="flex items-center gap-4 text-sm">
                    <div className="w-24 font-medium text-gray-700">{day}</div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Math
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Science
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat with Graspy (20%) */}
      <div className="w-1/5 bg-white border-l border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              G
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('chat.graspyTitle')}</h3>
              <p className="text-xs text-gray-500">{t('chat.graspySubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            // Loading state - graspy is working
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700 mb-3">
                  {t('chat.creatingPlan')}
                </p>

                {/* Checklist */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{t('chat.analyzingProfile')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{t('chat.creatingSubjects')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500 animate-spin">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                    </div>
                    <span className="text-gray-700">{t('chat.generatingTopics')}</span>
                  </div>

                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                    <span className="text-gray-500">{t('chat.creatingDailyPlan')}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{t('dashboard.progress')}</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Ready state
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  {t('chat.planReady', {
                    subjectCount: subjects.length,
                    topicCount: subjects.reduce((acc, s) => acc + s.topicCount, 0),
                  })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  {t('dashboard.clickToStart')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input (Disabled during loading) */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('chat.askPlaceholder')}
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('chat.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

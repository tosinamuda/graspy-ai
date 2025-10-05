'use client';

import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/lib/user-storage';
import { getCountryName, getLanguageInfo } from '@/lib/constants';
import { useI18n } from '@/lib/i18n-context';
import SubjectGrid from '@/components/SubjectGrid';
import { useDashboardContext } from './dashboard-context';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const userProfile = getUserProfile();

  const {
    curriculum,
    isGenerating,
    error,
    regenerate,
    nextSubject,
  } = useDashboardContext();

  const handleRegenerate = () => {
    if (userProfile) {
      regenerate(
        {
          country: userProfile.country,
          language: userProfile.language,
          gradeLevel: userProfile.gradeLevel,
        },
        t
      );
    }
  };

  const handleSubjectSelect = (subject: string) => {
    if (!userProfile) {
      return;
    }

    router.push(`/dashboard/${encodeURIComponent(subject)}`);
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-medium">Error generating curriculum</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Learning Plan Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t('dashboard.yourLearningPlan')}
        </h2>

        <SubjectGrid
          curriculum={curriculum}
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
          recommendedSubject={nextSubject}
          onSubjectSelect={handleSubjectSelect}
        />
      </div>
    </div>
  );
}

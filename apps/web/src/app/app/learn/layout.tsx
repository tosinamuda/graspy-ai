'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/lib/user-storage';
import { useI18n } from '@/lib/i18n-context';
import TopMenu from '@/components/TopMenu';
import ChatPanel from '@/components/ChatPanel';
import { resolveGradeLevelDescriptor } from '@/lib/grade-level';
import { DashboardProvider, useDashboardContext } from './dashboard-context';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [autoGenerateAttempted, setAutoGenerateAttempted] = useState(false);

  const {
    messages,
    curriculum,
    isGenerating,
    isPrimingLesson,
    generate,
    loadExistingData,
    nextSubject,
    sendUserMessage,
    continueSession,
    submitSessionAnswer,
    finishSession,
    learningContext,
  } = useDashboardContext();

  useEffect(() => {
    // Check if user has completed onboarding
    const profile = getUserProfile();
    if (!profile || !profile.onboardingCompleted) {
      router.push('/app/onboarding');
      return;
    }

    setUserProfile(profile);

    // Load existing curriculum from IndexedDB
    loadExistingData().then(() => {
      setIsDataLoaded(true);
    });
  }, [router, loadExistingData]);

  // Auto-generate curriculum on first visit if no curriculum exists
  useEffect(() => {
    if (
      userProfile &&
      isDataLoaded &&
      !autoGenerateAttempted &&
      (!curriculum || curriculum.subjects.length === 0) &&
      !isGenerating
    ) {
      setAutoGenerateAttempted(true);
      const gradeLevelDescriptor = resolveGradeLevelDescriptor({
        gradeLevel: userProfile.gradeLevel || userProfile.gradeLevelBand,
        schoolGrade: userProfile.schoolGrade,
        ageRange: userProfile.ageRange,
      });

      generate(
        {
          country: userProfile.country,
          language: userProfile.language,
          gradeLevel: gradeLevelDescriptor,
          subjects: userProfile.preferredSubjects,
        },
        t
      );
    }
  }, [userProfile, isDataLoaded, curriculum, isGenerating, generate, t, autoGenerateAttempted]);

  const handleSendMessage = (message: string) => {
    void sendUserMessage(message, t);
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className="h-screen bg-sky-50 flex flex-col overflow-hidden">
      <TopMenu />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Dynamic Content */}
        <div className="w-[65%] p-6 overflow-y-auto h-full min-h-0">
          {children}
        </div>

        {/* Right Panel - Persistent Chat with Graspy */}
        <ChatPanel
          messages={messages}
          isGenerating={isGenerating}
          isPrimingLesson={isPrimingLesson}
          curriculum={curriculum}
          recommendedSubject={nextSubject}
          activeSession={curriculum?.activeSession}
          onLessonContinue={continueSession}
          onSubmitLessonAnswer={(answerIndex) => submitSessionAnswer(answerIndex, t)}
          onFinishLesson={finishSession}
          onSendMessage={handleSendMessage}
          learningContext={learningContext}
        />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}

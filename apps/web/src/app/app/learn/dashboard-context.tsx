/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCurriculumChat, type LearningContext } from '@/hooks/useCurriculumChat';
import type { CurriculumData, CurriculumSubject } from '@/lib/curriculum-db';
import type { CurriculumRequest } from '@/lib/curriculum-api';

interface DashboardContextValue {
  messages: any[];
  curriculum: CurriculumData | null;
  isGenerating: boolean;
  isPrimingLesson: boolean;
  error: string | null;
  generate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  regenerate: (request: CurriculumRequest, t?: (key: string, params?: any) => string) => Promise<void>;
  loadExistingData: () => Promise<void>;
  nextSubject: CurriculumSubject | null;
  sendUserMessage: (message: string, t?: (key: string, params?: any) => string) => Promise<void>;
  continueSession: () => Promise<void>;
  submitSessionAnswer: (answerIndex: number, t?: (key: string, params?: any) => string) => Promise<void>;
  finishSession: () => Promise<void>;
  learningContext: LearningContext;
  setLearningContext: (context: Partial<LearningContext>) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const curriculumChat = useCurriculumChat();

  return (
    <DashboardContext.Provider value={curriculumChat}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return context;
}

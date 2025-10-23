'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { detectLocale } from '@/lib/locale-detector';
import {
  getAllCountries,
  SUPPORTED_LANGUAGES,
  getCountryName,
  getLanguageInfo,
  CRISIS_ZONE_COUNTRIES,
  AGE_GROUP_OPTIONS,
  SUBJECT_OPTIONS,
  SCHOOL_GRADE_OPTIONS,
  type GradeLevelValue,
} from '@/lib/constants';
import { saveUserProfile, getUserProfile } from '@/lib/user-storage';
import { deleteCurriculum, saveCurriculum, type CurriculumSubject } from '@/lib/curriculum-db';
import { streamCurriculum, type CurriculumRequest } from '@/lib/curriculum-api';
import SearchableSelect from '@/components/SearchableSelect';
import { useI18n } from '@/lib/i18n-context';
import { createSlug } from '@/lib/slug';
import { resolveGradeLevelDescriptor } from '@/lib/grade-level';

type StepKey = 'location' | 'context' | 'gradeConfidence' | 'grade' | 'age' | 'subjects';

type EducationStatus = 'in_school' | 'out_of_school' | '';

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

type AgentLogEntry = {
  id: string;
  timestamp: string;
  label: string;
  payload: string;
};

type GeneratedSubject = {
  id: string;
  label: string;
  recommended: boolean;
};

const SUBJECT_SELECTION_LIMIT = 15;

const EDUCATION_OPTIONS: Array<{
  id: EducationStatus;
  title: string;
  description: string;
  icon: string;
}> = [
    {
      id: 'in_school',
      title: 'Yes, I attend school',
      description: 'Match lessons to my classroom level and keep me on track.',
      icon: '🏫',
    },
    {
      id: 'out_of_school',
      title: "No, I'm learning independently",
      description: 'Help me pick the right level and support my own learning path.',
      icon: '🌍',
    },
  ];

const GRADE_KNOWLEDGE_OPTIONS: Array<{
  id: 'knows' | 'needs_help';
  title: string;
  description: string;
  icon: string;
}> = [
    {
      id: 'knows',
      title: 'I know my grade level',
      description: 'Choose the grade or class that fits me best.',
      icon: '📘',
    },
    {
      id: 'needs_help',
      title: 'Help me choose',
      description: 'Use my age to pick a helpful starting point.',
      icon: '🧭',
    },
  ];

const STEP_TITLES: Record<StepKey, string> = {
  location: `Welcome! Let's set you up.`,
  context: 'Do you currently attend school?',
  gradeConfidence: 'Do you know your grade level?',
  grade: 'Which grade or class are you in?',
  age: 'How old are you or what fits your age group best?',
  subjects: 'Great! Pick what you want to learn first.',
};

const STEP_DESCRIPTIONS: Partial<Record<StepKey, string>> = {
  location: 'We use this data you share to personalize your learning.',
  context: 'This helps us personalize your learning journey.',
  gradeConfidence: `Either way, we'll guide you to the right place.`,
  grade: 'Choose the option that sounds most like your class today.',
  age: 'This helps us set the right starting point for you.',
  subjects: 'We pre-selected a few based on your level—add or change anything you like.',
};

type CompletionPhase = 'form' | 'generating' | 'ready';
type GenerationTimelineStep = 'analyzing' | 'generating' | 'personalizing';

interface GenerationStats {
  subjectCount: number;
  topicCount: number;
}

const GENERATION_STEP_SEQUENCE: GenerationTimelineStep[] = ['analyzing', 'generating', 'personalizing'];

const GENERATION_STEP_META: Record<GenerationTimelineStep, { label: string; description: string }> = {
  analyzing: {
    label: 'Analyzing your profile',
    description: 'Understanding your learning preferences and level',
  },
  generating: {
    label: 'Generating curricula',
    description: 'Building personalized lesson sequences',
  },
  personalizing: {
    label: 'Personalizing your path',
    description: 'Optimizing pacing and topic flow',
  },
};

function GenerationProgressView({
  subjects,
  step,
  error,
  onRetry,
  onBack,
  isRetrying,
}: {
  subjects: string[];
  step: GenerationTimelineStep;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
  isRetrying: boolean;
}) {
  const stepIndex = GENERATION_STEP_SEQUENCE.indexOf(step);
  const progressPercent = Math.round(((stepIndex + 1) / GENERATION_STEP_SEQUENCE.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900">Building your learning plan</h2>
          <p className="mt-2 text-base text-slate-600">Hang tight—your subjects are being tailored into a curriculum just for you.</p>
        </div>

        {subjects.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {subjects.map(subject => (
              <span key={subject} className="rounded-full bg-sky-100 px-4 py-1.5 text-sm font-medium text-sky-700">
                {subject}
              </span>
            ))}
          </div>
        )}

        <div className="mb-8">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full w-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-slate-500">{progressPercent}% complete</p>
        </div>

        <div className="space-y-4">
          {GENERATION_STEP_SEQUENCE.map((timelineStep, index) => {
            const isActive = timelineStep === step;
            const isComplete = index < stepIndex;
            return (
              <div
                key={timelineStep}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                  isComplete
                    ? 'border-emerald-200 bg-emerald-50'
                    : isActive
                      ? 'border-sky-400 bg-sky-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="mt-1">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : isActive ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${isActive ? 'text-sky-900' : isComplete ? 'text-emerald-900' : 'text-slate-800'}`}>
                    {GENERATION_STEP_META[timelineStep].label}
                  </p>
                  <p className={`mt-1 text-sm ${isActive ? 'text-sky-700' : isComplete ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {GENERATION_STEP_META[timelineStep].description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <Zap className="mr-2 inline h-4 w-4" />
          This usually takes about 4–5 seconds. We are shaping every topic around your selections.
        </div>

        {error && (
          <div className="mt-10 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p className="font-semibold">We could not finish generating your plan.</p>
            <p className="text-sm text-red-600">{error}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
              >
                Adjust selections
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CurriculumReadyView({
  stats,
  subjects,
  generatedAt,
  onContinue,
}: {
  stats: GenerationStats;
  subjects: string[];
  generatedAt: Date | null;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-2xl text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-14 w-14 text-emerald-500" />
        </div>
        <h2 className="text-4xl font-bold text-slate-900">Your curriculum is ready!</h2>
        <p className="mt-4 text-base text-slate-600">
          We built a personalized path across {stats.topicCount} topics. Jump in when you are ready.
        </p>

        {subjects.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {subjects.map(subject => (
              <span key={subject} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
                {subject}
              </span>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6">
            <p className="text-3xl font-bold text-sky-700">{stats.subjectCount}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sky-600">Subjects</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
            <p className="text-3xl font-bold text-indigo-700">{stats.topicCount}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-indigo-600">Topics</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-left text-sm text-sky-800">
          <p className="font-semibold">✨ Graspy says</p>
          <p className="mt-2">
            Everything is sequenced by difficulty and pace. Expect about 45 minutes per subject each week—adjust anytime as you learn.
          </p>
          {generatedAt && (
            <p className="mt-3 text-xs font-medium text-sky-600">
              Generated {generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-500 px-6 py-4 text-lg font-semibold text-white transition hover:from-sky-600 hover:to-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          View your learning plan
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setLocale } = useI18n();

  const [isClient, setIsClient] = useState(false);
  const [autoDetected, setAutoDetected] = useState({ country: '', language: '' });

  const [stepIndex, setStepIndex] = useState(0);
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [educationStatus, setEducationStatus] = useState<EducationStatus>('');
  const [knowsGradeLevel, setKnowsGradeLevel] = useState<boolean | null>(null);
  const [schoolGrade, setSchoolGrade] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevelValue | ''>('');
  const gradeLevelDescriptor = useMemo(
    () =>
      resolveGradeLevelDescriptor({
        gradeLevel,
        schoolGrade,
        ageRange,
      }),
    [ageRange, gradeLevel, schoolGrade],
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectsSeeded, setSubjectsSeeded] = useState(false);
  const [allCountries, setAllCountries] = useState<ReturnType<typeof getAllCountries>>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const hasLoggedConnection = useRef(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<GeneratedSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const addAgentLog = useCallback((label: string, payload: Record<string, unknown>) => {
    setAgentLogs(prev => {
      const entry: AgentLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label,
        payload: JSON.stringify(payload, null, 2),
      };
      return [...prev, entry].slice(-20);
    });
  }, []);

  // Auto-detect locale on mount
  useEffect(() => {
    setIsClient(true);

    const existingProfile = getUserProfile();
    if (existingProfile?.onboardingCompleted) {
      router.push('/app/learn');
      return;
    }

    const countries = getAllCountries();
    setAllCountries(countries);

    const detected = detectLocale();
    const countryCode = detected.country !== 'UNKNOWN' ? detected.country : '';
    const detectedLang = SUPPORTED_LANGUAGES.includes(detected.language as SupportedLanguageCode);
    const langCode = detectedLang ? detected.language : 'en';

    setAutoDetected({ country: countryCode, language: langCode });
    setCountry(countryCode);
    setLanguage(langCode);
    if (countryCode || langCode) {
      addAgentLog('auto_detected_locale', {
        country: countryCode ? getCountryName(countryCode) || countryCode : null,
        language: langCode ? getLanguageInfo(langCode)?.nativeName || langCode : null,
      });
    }
  }, [addAgentLog, router]);

  const steps = useMemo<StepKey[]>(() => {
    const base: StepKey[] = ['location', 'context'];

    if (educationStatus === 'in_school') {
      return [...base, 'grade', 'subjects'];
    }

    if (educationStatus === 'out_of_school') {
      if (knowsGradeLevel === null) {
        return [...base, 'gradeConfidence'];
      }

      if (knowsGradeLevel) {
        return [...base, 'gradeConfidence', 'grade', 'subjects'];
      }

      return [...base, 'gradeConfidence', 'age', 'subjects'];
    }

    return base;
  }, [educationStatus, knowsGradeLevel]);

  useEffect(() => {
    if (stepIndex >= steps.length) {
      setStepIndex(Math.max(steps.length - 1, 0));
    }
  }, [steps, stepIndex]);

  const currentStep = steps[stepIndex] ?? 'location';

  useEffect(() => {
    if (!isClient || hasLoggedConnection.current) return;
    addAgentLog('agent_connected', {
      status: 'listening',
      detectedCountry: autoDetected.country ? getCountryName(autoDetected.country) || autoDetected.country : null,
      detectedLanguage: autoDetected.language ? getLanguageInfo(autoDetected.language)?.nativeName || autoDetected.language : null,
    });
    hasLoggedConnection.current = true;
  }, [addAgentLog, autoDetected.country, autoDetected.language, isClient]);

  useEffect(() => {
    if (!logContainerRef.current) return;
    logContainerRef.current.scrollTo({
      top: logContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [agentLogs]);

  const availableLanguages = useMemo(() => {
    return country
      ? allCountries.find(c => c.code === country)?.languages || []
      : [...SUPPORTED_LANGUAGES];
  }, [country, allCountries]);

  const countryOptions = useMemo(() => {
    const crisisOptions = CRISIS_ZONE_COUNTRIES.map(c => ({
      value: c.code,
      label: getCountryName(c.code),
      group: 'Priority Regions',
    }));

    const otherOptions = allCountries
      .filter(c => !CRISIS_ZONE_COUNTRIES.find(cc => cc.code === c.code))
      .map(c => ({
        value: c.code,
        label: getCountryName(c.code),
        group: 'All Countries',
      }));

    return [...crisisOptions, ...otherOptions];
  }, [allCountries]);

  const languageOptions = useMemo(() => {
    return availableLanguages.map(langCode => {
      const info = getLanguageInfo(langCode);
      return {
        value: langCode,
        label: `${info.nativeName} (${info.name})`,
      };
    });
  }, [availableLanguages]);

  const subjectStreamRef = useRef<EventSource | null>(null);
  const availableSubjectsRef = useRef<GeneratedSubject[]>([]);
  const selectedSubjectsRef = useRef<string[]>([]);
  const [subjectsStatusMessage, setSubjectsStatusMessage] = useState('');
  const [subjectsSelectionError, setSubjectsSelectionError] = useState('');
  const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('form');
  const [generationStep, setGenerationStep] = useState<GenerationTimelineStep>('analyzing');
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationCompletedAt, setGenerationCompletedAt] = useState<Date | null>(null);
  const [selectedSubjectNames, setSelectedSubjectNames] = useState<string[]>([]);
  const generationRunIdRef = useRef<number | null>(null);
  const lastGenerationRequestRef = useRef<CurriculumRequest | null>(null);

  const fetchSubjects = useCallback(() => {
    if (!country || !language || !educationStatus) {
      setSubjectsError('Update previous steps to choose subjects.');
      setSubjectsLoading(false);
      setSubjectsStatusMessage('');
      return;
    }

    if (subjectStreamRef.current) {
      subjectStreamRef.current.close();
      subjectStreamRef.current = null;
    }

    setSubjectsLoading(true);
    setSubjectsError(null);
    setSubjectsStatusMessage("Connecting to Graspy's learning guide…");
    setAvailableSubjects([]);
    setSelectedSubjects([]);
    setSubjectsSeeded(false);
    availableSubjectsRef.current = [];
    selectedSubjectsRef.current = [];
    setSubjectsSelectionError('');

    const params = new URLSearchParams({
      country,
      language,
      educationStatus,
    });

    if (gradeLevelDescriptor) params.append('gradeLevel', gradeLevelDescriptor);
    if (schoolGrade) params.append('schoolGrade', schoolGrade);
    if (ageRange) params.append('ageRange', ageRange);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
    const endpointBase = apiBase || '/api';
    const endpoint = `${endpointBase}/subjects/generate-stream?${params.toString()}`;

    addAgentLog('agent_request', {
      resource: 'subjects',
      gradeLevel: gradeLevelDescriptor || null,
      educationStatus,
    });

    const eventSource = new EventSource(endpoint);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        setSubjectsStatusMessage('');
        setSubjectsLoading(false);
        eventSource.close();
        subjectStreamRef.current = null;
        return;
      }

      try {
        const payload = JSON.parse(event.data);

        addAgentLog('agent_event', {
          resource: 'subjects',
          event: payload.type,
          message: payload.message ?? null,
          count: Array.isArray(payload.subjects) ? payload.subjects.length : undefined,
        });

        if (payload.type === 'status') {
          setSubjectsStatusMessage(payload.message || 'Generating subjects…');
          return;
        }

        if (payload.type === 'error') {
          setSubjectsError(payload.message || 'We could not load subjects. Try again?');
          setSubjectsStatusMessage('');
          setSubjectsLoading(false);
          eventSource.close();
          subjectStreamRef.current = null;
          return;
        }

        if (payload.type === 'subjects') {
          setAvailableSubjects(prev => {
            if (!Array.isArray(payload.subjects)) return prev;
            const existingIds = new Set(prev.map(subject => subject.id));
            const merged = [...prev];
            for (const rawSubject of payload.subjects as Array<{ id?: string; label?: string; recommended?: boolean }>) {
              if (!rawSubject || typeof rawSubject.id !== 'string' || typeof rawSubject.label !== 'string') continue;
              if (existingIds.has(rawSubject.id)) continue;
              const nextSubject: GeneratedSubject = {
                id: rawSubject.id,
                label: rawSubject.label,
                recommended: Boolean(rawSubject.recommended),
              };
              merged.push(nextSubject);
              existingIds.add(rawSubject.id);
            }
            availableSubjectsRef.current = merged;
            return merged;
          });
          if (payload.message) {
            setSubjectsStatusMessage(payload.message);
          }
          return;
        }

        if (payload.type === 'complete') {
          setSubjectsStatusMessage(payload.message || 'Subjects are ready.');
          setSubjectsLoading(false);
          addAgentLog('agent_response', {
            resource: 'subjects',
            total: availableSubjectsRef.current.length,
            selected: selectedSubjectsRef.current.length,
          });
          eventSource.close();
          subjectStreamRef.current = null;
        }
      } catch (error) {
        console.error('Failed to parse subject stream event', error);
      }
    };

    eventSource.onerror = () => {
      setSubjectsError('Connection lost while loading subjects. Try again?');
      setSubjectsStatusMessage('');
      setSubjectsLoading(false);
      setSubjectsSelectionError('');
      addAgentLog('agent_error', {
        resource: 'subjects',
        message: 'stream_error',
      });
      eventSource.close();
      subjectStreamRef.current = null;
    };

    subjectStreamRef.current = eventSource;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAgentLog, ageRange, country, educationStatus, gradeLevel, language, schoolGrade]);

  useEffect(() => {
    if (currentStep === 'subjects') {
      fetchSubjects();
    } else if (subjectStreamRef.current) {
      subjectStreamRef.current.close();
      subjectStreamRef.current = null;
      setSubjectsStatusMessage('');
    }
  }, [currentStep, fetchSubjects]);

  useEffect(() => () => {
    if (subjectStreamRef.current) {
      subjectStreamRef.current.close();
      subjectStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    availableSubjectsRef.current = availableSubjects;
  }, [availableSubjects]);

  useEffect(() => {
    selectedSubjectsRef.current = selectedSubjects;
  }, [selectedSubjects]);

  useEffect(() => {
    if (
      currentStep === 'subjects' &&
      !subjectsSeeded &&
      !subjectsLoading &&
      !subjectsError &&
      availableSubjects.length > 0
    ) {
      const recommendedInList = availableSubjects.filter(subject => subject.recommended).map(subject => subject.id);
      if (recommendedInList.length > 0) {
        setSelectedSubjects(recommendedInList);
        selectedSubjectsRef.current = recommendedInList;
        addAgentLog('agent_action', {
          type: 'subjects_seeded',
          subjects: recommendedInList,
        });
      }
      setSubjectsSeeded(true);
    }
  }, [addAgentLog, availableSubjects, currentStep, subjectsError, subjectsLoading, subjectsSeeded]);

  useEffect(() => {
    if (!isClient) return;
    addAgentLog('step_viewed', {
      step: currentStep,
      prompt: STEP_TITLES[currentStep],
      position: `${stepIndex + 1}/${steps.length}`,
    });
  }, [addAgentLog, currentStep, isClient, stepIndex, steps.length]);

  const progressPercent = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.round(((stepIndex + 1) / steps.length) * 100);
  }, [stepIndex, steps.length]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'location':
        return Boolean(country && language);
      case 'context':
        return educationStatus === 'in_school' || educationStatus === 'out_of_school';
      case 'gradeConfidence':
        return knowsGradeLevel !== null;
      case 'grade':
        return Boolean(schoolGrade);
      case 'age':
        return Boolean(ageRange);
      case 'subjects':
        return !subjectsLoading && !subjectsError && selectedSubjects.length > 0;
      default:
        return false;
    }
  }, [
    ageRange,
    country,
    currentStep,
    educationStatus,
    knowsGradeLevel,
    language,
    schoolGrade,
    selectedSubjects.length,
    subjectsError,
    subjectsLoading,
  ]);

  const summarizeStep = useCallback(
    (step: StepKey) => {
      switch (step) {
        case 'location':
          return { country: getCountryName(country) || country, language: getLanguageInfo(language)?.nativeName || language };
        case 'context':
          return { educationStatus };
        case 'gradeConfidence':
          return { knowsGradeLevel };
        case 'grade':
          return { schoolGrade, gradeLevel };
        case 'age':
          return { ageRange, gradeLevel };
        case 'subjects':
          return { selectedSubjects };
        default:
          return {};
      }
    },
    [ageRange, country, educationStatus, gradeLevel, knowsGradeLevel, language, schoolGrade, selectedSubjects],
  );

  const runGenerationAnimation = useCallback((runId: number) => {
    const advance = async () => {
      for (let index = 1; index < GENERATION_STEP_SEQUENCE.length; index += 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (generationRunIdRef.current !== runId) {
          return;
        }
        const nextStep = GENERATION_STEP_SEQUENCE[index];
        setGenerationStep(prev => {
          const prevIndex = GENERATION_STEP_SEQUENCE.indexOf(prev);
          return prevIndex < index ? nextStep : prev;
        });
      }
    };
    return advance();
  }, []);

  const runCurriculumGeneration = useCallback(async (request: CurriculumRequest, runId: number) => {
    const subjectMap = new Map<string, CurriculumSubject>();
    const topics: Record<string, string[]> = {};
    let nextSubject: CurriculumSubject | null = null;

    const stream = streamCurriculum(request);

    for await (const chunk of stream) {
      if (generationRunIdRef.current !== runId) {
        return null;
      }

      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (Array.isArray(chunk.subjects)) {
        for (const incoming of chunk.subjects as Array<CurriculumSubject | string>) {
          if (!incoming) {
            continue;
          }

          if (typeof incoming === 'string') {
            const name = incoming.trim();
            if (!name) {
              continue;
            }

            const existing = Array.from(subjectMap.values()).find((subject) => subject.name === name);
            if (existing) {
              if (!nextSubject) {
                nextSubject = existing;
              }
              continue;
            }

            const slug = createSlug(name, new Set(subjectMap.keys()));
            if (subjectMap.has(slug)) {
              continue;
            }

            const subject: CurriculumSubject = { name, slug };
            subjectMap.set(slug, subject);
            if (!nextSubject) {
              nextSubject = subject;
            }
            continue;
          }

          const name = incoming.name?.trim();
          const slug = incoming.slug?.trim();
          if (!name || !slug) {
            continue;
          }

          const existing = subjectMap.get(slug);
          if (existing) {
            if (existing.name !== name) {
              existing.name = name;
            }
            if (!nextSubject) {
              nextSubject = existing;
            }
            continue;
          }

          const subject: CurriculumSubject = { name, slug };
          subjectMap.set(slug, subject);
          if (!nextSubject) {
            nextSubject = subject;
          }
        }
      }

      if (chunk.topics) {
        for (const [key, subjectTopics] of Object.entries(chunk.topics)) {
          if (!Array.isArray(subjectTopics) || subjectTopics.length === 0) {
            continue;
          }

          const subject =
            subjectMap.get(key) ??
            Array.from(subjectMap.values()).find((candidate) => candidate.name === key);
          const slugKey = subject ? subject.slug : key;
          topics[slugKey] = subjectTopics;
        }
      }
    }

    if (generationRunIdRef.current !== runId) {
      return null;
    }

    const normalizedSubjects = Array.from(subjectMap.values());

    if (normalizedSubjects.length === 0) {
      throw new Error('No subjects were generated.');
    }

    const totalTopics = Object.values(topics).reduce((count, subjectTopics) => count + subjectTopics.length, 0);

    await saveCurriculum({
      country: request.country,
      language: request.language,
      gradeLevel: request.gradeLevel ?? 'middle school learners',
      subjects: normalizedSubjects,
      topics,
      assessment: {
        nextSubject: (nextSubject ?? normalizedSubjects[0])?.slug ?? null,
      },
    });

    return {
      subjectCount: normalizedSubjects.length,
      topicCount: totalTopics,
    } satisfies GenerationStats;
  }, []);

  const startGenerationFlow = useCallback(
    async (params: {
      request: CurriculumRequest;
      subjectNames: string[];
      profileSnapshot: {
        country: string;
        language: string;
        educationStatus: EducationStatus;
        knowsGradeLevel: boolean | null;
        schoolGrade: string;
        ageRange: string;
        gradeLevel: GradeLevelValue;
        gradeLevelDescriptor: string;
        preferredSubjects: string[];
      };
    }) => {
      const { request, subjectNames, profileSnapshot } = params;
      const runId = Date.now();
      generationRunIdRef.current = runId;
      lastGenerationRequestRef.current = request;

      setCompletionPhase('generating');
      setGenerationError(null);
      setGenerationStats(null);
      setGenerationStep('analyzing');
      setGenerationCompletedAt(null);
      setSelectedSubjectNames(subjectNames);
      setIsCompleting(true);

      addAgentLog('curriculum_generation_started', {
        subjects: subjectNames,
        gradeLevel: profileSnapshot.gradeLevelDescriptor,
        gradeLevelBand: profileSnapshot.gradeLevel,
        country: profileSnapshot.country,
        language: profileSnapshot.language,
      });

      try {
        await setLocale(profileSnapshot.language);
      } catch (error) {
        console.warn('Failed to update locale before generation', error);
      }

      saveUserProfile({
        country: profileSnapshot.country,
        language: profileSnapshot.language,
        educationStatus: profileSnapshot.educationStatus,
        knowsGradeLevel: profileSnapshot.knowsGradeLevel,
        schoolGrade: profileSnapshot.schoolGrade,
        ageRange: profileSnapshot.ageRange,
        gradeLevel: profileSnapshot.gradeLevelDescriptor,
        gradeLevelBand: profileSnapshot.gradeLevel,
        preferredSubjects: profileSnapshot.preferredSubjects,
        onboardingCompleted: false,
      });

      try {
        await deleteCurriculum();
      } catch (error) {
        console.warn('Failed to clear existing curriculum cache', error);
      }

      const animationPromise = runGenerationAnimation(runId);

      try {
        const result = await runCurriculumGeneration(request, runId);
        if (generationRunIdRef.current !== runId || !result) {
          return;
        }

        setGenerationStats(result);
        addAgentLog('curriculum_generation_complete', {
          subjects: result.subjectCount,
          topics: result.topicCount,
        });

        await animationPromise;

        if (generationRunIdRef.current !== runId) {
          return;
        }

        setGenerationStep('personalizing');
        setGenerationCompletedAt(new Date());
        saveUserProfile({ onboardingCompleted: true });
        setCompletionPhase('ready');
      } catch (error) {
        if (generationRunIdRef.current !== runId) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Something went wrong while creating your plan.';
        setGenerationError(message);
        addAgentLog('curriculum_generation_failed', {
          message,
        });
        generationRunIdRef.current = null;
        setIsCompleting(false);
      } finally {
        if (generationRunIdRef.current === runId) {
          setIsCompleting(false);
          generationRunIdRef.current = null;
        }
      }
    },
    [addAgentLog, runCurriculumGeneration, runGenerationAnimation, setLocale],
  );

  const handleGenerationReset = useCallback(() => {
    generationRunIdRef.current = null;
    lastGenerationRequestRef.current = null;
    setCompletionPhase('form');
    setGenerationError(null);
    setGenerationStats(null);
    setGenerationStep('analyzing');
    setGenerationCompletedAt(null);
    setIsCompleting(false);
  }, []);

  const handleRetryGeneration = useCallback(() => {
    if (!lastGenerationRequestRef.current) {
      return;
    }
    void startGenerationFlow({
      request: lastGenerationRequestRef.current,
      subjectNames: selectedSubjectNames,
      profileSnapshot: {
        country,
        language,
        educationStatus,
        knowsGradeLevel,
        schoolGrade,
        ageRange,
        gradeLevel: gradeLevel || 'middle',
        gradeLevelDescriptor,
        preferredSubjects: selectedSubjectNames,
      },
    });
  }, [
    ageRange,
    country,
    educationStatus,
    gradeLevel,
    gradeLevelDescriptor,
    knowsGradeLevel,
    language,
    schoolGrade,
    selectedSubjectNames,
    startGenerationFlow,
  ]);

  const handleContinueToDashboard = useCallback(() => {
    addAgentLog('navigate_to_learn', {
      subjects: selectedSubjectNames.length,
      topics: generationStats?.topicCount ?? 0,
    });
    router.push('/app/learn');
  }, [addAgentLog, generationStats, router, selectedSubjectNames]);

  const handleNext = () => {
    if (!canProceed || isCompleting) return;

    addAgentLog('step_completed', {
      step: currentStep,
      snapshot: summarizeStep(currentStep),
    });

    if (stepIndex === steps.length - 1) {
      void handleComplete();
      return;
    }

    const upcomingStep = steps[Math.min(stepIndex + 1, steps.length - 1)];
    setStepIndex(index => Math.min(index + 1, steps.length - 1));
    addAgentLog('step_ready', { nextStep: upcomingStep });
  };

  const handleBack = () => {
    if (stepIndex === 0 || isCompleting) return;
    const previousStep = steps[Math.max(stepIndex - 1, 0)];
    addAgentLog('step_revisited', { from: currentStep, to: previousStep });
    setStepIndex(index => Math.max(index - 1, 0));
  };

  const toggleSubject = (subjectId: string) => {
    if (subjectsLoading || subjectsError) return;
    setSelectedSubjects(prev => {
      const exists = prev.includes(subjectId);
      if (!exists && prev.length >= SUBJECT_SELECTION_LIMIT) {
        setSubjectsSelectionError(`You can pick up to ${SUBJECT_SELECTION_LIMIT} subjects for a single plan.`);
        addAgentLog('subject_selection_limit', {
          subjectId,
          attemptedTotal: prev.length + 1,
          limit: SUBJECT_SELECTION_LIMIT,
        });
        return prev;
      }
      const next = exists ? prev.filter(id => id !== subjectId) : [...prev, subjectId];
      selectedSubjectsRef.current = next;
      if (next.length <= SUBJECT_SELECTION_LIMIT) {
        setSubjectsSelectionError('');
      }
      addAgentLog('subject_selection', {
        subjectId,
        action: exists ? 'removed' : 'added',
        totalSelected: next.length,
      });
      return next;
    });
  };

  const handleComplete = async () => {
    if (!canProceed || isCompleting) return;

    const subjectLabels = selectedSubjects
      .map(id => availableSubjects.find(subject => subject.id === id)?.label
        ?? SUBJECT_OPTIONS.find(option => option.id === id)?.label)
      .filter((label): label is string => Boolean(label));

    if (subjectLabels.length === 0) {
      setSubjectsSelectionError('Choose at least one subject to continue.');
      return;
    }

    const finalGradeLevel: GradeLevelValue = gradeLevel || 'middle';
    const finalGradeDescriptor = gradeLevelDescriptor || resolveGradeLevelDescriptor({
      gradeLevel: finalGradeLevel,
      schoolGrade,
      ageRange,
    });

    addAgentLog('onboarding_complete', {
      country,
      language,
      educationStatus,
      knowsGradeLevel,
      schoolGrade,
      ageRange,
      gradeLevel: finalGradeDescriptor,
      gradeLevelBand: finalGradeLevel,
      selectedSubjects: subjectLabels,
    });

    setSubjectsSelectionError('');

    await startGenerationFlow({
      request: {
        country,
        language,
        gradeLevel: finalGradeDescriptor,
        subjects: subjectLabels,
      },
      subjectNames: subjectLabels,
      profileSnapshot: {
        country,
        language,
        educationStatus,
        knowsGradeLevel,
        schoolGrade,
        ageRange,
        gradeLevel: finalGradeLevel,
        gradeLevelDescriptor: finalGradeDescriptor,
        preferredSubjects: subjectLabels,
      },
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'location':
        return (
          <div className="flex h-full flex-col gap-6">
            {autoDetected.country && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm">
                <div className="font-medium text-sky-800">
                  {getCountryName(autoDetected.country)} — {getLanguageInfo(autoDetected.language).nativeName}
                </div>
                <p className="mt-1 text-xs text-sky-600">Auto-detected — you can update below.</p>
              </div>
            )}

            <SearchableSelect
              id="country"
              value={country}
              onChange={(value) => {
                setCountry(value);
                const newCountry = allCountries.find(c => c.code === value);
                addAgentLog('input_update', {
                  field: 'country',
                  value: getCountryName(value) || value,
                });
                if (newCountry && !newCountry.languages.includes(language)) {
                  const fallback = newCountry.languages[0] || '';
                  setLanguage(fallback);
                  if (fallback) {
                    addAgentLog('input_update', {
                      field: 'language',
                      value: getLanguageInfo(fallback)?.nativeName || fallback,
                      reason: 'country_change',
                    });
                  }
                }
              }}
              options={countryOptions}
              placeholder="Search or select your country..."
              label="Where are you learning from?"
              className="rounded-2xl border border-sky-100 bg-white px-5 py-4 text-base font-medium text-slate-900 shadow-[0_10px_30px_rgba(15,78,138,0.08)] transition focus:border-sky-400 focus:ring-0"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                What language do you want to learn in?
              </label>
              <SearchableSelect
                id="language"
                value={language}
                onChange={(value) => {
                  setLanguage(value);
                  addAgentLog('input_update', {
                    field: 'language',
                    value: getLanguageInfo(value)?.nativeName || value,
                  });
                }}
                options={languageOptions}
                placeholder="Select language..."
                disabled={!country}
                className="rounded-2xl border border-sky-100 bg-white px-5 py-4 text-base font-medium text-slate-900 shadow-[0_10px_30px_rgba(15,78,138,0.08)] transition focus:border-sky-400 focus:ring-0 disabled:bg-slate-100"
              />
              {!country && (
                <p className="mt-2 text-sm text-slate-500">Select a country to see popular languages.</p>
              )}
            </div>
          </div>
        );

      case 'context':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {EDUCATION_OPTIONS.map(option => {
              const isActive = educationStatus === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setEducationStatus(option.id);
                    setKnowsGradeLevel(null);
                    setSchoolGrade('');
                    setAgeRange('');
                    setGradeLevel('');
                    setSubjectsSeeded(false);
                    setSelectedSubjects([]);
                    addAgentLog('input_update', {
                      field: 'educationStatus',
                      value: option.id,
                    });
                  }}
                  className={`flex w-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${isActive
                    ? 'border-sky-500 bg-sky-50 shadow-[0_12px_30px_rgba(15,78,138,0.15)]'
                    : 'border-slate-200 bg-white/80 hover:border-sky-300 hover:bg-sky-50/60'
                    }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-900">{option.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'gradeConfidence':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {GRADE_KNOWLEDGE_OPTIONS.map(option => {
              const isActive =
                (option.id === 'knows' && knowsGradeLevel === true) ||
                (option.id === 'needs_help' && knowsGradeLevel === false);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    const knows = option.id === 'knows';
                    setKnowsGradeLevel(knows);
                    setSchoolGrade('');
                    setAgeRange('');
                    setGradeLevel('');
                    setSubjectsSeeded(false);
                    setSelectedSubjects([]);
                    addAgentLog('input_update', {
                      field: 'knowsGradeLevel',
                      value: knows,
                    });
                  }}
                  className={`flex w-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${isActive
                    ? 'border-sky-500 bg-sky-50 shadow-[0_12px_30px_rgba(15,78,138,0.15)]'
                    : 'border-slate-200 bg-white/80 hover:border-sky-300 hover:bg-sky-50/60'
                    }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-900">{option.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'grade':
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCHOOL_GRADE_OPTIONS.map(option => {
              const isActive = schoolGrade === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSchoolGrade(option.value);
                    addAgentLog('input_update', {
                      field: 'schoolGrade',
                      value: option.value,
                    });
                    if (gradeLevel !== option.gradeLevel) {
                      setGradeLevel(option.gradeLevel);
                      setSubjectsSeeded(false);
                      setSelectedSubjects([]);
                      addAgentLog('input_update', {
                        field: 'gradeLevel',
                        value: option.gradeLevel,
                      });
                    }
                  }}
                  className={`flex h-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${isActive
                    ? 'border-sky-500 bg-sky-50 shadow-[0_12px_30px_rgba(34,112,192,0.18)]'
                    : 'border-slate-200 bg-white/80 hover:border-sky-300 hover:bg-sky-50/60'
                    }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                    {option.description}
                  </span>
                  <div className="text-lg font-semibold text-slate-900">{option.label}</div>
                </button>
              );
            })}
          </div>
        );

      case 'age':
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGE_GROUP_OPTIONS.map(option => {
              const isActive = ageRange === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setAgeRange(option.value);
                    addAgentLog('input_update', {
                      field: 'ageRange',
                      value: option.value,
                    });
                    if (option.defaultSchoolGrade && schoolGrade !== option.defaultSchoolGrade) {
                      setSchoolGrade(option.defaultSchoolGrade);
                      addAgentLog('input_update', {
                        field: 'schoolGrade',
                        value: option.defaultSchoolGrade,
                        reason: 'age_selection',
                      });
                    }
                    if (gradeLevel !== option.gradeLevel) {
                      setGradeLevel(option.gradeLevel);
                      setSubjectsSeeded(false);
                      setSelectedSubjects([]);
                      addAgentLog('input_update', {
                        field: 'gradeLevel',
                        value: option.gradeLevel,
                      });
                    }
                  }}
                  className={`flex w-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${isActive
                    ? 'border-sky-500 bg-sky-50 shadow-[0_12px_30px_rgba(34,112,192,0.18)]'
                    : 'border-slate-200 bg-white/80 hover:border-sky-300 hover:bg-sky-50/60'
                    }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                    {option.label}
                  </span>
                  <div className="text-sm text-slate-600">{option.description}</div>
                </button>
              );
            })}
          </div>
        );

      case 'subjects':
        return (
          <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Subjects</span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                Scroll to explore
              </span>
            </div>

            {subjectsSelectionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {subjectsSelectionError}
              </div>
            )}

            {subjectsStatusMessage && !subjectsError && (
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                {subjectsStatusMessage}
              </div>
            )}

            <div className="relative flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white/90">
              {!subjectsLoading && !subjectsError && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-[1rem] bg-gradient-to-b from-white via-white/70 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[1rem] bg-gradient-to-t from-white via-white/80 to-transparent" />
                </>
              )}
              <div className="absolute inset-0 overflow-y-auto px-2 py-3">
                {subjectsError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-slate-600">{subjectsError}</p>
                    <button
                      type="button"
                      onClick={() => fetchSubjects()}
                      disabled={subjectsLoading}
                      className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Try again
                    </button>
                  </div>
                ) : subjectsLoading ? (
                  <div className="space-y-2 pr-1">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`subject-skeleton-${index}`}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-100/70 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-1">
                    {availableSubjects.map(subject => {
                      const isActive = selectedSubjects.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          disabled={subjectsLoading}
                          onClick={() => toggleSubject(subject.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-sky-400 bg-sky-50 text-sky-800'
                              : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
                          } ${subjectsLoading ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isActive ? 'text-sky-700' : 'text-slate-900'}`}>
                              {subject.label}
                            </span>
                            {subject.recommended && (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                                Recommended
                              </span>
                            )}
                          </div>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                              isActive ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 text-slate-400'
                            }`}
                          >
                            {isActive ? '✓' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="h-0" aria-hidden />
          </div>
        );

      default:
        return null;
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completionPhase === 'generating') {
    return (
      <GenerationProgressView
        subjects={selectedSubjectNames}
        step={generationStep}
        error={generationError}
        onRetry={handleRetryGeneration}
        onBack={handleGenerationReset}
        isRetrying={isCompleting}
      />
    );
  }

  if (completionPhase === 'ready' && generationStats) {
    return (
      <CurriculumReadyView
        stats={generationStats}
        subjects={selectedSubjectNames}
        generatedAt={generationCompletedAt}
        onContinue={handleContinueToDashboard}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#E8F3FF] via-white to-[#D3E8FF]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-sky-200/45 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 right-[-15%] h-[34rem] w-[34rem] rounded-full bg-sky-300/30 blur-[140px]" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-2">
          <div className="text-2xl font-semibold tracking-tight text-slate-900">graspy</div>
          <a
            href="mailto:hello@graspy.org"
            className="text-base font-medium text-sky-600 transition hover:text-sky-700"
          >
            Contact
          </a>
        </header>

        <div className="mt-12 flex flex-1 items-center">
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-stretch lg:gap-10">
            <div className="flex h-full">
              <div className="relative w-full rounded-[2.5rem] bg-white/90 p-8 shadow-[0_40px_80px_rgba(15,78,138,0.12)] backdrop-blur-sm min-h-[640px] sm:p-10 lg:h-full lg:p-12 xl:min-h-[680px]">
                <div className="absolute inset-x-10 top-0 h-16 rounded-t-[2.5rem] bg-gradient-to-b from-white to-transparent" aria-hidden />
                <div className="relative flex h-full min-h-0 flex-col">
                  <div className="flex-1 space-y-10">
                    <div className="flex flex-col gap-6">
                      <div className="space-y-5 sm:space-y-6">
                        <h2 className="text-4xl font-bold leading-tight text-slate-900 sm:text-[2.9rem] sm:leading-[1.1]">
                          Learn anywhere,<br />fast & fun
                        </h2>
                        <p className="text-base font-medium text-slate-500 sm:text-lg">
                          Lessons that feel human, hopeful, and ready to go with you.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-5 shadow-[0_18px_38px_rgba(15,78,138,0.08)]">
                        <div className="flex items-start gap-4">
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-2xl text-white shadow-lg">
                            🤖
                          </span>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Graspy Guide</p>
                            <p className="text-sm text-slate-700 sm:text-base">
                              I&apos;m your AI learning buddy. Share a few details and I&apos;ll tune the lessons for you in real time.
                            </p>
                            <p className="text-xs font-medium text-sky-600">
                              Listening to: {STEP_TITLES[currentStep]}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="mt-10 border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      Agent Communication Log
                    </div>
                    <div
                      ref={logContainerRef}
                      className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs font-mono text-slate-700 shadow-inner"
                    >
                      {agentLogs.length === 0 ? (
                        <p className="text-slate-400">Waiting for your first update...</p>
                      ) : (
                        agentLogs.map(entry => (
                          <div
                            key={entry.id}
                            className="mb-3 border-b border-slate-200/80 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                          >
                            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-sky-600">{entry.label}</span>
                              <span className="text-slate-500">{entry.timestamp}</span>
                            </div>
                            <pre className="whitespace-pre-wrap text-left text-[11px] text-slate-600">
                              {entry.payload}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex h-full">
              <div className="relative w-full rounded-[2.5rem] bg-white/85 p-8 shadow-[0_40px_90px_rgba(34,112,192,0.15)] ring-1 ring-white/50 backdrop-blur min-h-[640px] sm:p-10 lg:h-full lg:p-12 xl:min-h-[680px]">
                <div className="absolute inset-x-10 top-0 h-20 rounded-t-[2.5rem] bg-gradient-to-b from-sky-50/70 to-transparent" aria-hidden />
                <div className="relative flex h-full min-h-0 flex-col lg:overflow-hidden">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900 sm:text-[2.1rem]">
                      {STEP_TITLES[currentStep]}
                    </h1>
                    {STEP_DESCRIPTIONS[currentStep] && (
                      <p className="text-base text-slate-600 sm:text-lg">
                        {STEP_DESCRIPTIONS[currentStep]}
                      </p>
                    )}
                  </div>


                  <div className="mt-8 space-y-3">
                    <span className="text-sm font-semibold text-sky-600">
                      Step {stepIndex + 1} of {steps.length}
                    </span>
                    <div className="h-2 rounded-full bg-sky-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className={`mt-8 flex-1 min-h-0 lg:pr-1 ${currentStep === 'subjects' ? '' : 'lg:overflow-y-auto'}`}>
                    {renderStepContent()}
                  </div>

                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                    {stepIndex > 0 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isCompleting}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                    ) : (
                      <span className="invisible inline-flex items-center gap-2 rounded-2xl px-6 py-3" />
                    )}

                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceed || isCompleting}
                      className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${canProceed && !isCompleting
                        ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white hover:from-sky-600 hover:to-sky-400'
                        : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`}
                    >
                      {isCompleting
                        ? 'Setting up...'
                        : stepIndex === steps.length - 1
                          ? 'Start Learning'
                          : 'Next'}
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

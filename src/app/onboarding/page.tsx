'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { detectLocale } from '@/lib/locale-detector';
import {
  getAllCountries,
  SUPPORTED_LANGUAGES,
  GRADE_LEVELS,
  getCountryName,
  getLanguageInfo,
  CRISIS_ZONE_COUNTRIES,
} from '@/lib/constants';
import { saveUserProfile, getUserProfile } from '@/lib/user-storage';
import SearchableSelect from '@/components/SearchableSelect';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [autoDetected, setAutoDetected] = useState({ country: '', language: '' });
  const [allCountries, setAllCountries] = useState<ReturnType<typeof getAllCountries>>([]);
  const [isClient, setIsClient] = useState(false);

  // Auto-detect locale on mount
  useEffect(() => {
    // Mark as client-side to prevent hydration mismatch
    setIsClient(true);

    // Check if user already completed onboarding
    const existingProfile = getUserProfile();
    if (existingProfile?.onboardingCompleted) {
      router.push('/dashboard');
      return;
    }

    // Get all countries (client-side only due to Intl API)
    const countries = getAllCountries();
    setAllCountries(countries);

    // Auto-detect using browser APIs
    const detected = detectLocale();

    // Use detected country directly (it will appear in the full country list)
    const countryCode = detected.country !== 'UNKNOWN' ? detected.country : '';

    // Map language code to our supported languages
    const detectedLang = SUPPORTED_LANGUAGES.includes(detected.language as any);
    const langCode = detectedLang ? detected.language : 'en';

    setAutoDetected({ country: countryCode, language: langCode });
    setCountry(countryCode);
    setLanguage(langCode);
  }, [router]);

  const availableLanguages = country
    ? allCountries.find(c => c.code === country)?.languages || []
    : [...SUPPORTED_LANGUAGES];

  // Prepare options for SearchableSelect components
  const countryOptions = useMemo(() => {
    const crisisOptions = CRISIS_ZONE_COUNTRIES.map(c => ({
      value: c.code,
      label: getCountryName(c.code),
      group: '📍 Priority Regions',
    }));

    const otherOptions = allCountries
      .filter(c => !CRISIS_ZONE_COUNTRIES.find(cc => cc.code === c.code))
      .map(c => ({
        value: c.code,
        label: getCountryName(c.code),
        group: '🌍 All Countries',
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

  const handleNext = () => {
    if (step === 1 && country && language) {
      setStep(2);
    } else if (step === 2 && gradeLevel) {
      // Save profile and complete onboarding
      saveUserProfile({
        country,
        language,
        gradeLevel,
        onboardingCompleted: true,
      });
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const isStep1Valid = country && language;
  const isStep2Valid = gradeLevel;

  // Show loading state until client-side hydration completes
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">Welcome to graspy 🌍</h1>
          <p className="text-gray-600">
            Your personal AI tutor for learning at your own pace
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-indigo-600">Step {step} of 2</span>
            <span className="text-sm text-gray-500">{step === 1 ? 'Location & Language' : 'Grade Level'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Country & Language */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Auto-detection notice */}
            {autoDetected.country && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ✓ Auto-detected: {getCountryName(autoDetected.country)} • {' '}
                  {getLanguageInfo(autoDetected.language).nativeName}
                </p>
                <p className="text-xs text-blue-600 mt-1">You can change these below</p>
              </div>
            )}

            {/* Country Selection */}
            <SearchableSelect
              id="country"
              value={country}
              onChange={(value) => {
                setCountry(value);
                // Reset language if not available in new country
                const newCountry = allCountries.find(c => c.code === value);
                if (newCountry && !newCountry.languages.includes(language)) {
                  setLanguage(newCountry.languages[0] || '');
                }
              }}
              options={countryOptions}
              placeholder="Search or select your country..."
              label="Where are you from? 🌍"
            />

            {/* Language Selection */}
            <div>
              <SearchableSelect
                id="language"
                value={language}
                onChange={setLanguage}
                options={languageOptions}
                placeholder="Search or select your language..."
                label="What language do you prefer? 🗣️"
                disabled={!country}
              />
              {!country && (
                <p className="text-sm text-gray-500 mt-1">Please select a country first</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Grade Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                What is your current level? 📚
              </label>
              <div className="space-y-3">
                {GRADE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setGradeLevel(level.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      gradeLevel === level.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{level.label}</div>
                    <div className="text-sm text-gray-500">Age range: {level.ageRange}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              (step === 1 ? isStep1Valid : isStep2Valid)
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {step === 2 ? 'Start Learning' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

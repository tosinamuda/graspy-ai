'use client';
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, HelpCircle } from 'lucide-react';

export default function GraspyOnboarding() {
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState({
        country: 'Slovakia',
        language: 'English',
        inFormalEducation: null,
        grade: null,
        ageGroupPreference: null,
        ageGroup: null,
        subjects: new Set(),
    });

    const countries = ['Slovakia', 'Nigeria', 'United Kingdom', 'Canada', 'United States', 'India'];
    const languages = ['English', 'Slovak', 'Yoruba', 'Spanish', 'French', 'Hindi'];

    const grades = [
        { id: 'g1', label: 'Grade 1', desc: 'Age 6-7' },
        { id: 'g2', label: 'Grade 2', desc: 'Age 7-8' },
        { id: 'g3', label: 'Grade 3', desc: 'Age 8-9' },
        { id: 'g4', label: 'Grade 4', desc: 'Age 9-10' },
        { id: 'g5', label: 'Grade 5', desc: 'Age 10-11' },
        { id: 'g6', label: 'Grade 6', desc: 'Age 11-12' },
        { id: 'g7', label: 'Grade 7', desc: 'Age 12-13' },
        { id: 'g8', label: 'Grade 8', desc: 'Age 13-14' },
        { id: 'g9', label: 'Grade 9', desc: 'Age 14-15' },
        { id: 'g10', label: 'Grade 10', desc: 'Age 15-16' },
        { id: 'g11', label: 'Grade 11', desc: 'Age 16-17' },
        { id: 'g12', label: 'Grade 12', desc: 'Age 17-18' },
    ];

    const ageGroups = [
        { id: '6-8', label: 'Ages 6-8', desc: 'Fun games and stories' },
        { id: '9-11', label: 'Ages 9-11', desc: 'Cool projects and experiments' },
        { id: '12-14', label: 'Ages 12-14', desc: 'Deeper thinking challenges' },
        { id: '15-17', label: 'Ages 15-17', desc: 'Advanced topics' },
        { id: '18+', label: 'Ages 18+', desc: 'Professional learning' },
    ];

    const subjects = [
        { id: 'math', name: 'Math', icon: '🔢' },
        { id: 'english', name: 'Reading & Writing', icon: '📚' },
        { id: 'science', name: 'Science', icon: '🔬' },
        { id: 'history', name: 'History', icon: '🏛️' },
        { id: 'arts', name: 'Arts & Music', icon: '🎨' },
    ];

    const getTotalSteps = () => {
        if (profile.inFormalEducation === true) return 4;
        if (profile.inFormalEducation === false && profile.ageGroupPreference === null) return 3;
        if (profile.inFormalEducation === false && profile.ageGroupPreference === 'knows') return 5;
        if (profile.inFormalEducation === false && profile.ageGroupPreference === 'needsHelp') return 5;
        return 5;
    };

    const getProgressPercentage = () => {
        const total = getTotalSteps();
        return Math.round((step / total) * 100);
    };

    const handleNext = () => {
        if (step < getTotalSteps()) setStep(step + 1);
        else handleComplete();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const canProceed = () => {
        if (step === 1) return profile.country && profile.language;
        if (step === 2) return profile.inFormalEducation !== null;
        if (step === 3 && profile.inFormalEducation === true) return profile.grade;
        if (step === 3 && profile.inFormalEducation === false) return profile.ageGroupPreference !== null;
        if (step === 4 && profile.inFormalEducation === true) return profile.subjects.size > 0;
        if (step === 4 && profile.inFormalEducation === false) return profile.ageGroup;
        if (step === 5) return profile.subjects.size > 0;
        return false;
    };

    const toggleSubject = (subjectId) => {
        const newSubjects = new Set(profile.subjects);
        newSubjects.has(subjectId) ? newSubjects.delete(subjectId) : newSubjects.add(subjectId);
        setProfile(prev => ({ ...prev, subjects: newSubjects }));
    };

    const handleComplete = () => {
        console.log('Profile Complete:', profile);
        alert('Welcome to graspy! Your learning adventure starts now! 🎉');
    };

    // ============ STEP 1: LOCATION & LANGUAGE ============
    if (step === 1) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase">Step 1 of {getTotalSteps()}</span>
                                <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Where are you from?</h2>
                            <p className="text-base text-slate-600 mb-8">We guessed these answers, but you can change them if they're not right!</p>

                            <div className="space-y-8 mb-8">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-3 block">
                                        <span>📍</span> Your Country
                                    </label>
                                    <select
                                        value={profile.country}
                                        onChange={(e) => setProfile(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 font-medium text-base bg-white hover:border-slate-400 transition-colors"
                                    >
                                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-3 block">
                                        <span>🌐</span> Language You Want to Learn In
                                    </label>
                                    <select
                                        value={profile.language}
                                        onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 font-medium text-base bg-white hover:border-slate-400 transition-colors"
                                    >
                                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    <span className="font-semibold">💡 Why we ask:</span> This helps us show you examples and stories from your part of the world!
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button disabled className="opacity-0 flex-1 py-2.5 px-4">Back</button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ============ STEP 2: IN FORMAL EDUCATION? ============
    if (step === 2) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase">Step 2 of {getTotalSteps()}</span>
                                <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Do you go to school?</h2>
                            <p className="text-base text-slate-600 mb-8">This helps us pick the right lessons for you!</p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setProfile(prev => ({ ...prev, inFormalEducation: true }))}
                                    className={`w-full p-6 rounded-xl border-2 transition-all text-left ${profile.inFormalEducation === true
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="text-4xl flex-shrink-0">🏫</span>
                                        <div className="flex-1">
                                            <p className={`text-lg font-semibold mb-1 ${profile.inFormalEducation === true ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                Yes, I go to school
                                            </p>
                                            <p className="text-sm text-slate-600">I'm in a regular school with grades</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${profile.inFormalEducation === true
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-slate-300'
                                            }`} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => setProfile(prev => ({ ...prev, inFormalEducation: false, grade: null, ageGroupPreference: null, ageGroup: null }))}
                                    className={`w-full p-6 rounded-xl border-2 transition-all text-left ${profile.inFormalEducation === false
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="text-4xl flex-shrink-0">🚀</span>
                                        <div className="flex-1">
                                            <p className={`text-lg font-semibold mb-1 ${profile.inFormalEducation === false ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                No, I learn at home or by myself
                                            </p>
                                            <p className="text-sm text-slate-600">I'm homeschooled or learning on my own</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${profile.inFormalEducation === false
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-slate-300'
                                            }`} />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4 inline mr-1" />
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ============ STEP 3: GRADE (FORMAL) or AGE PREFERENCE (NON-FORMAL) ============
    if (step === 3) {
        const isFormal = profile.inFormalEducation === true;

        if (isFormal) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                        <div className="max-w-3xl mx-auto px-6 py-4">
                            <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                        </div>
                    </header>

                    <main className="flex-1 flex items-center justify-center px-6 py-12">
                        <div className="w-full max-w-2xl">
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-600 uppercase">Step 3 of {getTotalSteps()}</span>
                                    <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">What grade are you in?</h2>
                                <p className="text-base text-slate-600 mb-8">Pick the grade that matches what you're learning in school.</p>

                                <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                                    {grades.map((grade) => (
                                        <button
                                            key={grade.id}
                                            onClick={() => setProfile(prev => ({ ...prev, grade: grade.id }))}
                                            className={`p-4 rounded-xl border-2 transition-all text-center text-sm ${profile.grade === grade.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className={`font-semibold ${profile.grade === grade.id ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {grade.label}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">{grade.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase">Step 3 of {getTotalSteps()}</span>
                                <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">Do you know which age group fits you best?</h2>
                            <p className="text-sm text-slate-600 mb-6">This helps us pick lessons that are just right for you!</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setProfile(prev => ({ ...prev, ageGroupPreference: 'knows' }))}
                                    className={`w-full p-5 rounded-xl border-2 transition-all text-left ${profile.ageGroupPreference === 'knows'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`font-semibold text-lg ${profile.ageGroupPreference === 'knows' ? 'text-blue-900' : 'text-slate-900'
                                            }`}>
                                            ✓
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-semibold ${profile.ageGroupPreference === 'knows' ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                Yes, I know!
                                            </p>
                                            <p className="text-sm text-slate-600 mt-1">Let me pick my level</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setProfile(prev => ({ ...prev, ageGroupPreference: 'needsHelp' }))}
                                    className={`w-full p-5 rounded-xl border-2 transition-all text-left ${profile.ageGroupPreference === 'needsHelp'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <HelpCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${profile.ageGroupPreference === 'needsHelp' ? 'text-blue-600' : 'text-slate-400'
                                            }`} />
                                        <div className="flex-1">
                                            <p className={`font-semibold ${profile.ageGroupPreference === 'needsHelp' ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                Not sure, help me choose
                                            </p>
                                            <p className="text-sm text-slate-600 mt-1">Show me what might work best</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4 inline mr-1" />
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ============ STEP 4: SUBJECTS (FORMAL) or GRADE LEVEL/AGE GROUPS (NON-FORMAL) ============
    if (step === 4) {
        const isFormal = profile.inFormalEducation === true;
        const knowsAgePreference = profile.ageGroupPreference === 'knows';
        const needsHelp = profile.ageGroupPreference === 'needsHelp';

        if (isFormal) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                        <div className="max-w-3xl mx-auto px-6 py-4">
                            <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                        </div>
                    </header>

                    <main className="flex-1 flex items-center justify-center px-6 py-12">
                        <div className="w-full max-w-2xl">
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-600 uppercase">Step 4 of {getTotalSteps()}</span>
                                    <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-900 mb-1">What do you want to learn?</h2>
                                <p className="text-sm text-slate-600 mb-6">Pick one or more subjects that you're excited about!</p>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {subjects.map((subject) => (
                                        <button
                                            key={subject.id}
                                            onClick={() => toggleSubject(subject.id)}
                                            className={`p-4 rounded-lg border-2 transition-all text-center ${profile.subjects.has(subject.id)
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className="text-2xl mb-2">{subject.icon}</p>
                                            <p className={`text-sm font-semibold ${profile.subjects.has(subject.id) ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {subject.name}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs font-semibold text-blue-700">
                                        {profile.subjects.size} subject{profile.subjects.size !== 1 ? 's' : ''} picked
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Let's Go! <Sparkles className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }

        if (knowsAgePreference) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                        <div className="max-w-3xl mx-auto px-6 py-4">
                            <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                        </div>
                    </header>

                    <main className="flex-1 flex items-center justify-center px-6 py-12">
                        <div className="w-full max-w-2xl">
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-600 uppercase">Step 4 of {getTotalSteps()}</span>
                                    <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-900 mb-1">What level works best for you?</h2>
                                <p className="text-sm text-slate-600 mb-6">Pick the grade level that feels just right.</p>

                                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                    {grades.map((grade) => (
                                        <button
                                            key={grade.id}
                                            onClick={() => setProfile(prev => ({ ...prev, ageGroup: grade.id }))}
                                            className={`p-3 rounded-lg border-2 transition-all text-center text-sm ${profile.ageGroup === grade.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className={`font-semibold ${profile.ageGroup === grade.id ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {grade.label}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-0.5">{grade.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }

        if (needsHelp) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                        <div className="max-w-3xl mx-auto px-6 py-4">
                            <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                        </div>
                    </header>

                    <main className="flex-1 flex items-center justify-center px-6 py-12">
                        <div className="w-full max-w-2xl">
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-600 uppercase">Step 4 of {getTotalSteps()}</span>
                                    <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-900 mb-1">Which age group are you in?</h2>
                                <p className="text-sm text-slate-600 mb-6">Pick the age group that matches you best!</p>

                                <div className="space-y-2">
                                    {ageGroups.map((group) => (
                                        <button
                                            key={group.id}
                                            onClick={() => setProfile(prev => ({ ...prev, ageGroup: group.id }))}
                                            className={`w-full p-3 rounded-lg border-2 transition-all text-left text-sm ${profile.ageGroup === group.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className={`font-semibold ${profile.ageGroup === group.id ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {group.label}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-0.5">{group.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }
    }

    // ============ STEP 5: SUBJECTS (NON-FORMAL ONLY) ============
    if (step === 5) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
                <header className="bg-white/80 backdrop-blur border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <h1 className="text-xl font-bold text-slate-900">graspy</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase">Step 5 of {getTotalSteps()}</span>
                                <span className="text-xs text-slate-500">{getProgressPercentage()}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgressPercentage()}%` }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">What do you want to learn?</h2>
                            <p className="text-sm text-slate-600 mb-6">Pick one or more subjects you're excited about!</p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {subjects.map((subject) => (
                                    <button
                                        key={subject.id}
                                        onClick={() => toggleSubject(subject.id)}
                                        className={`p-4 rounded-lg border-2 transition-all text-center ${profile.subjects.has(subject.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <p className="text-2xl mb-2">{subject.icon}</p>
                                        <p className={`text-sm font-semibold ${profile.subjects.has(subject.id) ? 'text-blue-900' : 'text-slate-900'
                                            }`}>
                                            {subject.name}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                                <p className="text-xs font-semibold text-blue-700">
                                    {profile.subjects.size} subject{profile.subjects.size !== 1 ? 's' : ''} picked
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Your Profile</p>
                                <div className="space-y-1 text-slate-700">
                                    <p><span className="font-semibold">Age Group:</span> {ageGroups.find(a => a.id === profile.ageGroup)?.label}</p>
                                    <p><span className="font-semibold">Location:</span> {profile.country} • {profile.language}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-slate-900 hover:bg-slate-100 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4 inline mr-1" />
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${canProceed()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Let's Go! <Sparkles className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }
}

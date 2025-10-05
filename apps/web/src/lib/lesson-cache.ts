import type { LessonContentPayload, LessonResponse } from '@/lib/curriculum-api';

interface CachedLessonRecord {
  subject: string;
  topic: string;
  topicIndex: number;
  lesson: LessonContentPayload;
  session: LessonResponse['session'];
  savedAt: number;
}

const LESSON_KEY_PREFIX = 'lesson-cache:';

function makeKey(subject: string, index: number): string {
  return `${LESSON_KEY_PREFIX}${encodeURIComponent(subject)}:${index}`;
}

function safeParse(value: string | null): CachedLessonRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as CachedLessonRecord;
    if (parsed && typeof parsed.subject === 'string' && typeof parsed.topicIndex === 'number') {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse cached lesson from storage', error);
  }

  return null;
}

export function getCachedLesson(subject: string, index: number): CachedLessonRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeParse(window.localStorage.getItem(makeKey(subject, index)));
}

export function setCachedLesson(subject: string, index: number, record: CachedLessonRecord): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(makeKey(subject, index), JSON.stringify(record));
  } catch (error) {
    console.warn('Failed to cache lesson', error);
  }
}

export function clearLessonCacheForSubject(subject: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const prefix = `${LESSON_KEY_PREFIX}${encodeURIComponent(subject)}:`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

export function resetLessonCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(LESSON_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

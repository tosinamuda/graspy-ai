import type { LessonContentPayload, LessonResponse } from '@/lib/curriculum-api';

interface CachedLessonRecord {
  subjectSlug: string;
  subjectName: string;
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

type LegacyCachedLessonRecord = CachedLessonRecord & { subject?: string };

function safeParse(value: string | null): CachedLessonRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LegacyCachedLessonRecord>;
    if (parsed && typeof parsed.topicIndex === 'number') {
      if (parsed.subjectSlug && parsed.subjectName) {
        return parsed as CachedLessonRecord;
      }

      if (parsed.subject) {
        return {
          ...parsed,
          subjectSlug: parsed.subject,
          subjectName: parsed.subject,
        } as CachedLessonRecord;
      }
    }
  } catch (error) {
    console.warn('Failed to parse cached lesson from storage', error);
  }

  return null;
}

export function getCachedLesson(subject: string, index: number, legacySubject?: string): CachedLessonRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = makeKey(subject, index);
  let record = safeParse(window.localStorage.getItem(key));

  if (!record && legacySubject) {
    const legacyKey = makeKey(legacySubject, index);
    record = safeParse(window.localStorage.getItem(legacyKey));
    if (record) {
      try {
        window.localStorage.setItem(key, JSON.stringify(record));
        window.localStorage.removeItem(legacyKey);
      } catch (error) {
        console.warn('Failed to migrate cached lesson key', error);
      }
    }
  }

  return record;
}

export function setCachedLesson(subject: string, index: number, record: CachedLessonRecord, legacySubject?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(makeKey(subject, index), JSON.stringify(record));
    if (legacySubject) {
      window.localStorage.removeItem(makeKey(legacySubject, index));
    }
  } catch (error) {
    console.warn('Failed to cache lesson', error);
  }
}

export function clearLessonCacheForSubject(subject: string, legacySubject?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const prefixes = [subject, legacySubject]
    .filter(Boolean)
    .map((value) => `${LESSON_KEY_PREFIX}${encodeURIComponent(value as string)}:`);
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
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

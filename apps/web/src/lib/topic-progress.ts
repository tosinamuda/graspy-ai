export type TopicStatusValue = 'not_generated' | 'generating' | 'ready' | 'error';

export interface TopicStatusRecord {
  status: TopicStatusValue;
  updatedAt: number;
  error?: string | null;
}

// Simple status type for UI
export type TopicStatus = 'not-generated' | 'generating' | 'generated' | 'unlocked' | 'locked' | 'completed';

const STATUS_KEY_PREFIX = 'topic-status:';

function makeKey(subject: string, index: number): string {
  return `${STATUS_KEY_PREFIX}${encodeURIComponent(subject)}:${index}`;
}

function safeParse(value: string | null): TopicStatusRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as TopicStatusRecord;
    if (parsed && typeof parsed.status === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse topic status from storage', error);
  }

  return null;
}

function defaultStatus(): TopicStatusRecord {
  return {
    status: 'not_generated',
    updatedAt: Date.now(),
  };
}

export function getTopicStatus(subject: string, index: number): TopicStatusRecord {
  if (typeof window === 'undefined') {
    return defaultStatus();
  }

  const key = makeKey(subject, index);
  const parsed = safeParse(window.localStorage.getItem(key));
  return parsed ?? defaultStatus();
}

export function setTopicStatus(
  subject: string,
  index: number,
  status: TopicStatusValue,
  error: string | null = null,
): TopicStatusRecord {
  const record: TopicStatusRecord = {
    status,
    error,
    updatedAt: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(makeKey(subject, index), JSON.stringify(record));
    } catch (storageError) {
      console.warn('Failed to persist topic status', storageError);
    }
  }

  return record;
}

export function loadSubjectStatuses(subject: string, topicCount: number): TopicStatusRecord[] {
  const records: TopicStatusRecord[] = [];
  for (let index = 0; index < topicCount; index += 1) {
    records.push(getTopicStatus(subject, index));
  }
  return records;
}

export function clearSubjectStatuses(subject: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const prefix = `${STATUS_KEY_PREFIX}${encodeURIComponent(subject)}:`;
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

export function resetAllTopicStatuses(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STATUS_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

export function countReadyTopics(statuses: TopicStatusRecord[]): number {
  return statuses.filter((record) => record.status === 'ready').length;
}

// Simple status helpers for on-demand lesson generation
const SIMPLE_STATUS_PREFIX = 'simple-topic-status:';

function makeSimpleKey(subject: string): string {
  return `${SIMPLE_STATUS_PREFIX}${encodeURIComponent(subject)}`;
}

export function loadTopicProgress(subject: string, topicCount: number): TopicStatus[] {
  if (typeof window === 'undefined') {
    return Array(topicCount).fill('not-generated');
  }

  try {
    const stored = window.localStorage.getItem(makeSimpleKey(subject));
    if (stored) {
      const parsed = JSON.parse(stored) as TopicStatus[];
      // Ensure array has correct length
      while (parsed.length < topicCount) {
        parsed.push('not-generated');
      }
      return parsed.slice(0, topicCount);
    }
  } catch (error) {
    console.warn('Failed to load topic progress', error);
  }

  return Array(topicCount).fill('not-generated');
}

export function saveTopicProgress(subject: string, statuses: TopicStatus[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(makeSimpleKey(subject), JSON.stringify(statuses));
  } catch (error) {
    console.warn('Failed to save topic progress', error);
  }
}

export function completeTopic(subject: string, topicIndex: number, totalTopics: number): void {
  const statuses = loadTopicProgress(subject, totalTopics);
  statuses[topicIndex] = 'completed';
  saveTopicProgress(subject, statuses);
}

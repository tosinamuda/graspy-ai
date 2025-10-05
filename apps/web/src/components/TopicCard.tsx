'use client';

import type { TopicStatus } from '@/lib/topic-progress';

interface TopicCardProps {
  index: number;
  title: string;
  status: TopicStatus;
  onClick?: () => void;
}

const STATUS_STYLES: Record<TopicStatus, string> = {
  unlocked: 'border-teal-500 bg-white hover:shadow-md',
  locked: 'border-gray-200 bg-gray-50 text-gray-400',
  completed: 'border-teal-200 bg-teal-50 text-teal-800 hover:shadow-sm',
};

const STATUS_ICON: Record<TopicStatus, string> = {
  unlocked: '✅',
  locked: '🔒',
  completed: '✓',
};

export default function TopicCard({ index, title, status, onClick }: TopicCardProps) {
  const displayIndex = index + 1;
  const isInteractive = status !== 'locked';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={`w-full text-left rounded-xl border p-4 transition-shadow ${
        STATUS_STYLES[status]
      } ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {STATUS_ICON[status]}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {displayIndex}. {title}
            </p>
            <p className="text-xs text-gray-500">
              {status === 'locked'
                ? 'Complete the previous topic to unlock this one'
                : status === 'completed'
                ? 'Completed — revisit anytime'
                : 'Ready when you are'}
            </p>
          </div>
        </div>
        {status !== 'locked' ? (
          <span className="text-sm font-medium text-teal-600">
            {status === 'completed' ? 'Review' : 'Start'} →
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-400">Locked</span>
        )}
      </div>
    </button>
  );
}

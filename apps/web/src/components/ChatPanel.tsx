'use client';

import { useEffect, useMemo, useRef } from 'react';
import { type ChatMessage, type CurriculumData, type LearningSession } from '@/lib/curriculum-db';
import { useI18n } from '@/lib/i18n-context';
import CurriculumSetupCard from '@/components/CurriculumSetupCard';
import LearningSessionCard from '@/components/LearningSessionCard';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  curriculum: CurriculumData | null;
  recommendedSubject: string | null;
  activeSession?: LearningSession;
  onLessonContinue: () => void;
  onSubmitLessonAnswer: (answerIndex: number) => void;
  onFinishLesson: () => void;
  onSendMessage?: (message: string) => void;
}

export default function ChatPanel({
  messages,
  isGenerating,
  curriculum,
  recommendedSubject,
  activeSession,
  onLessonContinue,
  onSubmitLessonAnswer,
  onFinishLesson,
  onSendMessage,
}: ChatPanelProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  );

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'bg-teal-50 text-teal-900';
      case 'status':
        return 'bg-teal-50 text-teal-900';
      case 'subject':
        return 'bg-teal-50 text-teal-900 border-l-4 border-teal-500';
      case 'complete':
        return 'bg-teal-100 text-teal-900';
      case 'error':
        return 'bg-red-50 text-red-900';
      default:
        return 'bg-gray-50 text-gray-900';
    }
  };

  return (
    <div className="w-[35%] bg-white border-l border-gray-200 flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
            G
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('chat.graspyTitle')}</h3>
            <p className="text-xs text-gray-500">{t('chat.graspySubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {orderedMessages.length === 0 && !isGenerating && (
          <div className="bg-teal-50 rounded-lg p-3 text-sm text-teal-900">
            <p>{t('chat.graspyWelcome')}</p>
          </div>
        )}

        {orderedMessages.map((message) => {
          if (message.type === 'component' && message.metadata?.component === 'curriculum_setup') {
            return (
              <div key={message.id} className="flex justify-start">
                <CurriculumSetupCard
                  curriculum={curriculum}
                  isGenerating={isGenerating}
                  nextSubject={recommendedSubject}
                  className="w-full"
                />
              </div>
            );
          }

          if (message.type === 'component' && message.metadata?.component === 'learning_session') {
            return (
              <div key={message.id} className="flex justify-start">
                <LearningSessionCard
                  session={activeSession}
                  onContinue={onLessonContinue}
                  onSubmitAnswer={onSubmitLessonAnswer}
                  onFinish={onFinishLesson}
                />
              </div>
            );
          }

          if (message.sender === 'user') {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-teal-600 px-4 py-2 text-sm text-white shadow-sm">
                  <p className="whitespace-pre-wrap leading-snug">{message.content}</p>
                </div>
              </div>
            );
          }

          if (message.type === 'subject') {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-teal-900">
                      ✓ {message.metadata?.subject || message.content}
                    </span>
                    <span className="text-xs text-teal-700 flex items-center gap-1">
                      {message.metadata?.topics && message.metadata.topics.length > 0
                        ? t('chat.topicsGenerated', {
                            count: message.metadata.topics.length,
                          })
                        : t('chat.generating')}
                    </span>
                  </div>

                  {message.metadata?.topics && message.metadata.topics.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-teal-900 leading-tight list-disc list-inside">
                      {message.metadata.topics.map((topic: string, idx: number) => (
                        <li key={`${message.id}-topic-${idx}`}>{topic}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-snug ${getMessageStyle(message.type)}`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.subject && (
                  <div className="mt-1 text-xs opacity-75">
                    {t('chat.addedToCurriculum')}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-teal-50 rounded-lg p-3 text-sm text-teal-900 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <span>{t('chat.generating')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('chat.askPlaceholder')}
            disabled={isGenerating}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGenerating && onSendMessage) {
                const input = e.currentTarget;
                if (input.value.trim()) {
                  onSendMessage(input.value.trim());
                  input.value = '';
                }
              }
            }}
          />
          <button
            disabled={isGenerating}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input?.value.trim() && onSendMessage) {
                onSendMessage(input.value.trim());
                input.value = '';
              }
            }}
          >
            {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

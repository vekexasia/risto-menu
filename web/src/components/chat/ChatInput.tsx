'use client';

import { useState, useCallback } from 'react';
import { useIsChatStreaming } from '@/stores/chatStore';
import { useTranslations } from '@/lib/i18n';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
}

export function ChatInput({ onSend, onCancel }: ChatInputProps) {
  const [value, setValue] = useState('');
  const isStreaming = useIsChatStreaming();
  const t = useTranslations('chat');

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="border-t border-gray-200 p-3 flex gap-2 items-end bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('inputPlaceholder')}
        className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/30"
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button
          onClick={onCancel}
          className="p-2.5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex-shrink-0"
          aria-label="Stop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="p-2.5 rounded-full bg-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      )}
    </div>
  );
}

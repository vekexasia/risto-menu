'use client';

import { useEffect, useRef } from 'react';
import { useChatMessages, useChatStore } from '@/stores/chatStore';
import { ChatBubble } from './ChatBubble';
import type { MenuEntry } from '@/lib/types';

interface ChatMessagesProps {
  locale: string;
  onItemClick: (item: MenuEntry) => void;
  onChoiceSelect: (messageId: string, selection: string) => void;
}

export function ChatMessages({ locale, onItemClick, onChoiceSelect }: ChatMessagesProps) {
  const messages = useChatMessages();
  const currentStreamId = useChatStore(s => s.currentStreamId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-4xl mb-3">👋</div>
          <p className="text-gray-500 text-sm">
            Ciao! Chiedimi del menu, allergie, o consigli su cosa ordinare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          message={msg}
          locale={locale}
          isStreaming={msg.id === currentStreamId}
          onItemClick={onItemClick}
          onChoiceSelect={(selection) => onChoiceSelect(msg.id, selection)}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

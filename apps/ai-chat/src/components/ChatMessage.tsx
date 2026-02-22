import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const hasError = !!message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`
          shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
          ${isUser ? 'bg-cyan/20 text-cyan' : 'bg-amber/20 text-amber'}
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div
        className={`
          flex-1 max-w-[80%] rounded-xl p-4
          ${isUser ? 'bg-cyan/10 border border-cyan/20' : 'glass-dark'}
          ${hasError ? 'border-alert-red/50' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-industrial-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="typing-indicator">
              思考中<span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        ) : hasError ? (
          <div className="flex items-start gap-2 text-alert-red">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{message.error}</span>
          </div>
        ) : (
          <div className="prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Timestamp */}
        {!isLoading && (
          <div className="mt-2 text-xs text-industrial-500 font-mono">
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

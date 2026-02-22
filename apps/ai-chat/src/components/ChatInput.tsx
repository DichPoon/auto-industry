import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = '输入消息...' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-3">
      <div className="flex items-end gap-3">
        {/* Attachment Button */}
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-industrial-700 transition-colors text-industrial-400 hover:text-industrial-200"
          title="添加附件"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="
              w-full bg-transparent resize-none outline-none
              text-white placeholder-industrial-500
              font-mono text-sm
            "
          />
        </div>

        {/* Voice Button */}
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-industrial-700 transition-colors text-industrial-400 hover:text-industrial-200"
          title="语音输入"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <motion.button
          type="submit"
          disabled={disabled || !input.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            p-2 rounded-lg transition-colors
            ${input.trim() && !disabled
              ? 'bg-cyan text-industrial-900 hover:bg-cyan-glow'
              : 'bg-industrial-700 text-industrial-500 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Suggestions */}
      <div className="mt-2 flex flex-wrap gap-2">
        {['查看设备状态', '读取温度数据', '连接设备'].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setInput(suggestion)}
            className="px-2 py-1 text-xs rounded bg-industrial-700 text-industrial-400 hover:bg-industrial-600 hover:text-industrial-200 transition-colors font-mono"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );
}

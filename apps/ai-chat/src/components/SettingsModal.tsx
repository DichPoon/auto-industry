import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Check, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKey, setApiKey, isApiKeySet } = useStore();
  const [inputKey, setInputKey] = useState(apiKey);

  const handleSave = () => {
    setApiKey(inputKey);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass rounded-xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-industrial-700">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber" />
                  <h2 className="text-lg font-display font-semibold text-white">
                    API 设置
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-industrial-700 transition-colors"
                >
                  <X className="w-5 h-5 text-industrial-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Status */}
                {isApiKeySet && (
                  <div className="flex items-center gap-2 text-alert-green bg-alert-green/10 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-mono">API Key 已配置</span>
                  </div>
                )}

                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-mono text-industrial-400 mb-2">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan transition-colors"
                  />
                </div>

                {/* Help */}
                <div className="text-xs text-industrial-500 space-y-1">
                  <p>
                    没有配置 API Key 也可以使用，系统会使用模拟响应。
                  </p>
                  <p>
                    配置 API Key 后可获得真实的 AI 响应能力。
                  </p>
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan hover:text-cyan-glow"
                  >
                    获取 API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-industrial-700">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 rounded-lg border border-industrial-600 text-industrial-300 font-mono text-sm hover:bg-industrial-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 px-4 rounded-lg bg-cyan/20 text-cyan font-mono text-sm hover:bg-cyan/30 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

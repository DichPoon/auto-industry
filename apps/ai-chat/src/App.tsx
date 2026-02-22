import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Trash2, Zap, Menu, X } from 'lucide-react';
import { useStore } from './store/useStore';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { DeviceSidebar } from './components/DeviceSidebar';
import { SettingsModal } from './components/SettingsModal';
import { createAIService } from './service/aiService';
import type { AIService } from './service/aiService';

const SYSTEM_PROMPT = `你是工业协议网关的 AI 助手。你可以帮助用户管理和监控工业设备。

你的能力包括：
- 查看设备状态和列表
- 连接/断开设备
- 读取传感器数据（温度、湿度、压力等）
- 写入数据到设备
- 订阅数据更新

当前配置的协议：MQTT, Modbus TCP, OPC UA, Siemens S7

请用中文回复用户，保持简洁专业的语气。使用工具来完成实际操作。`;

export default function App() {
  const {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    isTyping,
    setTyping,
    devices,
    isApiKeySet,
    apiKey,
  } = useStore();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiServiceRef = useRef<AIService | null>(null);

  // Initialize AI service
  useEffect(() => {
    aiServiceRef.current = createAIService(devices);
  }, [devices]);

  // Update API key when changed
  useEffect(() => {
    if (aiServiceRef.current && apiKey) {
      aiServiceRef.current.setApiKey(apiKey);
    }
  }, [apiKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content });

    // Add loading message for assistant
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
      isLoading: true,
    });

    setTyping(true);

    try {
      if (!aiServiceRef.current) {
        throw new Error('AI service not initialized');
      }

      // Build message history
      const chatHistory = messages
        .filter(m => !m.isLoading)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Add current message
      chatHistory.push({ role: 'user', content });

      let fullResponse = '';

      // Stream response
      for await (const event of aiServiceRef.current.streamChat(chatHistory, SYSTEM_PROMPT)) {
        if (event.type === 'text') {
          fullResponse += event.content;
          updateMessage(assistantMessageId, {
            content: fullResponse,
            isLoading: false,
          });
        }
      }
    } catch (error) {
      updateMessage(assistantMessageId, {
        content: '',
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setTyping(false);
    }
  }, [messages, addMessage, updateMessage, setTyping]);

  return (
    <div className="h-screen flex bg-industrial-900">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: showSidebar ? 280 : 0 }}
        className="shrink-0 border-r border-industrial-700 overflow-hidden"
      >
        <div className="w-[280px] h-full p-4">
          <DeviceSidebar />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass border-b border-industrial-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-industrial-700 transition-colors"
            >
              {showSidebar ? (
                <X className="w-5 h-5 text-industrial-400" />
              ) : (
                <Menu className="w-5 h-5 text-industrial-400" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="p-1.5 rounded-lg bg-gradient-to-br from-cyan/20 to-amber/20"
              >
                <Zap className="w-5 h-5 text-cyan" />
              </motion.div>

              <div>
                <h1 className="text-lg font-display font-semibold text-white">
                  AI 助手
                </h1>
                <p className="text-xs text-industrial-500 font-mono">
                  工业协议网关智能助手
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* API Status */}
            <div
              className={`px-2 py-1 rounded text-xs font-mono ${
                isApiKeySet
                  ? 'bg-alert-green/20 text-alert-green'
                  : 'bg-industrial-700 text-industrial-400'
              }`}
            >
              {isApiKeySet ? 'API 已连接' : '模拟模式'}
            </div>

            {/* Clear Chat */}
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg hover:bg-industrial-700 transition-colors"
              title="清空对话"
            >
              <Trash2 className="w-5 h-5 text-industrial-400" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-industrial-700 transition-colors"
              title="设置"
            >
              <Settings className="w-5 h-5 text-industrial-400" />
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-industrial-700">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isTyping}
            placeholder={isTyping ? 'AI 正在思考...' : '输入消息或指令...'}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

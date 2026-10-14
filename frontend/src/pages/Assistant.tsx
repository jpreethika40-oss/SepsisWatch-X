import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, RefreshCw, Copy, Check, Trash2, 
  User, Activity, ShieldAlert, Database, Info, AlertCircle 
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelProvider?: string;
}

const SUGGESTED_PROMPTS = [
  "Explain the current dataset's missing-value patterns.",
  "Summarize the latest model evaluation (LightGBM vs GRU-D).",
  "Explain how Split Conformal prediction provides uncertainty bounds.",
  "What are the active ICU ward alerts and critical bed statuses?",
  "Explain the alarm policy simulation and false alert cooldown.",
  "What are the Surviving Sepsis Campaign 1-Hour Bundle guidelines?"
];

export const Assistant: React.FC = () => {
  const { currentRole, selectedPatientId, patients } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: 
        "**Hello, I am the SepsisWatch-X Clinical AI Assistant.**\n\n" +
        "I am connected directly to your active ICU ward telemetry, predictive models (LightGBM, GRU-D, DANN), " +
        "split conformal uncertainty calibrator, and uploaded clinical datasets.\n\n" +
        "Select a suggested inquiry below or ask any question regarding ward sepsis trajectories, alarm policies, or model evaluations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelProvider: "SepsisWatch-X Grounded Engine"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');
    setErrorMessage(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          persona: currentRole,
          patient_id: selectedPatientId || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to communicate with AI Assistant service');
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelProvider: data.model_provider
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating assistant response');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear the current consultation history?')) {
      setMessages([
        {
          id: `msg-reset-${Date.now()}`,
          role: 'assistant',
          content: "Conversation history cleared. Ready for new clinical inquiry.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelProvider: "SepsisWatch-X Grounded Engine"
        }
      ]);
    }
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="glass-panel p-4 rounded-xl border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 bg-[#151311]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-ember">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold font-display text-white">
                SepsisWatch-X Clinical AI Assistant
              </h1>
              <span className="bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                Grounded in Live Telemetry
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Active Persona: <strong className="text-amber-400 capitalize">{currentRole.replace('_', ' ')}</strong> • 12 Ward Beds Grounded
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-red-400 transition"
            title="Clear conversation history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Message Feed */}
      <div className="flex-1 glass-panel rounded-xl border border-stone-800 p-4 overflow-y-auto space-y-4 bg-[#0E0D0C]/80">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono ${
                  isUser
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-orange-500/20 border border-orange-500/40 text-orange-400 glow-ember'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs font-sans leading-relaxed border ${
                  isUser
                    ? 'bg-[#1E1B18] border-amber-500/30 text-stone-100 shadow-md'
                    : 'bg-[#141210] border-stone-800 text-stone-200'
                }`}
              >
                {/* Message Header with Model & Time */}
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-1.5 mb-2 text-[10px] font-mono text-stone-400">
                  <span>{isUser ? 'You' : msg.modelProvider || 'SepsisWatch-X Clinical AI'}</span>
                  <div className="flex items-center space-x-2">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-stone-200 transition"
                        title="Copy response to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Content with Markdown Formatting */}
                <div className="prose prose-invert prose-xs max-w-none font-mono whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#141210] border border-stone-800 rounded-2xl p-3 text-xs font-mono text-stone-400 flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>Analyzing live telemetry, models & clinical evidence...</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs font-mono text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-[11px] font-mono text-stone-400">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-stone-500 whitespace-nowrap">Suggested:</span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 hover:border-amber-500/40 whitespace-nowrap transition flex-shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="glass-panel p-2.5 rounded-xl border border-stone-800 bg-[#141210] flex items-end space-x-2">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about patient risk trajectories, model architecture, calibration, or upload troubleshooting (Enter to send, Shift+Enter for newline)..."
          className="flex-1 bg-transparent border-0 resize-none text-xs font-mono text-stone-100 placeholder-stone-500 p-2 focus:outline-none max-h-24"
          rows={2}
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-medium text-xs font-mono flex items-center space-x-1.5 transition shadow-lg shadow-orange-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

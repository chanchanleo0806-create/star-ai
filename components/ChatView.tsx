import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Message, Attachment } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMsgId, role: 'model', content: '', timestamp: Date.now(), isThinking: true }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [...messages, userMsg].map(m => ({ role: m.role, parts: [{ text: m.content }] })),
        config: { thinkingConfig: { thinkingBudget: 15000 } }
      });
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: response.text || "", isThinking: false } : m));
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: "오류가 발생했습니다.", isThinking: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header glass flex items-center justify-between">
        <div className="flex items-center" style={{ gap: '0.75rem' }}>
          <div className="flex items-center justify-center" style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
          </div>
          <span className="gradient-text" style={{ fontWeight: 900, fontSize: '1.125rem' }}>Chat Pro</span>
        </div>
        <div style={{ padding: '0.375rem 0.75rem', borderRadius: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
          Engine Active
        </div>
      </header>

      <div ref={scrollRef} className="message-area">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ opacity: 0.3, textAlign: 'center' }}>
            {/* Fix: Corrected justifyCenter to justifyContent */}
            <div style={{ width: '5rem', height: '5rem', borderRadius: '1.5rem', background: '#0f172a', border: '1px solid var(--star-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
               <svg style={{ width: '2.5rem', height: '2.5rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="1.5" /></svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', margin: 0 }}>Star AI Intelligence</h3>
            <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>대화를 시작해 보세요.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="flex flex-col" style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className="glass" style={{
              maxWidth: '80%',
              padding: '1rem 1.5rem',
              borderRadius: '2rem',
              background: m.role === 'user' ? 'var(--star-primary)' : 'var(--star-surface)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {m.isThinking ? (
                <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                  <div className="flex items-center" style={{ gap: '0.5rem' }}>
                    <div className="thinking-shimmer"></div>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase' }}>Reasoning...</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{m.content}</div>
              )}
            </div>
            <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--star-text-dark)', marginTop: '0.5rem', padding: '0 0.75rem', textTransform: 'uppercase' }}>
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      <div className="input-container">
        <div className="input-box flex items-center">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            placeholder="스타 AI에게 물어보세요..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              padding: '1rem',
              resize: 'none',
              fontWeight: 700
            }}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            className="btn-primary"
            style={{ margin: '0.25rem' }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
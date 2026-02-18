import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message, ChatSession, Attachment } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('star_ai_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed)) setSessions(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const saveSessionToStorage = (sessionId: string, updatedMessages: Message[]) => {
    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === sessionId);
      let newSessions;
      if (existingIdx !== -1) {
        newSessions = [...prev];
        newSessions[existingIdx] = { ...newSessions[existingIdx], messages: updatedMessages, lastUpdate: Date.now() };
      } else {
        const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || '새 대화';
        const newSession: ChatSession = { id: sessionId, title: firstUserMsg.slice(0, 30), messages: updatedMessages, lastUpdate: Date.now() };
        newSessions = [newSession, ...prev];
      }
      localStorage.setItem('star_ai_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedAttachments.length === 0) || isLoading) return;
    const activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) setCurrentSessionId(activeSessionId);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: Date.now(), attachments: selectedAttachments.length > 0 ? [...selectedAttachments] : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setSelectedAttachments([]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: Message = { id: botMsgId, role: 'model', content: '', timestamp: Date.now(), isThinking: true };
    setMessages((prev) => [...prev, botMsg]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const historyParts = newMessages.flatMap(m => {
        const parts: any[] = [{ text: m.content }];
        m.attachments?.forEach(att => parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
        return { role: m.role, parts };
      });

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: historyParts,
        config: { thinkingConfig: { thinkingBudget: 15000 }, tools: [{ googleSearch: {} }] },
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += (chunk as GenerateContentResponse).text || '';
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: fullText, isThinking: false } : m));
      }
      saveSessionToStorage(activeSessionId, [...newMessages, { ...botMsg, content: fullText, isThinking: false }]);
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: "오류가 발생했습니다.", isThinking: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/20">
      <header className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-bold text-amber-200">스타 AI</h2>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Engine</div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === 'user' ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-white/10'}`}>
              {m.isThinking ? <span className="text-xs text-amber-500 animate-pulse font-bold">● ● ●</span> : <div className="whitespace-pre-wrap text-sm">{m.content}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex items-center space-x-3 bg-slate-900 rounded-full px-5 py-2 border border-white/10">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3"
          />
          <button onClick={handleSendMessage} disabled={isLoading} className="p-3 rounded-full bg-amber-600 text-white disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
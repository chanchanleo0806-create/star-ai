
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message, ChatSession } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 초기 로드: 로컬 스토리지에서 세션 불러오기
  useEffect(() => {
    const savedSessions = localStorage.getItem('star_ai_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  // 메시지 변경 시 자동 스크롤 및 현재 세션 저장
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    if (messages.length > 0 && currentSessionId) {
      updateCurrentSession(messages);
    }
  }, [messages]);

  const updateCurrentSession = (updatedMessages: Message[]) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === currentSessionId);
      let newSessions;
      
      if (existing) {
        newSessions = prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: updatedMessages, lastUpdate: Date.now() } 
            : s
        );
      } else {
        // 첫 메시지 발송 시 세션 생성
        const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || '새로운 대화';
        const newSession: ChatSession = {
          id: currentSessionId!,
          title: firstUserMsg.slice(0, 20) + (firstUserMsg.length > 20 ? '...' : ''),
          messages: updatedMessages,
          lastUpdate: Date.now()
        };
        newSessions = [newSession, ...prev];
      }
      
      localStorage.setItem('star_ai_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setIsHistoryOpen(false);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsHistoryOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem('star_ai_sessions', JSON.stringify(newSessions));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 세션 ID가 없으면 생성 (메시지 전송 시점에 확정)
    const activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) setCurrentSessionId(activeSessionId);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isThinking: true,
    };

    setMessages((prev) => [...prev, botMessage]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const proSystemInstruction = `
        당신은 '자동 전문 답변 생성기(Expert Auto-Responder)' 역할을 수행한다.
        사용자가 질문을 입력하면, 되묻거나 추가 입력을 요구하지 말고, 아래 지침을 자동으로 내재화하여 바로 답변을 생성한다.

        [지침]
        1. 질문이 모호하거나 짧더라도, 사용자가 원하는 것을 스스로 추론해 가장 일반적이면서도 도움이 되는 맥락으로 확장한다.
        2. 답변의 관점은 실제 경험자, 전략 컨설턴트, 멘토의 시점을 입체적으로 조합한다.
        3. 톤과 말투는 고도의 친절함과 전문가의 팩트 기반 논리를 결합한다.
        4. 답변 구성은 항상 단계적이고 구조적이어야 한다 (도입 → 배경 → 방법론 → 예시 → 결론).
        5. 분량 규칙: 답변의 길이는 반드시 800자 이상, 1,500자 이하로 제한한다.
        6. 모든 주요 포인트마다 소제목(###)을 붙인다.
      `;

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: updatedMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: proSystemInstruction,
          thinkingConfig: { thinkingBudget: 12000 },
          tools: [{ googleSearch: {} }]
        },
      });

      let fullText = '';
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMessageId
              ? { ...m, content: fullText, isThinking: false }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMessageId
            ? { ...m, content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.", isThinking: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full transition-colors duration-500 bg-indigo-950/10 relative">
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/5 glass-morphism sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"></div>
          <div className="relative">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center space-x-2 group"
            >
              <h2 className="font-bold tracking-tight text-amber-200 group-hover:text-amber-100 transition-colors">
                스타 AI Pro {currentSessionId ? '대화 중' : '새 대화'}
              </h2>
              <svg className={`w-4 h-4 text-amber-500 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 히스토리 드롭다운 */}
            {isHistoryOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsHistoryOpen(false)}></div>
                <div className="absolute top-full left-0 mt-3 w-80 max-h-[70vh] overflow-y-auto glass-morphism rounded-2xl border border-white/10 shadow-2xl p-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors mb-2 text-amber-400 font-bold text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>새로운 대화 시작하기</span>
                  </button>
                  <div className="border-t border-white/5 my-2"></div>
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">이전 대화 목록</p>
                  {sessions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-xs italic">
                      저장된 대화가 없습니다.
                    </div>
                  ) : (
                    sessions.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => loadSession(s)}
                        className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer mb-1 ${
                          currentSessionId === s.id ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex flex-col items-start overflow-hidden">
                          <span className={`text-sm font-semibold truncate w-48 ${currentSessionId === s.id ? 'text-amber-200' : 'text-slate-300'}`}>
                            {s.title}
                          </span>
                          <span className="text-[10px] text-slate-500">{new Date(s.lastUpdate).toLocaleDateString()}</span>
                        </div>
                        <button 
                          onClick={(e) => deleteSession(e, s.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
            <button 
              onClick={handleNewChat}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"
              title="새 대화"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="px-3 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
              Engine: Gemini 3 Pro
            </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
             <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center border transition-all mb-2 shadow-inner bg-amber-500/10 border-amber-500/20 text-amber-500">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
             </div>
             <div className="space-y-4">
               <h3 className="text-4xl font-extrabold tracking-tight text-amber-100">
                 무제한 Pro 전문가 모드
               </h3>
               <p className="text-slate-400">대화 내용은 자동으로 저장되며, 상단 화살표를 눌러 불러올 수 있습니다.</p>
               <div className="p-6 rounded-3xl border bg-amber-500/5 border-amber-500/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 text-center">
                      <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center bg-amber-500/20 text-amber-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200">자동 대화 저장</h4>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center bg-amber-500/20 text-amber-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200">언제든 불러오기</h4>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center bg-amber-500/20 text-amber-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200">800-1500자 전문성</h4>
                    </div>
                  </div>
               </div>
             </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[75%] rounded-[1.5rem] px-6 py-5 shadow-2xl transition-all ${
              m.role === 'user' 
                ? 'bg-amber-600 text-white shadow-amber-900/30' 
                : 'bg-slate-900/80 border border-white/10 text-slate-100 backdrop-blur-md'
            }`}>
              {m.isThinking ? (
                <div className="flex items-center space-x-3 py-1">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] bg-amber-400"></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                    전문 지식 통합 및 리포트 구성 중...
                  </span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                   <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-normal">{m.content}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 border-t border-white/5 glass-morphism sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-slate-900/80 p-2 rounded-[2rem] border transition-all shadow-2xl focus-within:ring-2 border-amber-500/30 focus-within:ring-amber-500/20">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="대화를 시작하면 자동으로 저장됩니다..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 px-5 py-4 font-medium"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-4 rounded-full transition-all shadow-lg active:scale-95 ${
              inputValue.trim() && !isLoading 
                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                : 'bg-slate-800 text-slate-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

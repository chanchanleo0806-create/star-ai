
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
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const saveSessionToStorage = (sessionId: string, updatedMessages: Message[]) => {
    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === sessionId);
      let newSessions;
      
      if (existingIdx !== -1) {
        newSessions = [...prev];
        newSessions[existingIdx] = { 
          ...newSessions[existingIdx], 
          messages: updatedMessages, 
          lastUpdate: Date.now() 
        };
      } else {
        const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || '새로운 대화';
        const newSession: ChatSession = {
          id: sessionId,
          title: firstUserMsg.slice(0, 30).trim() + (firstUserMsg.length > 30 ? '...' : ''),
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
    setSelectedAttachments([]);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsHistoryOpen(false);
    setSelectedAttachments([]);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const promise = new Promise<Attachment>((resolve) => {
        reader.onload = () => {
          const base64Data = (reader.result as string).split(',')[1];
          resolve({
            mimeType: file.type,
            data: base64Data,
            url: URL.createObjectURL(file),
            name: file.name,
          });
        };
      });
      
      reader.readAsDataURL(file);
      newAttachments.push(await promise);
    }
    
    setSelectedAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[index].url);
      newArr.splice(index, 1);
      return newArr;
    });
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedAttachments.length === 0) || isLoading) return;

    const activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) setCurrentSessionId(activeSessionId);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
      attachments: selectedAttachments.length > 0 ? [...selectedAttachments] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setSelectedAttachments([]);
    setIsLoading(true);

    saveSessionToStorage(activeSessionId, newMessages);

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        당신은 고도로 훈련된 '스타 AI'입니다.
        사용자가 텍스트뿐만 아니라 이미지나 파일을 업로드할 수 있습니다.
        이미지가 포함된 경우 시각적 정보를 정밀하게 분석하여 답변에 반영하십시오.

        [핵심 원칙]
        1. 질문의 의도를 파악하여 배경 설명보다는 실행 가능한 솔루션을 우선합니다.
        2. 첨부파일(이미지 등)이 있다면 그 내용을 상세히 분석하여 답변의 근거로 삼으십시오.
        3. 답변은 논리적이며 구조적이어야 합니다 (### 소제목 활용).
        4. 분량은 가급적 800자 이상 1,500자 이하를 유지하며, 정보 밀도를 높입니다.
      `;

      const historyParts = newMessages.flatMap(m => {
        const parts: any[] = [{ text: m.content }];
        if (m.attachments) {
          m.attachments.forEach(att => {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data
              }
            });
          });
        }
        return { role: m.role, parts };
      });

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: historyParts,
        config: {
          systemInstruction: systemInstruction,
          thinkingConfig: { thinkingBudget: 15000 },
          tools: [{ googleSearch: {} }]
        },
      });

      let fullText = '';
      let currentFullMessages: Message[] = [];

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';
        
        const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const groundingUrls = groundingChunks
          ?.map((chunk: any) => {
            if (chunk.web && chunk.web.uri) {
              return { title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri };
            }
            return null;
          })
          .filter(Boolean) as Array<{ title: string; uri: string }> | undefined;

        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (m.id === botMessageId) {
              const updatedMsg = { ...m, content: fullText, isThinking: false };
              if (groundingUrls && groundingUrls.length > 0) {
                updatedMsg.groundingUrls = groundingUrls;
              }
              return updatedMsg;
            }
            return m;
          });
          currentFullMessages = updated;
          return updated;
        });
      }
      
      saveSessionToStorage(activeSessionId, currentFullMessages);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMessageId
            ? { ...m, content: "죄송합니다. 엔진 연결에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", isThinking: false }
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
              className="flex items-center space-x-2 group focus:outline-none"
            >
              <h2 className="font-bold tracking-tight text-amber-200 group-hover:text-amber-100 transition-colors">
                {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title || '대화 중' : '스타 AI'}
              </h2>
              <svg className={`w-4 h-4 text-amber-500 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isHistoryOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsHistoryOpen(false)}></div>
                <div className="absolute top-full left-0 mt-3 w-80 max-h-[75vh] overflow-y-auto glass-morphism rounded-2xl border border-white/10 shadow-2xl p-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-2xl bg-slate-900/90">
                  <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-colors mb-1 text-amber-400 font-bold text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>새로운 대화 시작</span>
                  </button>
                  <div className="border-t border-white/5 my-2"></div>
                  <div className="space-y-1">
                    {sessions.map(s => (
                      <div key={s.id} onClick={() => loadSession(s)} className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${currentSessionId === s.id ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                        <div className="flex flex-col items-start overflow-hidden flex-1">
                          <span className={`text-sm font-semibold truncate w-full ${currentSessionId === s.id ? 'text-amber-200' : 'text-slate-300'}`}>{s.title}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5">{new Date(s.lastUpdate).toLocaleString()}</span>
                        </div>
                        <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all ml-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={handleNewChat} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-amber-400 transition-colors" title="새 대화">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
            <div className="px-3 py-1 rounded-full border bg-amber-500/5 border-amber-500/20 text-amber-500/60 text-[10px] font-bold uppercase tracking-widest hidden sm:block">Star AI Engine</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scroll-smooth">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center border transition-all mb-2 shadow-inner bg-amber-500/10 border-amber-500/20 text-amber-500">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <div className="space-y-4">
               <h3 className="text-4xl font-black tracking-tighter text-amber-100">스타 AI 지능형 모드</h3>
               <p className="text-slate-400 font-medium">일상에 지능을 더하세요. 사진이나 파일을 함께 분석합니다.</p>
             </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] md:max-w-[75%] rounded-[1.8rem] px-6 py-5 shadow-2xl transition-all ${m.role === 'user' ? 'bg-amber-600 text-white shadow-amber-900/30 font-medium' : 'bg-slate-900/90 border border-white/10 text-slate-100 backdrop-blur-xl'}`}>
              
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {m.attachments.map((att, i) => (
                    <div key={i} className="relative group">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.url} alt="upload" className="w-32 h-32 object-cover rounded-xl border border-white/10" />
                      ) : (
                        <div className="w-32 h-32 bg-slate-800 rounded-xl flex flex-col items-center justify-center p-2 text-center border border-white/10">
                          <svg className="w-8 h-8 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className="text-[10px] truncate w-full">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {m.isThinking ? (
                <div className="flex items-center space-x-3 py-1">
                  <div className="flex space-x-1.5"><div className="w-2 h-2 rounded-full animate-bounce bg-amber-400"></div><div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] bg-amber-400"></div><div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] bg-amber-400"></div></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-500">분석 중...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                   <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</div>
                </div>
              )}

              {m.groundingUrls && m.groundingUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">참고 자료</p>
                  <div className="flex flex-wrap gap-2">
                    {m.groundingUrls.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center space-x-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-amber-200 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <span className="max-w-[120px] truncate">{link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 border-t border-white/5 glass-morphism sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {selectedAttachments.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 bg-slate-900/60 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-2">
              {selectedAttachments.map((att, i) => (
                <div key={i} className="relative w-16 h-16 group">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.url} className="w-full h-full object-cover rounded-lg border border-white/20" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded-lg flex items-center justify-center border border-white/20">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                  <button onClick={() => removeAttachment(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-lg hover:bg-red-600 transition-colors">
                    <svg className="w-3.3 h-3.3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-4 bg-slate-900/90 p-2 rounded-[2.2rem] border transition-all shadow-2xl focus-within:ring-2 border-amber-500/30 focus-within:ring-amber-500/20 focus-within:bg-slate-900">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="궁금한 점을 물어보거나 파일을 첨부하세요..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 px-2 py-4 font-medium"
            />
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && selectedAttachments.length === 0) || isLoading}
              className={`p-4 rounded-full transition-all shadow-lg active:scale-90 ${ (inputValue.trim() || selectedAttachments.length > 0) && !isLoading ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-600' }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-4">
          Star Shield Privacy System Active
        </p>
      </div>
    </div>
  );
};

export default ChatView;

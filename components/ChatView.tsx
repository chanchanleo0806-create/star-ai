import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message, Attachment } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setSelectedAttachments(prev => [...prev, { name: file.name, mimeType: file.type, data: base64, url: URL.createObjectURL(file) }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedAttachments.length === 0) || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: Date.now(), attachments: selectedAttachments.length > 0 ? [...selectedAttachments] : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedAttachments([]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMsgId, role: 'model', content: '', timestamp: Date.now(), isThinking: true }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contents = [...messages, userMsg].map(m => {
        const parts: any[] = [{ text: m.content }];
        m.attachments?.forEach(att => parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
        return { role: m.role, parts };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: {
          thinkingConfig: { thinkingBudget: 15000 },
          tools: isSearchMode ? [{ googleSearch: {} }] : undefined
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingUrls = groundingChunks?.map((chunk: any) => ({ title: chunk.web?.title || "정보 원천", uri: chunk.web?.uri })).filter((item: any) => item.uri);

      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: response.text || "", isThinking: false, groundingUrls: groundingUrls && groundingUrls.length > 0 ? groundingUrls : undefined } : m));
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: "죄송합니다. 오류가 발생했습니다.", isThinking: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
          </div>
          <span className="font-black tracking-tighter text-lg gradient-text">Chat Pro</span>
        </div>
        <button 
          onClick={() => setIsSearchMode(!isSearchMode)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${isSearchMode ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5" /></svg>
          <span>{isSearchMode ? 'Deep Search On' : 'Search Off'}</span>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
             <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center animate-float">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="1.5" /></svg>
             </div>
             <div>
               <h3 className="text-2xl font-black text-white">반갑습니다, {localStorage.getItem('star_ai_user')}님</h3>
               <p className="text-sm font-bold">무엇이든 물어보세요. 지능적인 답변을 드릴게요.</p>
             </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            {m.attachments && (
              <div className="flex gap-2 mb-3">
                {m.attachments.map((att, i) => <img key={i} src={att.url} className="w-32 h-32 rounded-2xl object-cover border border-white/10 shadow-lg" alt="upload" />)}
              </div>
            )}
            <div className={`max-w-[85%] rounded-[2rem] px-6 py-4 shadow-xl ${m.role === 'user' ? 'bg-blue-600 text-white shadow-blue-900/20' : 'glass border-white/10'}`}>
              {m.isThinking ? (
                <div className="space-y-3 py-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Star Engine Reasoning...</span>
                  </div>
                  <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full thinking-shimmer rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.content}</div>
              )}
              {!m.isThinking && m.groundingUrls && (
                <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified Sources</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.groundingUrls.map((url, i) => (
                        <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="citation-card flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" /></svg>
                          </div>
                          <span className="text-[10px] font-bold text-slate-300 truncate">{url.title}</span>
                        </a>
                      ))}
                   </div>
                </div>
              )}
            </div>
            <span className="text-[8px] font-black text-slate-600 mt-2 px-3 uppercase tracking-tighter opacity-50">
              {new Date(m.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-10 bg-gradient-to-t from-star-dark to-transparent shrink-0">
        <div className="max-w-4xl mx-auto flex items-end space-x-3 bg-slate-900/80 p-2 rounded-[2.5rem] border border-white/5 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-500 hover:text-blue-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" /></svg>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            placeholder="스타 AI에게 물어보세요..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-600 py-4 px-2 resize-none max-h-40 font-bold"
          />
          <button onClick={handleSendMessage} disabled={isLoading} className={`p-4 rounded-[1.5rem] transition-all ${isLoading || (!inputValue.trim() && selectedAttachments.length === 0) ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow-lg hover:bg-blue-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
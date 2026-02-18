import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message, ChatSession, Attachment } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
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
        const attachment: Attachment = {
          name: file.name,
          mimeType: file.type,
          data: base64,
          url: URL.createObjectURL(file)
        };
        setSelectedAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedAttachments.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
      attachments: selectedAttachments.length > 0 ? [...selectedAttachments] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedAttachments([]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    const initialBotMsg: Message = {
      id: botMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isThinking: true
    };
    setMessages(prev => [...prev, initialBotMsg]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contents = [...messages, userMsg].map(m => {
        const parts: any[] = [{ text: m.content }];
        m.attachments?.forEach(att => {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        });
        return { role: m.role, parts };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: {
          thinkingConfig: { thinkingBudget: 15000 },
          tools: [{ googleSearch: {} }]
        }
      });

      const fullText = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingUrls = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || chunk.web?.uri || "출처",
        uri: chunk.web?.uri
      })).filter((item: any) => item.uri);

      // Simple heuristic for thinking part if available in response.text
      // (Actual SDK might separate this in future, currently it might be part of response)
      setMessages(prev => prev.map(m => 
        m.id === botMsgId 
          ? { 
              ...m, 
              content: fullText, 
              isThinking: false, 
              groundingUrls: groundingUrls && groundingUrls.length > 0 ? groundingUrls : undefined 
            } 
          : m
      ));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: "죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.", isThinking: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-star-primary/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-star-primary ai-sparkle" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
            </svg>
          </div>
          <span className="font-extrabold tracking-tight text-lg gradient-text">Star AI Pro</span>
        </div>
        <div className="flex items-center space-x-2">
           <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gemini 3 Engine</span>
        </div>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
             <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center mb-2 animate-float">
                <svg className="w-10 h-10 text-star-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <h3 className="text-2xl font-bold">무엇을 도와드릴까요?</h3>
             <p className="max-w-xs text-sm text-slate-400">최신 웹 검색과 고도의 추론 능력을 갖춘 스타 AI가 대기 중입니다.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            {/* Attachments Preview in Message */}
            {m.attachments && m.attachments.length > 0 && (
              <div className="flex gap-2 mb-2">
                {m.attachments.map((att, idx) => (
                  <div key={idx} className="w-32 h-32 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.url} className="w-full h-full object-cover" alt="attachment" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] p-2 text-center">{att.name}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={`max-w-[90%] md:max-w-[75%] rounded-3xl px-6 py-4 ${
              m.role === 'user' 
                ? 'bg-star-primary text-white shadow-xl shadow-blue-900/20' 
                : 'chat-bubble-model'
            }`}>
              {m.isThinking ? (
                <div className="flex items-center space-x-2 py-1">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-star-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-star-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-star-primary rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-xs font-bold text-star-primary uppercase tracking-widest ml-2">Thinking...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              )}

              {/* Grounding Sources */}
              {!m.isThinking && m.groundingUrls && m.groundingUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sources & Citations</p>
                  <div className="flex flex-wrap gap-2">
                    {m.groundingUrls.map((url, i) => (
                      <a 
                        key={i} 
                        href={url.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-300 transition-all"
                      >
                        <svg className="w-3 h-3 text-star-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="truncate max-w-[120px]">{url.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-slate-600 mt-2 px-2 uppercase tracking-tighter">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && <div className="h-10"></div>}
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-10 bg-gradient-to-t from-star-dark via-star-dark to-transparent">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Attachment Preview Bar */}
          {selectedAttachments.length > 0 && (
            <div className="flex gap-3 animate-in slide-in-from-bottom-4 duration-300 overflow-x-auto pb-2">
              {selectedAttachments.map((att, i) => (
                <div key={i} className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-star-primary shadow-lg shadow-blue-900/20">
                    <img src={att.url} className="w-full h-full object-cover" alt="preview" />
                  </div>
                  <button 
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="glass rounded-[2rem] p-2 flex items-center shadow-2xl focus-within:ring-2 focus-within:ring-star-primary/30 transition-all">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-slate-400 hover:text-star-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange} 
            />
            
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="무엇이든 물어보세요..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-500 py-4 px-2 resize-none max-h-40 overflow-y-auto font-medium"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputValue.trim() && selectedAttachments.length === 0)}
              className={`p-4 rounded-2xl transition-all transform active:scale-95 ${
                isLoading || (!inputValue.trim() && selectedAttachments.length === 0)
                  ? 'bg-slate-800 text-slate-600'
                  : 'bg-star-primary text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500'
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
            Star AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
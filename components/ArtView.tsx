import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ImageGeneration } from '../types';

const ArtView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<ImageGeneration[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          }
        }
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            const base64 = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64}`;
            const newGen: ImageGeneration = {
              id: Date.now().toString(),
              prompt,
              imageUrl,
              timestamp: Date.now(),
            };
            setHistory(prev => [newGen, ...prev]);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Control Panel */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col glass-morphism bg-slate-900/30 overflow-y-auto shrink-0">
        <h2 className="text-xl font-bold mb-6 hidden md:block">아트 스튜디오</h2>
        
        <div className="space-y-6 flex-1">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">이미지 프롬프트</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="무엇을 그려드릴까요?"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm h-24 md:h-32 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">비율 설정</label>
            <div className="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {['1:1', '3:4', '4:3', '16:9', '9:16'].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap ${
                    aspectRatio === ratio ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center space-x-2 ${
              prompt.trim() && !isGenerating ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                 <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span>창작 중...</span>
              </div>
            ) : (
              <span>이미지 생성</span>
            )}
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 bg-slate-950 overflow-y-auto p-4 md:p-10">
        {history.length === 0 && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-10">
             <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
             </div>
             <p className="text-sm font-bold">생성된 이미지가 여기에 나타납니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            {isGenerating && (
              <div className="aspect-square bg-slate-900 rounded-3xl animate-pulse flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5">
                 <p className="text-xs font-bold text-slate-600">아이디어를 구현하는 중...</p>
              </div>
            )}
            {history.map(item => (
              <div key={item.id} className="group relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-white/5">
                <img src={item.imageUrl} alt={item.prompt} className="w-full h-auto object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-xs text-slate-300 line-clamp-2 mb-3">{item.prompt}</p>
                   <a href={item.imageUrl} download={`star-ai-${item.id}.png`} className="block w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-center text-xs font-bold backdrop-blur-md transition-all">
                     저장하기
                   </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtView;
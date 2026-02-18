
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
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
    } catch (err) {
      console.error('Generation error:', err);
      alert('이미지 생성에 실패했습니다. 다른 프롬프트를 시도해 보세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full">
      {/* Control Panel */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col glass-morphism">
        <h2 className="text-xl font-bold mb-6">아트 스튜디오</h2>
        
        <div className="space-y-6 flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">프롬프트</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 네온 사인이 반짝이는 사이버펑크 도시, 디지털 아트 스타일..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">가로세로 비율</label>
            <div className="grid grid-cols-3 gap-2">
              {['1:1', '3:4', '4:3', '16:9', '9:16'].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 text-xs rounded-lg border transition-all ${
                    aspectRatio === ratio ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
            prompt.trim() && !isGenerating ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
               <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span>꿈꾸는 중...</span>
            </>
          ) : (
            <>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
               <span>걸작 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* Results Area */}
      <div className="flex-1 bg-slate-950 overflow-y-auto p-6 md:p-10">
        {history.length === 0 && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6 opacity-50">
             <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
             </div>
             <div>
                <p className="text-lg font-semibold">창작할 준비가 되셨나요?</p>
                <p className="text-sm">왼쪽 프롬프트에 내용을 입력하여 고품질 AI 이미지를 생성해보세요.</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isGenerating && (
              <div className="aspect-square bg-slate-900 rounded-3xl animate-pulse border-2 border-dashed border-slate-700 flex flex-col items-center justify-center space-y-4">
                 <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-slate-800 animate-spin"></div>
                 <p className="text-sm font-medium text-slate-500">Gemini가 스케치 중입니다...</p>
              </div>
            )}
            {history.map(item => (
              <div key={item.id} className="group relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 transition-transform hover:scale-[1.02]">
                <img src={item.imageUrl} alt={item.prompt} className="w-full h-auto object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-6 translate-y-full group-hover:translate-y-0 transition-transform">
                   <p className="text-sm text-slate-200 line-clamp-3">{item.prompt}</p>
                   <div className="flex justify-between items-center mt-4">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <a href={item.imageUrl} download={`gemini-art-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                   </div>
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

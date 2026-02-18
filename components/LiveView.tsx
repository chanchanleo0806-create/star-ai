import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Orb Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const render = () => {
      time += isActive ? 0.05 : 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = canvas.width * 0.3;

      // Draw Layers
      for (let i = 0; i < 3; i++) {
        const t = time + i * 2;
        const radius = baseRadius + Math.sin(t) * (isActive ? 15 : 5);
        const opacity = isActive ? 0.4 - i * 0.1 : 0.2 - i * 0.05;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? `rgba(59, 130, 246, ${opacity})` : i === 1 ? `rgba(139, 92, 246, ${opacity})` : `rgba(245, 158, 11, ${opacity})`;
        ctx.fill();
        ctx.filter = `blur(${10 + i * 10}px)`;
      }

      // Inner Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.6 + Math.cos(time * 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.filter = 'blur(4px)';
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isActive]);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) sessionRef.current.close?.();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContextRef.current;
              if (ctx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.onended = () => sourcesRef.current.delete(source);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }
            if (message.serverContent?.inputTranscription) setTranscription(prev => [...prev.slice(-4), `User: ${message.serverContent?.inputTranscription?.text}`]);
            if (message.serverContent?.outputTranscription) setTranscription(prev => [...prev.slice(-4), `AI: ${message.serverContent?.outputTranscription?.text}`]);
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: stopSession,
          onclose: stopSession
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: '당신은 스타 AI의 보이스 엔진입니다. 간결하고 지적으로 대답하세요.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
      <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
        
        <div className="text-center space-y-2">
           <div className={`mx-auto w-fit px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
             {isActive ? 'Cognitive Active' : 'Neural Standby'}
           </div>
           <h2 className="text-4xl font-black tracking-tighter gradient-text">보이스 코어 v2</h2>
        </div>

        <div className="relative ai-orb-container group">
           <canvas 
             ref={canvasRef} 
             width={400} 
             height={400} 
             className="w-64 h-64 md:w-80 md:h-80 cursor-pointer"
             onClick={isActive ? stopSession : startSession}
           />
           
           <button
             onClick={isActive ? stopSession : startSession}
             disabled={isConnecting}
             className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-90 z-20 ${
               isActive ? 'text-white' : 'text-slate-400'
             }`}
           >
             {isConnecting ? (
               <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : isActive ? (
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
             ) : (
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             )}
           </button>
        </div>

        <div className="w-full glass rounded-[2rem] p-6 min-h-[160px] flex flex-col justify-center space-y-3">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Neural Link Stream</span>
             <div className="flex space-x-1">
               {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`} style={{animationDelay: `${i*0.1}s`}}></div>)}
             </div>
           </div>
           {transcription.length > 0 ? (
             transcription.map((t, i) => (
               <div key={i} className={`text-sm font-bold animate-in fade-in slide-in-from-bottom-1 duration-300 ${t.startsWith('AI') ? 'text-blue-200' : 'text-slate-400'}`}>
                 {t}
               </div>
             ))
           ) : (
             <p className="text-center text-slate-600 font-bold italic py-4">스타 AI와 대화를 시작하려면 코어를 터치하세요.</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveView;
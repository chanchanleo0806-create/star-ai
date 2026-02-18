import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

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
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
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

            if (message.serverContent?.inputTranscription) {
                setTranscription(prev => [...prev.slice(-6), `나: ${message.serverContent?.inputTranscription?.text}`]);
            }
            if (message.serverContent?.outputTranscription) {
                setTranscription(prev => [...prev.slice(-6), `스타: ${message.serverContent?.outputTranscription?.text}`]);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Voice error:', e);
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: '당신은 스타 AI의 실시간 보이스 엔진입니다. 사용자에게 예의 바르고 명쾌하게 대답하십시오.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session', err);
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/20 p-4 md:p-8">
      <div className="max-w-md w-full glass-morphism p-6 md:p-10 rounded-[2.5rem] border border-white/10 flex flex-col items-center space-y-8 md:space-y-12 text-center shadow-2xl relative overflow-hidden bg-slate-900/60">
        
        <div className="flex flex-col items-center space-y-2">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isActive ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
            {isActive ? 'Live Interaction' : 'Standby Mode'}
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">음성 엔진</h2>
        </div>

        <div className="relative flex items-center justify-center h-40 w-40 md:h-56 md:w-56">
          <div className={`absolute inset-0 rounded-full border-2 border-amber-500/20 ${isActive ? 'animate-[ping_3s_infinite]' : ''}`}></div>
          <div className={`absolute inset-6 rounded-full border-2 border-amber-500/30 ${isActive ? 'animate-[ping_2s_infinite]' : ''}`}></div>
          
          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`relative z-10 w-28 h-28 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl ${
              isActive 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-900/40' 
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
            }`}
          >
            {isConnecting ? (
              <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isActive ? (
              <svg className="w-10 h-10 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-10 h-10 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        <div className="w-full bg-slate-950/80 p-5 rounded-3xl min-h-[120px] text-xs font-bold text-slate-400 text-left border border-white/5 space-y-2">
           <div className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Real-time Transcription</div>
           {transcription.length > 0 ? (
             transcription.map((t, i) => (
               <div key={i} className={`animate-in fade-in slide-in-from-bottom-1 duration-300 ${t.startsWith('스타') ? 'text-amber-200' : 'text-slate-300'}`}>
                 {t}
               </div>
             ))
           ) : (
             <div className="italic text-slate-700 h-full flex items-center justify-center">대화를 시작하세요...</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveView;
import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (name: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    // 부팅 속도 향상을 위해 지연 시간을 300ms로 단축
    setTimeout(() => {
      onLogin(name.trim());
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full h-full relative z-[100]">
      <div className="max-w-md w-full glass-morphism p-10 rounded-[2.5rem] border border-white/30 shadow-[0_0_80px_rgba(0,0,0,0.8)] space-y-8 animate-in fade-in zoom-in duration-500 bg-slate-900/90">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] mb-2 border border-white/20">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-amber-400 bg-clip-text text-transparent">
              스타 AI
            </h1>
            <p className="text-amber-200/60 text-xs font-bold uppercase tracking-[0.3em]">Star Intelligence</p>
          </div>
          <p className="text-slate-300 font-medium">프리미엄 지능형 어시스턴트 서비스</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest px-1">접속자 이름</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해 주세요"
              className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-700 text-white font-bold text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center space-x-3 shadow-2xl active:scale-[0.97] ${
              !isLoading && name.trim() 
              ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white shadow-amber-900/40' 
              : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>시작하기</span>
            )}
          </button>
        </form>

        <div className="pt-8 border-t border-white/5 text-center flex flex-col items-center">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mb-1">
            STAR SHIELD PROTECTED
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[8px] text-slate-600 font-bold">시스템 정상 작동 중</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
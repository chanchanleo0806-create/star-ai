
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
    // 인공적인 로딩 지연
    setTimeout(() => {
      onLogin(name.trim());
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full h-full relative z-20">
      <div className="max-w-md w-full glass-morphism p-10 rounded-[2.5rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-4 border border-white/10">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            스타 AI
          </h1>
          <p className="text-slate-300 font-medium">일상에 지능을 더하는 스마트 어시스턴트</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">당신의 이름</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg ${
              !isLoading && name.trim() 
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 text-white active:scale-[0.98]' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>무료로 시작하기</span>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Powered by Star Standard Engine
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

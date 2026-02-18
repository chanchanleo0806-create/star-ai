
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userName: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, userName, onLogout }) => {
  const menuItems = [
    { id: AppView.CHAT, label: '스타 AI 채팅', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.LIVE, label: '음성 대화', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: AppView.ART, label: '아트 스튜디오', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <aside className="w-64 glass-morphism h-full flex flex-col border-r border-white/5 hidden md:flex">
      <div className="p-8">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white font-bold bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
            S
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            스타 AI
          </h1>
        </div>
        <p className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold">
          Star Intelligence
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all ${
              currentView === item.id
                ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
        
        <div className="mt-8 px-4 py-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-slate-900/40 border border-white/5 text-center">
           <svg className="w-8 h-8 text-amber-500/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 2.944V22m0-19.056c-2.282 0-4.47.663-6.327 1.823A11.954 11.954 0 003.414 11c0 2.282.663 4.47 1.823 6.327a11.955 11.955 0 005.152 4.152M12 2.944c2.282 0 4.47.663 6.327 1.823a11.954 11.954 0 013.61 5.233c0 2.282-.663 4.47-1.823 6.327a11.955 11.955 0 01-5.152 4.152" />
           </svg>
           <p className="text-xs font-bold text-slate-400">엔터프라이즈 보안</p>
           <p className="text-[9px] text-slate-600 mt-1 uppercase font-black">Star Shield</p>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-2xl border border-white/5 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-amber-500 to-yellow-600">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{userName}님</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                Star Member
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userName: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, userName, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: AppView.CHAT, label: '스타 채팅', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.LIVE, label: '보이스 코어', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: AppView.ART, label: '아트 스튜디오', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <aside className="w-64 glass h-full flex flex-col border-r border-white/5 hidden md:flex shrink-0">
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-star-primary shadow-lg shadow-blue-500/30">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
          </div>
          <h1 className="text-xl font-black tracking-tighter gradient-text">STAR AI</h1>
        </div>
        <p className="text-[9px] text-star-primary font-black uppercase tracking-[0.3em] opacity-60">Version 2.5 Pro</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${
              currentView === item.id
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}

        <div className="mt-10 pt-6 border-t border-white/5 px-4">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">System Status</p>
           <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-bold">
                 <span className="text-slate-500 uppercase">Core Load</span>
                 <span className="text-blue-400">12%</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[12%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              </div>
              
              <div className="flex justify-between items-center text-[10px] font-bold">
                 <span className="text-slate-500 uppercase">Latency</span>
                 <span className="text-green-400">24ms</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 w-[8%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              </div>
           </div>
        </div>
      </nav>

      <div className="p-4 bg-black/20 space-y-4">
        <div className="flex items-center space-x-3 bg-slate-800/40 p-3 rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-star-primary to-star-secondary">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black truncate text-slate-200">{userName}님</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Pro Subscriber</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold text-slate-600 hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span>시스템 종료</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
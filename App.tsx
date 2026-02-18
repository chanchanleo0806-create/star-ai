import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import LiveView from './components/LiveView';
import ArtView from './components/ArtView';
import LoginView from './components/LoginView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const savedUser = localStorage.getItem('star_ai_user');
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (name: string) => {
    localStorage.setItem('star_ai_user', name);
    setUserName(name);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('star_ai_user');
    setIsLoggedIn(false);
    setUserName('');
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.CHAT: return <ChatView />;
      case AppView.LIVE: return <LiveView />;
      case AppView.ART: return <ArtView />;
      default: return <ChatView />;
    }
  };

  const navItems = [
    { id: AppView.CHAT, label: '채팅', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.LIVE, label: '음성', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: AppView.ART, label: '아트', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-slate-100 flex-col md:flex-row">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        userName={userName}
        onLogout={handleLogout}
      />

      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white font-bold bg-amber-500">S</div>
          <span className="font-bold tracking-tight text-amber-200">스타 AI</span>
        </div>
        <div className="flex items-center space-x-4">
           <span className="text-xs font-mono font-bold text-amber-500/80">
             {currentTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })}
           </span>
           <button onClick={handleLogout} className="text-slate-500">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
           </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col overflow-hidden pb-[72px] md:pb-0">
        {renderView()}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[72px] bg-slate-900/95 border-t border-white/10 backdrop-blur-xl flex items-center justify-around px-4 z-[50]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center justify-center space-y-1 w-16 transition-all ${
              currentView === item.id ? 'text-amber-400 scale-110' : 'text-slate-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
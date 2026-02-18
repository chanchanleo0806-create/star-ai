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

  useEffect(() => {
    const savedUser = localStorage.getItem('star_ai_user');
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
    }
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
      case AppView.CHAT:
        return <ChatView />;
      case AppView.LIVE:
        return <LiveView />;
      case AppView.ART:
        return <ArtView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-slate-100">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        userName={userName}
        onLogout={handleLogout}
      />
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
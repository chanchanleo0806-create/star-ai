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
    { id: AppView.CHAT, label: '스타 채팅', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.LIVE, label: '보이스 코어', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: AppView.ART, label: '아트 스튜디오', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <aside className="sidebar-container glass md-flex flex-col hidden">
      <div style={{ padding: '2rem' }}>
        <div className="flex items-center" style={{ gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div className="flex items-center justify-center" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.75rem', background: 'var(--star-primary)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
            <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
          </div>
          <h1 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>STAR AI</h1>
        </div>
        <p style={{ fontSize: '9px', color: 'var(--star-primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.6, margin: 0 }}>Version 2.6 Pro</p>
      </div>

      <nav className="flex-1" style={{ padding: '0 1rem', overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: '1rem',
              border: 'none',
              background: currentView === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: currentView === item.id ? '#60a5fa' : 'var(--star-text-dark)',
              cursor: 'pointer',
              marginBottom: '0.25rem',
              transition: 'all 0.2s'
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center glass" style={{ padding: '0.75rem', borderRadius: '1rem', gap: '0.75rem' }}>
          <div className="flex items-center justify-center" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', fontWeight: 800, background: 'linear-gradient(to bottom right, var(--star-primary), var(--star-secondary))' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 900, margin: 0, color: '#e2e8f0' }}>{userName}님</p>
            <p style={{ fontSize: '10px', color: 'var(--star-text-dark)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Pro Plan</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--star-text-dark)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          시스템 종료
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // 확장자를 명시해야 Babel이 파일을 정확히 가져옵니다.

const init = () => {
  const container = document.getElementById('root');
  if (!container) return;

  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Star AI: Successfully mounted.");
  } catch (err) {
    console.error("Star AI: Render error", err);
    container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">
      <h2 style="color:#f59e0b">런타임 오류</h2>
      <p style="font-size:12px; opacity:0.6">${err.message}</p>
    </div>`;
  }
};

// 즉시 실행
init();
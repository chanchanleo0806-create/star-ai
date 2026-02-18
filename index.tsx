import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // .tsx 확장자 제거 (MIME 오류 방지)

console.log("Star AI Engine: Bootstrap initiated.");

const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Star AI Engine: App mounted successfully.");
  } catch (err) {
    console.error("Star AI Engine: Mount failed.", err);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; text-align: center;">
        <h1 style="color: #f59e0b;">엔진 구동 오류</h1>
        <p>${err.message}</p>
        <button onclick="location.reload()" style="background: #f59e0b; color: white; border: 0; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 10px;">다시 시도</button>
      </div>
    `;
  }
};

// DOM이 완전히 준비된 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
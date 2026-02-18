import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Star AI Engine: Initializing bootstrap sequence...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Star AI Engine: Critical Error - Root element not found.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Star AI Engine: Application successfully mounted.");
  } catch (err) {
    console.error("Star AI Engine: Mount failed!", err);
    rootElement.innerHTML = `<div style="color: white; text-align: center; padding-top: 50px;">
      <h2 style="color: #f59e0b;">시스템 초기화 실패</h2>
      <p style="color: #64748b;">${err.message}</p>
      <button onclick="location.reload()" style="background: #f59e0b; color: white; border: 0; padding: 10px 20px; border-radius: 8px; margin-top: 20px; cursor: pointer;">다시 시도</button>
    </div>`;
  }
}
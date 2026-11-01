import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function bootstrap() {
  if (!window.blueDesktop && window.location.hostname === '127.0.0.1') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 250);
      const res = await fetch('/__desktop/ping', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const info = await res.json().catch(() => null);
        if (info?.app === 'blue.ai-desktop') {
          window.isStandaloneExe = true;
          window.blueDesktop = {
            isElectron: false,
            minimize: async () => {},
            maximize: async () => false,
            close: async () => window.close(),
            getWindowState: async () => ({
              isMaximized: false,
              isAlwaysOnTop: false,
              platform: 'win32',
            }),
            setAlwaysOnTop: async () => false,
            openExternal: async (url: string) => {
              await fetch('/__desktop/open-external', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: url,
              }).catch(() => {});
              return true;
            },
            readStorage: async () => {
              const r = await fetch('/__desktop/storage').catch(() => null);
              if (!r || !r.ok) return null;
              return r.json().catch(() => null);
            },
            writeStorage: async (data: Record<string, unknown>) => {
              await fetch('/__desktop/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=utf-8' },
                body: JSON.stringify(data),
              }).catch(() => {});
              return true;
            },
            onMaximizedChanged: () => () => {},
          };

          // Heartbeat so native Windows .exe host tracks window lifecycle cleanly
          const sendHeartbeat = () => {
            fetch('/__desktop/heartbeat', {
              method: 'POST',
              keepalive: true,
            }).catch(() => {});
          };
          sendHeartbeat();
          setInterval(sendHeartbeat, 3500);
        }
      }
    } catch {
      // Running in standard Vite dev server
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();

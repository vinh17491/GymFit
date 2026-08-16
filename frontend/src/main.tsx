import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { useAuthStore } from './stores/authStore';
import './index.css';

function Root() {
  const initUser = useAuthStore(s => s.initUser);
  const initialized = useAuthStore(s => s.initialized);

  useEffect(() => { initUser(); }, [initUser]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="text-lg text-slate-200">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#172033', color: '#F8FAFC', border: '1px solid #3B4A60', borderRadius: '0.75rem' },
          success: { iconTheme: { primary: '#A3E635', secondary: '#0B0F14' } },
          error: { iconTheme: { primary: '#FB7185', secondary: '#0B0F14' } },
        }}
      />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

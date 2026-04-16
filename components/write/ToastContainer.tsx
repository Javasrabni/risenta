'use client';

import { useState, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleShowToast = (e: any) => {
      const { message, type } = e.detail;
      const id = Date.now();
      
      setToasts(prev => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`p-3 px-4 rounded-write-lg text-[13px] shadow-write-lg animate-in slide-in-from-right duration-300 min-w-[200px] flex items-center gap-2 font-semibold text-left ${
            toast.type === 'success' ? 'bg-write-green-bg text-write-green border border-write-green-border' :
            toast.type === 'error' ? 'bg-write-red-bg text-write-red border border-write-red-border' :
            'bg-write-blue-bg text-write-blue border border-write-blue-border'
          }`}
        >
          <span>
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✗'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
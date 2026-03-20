"use client";

import { useEffect, useState } from 'react';

export type ToastType = 'info' | 'warning' | 'success';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToasterProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export function Toaster({ toasts, removeToast }: ToasterProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-[320px] pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto shadow-2xl rounded-xl border p-4 bg-bgCard/95 backdrop-blur-md relative overflow-hidden transition-all
            ${toast.type === 'warning' ? 'border-warning/50' : toast.type === 'success' ? 'border-bullish/50' : 'border-accent/50'}
          `}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b 
            ${toast.type === 'warning' ? 'from-warning to-warning/50' : toast.type === 'success' ? 'from-bullish to-bullish/50' : 'from-accent to-accent/50'}
          "></div>
          
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 text-lg
              ${toast.type === 'warning' ? 'text-warning' : toast.type === 'success' ? 'text-bullish' : 'text-accent'}
            `}>
              {toast.type === 'warning' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <div className="flex-1">
              <h4 className={`text-[13px] font-bold tracking-wide uppercase font-['Inter'] mb-1
                ${toast.type === 'warning' ? 'text-warning' : toast.type === 'success' ? 'text-bullish' : 'text-accent'}
              `}>
                {toast.title}
              </h4>
              <p className="text-[12px] font-medium text-textSecondary leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-textSecondary hover:text-textPrimary transition-colors opacity-50 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

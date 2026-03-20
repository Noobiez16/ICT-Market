import { ReactNode } from 'react';

export function InfoModal({ 
  isOpen, 
  title, 
  desc, 
  onClose 
}: { 
  isOpen: boolean; 
  title: string; 
  desc: string; 
  onClose: () => void 
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-[2px] transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-bgCard border border-borderSubtle p-6 rounded-xl w-[90%] max-w-[400px] shadow-2xl transform transition-transform animate-in zoom-in-95 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 font-bold text-base text-textPrimary">
          <span>{title}</span>
          <button 
            onClick={onClose}
            className="text-textSecondary hover:text-bearish cursor-pointer text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-textSecondary leading-relaxed">
          {desc}
        </div>
      </div>
    </div>
  );
}

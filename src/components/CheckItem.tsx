import { ReactNode } from 'react';

interface InfoData {
  title: string;
  desc: string;
}

interface CheckItemProps {
  label: string | ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  pts?: number;
  negative?: boolean;
  info?: InfoData;
  onInfoClick?: (info: InfoData) => void;
  children?: ReactNode; // For nested dropdowns
}

export function CheckItem({ label, checked, onChange, pts, negative, info, onInfoClick, children }: CheckItemProps) {
  const glowStyle = checked 
    ? (negative ? 'bg-bearish/8 border-bearish/35 shadow-[0_0_16px_rgba(225,29,72,0.10)] ring-1 ring-bearish/25' : 'bg-accent/8 border-accent/35 shadow-[0_0_16px_rgba(99,102,241,0.12)] ring-1 ring-accent/25')
    : 'border-transparent hover:border-borderSubtle hover:bg-bgMain/30 bg-transparent';

  return (
    <label className={`group flex items-start gap-4 p-3.5 rounded-xl border cursor-pointer mb-2 transition-all duration-300 ease-out select-none ${glowStyle} active:scale-[0.98]`}>
      
      {/* Neo-checkbox Design */}
      <div className={`relative flex items-center justify-center mt-0.5 shrink-0 w-5 h-5 rounded-[4px] border bg-transparent transition-all duration-300
        ${checked ? (negative ? 'border-bearish/50' : 'border-accent/50') : 'border-borderSubtle/60 group-hover:border-textSecondary/50'}
      `}>
        <input type="checkbox" className="absolute opacity-0 w-full h-full cursor-pointer z-10" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {/* Glowing Matrix Core */}
        <div className={`w-3 h-3 rounded-[2px] transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
          ${negative ? 'bg-bearish shadow-[0_0_10px_rgba(255,46,76,1)]' : 'bg-accent shadow-[0_0_10px_rgba(0,225,255,1)]'}
        `} />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium text-textPrimary flex items-center gap-2 flex-wrap leading-tight">
          {label}
          {info && onInfoClick && (
            <span
              className="info-icon hover:bg-accent hover:text-bgCard transition-colors rounded-sm px-1 text-[10px] bg-borderSubtle/50 text-textSecondary cursor-help font-mono border border-borderSubtle/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInfoClick(info);
              }}
            >
              INFO
            </span>
          )}
        </span>
        {children && <div className="mt-2.5">{children}</div>}
      </div>

      {pts !== undefined && (
        <span className={`text-[11px] font-bold shrink-0 mt-0.5 ml-2 font-['JetBrains_Mono'] px-1.5 py-0.5 rounded-sm border 
          ${checked ? (negative ? 'bg-bearish/20 text-bearish border-bearish/30' : 'bg-bullish/20 text-bullish border-bullish/30') : 'bg-transparent text-textSecondary border-borderSubtle/50'}`}>
          {negative ? '-' : '+'}{pts}
        </span>
      )}
    </label>
  );
}

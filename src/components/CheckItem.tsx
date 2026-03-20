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
  return (
    <label className={`group flex items-start gap-4 p-3 rounded-md border cursor-pointer mb-[6px] transition-all duration-200 ease-out select-none
      ${checked ? 'bg-accent/10 border-accent/40 shadow-[inset_4px_0_0_0_var(--accent)] dark:shadow-[inset_4px_0_0_0_#2979ff]' : 'border-transparent hover:bg-itemHover hover:border-borderSubtle'}
      active:scale-[0.99]
    `}>
      <div className="relative flex items-center justify-center mt-0.5 shrink-0 w-4 h-4 rounded-sm border border-textSecondary/50 bg-inputBg shadow-sm transition-all group-hover:border-accent">
        <input 
          type="checkbox" 
          className="absolute opacity-0 w-full h-full cursor-pointer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {checked && (
          <svg className={`w-3 h-3 ${negative ? 'text-bearish' : 'text-accent'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
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

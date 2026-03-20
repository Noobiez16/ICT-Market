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
    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer mb-[6px] transition-all duration-200 ease-out 
      ${checked ? 'bg-indigo-500/10 border-indigo-500/30 dark:bg-accent/10 dark:border-accent/30' : 'border-transparent hover:bg-itemHover hover:border-borderSubtle'}
      active:scale-[0.98]
    `}>
      <input 
        type="checkbox" 
        className="w-[18px] h-[18px] mt-[2px] accent-accent cursor-pointer shrink-0 transition-transform active:scale-90"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="flex-1">
        <span className="text-[13px] font-medium text-textPrimary block flex items-center gap-1.5 flex-wrap">
          {label}
          {info && onInfoClick && (
            <span 
              className="info-icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInfoClick(info);
              }}
            >
              i
            </span>
          )}
        </span>
        {children}
      </div>
      {pts !== undefined && (
        <span className={`text-xs font-bold ml-auto whitespace-nowrap font-['JetBrains_Mono'] ${negative ? 'text-bearish' : 'text-bullish'}`}>
          {negative ? '-' : '+'}{pts}
        </span>
      )}
    </label>
  );
}

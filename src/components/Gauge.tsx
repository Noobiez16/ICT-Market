import { useEffect, useState } from 'react';

export function Gauge({ score, gradeColor }: { score: number; gradeColor: string }) {
  const maxScoreRatio = 110;
  const radius = 60;
  const dashArray = 2 * Math.PI * radius; // 377
  
  const pctFill = Math.min(score / maxScoreRatio, 1);
  const off = dashArray - (pctFill * dashArray);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex justify-center items-center mb-6 relative">
      <svg className="w-[140px] h-[140px] -rotate-90" viewBox="0 0 140 140">
        <circle 
          cx="70" cy="70" r={radius} 
          className="fill-none stroke-inputBg" 
          strokeWidth="8"
        />
        <circle 
          cx="70" cy="70" r={radius} 
          className="fill-none transition-all duration-700 ease-out" 
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={mounted ? off : dashArray}
          style={{ stroke: gradeColor }}
        />
      </svg>
    </div>
  );
}

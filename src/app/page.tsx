"use client";

import { useMemo, useState } from "react";
import { useChecklistState } from "@/hooks/useChecklistState";
import { InfoModal } from "@/components/InfoModal";
import { CheckItem } from "@/components/CheckItem";
import { Gauge } from "@/components/Gauge";

// [infos and rfEvents definitions kept the same for logic]
const infos = {
  hasRedFolder: { title: "Red Folder Event", desc: "Eventos de gran impacto económico. Reduce el tamaño de tu posición o acorta expectativas de ganancias si operas alrededor de estas horas debido a la extrema volatilidad algorítmica." },
  event30Min: { title: "Event within 30m", desc: "Se aplica una penalización alta si decides tomar el trade justo cuando falta menos de 30 minutos para la inyección de la noticia. Sumamente arriesgado." },
  a1: { title: "1H FVG", desc: "Identifica un inbalance claro en gráficos de 1 hora (Fair Value Gap), que servirá como nuestra zona de mayor probabilidad o confluencia principal (POI)." },
  a2: { title: "Retrace to FVG", desc: "Esperamos a que el precio retroceda y entre verdaderamente en la zona del FVG de 1 Hora. Sin esto no hay setup premium." },
  a3: { title: "Reaction Candle", desc: "Mapeamos o marcamos la primera vela que reacciona de forma fuerte nada más entrar a la zona del FVG. Confirma que el nivel está activo." },
  b1: { title: "5M FVG", desc: "Una vez en el FVG de 1H, bajamos a 5M y buscamos que se forme un nuevo FVG dentro de esa zona macro." },
  b2: { title: "Stacked Confluence", desc: "Un FVG que se apoya en otro FVG de la misma temporalidad u otra mayor (o sobre un Order Block). Da muy alta confianza algorítmica a tu confirmación." },
  c1: { title: "Liquidity Sweep", desc: "Se confirma visualmente que el precio tomó la liquidez o \"stops\" de inversores retail por encima de un máximo (BSL) o debajo de un mínimo (SSL)." },
  c2: { title: "Draw on Liquidity", desc: "Debes tener claro hacia dónde irá el precio ahora. Si el objetivo no te salta a la vista de manera obvia, el setup no es de alta calidad." },
  d1: { title: "Displacement", desc: "La vela expansiva de 1 minuto debe tener un cuerpo muy robusto en dirección a nuestro trade, demostrando inyección real del algoritmo." },
  d2: { title: "Validation Close", desc: "Buscar un segundo cierre de vela de 1M en dirección del setup (además de la de desplazamiento). Reduce estafas del algoritmo." },
  d3: { title: "Structural SL", desc: "Coloca el Stop Loss por detrás del mínimo protector de la estructura reciente, donde ya hubo \"Sweep\" o mitigación. Nunca dejar el SL \"flotando\"." },
  e1: { title: "Overfilled FVG", desc: "Si la vela entró en el FVG de 1 Hora y llenó más del 70% u 80%, el impulso pierde mucha fiabilidad y hay riesgo de continuación al otro lado." },
  e2: { title: "Chop/Range", desc: "Operar en el medio de un rango macro que está en consolidación pura. Los FVGs no se respetan en entornos laterales, busca extremos." },
  e3: { title: "Opposing Clash", desc: "El precio ha dejado inbalances muy notorios en tu contra antes de llegar a tu entrada, que ahora podrían servir como barrera inmediata e impedir tu \"target\"." },
};

const rfEvents = [
  { val: "FOMC Rate", tier: 1 }, { val: "FOMC Minutes", tier: 1 }, { val: "Fed Spch", tier: 1 },
  { val: "CPI", tier: 1 }, { val: "NFP", tier: 1 },
  { val: "GDP", tier: 2 }, { val: "PCE", tier: 2 }, { val: "PPI", tier: 2 }, { val: "CB Spch", tier: 2 },
  { val: "ISM Mfg", tier: 3 }, { val: "Retail", tier: 3 }, { val: "Jobless", tier: 3 },
  { val: "Flash PMI", tier: 3 },
];

export default function Home() {
  const { state, updateField, toggleRfFlag, toggleTriggerFlag, resetState } = useChecklistState();
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; desc: string }>({ isOpen: false, title: "", desc: "" });

  const openInfo = (info: { title: string; desc: string }) => setModal({ isOpen: true, ...info });

  const computed = useMemo(() => {
    let totalPoints = 0;
    const penaltiesDesc: string[] = [];
    let rfTier = 0;
    let setupOutsideKz = false;
    let kzText = 'SYS_WAIT';
    let kzColor = 'text-warning';

    if (state.datetime) {
      const dt = new Date(state.datetime);
      const estString = dt.toLocaleString("en-US", { timeZone: "America/New_York", hour: '2-digit', minute: '2-digit', hour12: false });
      const estHour = parseInt(estString.split(':')[0]);
      const estMinute = parseInt(estString.split(':')[1]);
      const estMinsTotal = estHour * 60 + estMinute;

      const inLondon = estMinsTotal >= (2 * 60) && estMinsTotal <= (5 * 60);
      const inNYAM = estMinsTotal >= (8 * 60 + 30) && estMinsTotal <= (11 * 60);
      const inNYPM = estMinsTotal >= (13 * 60 + 30) && estMinsTotal <= (16 * 60);

      if (inLondon || inNYAM || inNYPM) {
        kzText = `ACTIVE_${estString}_EST`;
        kzColor = "text-bullish";
      } else {
        kzText = `DEADZONE_${estString}_EST`;
        kzColor = "text-warning";
        setupOutsideKz = true;
      }
    }

    if (state.hasRedFolder) {
      state.rfFlags.forEach(val => {
        const ev = rfEvents.find(e => e.val === val);
        if (ev) {
          if (ev.tier === 1) rfTier = Math.max(rfTier, 1);
          else if (ev.tier === 2 && rfTier !== 1) rfTier = 2;
          else if (ev.tier === 3 && rfTier === 0) rfTier = 3;
        }
      });

      if (rfTier === 1) { totalPoints -= 25; penaltiesDesc.push("T1 News (-25)"); }
      else if (rfTier === 2) { totalPoints -= 15; penaltiesDesc.push("T2 News (-15)"); }
      else if (rfTier === 3) { totalPoints -= 10; penaltiesDesc.push("T3 News (-10)"); }
      if (state.event30Min) { totalPoints -= 10; penaltiesDesc.push("News <30m (-10)"); }
    }

    if (state.a1) totalPoints += 15;
    if (state.a2) totalPoints += 10;
    if (state.a3) totalPoints += 5;

    if (state.b1) totalPoints += 15;
    if (state.b2) totalPoints += 10;
    if (state.b_delivery === 'onesided') totalPoints += 3;

    if (state.c1) totalPoints += 12;
    if (state.c2) totalPoints += 8;

    const activeTriggers = state.triggerFlags.length;
    let triggerBonus = 0;
    if (activeTriggers === 4) triggerBonus = 10;
    else if (activeTriggers === 3) triggerBonus = 6;
    else if (activeTriggers === 2) triggerBonus = 3;
    totalPoints += triggerBonus;

    if (state.d1) totalPoints += 10;
    if (state.d2) totalPoints += 8;
    if (state.d3) totalPoints += 7;

    if (state.e1) { totalPoints -= 10; penaltiesDesc.push("1H FVG >70% (-10)"); }
    if (state.e2) { totalPoints -= 10; penaltiesDesc.push("1H Range (-10)"); }
    if (state.e3) { totalPoints -= 8; penaltiesDesc.push("Opp FVG (-8)"); }
    if (setupOutsideKz) { totalPoints -= 5; penaltiesDesc.push("Out KZ (-5)"); }

    let bullSignals = 0, bearSignals = 0;
    if (state.a1) {
      if (['Bullish', 'InverseBull'].includes(state.a1_dir)) bullSignals += 2;
      if (['Bearish', 'InverseBear'].includes(state.a1_dir)) bearSignals += 2;
    }
    if (state.c1) {
      if (state.c1_dir === 'SSL') bullSignals += 1;
      if (state.c1_dir === 'BSL') bearSignals += 1;
    }
    if (state.c2) {
      if (['BSL', 'EQH', 'PDH', 'PWH'].includes(state.c2_pool)) bullSignals += 1;
      if (['SSL', 'EQL', 'PDL', 'PWL'].includes(state.c2_pool)) bearSignals += 1;
    }

    let directionText = "NEUTRAL";
    let dirColor = "text-textSecondary";
    if (bullSignals > bearSignals) {
      directionText = (bullSignals >= 3) ? "STRONG_BULL" : "WEAK_BULL";
      dirColor = "text-bullish";
    } else if (bearSignals > bullSignals) {
      directionText = (bearSignals >= 3) ? "STRONG_BEAR" : "WEAK_BEAR";
      dirColor = "text-bearish";
    } else if (bullSignals > 0 && bearSignals > 0) {
      directionText = "CONFLICTED";
      dirColor = "text-warning";
    }

    if (totalPoints < 0) totalPoints = 0;

    let grade = "D", verdict = "NO_TRADE", size = "0.00x", gradeColorStr = "var(--bearish)";
    
    if (totalPoints >= 85) { grade = "A+"; verdict = "EXEC_FULL_SIZE"; size = "1.00x"; gradeColorStr = "var(--bullish)"; }
    else if (totalPoints >= 70) { grade = "A"; verdict = "EXEC_STD_SIZE"; size = "0.75x"; gradeColorStr = "var(--bullish)"; }
    else if (totalPoints >= 55) { grade = "B"; verdict = "EXEC_REDUCED"; size = "0.50x"; gradeColorStr = "var(--warning)"; }
    else if (totalPoints >= 40) { grade = "C"; verdict = "WAIT_CONFIRM"; size = "0.25x"; gradeColorStr = "var(--warning)"; }

    if (rfTier === 1 && state.event30Min) {
      grade = "F"; verdict = "SYS_HALT (T1)"; size = "0.00x"; gradeColorStr = "var(--bearish)";
    }

    return { totalPoints, grade, verdict, size, dirColor, directionText, penaltiesDesc, rfTier, triggerBonus, activeTriggers, kzText, kzColor, gradeColorStr };
  }, [state]);

  const toggleTheme = () => document.documentElement.classList.toggle('dark');

  const exportClipboard = () => {
    const text = `==== SYS.EXPORT.MKT ====\nOPEN: ${state.datetime || 'N/A'}\nCLOSE: ${state.closingTime || 'N/A'}\nSCORE: ${computed.totalPoints} [${computed.grade}]\nDIR: ${computed.directionText}\nSIZE: ${computed.size}\nVERDICT: ${computed.verdict}\n========================`;
    navigator.clipboard.writeText(text);
  };

  const getSessContext = (s: string) => {
    return {
      'London': 'LND_EXP', 'NY AM': 'NY_AM_PRIME', 'NY Lunch': 'NY_LUNCH_WARN',
      'NY PM': 'NY_PM_CONT', 'Asian': 'ASIAN_RNG_WARN', 'London Close': 'LND_CLS_REV'
    }[s] || 'SYS_IDLE';
  };

  const BlockHeader = ({ icon, title, pts, borderStyle }: { icon: string, title: string, pts?: string, borderStyle?: string }) => (
    <div className={`flex items-center gap-3 mb-4 pb-2 border-b border-borderSubtle ${borderStyle || ''}`}>
      <span className="bg-bgMain p-1.5 rounded-md border border-borderSubtle text-sm flex items-center justify-center aspect-square">{icon}</span>
      <h2 className="font-semibold text-[13px] tracking-wide uppercase text-textSecondary">{title}</h2>
      {pts && <span className="ml-auto font-['JetBrains_Mono'] text-[10px] font-bold bg-bgMain text-textSecondary px-2 py-1 rounded border border-borderSubtle">{pts}</span>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pt-0">
      {/* Top Application Bar */}
      <nav className="sticky top-0 z-40 w-full min-h-[48px] bg-bgCard/80 backdrop-blur-md border-b border-borderSubtle flex items-center justify-between px-6 py-2 shadow-sm font-['JetBrains_Mono']">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]" />
            <span className="text-[13px] font-bold text-textPrimary tracking-widest uppercase">SYD_TRM_PROTO</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-borderSubtle mx-2" />
          <div className="hidden sm:flex text-[11px] gap-4 text-textSecondary font-semibold">
            <span className={`tracking-wide ${computed.kzColor}`}>{computed.kzText}</span>
            <span className="tracking-wide text-accent">SESS_MOD: {getSessContext(state.session)}</span>
          </div>
        </div>
        
        <div className="flex gap-2 print:hidden">
          <button onClick={toggleTheme} className="bg-inputBg border border-borderSubtle hover:border-textSecondary hover:text-textPrimary text-textSecondary px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors">THEME</button>
          <button onClick={resetState} className="bg-bearish/10 border border-bearish/30 text-bearish hover:bg-bearish hover:text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all ring-1 ring-inset ring-transparent shadow-[0_0_10px_rgba(239,68,68,0.1)]">FLUSH_SYS</button>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Core Blocks Grid */}
        <div className="flex flex-col gap-6">
          
          {/* Top Info Bar: Contains Inputs horizontally laid out to save space */}
          <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 flex flex-wrap lg:flex-nowrap gap-4 items-center shadow-sm">
            <div className="w-full lg:w-32 shrink-0">
              <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1 px-1">TICKER</label>
              <input type="text" placeholder="EUR/USD" value={state.instrument} onChange={(e) => updateField('instrument', e.target.value.toUpperCase())} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md justify-center text-[13px] font-bold outline-none focus:border-accent font-['JetBrains_Mono'] uppercase tracking-wider text-center" />
            </div>
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1 px-1 group-focus-within:text-accent transition-colors">TIME(OPEN)</label>
              <input type="datetime-local" value={state.datetime} onChange={(e) => updateField('datetime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md outline-none focus:border-accent text-[12px] font-['JetBrains_Mono'] transition-colors" />
            </div>
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1 px-1 group-focus-within:text-accent transition-colors">TIME(CLOSE)</label>
              <input type="datetime-local" value={state.closingTime} onChange={(e) => updateField('closingTime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textSecondary focus:text-textPrimary px-3 py-2 rounded-md outline-none focus:border-accent text-[12px] font-['JetBrains_Mono'] transition-colors" />
            </div>
            <div className="w-full lg:w-48 shrink-0 group">
              <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1 px-1 group-focus-within:text-accent transition-colors">MACRO SESS</label>
              <select value={state.session} onChange={(e) => updateField('session', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md outline-none focus:border-accent text-[12px] font-bold font-['JetBrains_Mono'] cursor-pointer appearance-none text-center">
                {['London', 'NY AM', 'NY Lunch', 'NY PM', 'Asian', 'London Close'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Risk / Red Folder */}
            <div className={`bg-bgCard border rounded-lg p-5 col-span-full shadow-sm relative overflow-hidden transition-all duration-300 ${computed.rfTier === 1 ? 'animate-pulseBorder border-bearish ring-1 ring-bearish/30' : computed.rfTier > 1 ? 'border-warning' : 'border-borderSubtle hover:border-textSecondary/50'}`}>
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"></path></svg>
              </div>
              <BlockHeader icon="⚠️" title="SYS.RISK_FILTER" pts="NEWS_MONITOR" borderStyle={computed.rfTier === 1 ? 'border-bearish/30' : ''} />
              
              <CheckItem label={<span className="font-bold">ENGAGE RED FOLDER SCAN</span>} checked={state.hasRedFolder} onChange={(v) => updateField('hasRedFolder', v)} info={infos.hasRedFolder} onInfoClick={openInfo} />
              
              {state.hasRedFolder && (
                <div className="mt-3 bg-bgMain p-4 rounded-md border border-borderSubtle">
                  {computed.rfTier === 1 && <div className="text-[13px] tracking-widest font-extrabold font-['JetBrains_Mono'] px-3 py-2.5 rounded border border-bearish/50 mb-4 text-center bg-bearish text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">AVOID TRADING — T1 IMMINENT</div>}
                  {computed.rfTier === 2 && <div className="text-[12px] tracking-widest font-extrabold font-['JetBrains_Mono'] px-3 py-2.5 rounded border border-warning/50 mb-4 text-center bg-warning text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">HIGH CAUTION — T2 NEWS</div>}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rfEvents.map(e => (
                      <label key={e.val} className={`text-[11px] font-['JetBrains_Mono'] font-bold flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded transition-all border
                        ${state.rfFlags.includes(e.val) ? (e.tier === 1 ? 'bg-bearish/20 text-bearish border-bearish' : 'bg-warning/20 text-warning border-warning') : 'bg-inputBg text-textSecondary border-borderSubtle hover:border-textSecondary/50 hover:bg-bgCard'}`}>
                        <input type="checkbox" checked={state.rfFlags.includes(e.val)} onChange={() => toggleRfFlag(e.val)} className="hidden" /> 
                        {e.val.toUpperCase()}
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="SYS.INPUT_OTHER_TICKER" value={state.rfOther} onChange={(e) => updateField('rfOther', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded text-[12px] outline-none focus:border-accent mb-3 font-['JetBrains_Mono'] placeholder:text-textSecondary/50" />
                  
                  <div className="bg-bgCard border border-borderSubtle/50 rounded-md">
                    <CheckItem label={<span className="text-bearish font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-bearish animate-pulse"></div>T-MINUS 30m WARNING</span>} checked={state.event30Min} onChange={v => updateField('event30Min', v)} info={infos.event30Min} onInfoClick={openInfo} negative pts={10} />
                  </div>
                </div>
              )}
            </div>

            {/* BLOCK A */}
            <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="A" title="1H MACRO BIAS" pts="30_MAX" />
              <CheckItem label="FVG Identified (1H)" checked={state.a1} onChange={v=>updateField('a1',v)} info={infos.a1} onInfoClick={openInfo} pts={15}>
                <div className="mt-2.5 flex items-center bg-inputBg rounded-sm border border-borderSubtle/50 px-2 group-focus-within:border-accent/50 transition-colors">
                  <select value={state.a1_dir} onChange={(e)=>updateField('a1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[11px] font-['JetBrains_Mono'] font-bold outline-none uppercase appearance-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- SELECT_DIR --</option>
                    <option value="Bullish">BULLISH_FVG</option><option value="Bearish">BEARISH_FVG</option>
                    <option value="InverseBull">INV_FVG_BULLISH</option><option value="InverseBear">INV_FVG_BEARISH</option>
                  </select>
                </div>
              </CheckItem>
              <CheckItem label="Retrace to 1H Zone" checked={state.a2} onChange={v=>updateField('a2',v)} info={infos.a2} onInfoClick={openInfo} pts={10} />
              <CheckItem label="First React Candle" checked={state.a3} onChange={v=>updateField('a3',v)} info={infos.a3} onInfoClick={openInfo} pts={5} />
            </div>

            {/* BLOCK B */}
            <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="B" title="5M MICRO STRUCT" pts="25_MAX" />
              <CheckItem label="5M Inside 1H Zone" checked={state.b1} onChange={v=>updateField('b1',v)} info={infos.b1} onInfoClick={openInfo} pts={15} />
              <CheckItem label="Stacked Confluence" checked={state.b2} onChange={v=>updateField('b2',v)} info={infos.b2} onInfoClick={openInfo} pts={10} />
              
              <div className="mt-3 p-3 bg-bgMain rounded border border-borderSubtle">
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-2">DELIVERY.ENGINE</label>
                <select value={state.b_delivery} onChange={(e)=>updateField('b_delivery', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded text-[11px] font-['JetBrains_Mono'] font-bold outline-none focus:border-accent">
                  <option value="balanced">BALANCED_STATE (0)</option>
                  <option value="onesided">ONE_SIDED_STATE (+3)</option>
                  <option value="cisd">CISD_DETECTED (0)</option>
                </select>
              </div>
            </div>

            {/* BLOCK C */}
            <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="C" title="LIQ_POOLS" pts="20_MAX" />
              <CheckItem label="Liquidity Sweep Confirmed" checked={state.c1} onChange={v=>updateField('c1',v)} info={infos.c1} onInfoClick={openInfo} pts={12}>
                <div className="mt-2.5 flex items-center bg-inputBg rounded-sm border border-borderSubtle/50 px-2">
                  <select value={state.c1_dir} onChange={(e)=>updateField('c1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[11px] font-['JetBrains_Mono'] font-bold outline-none uppercase appearance-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- SWEEP_LVL --</option>
                    <option value="BSL">BSL_PURGE [BEAR]</option>
                    <option value="SSL">SSL_PURGE [BULL]</option>
                  </select>
                </div>
              </CheckItem>
              <CheckItem label="Draw TGT Assigned" checked={state.c2} onChange={v=>updateField('c2',v)} info={infos.c2} onInfoClick={openInfo} pts={8}>
                <div className="mt-2.5 flex items-center bg-inputBg rounded-sm border border-borderSubtle/50 px-2">
                  <select value={state.c2_pool} onChange={(e)=>updateField('c2_pool', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[11px] font-['JetBrains_Mono'] font-bold outline-none uppercase appearance-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- TARGET_POOL --</option>
                    <option value="BSL">BSL_ABOVE</option><option value="SSL">SSL_BELOW</option>
                    <option value="PDH">PRV_DAY_HIGH</option><option value="PDL">PRV_DAY_LOW</option>
                  </select>
                </div>
              </CheckItem>
            </div>

            {/* BLOCK D */}
            <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="D" title="EXEC.TRIGGERS" pts="25(+)" />
              <div className="mb-3 bg-bgMain p-3 rounded border border-borderSubtle">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wide">TRIGGER_MLTP</span>
                  {computed.triggerBonus > 0 && <span className="font-['JetBrains_Mono'] text-[10px] bg-accent/20 px-1.5 py-0.5 rounded text-accent tracking-widest border border-accent/20 drop-shadow-[0_0_5px_var(--accent)]">+{computed.triggerBonus}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['InvFVG', 'CISD', 'MSS', 'Sweep'].map(t => (
                    <label key={t} className={`text-[11px] font-['JetBrains_Mono'] px-2 py-1.5 rounded cursor-pointer transition-colors border text-center ${state.triggerFlags.includes(t) ? 'bg-accent text-bgCard font-bold border-accent shadow-[0_0_8px_var(--accent)]' : 'bg-inputBg text-textSecondary hover:text-textPrimary border-borderSubtle hover:border-textSecondary/50'}`}>
                      <input type="checkbox" checked={state.triggerFlags.includes(t)} onChange={() => toggleTriggerFlag(t)} className="hidden" /> {t.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <CheckItem label="Displacement > 60%" checked={state.d1} onChange={v=>updateField('d1',v)} info={infos.d1} onInfoClick={openInfo} pts={10} />
              <CheckItem label="2nd Valid Close" checked={state.d2} onChange={v=>updateField('d2',v)} info={infos.d2} onInfoClick={openInfo} pts={8} />
              <CheckItem label="Struct SL Defined" checked={state.d3} onChange={v=>updateField('d3',v)} info={infos.d3} onInfoClick={openInfo} pts={7} />
            </div>

            {/* BLOCK E */}
            <div className="bg-bgCard border border-borderSubtle rounded-lg p-5 col-span-full shadow-sm hover:border-bearish/30 transition-colors relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning to-bearish opacity-60"></div>
              <BlockHeader icon="E" title="PENALTIES.ERR" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CheckItem label="1H FVG > 70%" checked={state.e1} onChange={v=>updateField('e1',v)} info={infos.e1} onInfoClick={openInfo} negative pts={10} />
                <CheckItem label="1H Lat Range" checked={state.e2} onChange={v=>updateField('e2',v)} info={infos.e2} onInfoClick={openInfo} negative pts={10} />
                <CheckItem label="Opp FVG Clash" checked={state.e3} onChange={v=>updateField('e3',v)} info={infos.e3} onInfoClick={openInfo} negative pts={8} />
              </div>
            </div>
            
          </div>
        </div>

        {/* TERMINAL UI METRICS PANEL */}
        <aside className="sticky xl:top-[88px]">
          <div className="bg-[#030712] dark:bg-bgCard border border-borderSubtle/60 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-48 h-48 rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"></path></svg>
            </div>
            <div className="bg-bgMain border-b border-borderSubtle px-5 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bearish"></span>
              <span className="w-2 h-2 rounded-full bg-warning"></span>
              <span className="w-2 h-2 rounded-full bg-bullish"></span>
              <span className="ml-2 font-['JetBrains_Mono'] text-[10px] tracking-widest text-textSecondary uppercase">OUT.EVAL</span>
            </div>
            
            <div className="p-6 font-['JetBrains_Mono'] flex flex-col items-center relative">
              <Gauge score={computed.totalPoints} gradeColor={computed.gradeColorStr} />
              
              <div className="absolute top-[125px] flex flex-col items-center">
                <div className="text-[52px] font-extrabold tracking-tighter leading-none" style={{ color: computed.gradeColorStr, filter: `drop-shadow(0px 0px 12px ${computed.gradeColorStr}40)` }}>{computed.totalPoints}</div>
                <div className="text-[10px] text-textSecondary font-bold mt-1 tracking-widest">PTS</div>
              </div>

              <div className="w-full mt-10">
                <div className="bg-[#020617] dark:bg-inputBg border border-borderSubtle/50 rounded-lg p-3">
                  <div className="flex justify-between items-center py-2 border-b border-borderSubtle/30 text-[11px]">
                    <span className="text-textSecondary/80 tracking-widest">EVAL_GRADE</span>
                    <span className="font-extrabold text-[14px]" style={{ color: computed.gradeColorStr, textShadow: `0 0 8px ${computed.gradeColorStr}50`}}>{computed.grade}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-borderSubtle/30 text-[11px]">
                    <span className="text-textSecondary/80 tracking-widest">VERDICT</span>
                    <span className="font-bold tracking-widest text-[11px]" style={{ color: computed.gradeColorStr }}>{computed.verdict}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-borderSubtle/30 text-[11px]">
                    <span className="text-textSecondary/80 tracking-widest">ALLOC_SIZE</span>
                    <span className="font-bold text-textPrimary tracking-widest">{computed.size}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-borderSubtle/30 text-[11px]">
                    <span className="text-textSecondary/80 tracking-widest">BIAS_DIR</span>
                    <span className={`font-bold tracking-widest ${computed.dirColor}`}>{computed.directionText}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 pt-3 text-[11px]">
                    <span className="text-textSecondary/80 tracking-widest">ERR_FLAGS</span>
                    <div className="text-left leading-tight mt-1">
                      {computed.penaltiesDesc.length ? <span className="text-bearish font-bold">{computed.penaltiesDesc.join(' | ')}</span> : <span className="text-bullish font-bold">CLEAR.0_FOUND</span>}
                    </div>
                  </div>
                </div>
              </div>

              <textarea placeholder="> INSERT_LOG_NOTES_" value={state.notes} onChange={(e) => updateField('notes', e.target.value)} className="w-full mt-5 min-h-[90px] text-[11px] font-['JetBrains_Mono'] bg-[#020617] dark:bg-inputBg border border-borderSubtle/50 text-textPrimary p-3 rounded-lg outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all font-medium leading-relaxed resize-y placeholder:text-textSecondary/30" />

              <div className="flex gap-2 w-full mt-4 print:hidden">
                <button onClick={exportClipboard} className="flex-1 bg-[#020617] dark:bg-bgMain border border-borderSubtle/50 text-textSecondary hover:text-textPrimary font-bold text-[10px] py-2.5 rounded hover:border-textSecondary/50 transition-all tracking-widest uppercase">CPY_LOG</button>
                <button onClick={() => window.print()} className="flex-1 bg-[#020617] dark:bg-bgMain border border-borderSubtle/50 text-textSecondary hover:text-textPrimary font-bold text-[10px] py-2.5 rounded hover:border-textSecondary/50 transition-all tracking-widest uppercase">PRT_PDF</button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <InfoModal isOpen={modal.isOpen} title={modal.title} desc={modal.desc} onClose={() => setModal({ ...modal, isOpen: false })} />
    </div>
  );
}

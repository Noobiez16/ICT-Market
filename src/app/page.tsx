"use client";

import { useMemo, useState } from "react";
import { useChecklistState } from "@/hooks/useChecklistState";
import { InfoModal } from "@/components/InfoModal";
import { CheckItem } from "@/components/CheckItem";
import { Gauge } from "@/components/Gauge";

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
  { val: "FOMC Rate Decision", tier: 1 }, { val: "FOMC Meeting Minutes", tier: 1 }, { val: "Federal Reserve Press Conf", tier: 1 },
  { val: "CPI", tier: 1 }, { val: "NFP", tier: 1 },
  { val: "GDP", tier: 2 }, { val: "PCE", tier: 2 }, { val: "PPI", tier: 2 }, { val: "Central Bank Speech", tier: 2 },
  { val: "ISM Mfg/Services", tier: 3 }, { val: "Retail Sales", tier: 3 }, { val: "Jobless Claims", tier: 3 },
  { val: "Unemployment Claims", tier: 3 }, { val: "Flash Mfg PMI", tier: 3 }, { val: "Flash Service PMI", tier: 3 }
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
    let kzText = 'Determining...';
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
        kzText = `In Kill Zone (${estString} EST)`;
        kzColor = "text-bullish";
      } else {
        kzText = `Out of Kill Zone (${estString} EST)`;
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

      if (rfTier === 1) { totalPoints -= 25; penaltiesDesc.push("Tier 1 News (-25)"); }
      else if (rfTier === 2) { totalPoints -= 15; penaltiesDesc.push("Tier 2 News (-15)"); }
      else if (rfTier === 3) { totalPoints -= 10; penaltiesDesc.push("Tier 3 News (-10)"); }
      if (state.event30Min) { totalPoints -= 10; penaltiesDesc.push("Event < 30m (-10)"); }
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

    if (state.e1) { totalPoints -= 10; penaltiesDesc.push("1H FVG > 70% filled (-10)"); }
    if (state.e2) { totalPoints -= 10; penaltiesDesc.push("1H Lateral Range (-10)"); }
    if (state.e3) { totalPoints -= 8; penaltiesDesc.push("Opposing FVG Clash (-8)"); }
    if (setupOutsideKz) { totalPoints -= 5; penaltiesDesc.push("Outside Kill Zone (-5)"); }

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

    let directionText = "Neutral";
    let dirColor = "text-textSecondary";
    if (bullSignals > bearSignals) {
      directionText = (bullSignals >= 3) ? "Strong Bull" : "Weak Bull";
      dirColor = "text-bullish";
    } else if (bearSignals > bullSignals) {
      directionText = (bearSignals >= 3) ? "Strong Bear" : "Weak Bear";
      dirColor = "text-bearish";
    } else if (bullSignals > 0 && bearSignals > 0) {
      directionText = "Conflicted";
      dirColor = "text-warning";
    }

    if (totalPoints < 0) totalPoints = 0;

    let grade = "D", verdict = "NO TRADE", size = "0%", gradeColorStr = "var(--bearish)";
    
    if (totalPoints >= 85) { grade = "A+"; verdict = "EXECUTE FULL"; size = "100%"; gradeColorStr = "var(--bullish)"; }
    else if (totalPoints >= 70) { grade = "A"; verdict = "EXECUTE STD"; size = "75%"; gradeColorStr = "var(--bullish)"; }
    else if (totalPoints >= 55) { grade = "B"; verdict = "CAUTION REDUCED"; size = "50%"; gradeColorStr = "var(--warning)"; }
    else if (totalPoints >= 40) { grade = "C"; verdict = "WAIT CONFLUENCE"; size = "25%"; gradeColorStr = "var(--warning)"; }

    if (rfTier === 1 && state.event30Min) {
      grade = "F"; verdict = "HARD STOP (T1)"; size = "0%"; gradeColorStr = "var(--bearish)";
    }

    return { totalPoints, grade, verdict, size, dirColor, directionText, penaltiesDesc, rfTier, triggerBonus, activeTriggers, kzText, kzColor, gradeColorStr };
  }, [state]);

  const toggleTheme = () => document.documentElement.classList.toggle('dark');

  const exportClipboard = () => {
    const text = `==== ICT TERMINAL OUTPUT ====\nOPEN: ${state.datetime || 'N/A'}\nCLOSE: ${state.closingTime || 'N/A'}\nSCORE: ${computed.totalPoints}% [${computed.grade}]\nDIR: ${computed.directionText}\nSIZE: ${computed.size}\nVERDICT: ${computed.verdict}\n=============================`;
    navigator.clipboard.writeText(text);
  };

  const getSessContext = (s: string) => {
    const ctx: Record<string, string> = {
      'London': 'London Open — Great for initial daily expansion',
      'NY AM': 'NY AM — Highest probability session for ICT setups',
      'NY Lunch': 'NY Lunch — ⚠️ Beware of chop / lower probability',
      'NY PM': 'NY PM — PM trend continuation or macro reversal',
      'Asian': 'Asian — ⚠️ Range bound, lower probability (unless Nikkei news)',
      'London Close': 'London Close — Minor retracement / reversal window'
    };
    return ctx[s] || '';
  };

  const BlockHeader = ({ icon, title, pts, borderStyle }: { icon: string, title: string, pts?: string, borderStyle?: string }) => (
    <div className={`flex items-center gap-3 mb-4 pb-2 border-b border-borderSubtle ${borderStyle || ''}`}>
      <span className="bg-bgMain p-1.5 rounded-md border border-borderSubtle text-sm flex items-center justify-center aspect-square shadow-sm">{icon}</span>
      <h2 className="font-semibold text-[14px] tracking-wide text-textPrimary">{title}</h2>
      {pts && <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-bgMain text-textSecondary px-2 py-1 rounded border border-borderSubtle shadow-sm">{pts}</span>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pt-0 pb-10">
      {/* Top Application Bar */}
      <nav className="sticky top-0 z-40 w-full min-h-[56px] bg-bgCard/90 backdrop-blur-md border-b border-borderSubtle flex items-center justify-between px-6 py-3 shadow-sm font-['Inter']">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]" />
            <span className="text-[15px] font-extrabold text-textPrimary tracking-wide uppercase">ICT Market Checklist</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-borderSubtle mx-2" />
          <div className="hidden sm:flex text-[12px] gap-4 text-textSecondary font-medium">
            <span className={`tracking-wide font-semibold ${computed.kzColor}`}>{computed.kzText}</span>
            <span className="tracking-wide text-accent font-semibold">{getSessContext(state.session)}</span>
          </div>
        </div>
        
        <div className="flex gap-3 print:hidden">
          <button onClick={toggleTheme} className="bg-bgCard border border-borderSubtle hover:border-textSecondary hover:text-textPrimary text-textSecondary px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors shadow-sm">Toggle Theme</button>
          <button onClick={resetState} className="bg-bgCard border border-bearish/30 text-bearish hover:bg-bearish hover:text-white px-4 py-2 rounded-lg text-[12px] font-semibold transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]">Reset Calculator</button>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Core Blocks Grid */}
        <div className="flex flex-col gap-6">
          
          {/* Top Info Bar: Contains Inputs */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-5 flex flex-wrap lg:flex-nowrap gap-5 items-center shadow-sm">
            <div className="w-full lg:w-40 shrink-0">
              <label className="block text-[11px] font-bold text-textSecondary uppercase mb-1.5 px-1">Instrument / Ticker</label>
              <input type="text" placeholder="EUR/USD" value={state.instrument} onChange={(e) => updateField('instrument', e.target.value.toUpperCase())} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-4 py-2.5 rounded-lg justify-center text-[13px] font-bold outline-none focus:border-accent font-['JetBrains_Mono'] uppercase tracking-wider text-center transition-colors" />
            </div>
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[11px] font-bold text-textSecondary uppercase mb-1.5 px-1 group-focus-within:text-accent transition-colors">Open Time (Operación)</label>
              <input type="datetime-local" value={state.datetime} onChange={(e) => updateField('datetime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-4 py-2.5 rounded-lg outline-none focus:border-accent text-[13px] font-['JetBrains_Mono'] transition-colors" />
            </div>
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[11px] font-bold text-textSecondary uppercase mb-1.5 px-1 group-focus-within:text-accent transition-colors">Closing Time (Operación)</label>
              <input type="datetime-local" value={state.closingTime} onChange={(e) => updateField('closingTime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textSecondary focus:text-textPrimary px-4 py-2.5 rounded-lg outline-none focus:border-accent text-[13px] font-['JetBrains_Mono'] transition-colors" />
            </div>
            <div className="w-full lg:w-56 shrink-0 group">
              <label className="block text-[11px] font-bold text-textSecondary uppercase mb-1.5 px-1 group-focus-within:text-accent transition-colors">Macro Session</label>
              <select value={state.session} onChange={(e) => updateField('session', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-4 py-2.5 rounded-lg outline-none focus:border-accent text-[13px] font-medium font-['JetBrains_Mono'] cursor-pointer transition-colors appearance-none">
                {['London', 'NY AM', 'NY Lunch', 'NY PM', 'Asian', 'London Close'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Risk / Red Folder */}
            <div className={`bg-bgCard border rounded-xl p-6 col-span-full shadow-sm relative overflow-hidden transition-all duration-300 ${computed.rfTier === 1 ? 'animate-pulseBorder border-bearish ring-1 ring-bearish/30' : computed.rfTier > 1 ? 'border-warning' : 'border-borderSubtle hover:border-textSecondary/50'}`}>
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none text-red-500">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"></path></svg>
              </div>
              <BlockHeader icon="🔴" title="Red Folder / Risk Filter" pts="News Monitor" borderStyle={computed.rfTier === 1 ? 'border-bearish/30' : ''} />
              
              <CheckItem label={<span className="font-semibold text-textPrimary">Is there a Red Folder event within the next 4 hours?</span>} checked={state.hasRedFolder} onChange={(v) => updateField('hasRedFolder', v)} info={infos.hasRedFolder} onInfoClick={openInfo} />
              
              {state.hasRedFolder && (
                <div className="mt-4 bg-bgMain p-5 rounded-lg border border-borderSubtle shadow-inner">
                  {computed.rfTier === 1 && <div className="text-[13px] tracking-wide font-bold font-['Inter'] px-4 py-3 rounded-lg border border-bearish/50 mb-5 text-center bg-bearish text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]">AVOID TRADING — TIER 1 NEWS IMMINENT</div>}
                  {computed.rfTier === 2 && <div className="text-[13px] tracking-wide font-bold font-['Inter'] px-4 py-3 rounded-lg border border-warning/50 mb-5 text-center bg-warning text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]">HIGH CAUTION — TIER 2 NEWS</div>}
                  
                  <div className="flex flex-wrap gap-2.5 mb-5">
                    {rfEvents.map(e => (
                      <label key={e.val} className={`text-[12px] font-['Inter'] font-medium flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg transition-all border
                        ${state.rfFlags.includes(e.val) ? (e.tier === 1 ? 'bg-bearish/20 text-bearish border-bearish' : 'bg-warning/20 text-warning border-warning') : 'bg-bgCard text-textSecondary border-borderSubtle hover:border-textSecondary/50 hover:bg-inputBg hover:text-textPrimary'}`}>
                        <input type="checkbox" checked={state.rfFlags.includes(e.val)} onChange={() => toggleRfFlag(e.val)} className="hidden" /> 
                        {e.val}
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="Other event ticker... (e.g. BOC Rate)" value={state.rfOther} onChange={(e) => updateField('rfOther', e.target.value)} className="w-full bg-bgCard border border-borderSubtle text-textPrimary px-4 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent mb-4 placeholder:text-textSecondary/50 font-medium" />
                  
                  <div className="bg-bgCard border border-borderSubtle/50 rounded-lg p-1.5 shadow-sm">
                    <CheckItem label={<span className="text-bearish font-bold flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-bearish animate-pulse shadow-[0_0_5px_rgba(239,68,68,1)]"></div>Event is within 30 minutes!</span>} checked={state.event30Min} onChange={v => updateField('event30Min', v)} info={infos.event30Min} onInfoClick={openInfo} negative pts={10} />
                  </div>
                </div>
              )}
            </div>

            {/* BLOCK A */}
            <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="📈" title="Block A: 1H Macro" pts="30 Pts" />
              <CheckItem label="FVG clearly identified on 1H" checked={state.a1} onChange={v=>updateField('a1',v)} info={infos.a1} onInfoClick={openInfo} pts={15}>
                <div className="mt-3 flex items-center bg-inputBg rounded-lg border border-borderSubtle/50 px-3 py-1 group-focus-within:border-accent/50 transition-colors">
                  <select value={state.a1_dir} onChange={(e)=>updateField('a1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- Direction --</option>
                    <option value="Bullish">Bullish FVG</option><option value="Bearish">Bearish FVG</option>
                    <option value="InverseBull">Inverse FVG → Bullish</option><option value="InverseBear">Inverse FVG → Bearish</option>
                  </select>
                </div>
              </CheckItem>
              <CheckItem label="Price retraces INTO 1H FVG" checked={state.a2} onChange={v=>updateField('a2',v)} info={infos.a2} onInfoClick={openInfo} pts={10} />
              <CheckItem label="First reaction candle mapped" checked={state.a3} onChange={v=>updateField('a3',v)} info={infos.a3} onInfoClick={openInfo} pts={5} />
            </div>

            {/* BLOCK B */}
            <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="📉" title="Block B: 5M Structure" pts="25 Pts" />
              <CheckItem label="5M FVG INSIDE 1H zone" checked={state.b1} onChange={v=>updateField('b1',v)} info={infos.b1} onInfoClick={openInfo} pts={15} />
              <CheckItem label="Stacked FVG Confluence" checked={state.b2} onChange={v=>updateField('b2',v)} info={infos.b2} onInfoClick={openInfo} pts={10} />
              
              <div className="mt-4 p-4 bg-inputBg rounded-lg border border-borderSubtle/50">
                <label className="block text-[11px] font-bold text-textSecondary uppercase mb-2">Delivery State Engine</label>
                <select value={state.b_delivery} onChange={(e)=>updateField('b_delivery', e.target.value)} className="w-full bg-bgCard border border-borderSubtle text-textPrimary px-3 py-2.5 rounded-md text-[13px] font-medium outline-none focus:border-accent">
                  <option value="balanced">Balanced (50/50) — 0 pts</option>
                  <option value="onesided">One-sided (3+) — +3 pts</option>
                  <option value="cisd">CISD detected</option>
                </select>
              </div>
            </div>

            {/* BLOCK C */}
            <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="💧" title="Block C: Liquidity Pools" pts="20 Pts" />
              <CheckItem label="Liquidity Sweep Confirmed" checked={state.c1} onChange={v=>updateField('c1',v)} info={infos.c1} onInfoClick={openInfo} pts={12}>
                <div className="mt-3 flex items-center bg-inputBg rounded-lg border border-borderSubtle/50 px-3 py-1 group-focus-within:border-accent/50 transition-colors">
                  <select value={state.c1_dir} onChange={(e)=>updateField('c1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- Sweep Level --</option>
                    <option value="BSL">BSL Taken Above</option>
                    <option value="SSL">SSL Taken Below</option>
                  </select>
                </div>
              </CheckItem>
              <CheckItem label="Draw Target Assigned" checked={state.c2} onChange={v=>updateField('c2',v)} info={infos.c2} onInfoClick={openInfo} pts={8}>
                <div className="mt-3 flex items-center bg-inputBg rounded-lg border border-borderSubtle/50 px-3 py-1 group-focus-within:border-accent/50 transition-colors">
                  <select value={state.c2_pool} onChange={(e)=>updateField('c2_pool', e.target.value)} onClick={(e)=>e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer">
                    <option value="" className="text-textSecondary">-- Pool --</option>
                    <option value="BSL">BSL Above</option><option value="SSL">SSL Below</option>
                    <option value="PDH">Previous Day High</option><option value="PDL">Previous Day Low</option>
                  </select>
                </div>
              </CheckItem>
            </div>

            {/* BLOCK D */}
            <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 shadow-sm hover:border-textSecondary/30 transition-colors">
              <BlockHeader icon="⚡" title="Block D: 1M Triggers" pts="25+ Pts" />
              <div className="mb-4 bg-inputBg p-4 rounded-lg border border-borderSubtle/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold text-textSecondary uppercase">Entry Multipliers</span>
                  {computed.triggerBonus > 0 && <span className="font-bold text-[11px] bg-accent/10 px-2 py-1 rounded-md text-accent border border-accent/20">+{computed.triggerBonus} Points</span>}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {['InvFVG', 'CISD', 'MSS', 'Sweep'].map(t => (
                    <label key={t} className={`text-[12px] font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors border text-center ${state.triggerFlags.includes(t) ? 'bg-accent text-white font-bold border-accent shadow-[0_4px_10px_rgba(99,102,241,0.2)]' : 'bg-bgCard text-textSecondary hover:text-textPrimary border-borderSubtle hover:border-textSecondary/50'}`}>
                      <input type="checkbox" checked={state.triggerFlags.includes(t)} onChange={() => toggleTriggerFlag(t)} className="hidden" /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <CheckItem label="Displacement Candle > 60%" checked={state.d1} onChange={v=>updateField('d1',v)} info={infos.d1} onInfoClick={openInfo} pts={10} />
              <CheckItem label="2nd Confirmation Close" checked={state.d2} onChange={v=>updateField('d2',v)} info={infos.d2} onInfoClick={openInfo} pts={8} />
              <CheckItem label="Structural SL Defined" checked={state.d3} onChange={v=>updateField('d3',v)} info={infos.d3} onInfoClick={openInfo} pts={7} />
            </div>

            {/* BLOCK E */}
            <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 col-span-full shadow-sm hover:border-bearish/30 transition-colors relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-warning to-bearish opacity-80"></div>
              <BlockHeader icon="⚠️" title="Block E: Risk Penalties" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CheckItem label="1H FVG > 70% filled" checked={state.e1} onChange={v=>updateField('e1',v)} info={infos.e1} onInfoClick={openInfo} negative pts={10} />
                <CheckItem label="1H Lateral Range" checked={state.e2} onChange={v=>updateField('e2',v)} info={infos.e2} onInfoClick={openInfo} negative pts={10} />
                <CheckItem label="Opposing FVG Clash" checked={state.e3} onChange={v=>updateField('e3',v)} info={infos.e3} onInfoClick={openInfo} negative pts={8} />
              </div>
            </div>
            
          </div>
        </div>

        {/* RESULTS PANEL */}
        <aside className="sticky xl:top-[88px] w-full">
          <div className="bg-bgCard border border-borderSubtle rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-inputBg border-b border-borderSubtle px-6 py-4 flex items-center justify-center relative">
              <h2 className="font-bold text-[12px] tracking-[2px] text-textSecondary uppercase">Quantitative Output</h2>
            </div>
            
            <div className="p-8 flex flex-col items-center relative">
              <Gauge score={computed.totalPoints} gradeColor={computed.gradeColorStr} />
              
              <div className="absolute top-[140px] flex flex-col items-center">
                <div className="text-[56px] font-extrabold tracking-tight leading-none" style={{ color: computed.gradeColorStr, filter: `drop-shadow(0px 4px 12px ${computed.gradeColorStr}30)` }}>{computed.totalPoints}</div>
                <div className="text-[12px] text-textSecondary font-bold mt-1 tracking-widest uppercase">Score</div>
              </div>

              <div className="w-full mt-10">
                <div className="bg-inputBg border border-borderSubtle rounded-xl p-4">
                  <div className="flex justify-between items-center py-3 border-b border-borderSubtle/50 text-[13px]">
                    <span className="text-textSecondary font-medium">Evaluation Grade</span>
                    <span className="font-extrabold text-[15px] px-2 py-0.5 rounded bg-bgCard border border-borderSubtle" style={{ color: computed.gradeColorStr, boxShadow: `0 2px 8px ${computed.gradeColorStr}20`}}>{computed.grade}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-borderSubtle/50 text-[13px]">
                    <span className="text-textSecondary font-medium">Verdict</span>
                    <span className="font-bold text-[13px]" style={{ color: computed.gradeColorStr }}>{computed.verdict}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-borderSubtle/50 text-[13px]">
                    <span className="text-textSecondary font-medium">Position Size</span>
                    <span className="font-bold text-textPrimary text-[14px] px-2 py-0.5 rounded bg-bgCard border border-borderSubtle">{computed.size}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-borderSubtle/50 text-[13px]">
                    <span className="text-textSecondary font-medium">Direction Bias</span>
                    <span className={`font-bold tracking-wide ${computed.dirColor}`}>{computed.directionText}</span>
                  </div>
                  <div className="flex flex-col gap-2 py-3 pt-4 text-[13px]">
                    <span className="text-textSecondary font-medium">Active Penalties</span>
                    <div className="text-left mt-1 p-3 bg-bgCard rounded-lg border border-borderSubtle/50">
                      {computed.penaltiesDesc.length ? <span className="text-bearish font-medium leading-relaxed block">{computed.penaltiesDesc.join(', ')}</span> : <span className="text-bullish font-medium block">None Active. Clear to proceed.</span>}
                    </div>
                  </div>
                </div>
              </div>

              <textarea placeholder="Enter execution notes here..." value={state.notes} onChange={(e) => updateField('notes', e.target.value)} className="w-full mt-6 min-h-[100px] text-[13px] bg-inputBg border border-borderSubtle text-textPrimary p-4 rounded-xl outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-medium leading-relaxed resize-y placeholder:text-textSecondary" />

              <div className="flex gap-3 w-full mt-5 print:hidden">
                <button onClick={exportClipboard} className="flex-1 bg-inputBg border border-borderSubtle text-textPrimary hover:bg-bgCard font-bold text-[12px] py-3.5 rounded-xl hover:border-textSecondary transition-all tracking-wide shadow-sm active:scale-[0.98]">Copy to Clipboard</button>
                <button onClick={() => window.print()} className="flex-1 bg-inputBg border border-borderSubtle text-textPrimary hover:bg-bgCard font-bold text-[12px] py-3.5 rounded-xl hover:border-textSecondary transition-all tracking-wide shadow-sm active:scale-[0.98]">Save as PDF</button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <InfoModal isOpen={modal.isOpen} title={modal.title} desc={modal.desc} onClose={() => setModal({ ...modal, isOpen: false })} />
    </div>
  );
}

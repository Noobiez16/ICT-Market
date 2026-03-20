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
  { val: "Unemployment Claims", tier: 3 }, { val: "Flash Mfg PMI", tier: 3 }, { val: "Flash Service PMI", tier: 3 },
];

export default function Home() {
  const { state, updateField, toggleRfFlag, toggleTriggerFlag, resetState } = useChecklistState();
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; desc: string }>({ isOpen: false, title: "", desc: "" });

  const openInfo = (info: { title: string; desc: string }) => setModal({ isOpen: true, ...info });

  // Compute scoring
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
        kzText = `[IN KZ] ${estString} EST`;
        kzColor = "text-bullish";
      } else {
        kzText = `[OUT OF KZ] ${estString} EST`;
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

    if (state.e1) { totalPoints -= 10; penaltiesDesc.push("1H FVG >70% (-10)"); }
    if (state.e2) { totalPoints -= 10; penaltiesDesc.push("1H Range (-10)"); }
    if (state.e3) { totalPoints -= 8; penaltiesDesc.push("Opposing FVG (-8)"); }
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

    let directionText = "NEUTRAL";
    let dirColor = "text-textSecondary";
    if (bullSignals > bearSignals) {
      directionText = (bullSignals >= 3) ? "STRONG BULL" : "WEAK BULL";
      dirColor = "text-bullish";
    } else if (bearSignals > bullSignals) {
      directionText = (bearSignals >= 3) ? "STRONG BEAR" : "WEAK BEAR";
      dirColor = "text-bearish";
    } else if (bullSignals > 0 && bearSignals > 0) {
      directionText = "CONFLICTED";
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

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const exportClipboard = () => {
    const text = `==== ICT TERMINAL OUTPUT ====\nOPEN: ${state.datetime}\nCLOSE: ${state.closingTime}\nSCORE: ${computed.totalPoints}% [${computed.grade}]\nDIR: ${computed.directionText}\nSIZE: ${computed.size}\nVERDICT: ${computed.verdict}\n=============================`;
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

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-borderSubtle">
        <div className="text-xl font-extrabold tracking-tight text-textPrimary flex items-center gap-3">
          <span className="font-['JetBrains_Mono'] bg-accent text-white px-2 py-1 rounded-md text-xs tracking-wide">ICT</span> 
          Market Read Terminal Pro
        </div>
        <div className="flex gap-3 print:hidden">
          <button onClick={toggleTheme} className="bg-bgCard border border-borderSubtle text-textPrimary px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-itemHover hover:border-textSecondary transition-all">🌓 Theme</button>
          <button onClick={resetState} className="bg-bgCard border border-borderSubtle text-bearish px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-itemHover hover:border-textSecondary transition-all">✕ Reset</button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tile: Session Context */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 col-span-full">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">⏱️</span> Session Context</div>
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Instrument</label>
                <input type="text" placeholder="TICKER" value={state.instrument} onChange={(e) => updateField('instrument', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3.5 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent font-['JetBrains_Mono']" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Open Time (Operación)</label>
                <input type="datetime-local" value={state.datetime} onChange={(e) => updateField('datetime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3.5 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent font-['JetBrains_Mono']" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Closing Time (Operación)</label>
                <input type="datetime-local" value={state.closingTime} onChange={(e) => updateField('closingTime', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3.5 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent font-['JetBrains_Mono']" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Macro Session</label>
                <select value={state.session} onChange={(e) => updateField('session', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3.5 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent font-['JetBrains_Mono']">
                  {['London', 'NY AM', 'NY Lunch', 'NY PM', 'Asian', 'London Close'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="bg-inputBg px-3 py-2 rounded-md text-[12px] text-accent font-medium">{getSessContext(state.session)}</div>
              <div className={`bg-inputBg px-3 py-2 rounded-md text-[12px] font-semibold font-['JetBrains_Mono'] ${computed.kzColor}`}>{computed.kzText}</div>
            </div>
          </div>

          {/* Red Folder */}
          <div className={`bg-bgCard border rounded-xl p-6 col-span-full ${computed.rfTier === 1 ? 'animate-pulseBorder border-bearish' : computed.rfTier > 1 ? 'border-warning border-l-[3px]' : 'border-borderSubtle border-l-[3px] border-l-bearish'}`}>
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]">
              <span className="text-base">🔴</span> Red Folder / Risk
              <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-itemHover text-bearish px-2 py-0.5 rounded-md border border-borderSubtle">RISK FILTER</span>
            </div>
            
            {(computed.rfTier === 1) && <div className="text-[12px] font-extrabold font-['JetBrains_Mono'] px-3 py-2 rounded-md mb-4 text-center bg-bearish/10 text-bearish">AVOID TRADING — TIER 1 NEWS IMMINENT</div>}
            {(computed.rfTier === 2) && <div className="text-[12px] font-extrabold font-['JetBrains_Mono'] px-3 py-2 rounded-md mb-4 text-center bg-warning/10 text-warning">HIGH CAUTION — TIER 2 NEWS</div>}
            {(computed.rfTier === 3) && <div className="text-[12px] font-extrabold font-['JetBrains_Mono'] px-3 py-2 rounded-md mb-4 text-center bg-warning/5 text-warning">REDUCE SIZE — TIER 3 NEWS</div>}

            <CheckItem label="Is there a Red Folder event within the next 4 hours?" checked={state.hasRedFolder} onChange={(v) => updateField('hasRedFolder', v)} info={infos.hasRedFolder} onInfoClick={openInfo} />
            
            {state.hasRedFolder && (
              <div className="mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-inputBg p-3 rounded-lg border border-borderSubtle mb-3">
                  {rfEvents.map(e => (
                    <label key={e.val} className="text-xs flex items-center gap-1.5 cursor-pointer text-textSecondary hover:text-textPrimary transition-colors">
                      <input type="checkbox" checked={state.rfFlags.includes(e.val)} onChange={() => toggleRfFlag(e.val)} className="accent-accent" /> {e.val}
                    </label>
                  ))}
                </div>
                <input type="text" placeholder="Other event ticker..." value={state.rfOther} onChange={(e) => updateField('rfOther', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3.5 py-2.5 rounded-lg text-[13px] outline-none focus:border-accent mb-3 font-['JetBrains_Mono']" />
                
                <CheckItem label={<span className="text-bearish block">Event is within 30 minutes! <span className="block text-xs text-textSecondary mt-1">Applies additional -10 pts penalty</span></span>} checked={state.event30Min} onChange={v => updateField('event30Min', v)} info={infos.event30Min} onInfoClick={openInfo} negative pts={10} />
              </div>
            )}
          </div>

          {/* BLOCK A */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">📈</span> Block A: 1H Macro <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-itemHover text-textSecondary px-2 py-0.5 rounded-md border border-borderSubtle">30 PTS</span></div>
            <CheckItem label="FVG clearly identified on 1H" checked={state.a1} onChange={v=>updateField('a1',v)} info={infos.a1} onInfoClick={openInfo} pts={15}>
              <select value={state.a1_dir} onChange={(e)=>updateField('a1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="mt-2 w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md text-[13px] font-['JetBrains_Mono'] outline-none">
                <option value="">-- Direction --</option>
                <option value="Bullish">Bullish FVG</option><option value="Bearish">Bearish FVG</option>
                <option value="InverseBull">Inverse FVG → Bullish</option><option value="InverseBear">Inverse FVG → Bearish</option>
              </select>
            </CheckItem>
            <CheckItem label="Price retraces INTO 1H FVG" checked={state.a2} onChange={v=>updateField('a2',v)} info={infos.a2} onInfoClick={openInfo} pts={10} />
            <CheckItem label="First reaction candle mapped" checked={state.a3} onChange={v=>updateField('a3',v)} info={infos.a3} onInfoClick={openInfo} pts={5} />
          </div>

          {/* BLOCK B */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">🔬</span> Block B: 5M Structure <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-itemHover text-textSecondary px-2 py-0.5 rounded-md border border-borderSubtle">25 PTS</span></div>
            <CheckItem label="5M FVG INSIDE 1H zone" checked={state.b1} onChange={v=>updateField('b1',v)} info={infos.b1} onInfoClick={openInfo} pts={15} />
            <CheckItem label="Stacked FVG Confluence" checked={state.b2} onChange={v=>updateField('b2',v)} info={infos.b2} onInfoClick={openInfo} pts={10} />
            <div className="mt-3">
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Delivery State Engine</label>
              <select value={state.b_delivery} onChange={(e)=>updateField('b_delivery', e.target.value)} className="w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md text-[13px] font-['JetBrains_Mono'] outline-none focus:border-accent">
                <option value="balanced">Balanced (50/50) — 0 pts</option>
                <option value="onesided">One-sided (3+) — +3 pts</option>
                <option value="cisd">CISD detected</option>
              </select>
            </div>
          </div>

          {/* BLOCK C */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">💧</span> Block C: Liquidity Pools <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-itemHover text-textSecondary px-2 py-0.5 rounded-md border border-borderSubtle">20 PTS</span></div>
            <CheckItem label="Liquidity Sweep Confirmed" checked={state.c1} onChange={v=>updateField('c1',v)} info={infos.c1} onInfoClick={openInfo} pts={12}>
              <select value={state.c1_dir} onChange={(e)=>updateField('c1_dir', e.target.value)} onClick={(e)=>e.stopPropagation()} className="mt-2 w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md text-[13px] font-['JetBrains_Mono'] outline-none">
                <option value="">-- Sweep Level --</option><option value="BSL">BSL Taken Above</option><option value="SSL">SSL Taken Below</option>
              </select>
            </CheckItem>
            <CheckItem label="Draw Target Assigned" checked={state.c2} onChange={v=>updateField('c2',v)} info={infos.c2} onInfoClick={openInfo} pts={8}>
              <select value={state.c2_pool} onChange={(e)=>updateField('c2_pool', e.target.value)} onClick={(e)=>e.stopPropagation()} className="mt-2 w-full bg-inputBg border border-borderSubtle text-textPrimary px-3 py-2 rounded-md text-[13px] font-['JetBrains_Mono'] outline-none">
                <option value="">-- Pool --</option><option value="BSL">BSL Above</option><option value="SSL">SSL Below</option><option value="PDH">Previous Day High</option>
              </select>
            </CheckItem>
          </div>

          {/* BLOCK D */}
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">⚡</span> Block D: 1M Triggers <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-bold bg-itemHover text-textSecondary px-2 py-0.5 rounded-md border border-borderSubtle">25+ PTS</span></div>
            <div className="mb-3 bg-inputBg p-2.5 rounded-lg border border-borderSubtle">
              <label className="block text-xs font-semibold text-textSecondary uppercase mb-2">Entry Multipliers</label>
              <div className="flex gap-3 flex-wrap">
                {['InvFVG', 'CISD', 'MSS', 'Sweep'].map(t => (
                  <label key={t} className="text-[11px] flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={state.triggerFlags.includes(t)} onChange={() => toggleTriggerFlag(t)} className="accent-accent" /> {t}
                  </label>
                ))}
              </div>
              {computed.triggerBonus > 0 && <div className="mt-1.5 font-['JetBrains_Mono'] text-[10px] font-bold text-accent">+{computed.triggerBonus} PTS ({computed.activeTriggers} Mltp)</div>}
            </div>
            <CheckItem label="Displacement Candle > 60%" checked={state.d1} onChange={v=>updateField('d1',v)} info={infos.d1} onInfoClick={openInfo} pts={10} />
            <CheckItem label="2nd Confirmation Close" checked={state.d2} onChange={v=>updateField('d2',v)} info={infos.d2} onInfoClick={openInfo} pts={8} />
            <CheckItem label="Structural SL Defined" checked={state.d3} onChange={v=>updateField('d3',v)} info={infos.d3} onInfoClick={openInfo} pts={7} />
          </div>

          {/* BLOCK E */}
          <div className="bg-bgCard border rounded-xl p-6 col-span-full border-l-[3px] border-l-warning">
            <div className="flex items-center gap-2.5 mb-5 text-textPrimary font-bold text-[15px]"><span className="text-base">⚠️</span> Block E: Risk Penalties</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CheckItem label="1H FVG > 70% filled" checked={state.e1} onChange={v=>updateField('e1',v)} info={infos.e1} onInfoClick={openInfo} negative pts={10} />
              <CheckItem label="1H Lateral Range" checked={state.e2} onChange={v=>updateField('e2',v)} info={infos.e2} onInfoClick={openInfo} negative pts={10} />
              <CheckItem label="Opposing FVG Clash" checked={state.e3} onChange={v=>updateField('e3',v)} info={infos.e3} onInfoClick={openInfo} negative pts={8} />
            </div>
          </div>
          
        </div>

        {/* SIDEBAR */}
        <div className="sticky top-6">
          <div className="bg-bgCard border border-borderSubtle rounded-xl p-6 font-['JetBrains_Mono']">
            <div className="text-[11px] font-bold tracking-[1.5px] text-textSecondary uppercase mb-6 border-b border-borderSubtle pb-3">Quantitative Output</div>
            <Gauge score={computed.totalPoints} gradeColor={computed.gradeColorStr} />
            <div className="text-center mt-[-100px] mb-12">
              <div className="text-4xl font-extrabold" style={{ color: computed.gradeColorStr }}>{computed.totalPoints}</div>
              <div className="text-[11px] text-textSecondary font-semibold mt-1">SCORE</div>
              <div className="inline-block bg-inputBg text-textPrimary px-2 py-0.5 rounded-md text-sm font-extrabold mt-1.5 border border-borderSubtle" style={{ color: computed.gradeColorStr }}>{computed.grade}</div>
            </div>

            <div className="flex justify-between py-2.5 border-b border-dashed border-borderSubtle text-xs">
              <span className="text-textSecondary font-medium">VERDICT</span>
              <span className="font-bold" style={{ color: computed.gradeColorStr }}>{computed.verdict}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-dashed border-borderSubtle text-xs">
              <span className="text-textSecondary font-medium">POS. SIZE</span>
              <span className="font-bold text-textPrimary">{computed.size}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-dashed border-borderSubtle text-xs">
              <span className="text-textSecondary font-medium">DIRECTION</span>
              <span className={`font-bold ${computed.dirColor}`}>{computed.directionText}</span>
            </div>
            <div className="flex flex-col gap-1.5 py-2.5 border-b border-dashed border-borderSubtle text-xs">
              <span className="text-textSecondary font-medium">ACTIVE PENALTIES</span>
              <div className="text-left text-[11px]">
                {computed.penaltiesDesc.length ? <span className="text-bearish">{computed.penaltiesDesc.join(', ')}</span> : <span className="text-bullish">0 ACTIVE</span>}
              </div>
            </div>

            <textarea placeholder="EXECUTION NOTES..." value={state.notes} onChange={(e) => updateField('notes', e.target.value)} className="w-full mt-4 min-h-[80px] text-xs bg-inputBg border border-borderSubtle text-textPrimary p-3 rounded-lg outline-none focus:border-accent" />

            <div className="flex gap-3 mt-6 print:hidden">
              <button onClick={exportClipboard} className="flex-1 bg-inputBg border border-borderSubtle text-textPrimary font-bold text-xs py-2.5 rounded-lg hover:border-accent hover:bg-indigo-500/5 transition-all">COPY TXT</button>
              <button onClick={() => window.print()} className="flex-1 bg-inputBg border border-borderSubtle text-textPrimary font-bold text-xs py-2.5 rounded-lg hover:border-accent hover:bg-indigo-500/5 transition-all">SAVE PDF</button>
            </div>
          </div>
        </div>
      </main>

      <InfoModal isOpen={modal.isOpen} title={modal.title} desc={modal.desc} onClose={() => setModal({ ...modal, isOpen: false })} />
    </div>
  );
}

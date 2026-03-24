"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useChecklistState } from "@/hooks/useChecklistState";
import { InfoModal } from "@/components/InfoModal";
import { CheckItem } from "@/components/CheckItem";
import { Gauge } from "@/components/Gauge";
import { Toaster, ToastMessage, ToastType } from "@/components/Toaster";
import TradingViewWidget from "@/components/TradingViewWidget";

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
  pine_sweep: { title: "1. Liquidity Sweep", desc: "El precio debe realizar una toma de liquidez clara (Sweep) antes de la formación del setup." },
  pine_obGap: { title: "2. OB & Gap Formation", desc: "Formación de un Order Block (OB) e inmediatamente un Fair Value Gap (FVG) contiguo que valida el impulso." },
  pine_gapRespected: { title: "3. Gap Respected (Invalidation Zone)", desc: "El FVG formado es la zona de invalidación. NUNCA debe ser tocado antes de que ocurra el MSS. Si se toca, el setup se invalida." },
  pine_mss: { title: "4. Market Structure Shift", desc: "Se produce un Market Structure Shift (MSS) válido, confirmando la reversión." },
  pine_revisit: { title: "5. OB Revisit", desc: "El precio regresa al Order Block (OB) original donde ejecutamos la entrada." },
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Eliminate Hydration Errors caused by localStorage reading
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openInfo = (info: { title: string; desc: string }) => setModal({ isOpen: true, ...info });

  const addToast = useCallback((title: string, message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 12000); // Dissappear after 12s
  }, []);

  // Interval notification manager
  useEffect(() => {
    // Initial welcome tip
    const initialTimer = setTimeout(() => {
      addToast("System Ready", "Mantén tu checklist de trading actualizada en tiempo real. Recibirás avisos contexturales cada 5 min.", "success");
    }, 4000);

    const interval = setInterval(() => {
      // Basic context aware recommendation engine
      if (state.d1 && !state.d2) {
        addToast("Validation Warning", "Tienes buena vela de desplazamiento, pero sería vital asegurar el 2nd Confirmation Close para evitar trampas algorítmicas.", "warning");
      } else if (state.hasRedFolder && state.event30Min) {
        addToast("Risk Alert", "Tienes una noticia de alto impacto a menos de 30 minutos. Evalúa muy bien si vale la pena arriesgar ahora.", "warning");
      } else if (state.b1 && !state.b2) {
        addToast("Confluence Search", "Has confirmado un 5M FVG. Trata de apoyarlo sobre otro FVG u Order Block (Stacked Confluence) para máxima efectividad.", "info");
      } else if (!state.a2) {
        addToast("Patience Required", "El setup aún no se considera maduro si el precio no retrocede hacia la zona origen (1H FVG). Espera a que el algoritmo busque liquidez interna.", "info");
      } else if (state.e1 || state.e2 || state.e3) {
        addToast("Penalties Active", "Tu operación actual tiene advertencias o 'Red Flags' considerables. Evalúa bajar la exposición o esperar mejor escenario.", "warning");
      } else {
        // Fallback psychology tip
        const tips = [
          "Mantén tu disciplina. No persigas movimientos si se escapan de tu Kill Zone.",
          "Tradea lo que ves, no lo que sientes. Si la estructura falla, asume la pérdida.",
          "El mercado paga por esperar el setup A+, no por operar frenéticamente todos los inbalances.",
          "Presta atención al Draw on Liquidity macro. ¿A quién están manipulando hacia los extremos de la sesión?"
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        addToast("Trading Mindset", randomTip, "info");
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [state, addToast]);

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

    let pineBonus = 0;
    if (state.pine_sweep && state.pine_obGap && state.pine_gapRespected && state.pine_mss && state.pine_revisit) {
      pineBonus = 20;
      totalPoints += pineBonus;
    }
    
    if (state.pine_obGap && !state.pine_gapRespected) {
      totalPoints -= 15;
      penaltiesDesc.push("Pine Script Model Invalidated (Gap Touched)");
    }

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

  /* ─── Sub-component: Block Header ─────────────────────────────────────── */
  const BlockHeader = ({ icon, title, pts, borderStyle }: { icon: string, title: string, pts?: string, borderStyle?: string }) => (
    <div className={`flex items-center gap-3 mb-5 pb-3 border-b border-borderSubtle ${borderStyle || ''}`}>
      <span className="w-8 h-8 bg-bgMain rounded-lg border border-borderSubtle text-sm flex items-center justify-center shadow-sm flex-shrink-0">
        {icon}
      </span>
      <h2 className="font-semibold text-[13px] tracking-[0.04em] text-textPrimary uppercase">{title}</h2>
      {pts && (
        <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-semibold bg-bgMain text-textSecondary px-2.5 py-1 rounded-md border border-borderSubtle">
          {pts}
        </span>
      )}
    </div>
  );

  /* ─── Loading skeleton ─────────────────────────────────────────────────── */
  if (!isMounted) return (
    <div className="min-h-screen bg-bgMain flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span className="text-[12px] text-textSecondary tracking-widest uppercase font-medium">Initializing</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* ═══════════════════════════════════════════════════════════
          TOP APPLICATION BAR — Glassmorphism Nav
          ═══════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-40 w-full bg-bgCard/80 backdrop-blur-xl border-b border-borderSubtle shadow-[0_1px_0_0_var(--border-subtle)] print:hidden">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 h-[58px] flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Live indicator dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bullish opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-bullish" />
              </span>
              <span className="text-[14px] font-bold text-textPrimary tracking-wide">
                ICT Market Checklist
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-borderSubtle flex-shrink-0" />

            {/* Status pills */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium min-w-0">
              <span className={`truncate font-semibold tracking-wide ${computed.kzColor}`}>
                {computed.kzText}
              </span>
              {getSessContext(state.session) && (
                <>
                  <span className="text-borderSubtle">·</span>
                  <span className="text-accent font-semibold truncate">
                    {getSessContext(state.session)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            <button
              onClick={toggleTheme}
              className="h-8 px-3.5 rounded-lg text-[12px] font-medium text-textSecondary border border-borderSubtle bg-transparent hover:bg-bgMain hover:text-textPrimary hover:border-textSecondary/40 transition-all duration-200"
            >
              Toggle Theme
            </button>
            <button
              onClick={resetState}
              className="h-8 px-3.5 rounded-lg text-[12px] font-medium text-bearish border border-bearish/25 bg-bearish/5 hover:bg-bearish/10 hover:border-bearish/50 transition-all duration-200"
            >
              Reset Calculator
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          HERO INPUTS BAR — Trade Context
          ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-bgCard/60 border-b border-borderSubtle backdrop-blur-lg">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-4">
          <div className="flex flex-wrap lg:flex-nowrap gap-4 items-end">

            {/* Instrument */}
            <div className="w-full lg:w-36 shrink-0">
              <label className="block text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em] mb-2">
                Instrument / Ticker
              </label>
              <input
                type="text"
                placeholder="EUR/USD"
                value={state.instrument}
                onChange={(e) => updateField('instrument', e.target.value.toUpperCase())}
                className="w-full bg-bgMain border border-borderSubtle text-textPrimary px-3 py-2.5 rounded-lg text-[13px] font-bold outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-['JetBrains_Mono'] uppercase tracking-wider text-center transition-all duration-200 hover:border-textSecondary/40 placeholder:text-textSecondary/40"
              />
            </div>

            {/* Open Time */}
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em] mb-2 group-focus-within:text-accent transition-colors duration-200">
                Open Time (Operación)
              </label>
              <input
                type="datetime-local"
                value={state.datetime}
                onChange={(e) => updateField('datetime', e.target.value)}
                className="w-full bg-bgMain border border-borderSubtle text-textPrimary px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-[13px] font-['JetBrains_Mono'] transition-all duration-200 hover:border-textSecondary/40"
              />
            </div>

            {/* Closing Time */}
            <div className="w-full sm:w-auto flex-1 group">
              <label className="block text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em] mb-2 group-focus-within:text-accent transition-colors duration-200">
                Closing Time (Operación)
              </label>
              <input
                type="datetime-local"
                value={state.closingTime}
                onChange={(e) => updateField('closingTime', e.target.value)}
                className="w-full bg-bgMain border border-borderSubtle text-textSecondary focus:text-textPrimary px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-[13px] font-['JetBrains_Mono'] transition-all duration-200 hover:border-textSecondary/40"
              />
            </div>

            {/* Macro Session */}
            <div className="w-full lg:w-60 shrink-0 group">
              <label className="block text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em] mb-2 group-focus-within:text-accent transition-colors duration-200">
                Macro Session
              </label>
              <select
                value={state.session}
                onChange={(e) => updateField('session', e.target.value)}
                className="w-full bg-bgMain border border-borderSubtle text-textPrimary px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-[13px] font-medium font-['JetBrains_Mono'] cursor-pointer transition-all duration-200 appearance-none text-center hover:border-textSecondary/40"
              >
                <option value="London">London (02:00-05:00 EST)</option>
                <option value="NY AM">New York AM (08:30-11:00 EST)</option>
                <option value="NY Lunch">New York Lunch (11:30-13:00 EST)</option>
                <option value="NY PM">New York PM (13:30-16:00 EST)</option>
                <option value="Asian">Asian (20:00-00:00 EST)</option>
                <option value="London Close">London Close</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-5 sm:px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_368px_1fr] gap-5 items-start">

        {/* ── INNER GRID: wraps Red Folder, A/B/Output/C/D, and Block E ── */}
        {/* Red Folder: spans all 3 cols */}
        <div className="xl:col-span-3">

            {/* ─── Red Folder / Risk Filter ─── */}
            <div className={`
              bg-bgCard border rounded-2xl p-6 col-span-full relative overflow-hidden transition-all duration-300
              print:break-inside-avoid
              ${computed.rfTier === 1
                ? 'animate-pulseBorder border-bearish ring-1 ring-bearish/20'
                : computed.rfTier > 1
                  ? 'border-warning/60'
                  : 'border-borderSubtle hover:border-textSecondary/20'}
            `}>
              {/* Subtle hazard background icon */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none text-bearish">
                <svg className="w-28 h-28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2" />
                </svg>
              </div>

              <BlockHeader
                icon="🔴"
                title="Red Folder / Risk Filter"
                pts="News Monitor"
                borderStyle={computed.rfTier === 1 ? 'border-bearish/20' : ''}
              />

              <CheckItem
                label={<span className="font-semibold text-textPrimary">Is there a Red Folder event within the next 4 hours?</span>}
                checked={state.hasRedFolder}
                onChange={(v) => updateField('hasRedFolder', v)}
                info={infos.hasRedFolder}
                onInfoClick={openInfo}
              />

              {state.hasRedFolder && (
                <div className="mt-5 bg-bgMain/60 p-5 rounded-xl border border-borderSubtle">
                  {computed.rfTier === 1 && (
                    <div className="text-[12px] tracking-widest font-bold font-['Inter'] px-4 py-3 rounded-xl border border-bearish/40 mb-5 text-center bg-bearish/10 text-bearish">
                      AVOID TRADING — TIER 1 NEWS IMMINENT
                    </div>
                  )}
                  {computed.rfTier === 2 && (
                    <div className="text-[12px] tracking-widest font-bold font-['Inter'] px-4 py-3 rounded-xl border border-warning/40 mb-5 text-center bg-warning/10 text-warning">
                      HIGH CAUTION — TIER 2 NEWS
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-5">
                    {rfEvents.map(e => (
                      <label
                        key={e.val}
                        className={`
                          text-[11px] font-medium font-['Inter'] flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg transition-all duration-150 border
                          ${state.rfFlags.includes(e.val)
                            ? (e.tier === 1
                              ? 'bg-bearish/10 text-bearish border-bearish/40'
                              : 'bg-warning/10 text-warning border-warning/40')
                            : 'bg-bgCard text-textSecondary border-borderSubtle hover:border-textSecondary/30 hover:bg-bgMain hover:text-textPrimary'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={state.rfFlags.includes(e.val)}
                          onChange={() => toggleRfFlag(e.val)}
                          className="hidden"
                        />
                        {e.val}
                      </label>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Other event ticker... (e.g. BOC Rate)"
                    value={state.rfOther}
                    onChange={(e) => updateField('rfOther', e.target.value)}
                    className="w-full bg-bgCard border border-borderSubtle text-textPrimary px-4 py-2.5 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4 placeholder:text-textSecondary/40 font-medium transition-all duration-200"
                  />

                  <div className="rounded-xl border border-borderSubtle bg-bgCard/50">
                    <CheckItem
                      label={
                        <span className="text-bearish font-semibold flex items-center gap-2.5 text-[13px]">
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bearish opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-bearish" />
                          </span>
                          Event is within 30 minutes!
                        </span>
                      }
                      checked={state.event30Min}
                      onChange={v => updateField('event30Min', v)}
                      info={infos.event30Min}
                      onInfoClick={openInfo}
                      negative
                      pts={10}
                    />
                  </div>
                </div>
              )}
            </div>


        </div>{/* close Red Folder col-span-3 */}

        {/* ── Block A: col 1, row 2 ── */}
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 hover:border-textSecondary/20 transition-all duration-300 print:break-inside-avoid">
          <BlockHeader icon="📈" title="Block A: 1H Macro" pts="30 Pts" />
          <CheckItem label="FVG clearly identified on 1H" checked={state.a1} onChange={v => updateField('a1', v)} info={infos.a1} onInfoClick={openInfo} pts={15}>
            <div className="mt-3 flex items-center bg-bgMain rounded-lg border border-borderSubtle px-3 py-1 hover:border-textSecondary/30 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/15 transition-all duration-200">
              <select value={state.a1_dir} onChange={(e) => updateField('a1_dir', e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer appearance-none text-center">
                <option value="">-- Direction --</option>
                <option value="Bullish">Bullish FVG (Price expected to rally)</option>
                <option value="Bearish">Bearish FVG (Price expected to drop)</option>
                <option value="InverseBull">Inverse FVG → Now Bullish</option>
                <option value="InverseBear">Inverse FVG → Now Bearish</option>
              </select>
            </div>
          </CheckItem>
          <CheckItem label="Price retraces INTO 1H FVG" checked={state.a2} onChange={v => updateField('a2', v)} info={infos.a2} onInfoClick={openInfo} pts={10} />
          <CheckItem label="First reaction candle mapped" checked={state.a3} onChange={v => updateField('a3', v)} info={infos.a3} onInfoClick={openInfo} pts={5} />
        </div>

        {/* ── Quantitative Output: col 2, rows 2-3 (center) ── */}
        <aside className="w-full xl:row-span-2">
          <div className="bg-bgCard border border-borderSubtle rounded-2xl overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] print:shadow-none print:break-inside-avoid">

            <div className="bg-bgMain/70 border-b border-borderSubtle px-6 py-4 flex items-center justify-center">
              <h2 className="font-semibold text-[11px] tracking-[0.16em] text-textSecondary uppercase font-['JetBrains_Mono']">
                Quantitative Output
              </h2>
            </div>

            <div className="p-6 flex flex-col items-center">

              <div className="relative w-full flex flex-col items-center">
                <Gauge score={computed.totalPoints} gradeColor={computed.gradeColorStr} />
                <div className="absolute top-[130px] flex flex-col items-center pointer-events-none">
                  <div
                    className="text-[52px] font-extrabold tracking-tight leading-none tabular-nums"
                    style={{ color: computed.gradeColorStr, filter: `drop-shadow(0 0 18px ${computed.gradeColorStr}50)` }}
                  >
                    {computed.totalPoints}
                  </div>
                  <div className="text-[10px] text-textSecondary font-semibold mt-1.5 tracking-[0.18em] uppercase font-['JetBrains_Mono']">
                    Score
                  </div>
                </div>
              </div>

              <div className="w-full mt-8">
                <div className="bg-bgMain/60 border border-borderSubtle rounded-xl divide-y divide-borderSubtle overflow-hidden">

                  {/* Evaluation Grade */}
                  <div className="flex justify-between items-center px-4 py-3 text-[13px]">
                    <span className="text-textSecondary font-medium">Evaluation Grade</span>
                    <span
                      className="font-extrabold text-[15px] px-2.5 py-0.5 rounded-lg bg-bgCard border border-borderSubtle font-['JetBrains_Mono']"
                      style={{ color: computed.gradeColorStr, boxShadow: `0 2px 10px ${computed.gradeColorStr}25` }}
                    >
                      {computed.grade}
                    </span>
                  </div>

                  {/* Verdict */}
                  <div className="flex justify-between items-center px-4 py-3 text-[13px]">
                    <span className="text-textSecondary font-medium">Verdict</span>
                    <span
                      className="font-bold text-[12px] tracking-[0.06em] font-['JetBrains_Mono']"
                      style={{ color: computed.gradeColorStr }}
                    >
                      {computed.verdict}
                    </span>
                  </div>

                  {/* Position Size */}
                  <div className="flex justify-between items-center px-4 py-3 text-[13px]">
                    <span className="text-textSecondary font-medium">Position Size</span>
                    <span className="font-bold text-textPrimary text-[14px] px-2.5 py-0.5 rounded-lg bg-bgCard border border-borderSubtle font-['JetBrains_Mono']">
                      {computed.size}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 text-[13px]">
                    <span className="text-textSecondary font-medium">Direction Bias</span>
                    <span className={`font-bold tracking-wide text-[13px] ${computed.dirColor}`}>{computed.directionText}</span>
                  </div>

                  <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                    <span className="text-textSecondary font-medium">Active Penalties</span>
                    <div className="mt-1 p-3 bg-bgCard rounded-lg border border-borderSubtle">
                      {computed.penaltiesDesc.length
                        ? <span className="text-bearish font-medium leading-relaxed block text-[12px]">{computed.penaltiesDesc.join(', ')}</span>
                        : <span className="text-bullish font-medium block text-[12px]">None Active. Clear to proceed.</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <textarea
                placeholder="Enter execution notes here..."
                value={state.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="w-full mt-5 min-h-[96px] text-[13px] bg-bgMain/70 border border-borderSubtle text-textPrimary p-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 font-medium leading-relaxed resize-y placeholder:text-textSecondary/40"
              />

              <div className="flex gap-3 w-full mt-4 print:hidden">
                <button onClick={exportClipboard} className="flex-1 bg-transparent border border-borderSubtle text-textSecondary hover:text-textPrimary hover:border-textSecondary/50 hover:bg-bgMain font-semibold text-[12px] py-3 rounded-xl transition-all duration-200 tracking-wide active:scale-[0.97] font-['Inter']">
                  Copy to Clipboard
                </button>
                <button onClick={() => window.print()} className="flex-1 bg-transparent border border-borderSubtle text-textSecondary hover:text-textPrimary hover:border-textSecondary/50 hover:bg-bgMain font-semibold text-[12px] py-3 rounded-xl transition-all duration-200 tracking-wide active:scale-[0.97] font-['Inter']">
                  Save as PDF
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Block B: col 3, row 2 ── */}
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 hover:border-textSecondary/20 transition-all duration-300 print:break-inside-avoid">
          <BlockHeader icon="📉" title="Block B: 5M Structure" pts="25 Pts" />
          <CheckItem label="5M FVG INSIDE 1H zone" checked={state.b1} onChange={v => updateField('b1', v)} info={infos.b1} onInfoClick={openInfo} pts={15} />
          <CheckItem label="Stacked FVG Confluence" checked={state.b2} onChange={v => updateField('b2', v)} info={infos.b2} onInfoClick={openInfo} pts={10} />
          <div className="mt-4 p-4 bg-bgMain/70 rounded-xl border border-borderSubtle">
            <label className="block text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em] mb-2.5">Delivery State Engine</label>
            <select value={state.b_delivery} onChange={(e) => updateField('b_delivery', e.target.value)} className="w-full bg-bgCard border border-borderSubtle text-textPrimary px-3 py-2.5 rounded-lg text-[13px] font-medium outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none text-center transition-all duration-200 hover:border-textSecondary/30">
              <option value="balanced">Balanced (50/50 candles) — 0 pts</option>
              <option value="onesided">One-sided (3+ consecutive) — +3 bonus pts</option>
              <option value="cisd">CISD detected — Mandatory 1M check</option>
            </select>
          </div>
        </div>

        {/* ── Block C: col 1, row 3 ── */}
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 hover:border-textSecondary/20 transition-all duration-300 print:break-inside-avoid">
          <BlockHeader icon="💧" title="Block C: Liquidity Pools" pts="20 Pts" />
          <CheckItem label="Liquidity Sweep Confirmed" checked={state.c1} onChange={v => updateField('c1', v)} info={infos.c1} onInfoClick={openInfo} pts={12}>
            <div className="mt-3 flex items-center bg-bgMain rounded-lg border border-borderSubtle px-3 py-1 hover:border-textSecondary/30 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/15 transition-all duration-200">
              <select value={state.c1_dir} onChange={(e) => updateField('c1_dir', e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer appearance-none text-center">
                <option value="">-- Sweep Level --</option>
                <option value="BSL">BSL Taken Above (Bearish Signal)</option>
                <option value="SSL">SSL Taken Below (Bullish Signal)</option>
              </select>
            </div>
          </CheckItem>
          <CheckItem label="Draw Target Assigned" checked={state.c2} onChange={v => updateField('c2', v)} info={infos.c2} onInfoClick={openInfo} pts={8}>
            <div className="mt-3 flex items-center bg-bgMain rounded-lg border border-borderSubtle px-3 py-1 hover:border-textSecondary/30 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/15 transition-all duration-200">
              <select value={state.c2_pool} onChange={(e) => updateField('c2_pool', e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent text-textPrimary py-1.5 text-[12px] font-medium outline-none cursor-pointer appearance-none text-center">
                <option value="">-- Pool --</option>
                <option value="BSL">BSL Above (Bullish Target)</option>
                <option value="SSL">SSL Below (Bearish Target)</option>
                <option value="EQH">Equal Highs Above</option>
                <option value="EQL">Equal Lows Below</option>
                <option value="PDH">Previous Day High</option>
                <option value="PDL">Previous Day Low</option>
                <option value="PWH">Previous Week High</option>
                <option value="PWL">Previous Week Low</option>
                <option value="Midnight">Midnight Open level</option>
              </select>
            </div>
          </CheckItem>
        </div>

        {/* ── col 2 row 3 is occupied by aside row-span-2 — nothing needed here ── */}

        {/* ── Block D: col 3, row 3 ── */}
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 hover:border-textSecondary/20 transition-all duration-300 print:break-inside-avoid">
          <BlockHeader icon="⚡" title="Block D: 1M Triggers" pts="25+ Pts" />
          <div className="mb-5 bg-bgMain/70 p-4 rounded-xl border border-borderSubtle relative overflow-hidden print:bg-transparent">
            <div className="absolute top-0 left-0 w-0.5 h-full bg-accent opacity-60 rounded-full" />
            <div className="flex justify-between items-center mb-4 pl-1">
              <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-[0.08em]">Entry Multipliers</span>
              {computed.triggerBonus > 0 && (
                <span className="font-bold text-[11px] bg-accent/10 px-2 py-0.5 rounded-md text-accent border border-accent/25 font-['JetBrains_Mono']">+{computed.triggerBonus} Points</span>
              )}
            </div>
            <div className="flex flex-col gap-2.5 pl-1">
              {['InvFVG', 'CISD', 'MSS', 'Sweep'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-14 text-[11px] font-bold text-textPrimary">{t}</span>
                  <label className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold py-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                    state.triggerFlags.includes(`${t} (Up)`)
                      ? 'bg-bullish/15 text-bullish border-bullish/40 shadow-sm'
                      : 'bg-bgCard text-textSecondary border-borderSubtle hover:border-textSecondary/40'
                  }`}>
                    <input type="checkbox" checked={state.triggerFlags.includes(`${t} (Up)`)} onChange={() => toggleTriggerFlag(`${t} (Up)`)} className="hidden" />
                    Upside 📈
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold py-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                    state.triggerFlags.includes(`${t} (Dn)`)
                      ? 'bg-bearish/15 text-bearish border-bearish/40 shadow-sm'
                      : 'bg-bgCard text-textSecondary border-borderSubtle hover:border-textSecondary/40'
                  }`}>
                    <input type="checkbox" checked={state.triggerFlags.includes(`${t} (Dn)`)} onChange={() => toggleTriggerFlag(`${t} (Dn)`)} className="hidden" />
                    Downside 📉
                  </label>
                </div>
              ))}
            </div>
          </div>
          <CheckItem label="Displacement Candle > 60%" checked={state.d1} onChange={v => updateField('d1', v)} info={infos.d1} onInfoClick={openInfo} pts={10} />
          <CheckItem label="2nd Confirmation Close" checked={state.d2} onChange={v => updateField('d2', v)} info={infos.d2} onInfoClick={openInfo} pts={8} />
          <CheckItem label="Structural SL Defined" checked={state.d3} onChange={v => updateField('d3', v)} info={infos.d3} onInfoClick={openInfo} pts={7} />
        </div>

        {/* ── Block: OB Sweep & Revisit Model ── */}
        <div className="xl:col-span-3 bg-bgCard border border-borderSubtle rounded-2xl p-6 hover:border-textSecondary/20 transition-all duration-300 print:break-inside-avoid">
          <BlockHeader icon="🎯" title="OB Sweep Model" pts="Bonus" />
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <CheckItem label="1. Liquidity Sweep" checked={state.pine_sweep} onChange={v => updateField('pine_sweep', v)} info={infos.pine_sweep} onInfoClick={openInfo} />
            <CheckItem label="2. OB & Gap" checked={state.pine_obGap} onChange={v => updateField('pine_obGap', v)} info={infos.pine_obGap} onInfoClick={openInfo} />
            <CheckItem label="3. Gap Respected" checked={state.pine_gapRespected} onChange={v => updateField('pine_gapRespected', v)} info={infos.pine_gapRespected} onInfoClick={openInfo} />
            <CheckItem label="4. MSS Validated" checked={state.pine_mss} onChange={v => updateField('pine_mss', v)} info={infos.pine_mss} onInfoClick={openInfo} />
            <CheckItem label="5. Revisit to OB" checked={state.pine_revisit} onChange={v => updateField('pine_revisit', v)} info={infos.pine_revisit} onInfoClick={openInfo} />
          </div>
        </div>

        {/* ── Block E: spans all 3 cols, row 4 ── */}
        <div className="xl:col-span-3 bg-bgCard border border-borderSubtle rounded-2xl p-6 relative overflow-hidden hover:border-bearish/20 transition-all duration-300 print:break-inside-avoid">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning/60 to-bearish/60 rounded-full" />
          <BlockHeader icon="⚠️" title="Block E: Risk Penalties" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CheckItem label="1H FVG > 70% filled" checked={state.e1} onChange={v => updateField('e1', v)} info={infos.e1} onInfoClick={openInfo} negative pts={10} />
            <CheckItem label="1H Lateral Range" checked={state.e2} onChange={v => updateField('e2', v)} info={infos.e2} onInfoClick={openInfo} negative pts={10} />
            <CheckItem label="Opposing FVG Clash" checked={state.e3} onChange={v => updateField('e3', v)} info={infos.e3} onInfoClick={openInfo} negative pts={8} />
          </div>
        </div>

        {/* ── TradingView Chart: spans all 3 cols, row 5 ── */}
        <div className="xl:col-span-3 bg-bgCard border border-borderSubtle rounded-2xl overflow-hidden print:hidden">
          {/* Header */}
          <div className="bg-bgMain/70 border-b border-borderSubtle px-6 py-4 flex items-center gap-3">
            <span className="w-8 h-8 bg-bgCard rounded-lg border border-borderSubtle text-sm flex items-center justify-center shadow-sm flex-shrink-0">📊</span>
            <h2 className="font-semibold text-[13px] tracking-[0.04em] text-textPrimary uppercase">Live Market Chart</h2>
            <span className="ml-auto font-['JetBrains_Mono'] text-[11px] font-semibold bg-bgMain text-textSecondary px-2.5 py-1 rounded-md border border-borderSubtle">US100 · 5m</span>
          </div>
          {/* Chart container */}
          <div style={{ height: '560px' }}>
            <TradingViewWidget />
          </div>
        </div>
      </main>

      <InfoModal isOpen={modal.isOpen} title={modal.title} desc={modal.desc} onClose={() => setModal({ ...modal, isOpen: false })} />
      <Toaster toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}

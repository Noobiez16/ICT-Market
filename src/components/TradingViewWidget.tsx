"use client";

import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear the container to prevent duplicate widgets during React Strict Mode or HMR
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // ICT-Optimized Configuration
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": "CAPITALCOM:US100", // Free, unrestricted, tick-for-tick Nasdaq 100 proxy
      "interval": "5", // 5-minute chart is standard for ICT intraday alignment
      "timezone": "America/New_York", // Crucial for ICT killzones
      "theme": "dark",
      "style": "1", // Japanese Candlesticks
      "locale": "en",
      "enable_publishing": false,
      "backgroundColor": "#09090b", // Matches your Next.js zinc-950 background
      "gridColor": "rgba(255, 255, 255, 0.03)", // Ultra subtle grid
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": true,
      "allow_symbol_change": true,
      "calendar": false,
      "hide_side_toolbar": false, // Enabled so you can draw FVGs, Fibs, etc.
      "details": false,
      "hotlist": false,
      "hide_volume": true, // ICT mostly relies on pure price/time, hiding volume for cleaner look
      "withdateranges": true,
      "studies": [],
      "support_host": "https://www.tradingview.com"
    });

    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
      <div ref={container} className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }} />
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/symbols/CAPITALCOM-US100/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">US100 chart</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);

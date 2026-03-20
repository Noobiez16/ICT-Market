import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgMain: 'var(--bg-main)',
        bgCard: 'var(--bg-card)',
        borderSubtle: 'var(--border-subtle)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        bullish: 'var(--bullish)',
        bearish: 'var(--bearish)',
        warning: 'var(--warning)',
        accent: 'var(--accent)',
        inputBg: 'var(--input-bg)',
        itemHover: 'var(--item-hover)',
      },
      animation: {
        pulseBorder: 'pulse-border 1.5s infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%': { borderColor: 'rgba(239, 68, 68, 0.4)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.1)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 1)', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.2)' },
          '100%': { borderColor: 'rgba(239, 68, 68, 0.4)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.1)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;

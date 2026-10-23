import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '360px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      // Orientation-aware variants: `portrait:` / `landscape:`
      portrait: { raw: '(orientation: portrait)' },
      landscape: { raw: '(orientation: landscape)' },
      // Short landscape phones: switch to compact dock/side layout
      'landscape-short': { raw: '(orientation: landscape) and (max-height: 500px)' },
      // Fine pointer (desktop) vs coarse (touch)
      touch: { raw: '(pointer: coarse)' },
      mouse: { raw: '(pointer: fine)' },
    },
    extend: {
      colors: {
        scada: {
          bg: '#090D16', // Deep Space Dark
          panel: '#131B2E', // Card surfaces
          border: '#1E293B', // Panel sub-borders
          mint: '#00F5D4', // Nominal
          amber: '#FFB703', // Caution
          crimson: '#FF0054', // Critical
          cobalt: '#3A86FF', // Actions / links
          text: '#E2E8F0',
          dim: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: [
          '"Fira Code"',
          '"Share Tech Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        dock: 'calc(4rem + env(safe-area-inset-bottom))',
      },
      boxShadow: {
        'glow-mint': '0 0 12px rgba(0, 245, 212, 0.55)',
        'glow-amber': '0 0 12px rgba(255, 183, 3, 0.55)',
        'glow-crimson': '0 0 14px rgba(255, 0, 84, 0.65)',
        'glow-cobalt': '0 0 12px rgba(58, 134, 255, 0.55)',
      },
      dropShadow: {
        'glow-mint': '0 0 6px rgba(0, 245, 212, 0.8)',
        'glow-amber': '0 0 6px rgba(255, 183, 3, 0.8)',
        'glow-crimson': '0 0 6px rgba(255, 0, 84, 0.9)',
        'glow-cobalt': '0 0 6px rgba(58, 134, 255, 0.8)',
      },
      keyframes: {
        // Animated SVG power-flow lines: apply to a stroke-dasharray'd path
        'flow-forward': { to: { strokeDashoffset: '-24' } },
        'flow-reverse': { to: { strokeDashoffset: '24' } },
        'alarm-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 4px rgba(255,0,84,0.4)' },
          '50%': { opacity: '0.55', boxShadow: '0 0 18px rgba(255,0,84,0.9)' },
        },
        'tap-ripple': {
          '0%': { transform: 'scale(0.96)', filter: 'brightness(1.6)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.82' },
          '95%': { opacity: '1' },
        },
        'scan-roll': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'blink-caret': { '50%': { opacity: '0' } },
        'pop-in': {
          '0%': { transform: 'translateY(8px) scale(0.6)', opacity: '0' },
          '70%': { transform: 'translateY(-2px) scale(1.06)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      animation: {
        'flow-forward': 'flow-forward 0.8s linear infinite',
        'flow-reverse': 'flow-reverse 0.8s linear infinite',
        'alarm-pulse': 'alarm-pulse 1s ease-in-out infinite',
        'tap-ripple': 'tap-ripple 160ms ease-out',
        flicker: 'flicker 6s linear infinite',
        'scan-roll': 'scan-roll 7s linear infinite',
        caret: 'blink-caret 1s steps(1) infinite',
        'pop-in': 'pop-in 0.35s cubic-bezier(.2,1.4,.4,1) both',
      },
      transitionTimingFunction: { gauge: 'linear' },
    },
  },
  plugins: [
    plugin(function ({ addBase, addComponents, addUtilities }) {
      addBase({
        ':root': {
          '--scada-bg': '#090D16',
          '--scada-panel': '#131B2E',
          '--scada-border': '#1E293B',
          '--scada-mint': '#00F5D4',
          '--scada-amber': '#FFB703',
          '--scada-crimson': '#FF0054',
          '--scada-cobalt': '#3A86FF',
        },
        html: { backgroundColor: '#090D16', color: '#E2E8F0', touchAction: 'manipulation' },
        body: {
          margin: '0',
          overscrollBehavior: 'none',
          WebkitTapHighlightColor: 'transparent',
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        },
      });

      addComponents({
        // Pinned CRT overlay; toggle by adding/removing `.crt-on` on a root element
        '.crt-overlay': {
          pointerEvents: 'none',
          position: 'fixed',
          inset: '0',
          zIndex: '60',
          display: 'none',
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0) 4px), radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)',
          mixBlendMode: 'multiply',
        },
        '.crt-on .crt-overlay': { display: 'block' },
        '.crt-on .crt-overlay::after': {
          content: '""',
          position: 'absolute',
          inset: '0',
          height: '30%',
          background:
            'linear-gradient(to bottom, rgba(0,245,212,0), rgba(0,245,212,0.05), rgba(0,245,212,0))',
          animation: 'scan-roll 7s linear infinite',
        },
        '.crt-on .crt-flicker': { animation: 'flicker 6s linear infinite' },

        // Panels and touch targets
        '.scada-panel': {
          backgroundColor: 'rgba(19,27,46,0.82)',
          border: '1px solid rgba(148,163,184,0.16)',
          borderRadius: '1rem',
          backdropFilter: 'blur(8px)',
        },
        '.touch-target': {
          minHeight: '48px',
          minWidth: '48px',
          userSelect: 'none',
          transition: 'transform 80ms linear, filter 80ms linear',
        },
        '.touch-target:active': { transform: 'scale(0.96)', filter: 'brightness(1.5)' },

        // Dashed stroke for animated power-flow SVG lines
        '.flow-line': { strokeDasharray: '6 6', strokeLinecap: 'round' },
      });

      addUtilities({
        '.text-glow-mint': { textShadow: '0 0 8px rgba(0,245,212,0.7)' },
        '.text-glow-amber': { textShadow: '0 0 8px rgba(255,183,3,0.7)' },
        '.text-glow-crimson': { textShadow: '0 0 8px rgba(255,0,84,0.8)' },
        '.text-glow-cobalt': { textShadow: '0 0 8px rgba(58,134,255,0.7)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.scrollbar-none': { scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } },
        '.snap-swipe': { scrollSnapType: 'x mandatory', overflowX: 'auto' },
      });
    }),
  ],
};

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
          bg: '#000000',
          panel: '#1c1c1e', // secondarySystemBackground
          border: '#2c2c2e',
          mint: '#30D158', // systemGreen
          amber: '#FF9F0A', // systemOrange
          crimson: '#FF453A', // systemRed
          cobalt: '#0A84FF', // systemBlue
          text: '#FFFFFF',
          dim: '#8E8E93', // secondaryLabel
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        hud: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Rounded"', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        dock: 'calc(4rem + env(safe-area-inset-bottom))',
      },
      boxShadow: {
        'glow-mint': '0 4px 16px rgba(48, 209, 88, 0.30)',
        'glow-amber': '0 4px 16px rgba(255, 159, 10, 0.30)',
        'glow-crimson': '0 4px 16px rgba(255, 69, 58, 0.34)',
        'glow-cobalt': '0 4px 16px rgba(10, 132, 255, 0.34)',
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
          '--scada-bg': '#000000',
          '--scada-panel': '#1c1c1e',
          '--scada-border': '#2c2c2e',
          '--scada-mint': '#30D158',
          '--scada-amber': '#FF9F0A',
          '--scada-crimson': '#FF453A',
          '--scada-cobalt': '#0A84FF',
        },
        html: { backgroundColor: '#000000', color: '#FFFFFF', touchAction: 'manipulation', colorScheme: 'dark' },
        body: {
          margin: '0',
          overscrollBehavior: 'none',
          WebkitTapHighlightColor: 'transparent',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
          backgroundColor: 'rgba(28,28,30,0.62)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '1.25rem',
          backdropFilter: 'blur(24px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.7)',
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
        '.text-glow-mint': { textShadow: '0 1px 2px rgba(0,0,0,0.4)' },
        '.text-glow-amber': { textShadow: '0 1px 2px rgba(0,0,0,0.4)' },
        '.text-glow-crimson': { textShadow: '0 1px 2px rgba(0,0,0,0.4)' },
        '.text-glow-cobalt': { textShadow: '0 1px 2px rgba(0,0,0,0.4)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.scrollbar-none': { scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } },
        '.snap-swipe': { scrollSnapType: 'x mandatory', overflowX: 'auto' },
      });
    }),
  ],
};

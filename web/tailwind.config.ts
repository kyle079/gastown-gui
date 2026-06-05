import type { Config } from 'tailwindcss';

/**
 * Gas Town design tokens.
 *
 * Visual direction: Vercel-grade restraint with a RESTRAINED TRON influence —
 * dark, geometric, precise, technical legibility. NO neon glow, NO cyberpunk.
 * Colors are exposed as `R G B` channel triples in CSS variables (see styles/tokens.css)
 * so Tailwind's `/<alpha>` opacity modifiers work everywhere.
 *
 * See DESIGN.md for the rationale behind every token.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replace the default palette: semantic tokens only. No stray indigo-500s.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      // Structural surfaces, dark -> light
      ink: channel('--c-ink'), // deepest background
      base: channel('--c-base'), // app background
      surface: channel('--c-surface'), // panels, cards
      raised: channel('--c-raised'), // hover / lifted rows
      overlay: channel('--c-overlay'), // dialogs, popovers

      // Lines
      line: channel('--c-line'), // hairline borders
      'line-strong': channel('--c-line-strong'),

      // Text
      fg: channel('--c-fg'), // primary text
      muted: channel('--c-muted'), // secondary text
      faint: channel('--c-faint'), // tertiary / disabled

      // The single accent — restrained technical cyan. Used flat, never glowing.
      accent: channel('--c-accent'),
      'accent-fg': channel('--c-accent-fg'),
      'accent-dim': channel('--c-accent-dim'),

      // Status — desaturated to sit calmly on the dark base.
      ok: channel('--c-ok'),
      warn: channel('--c-warn'),
      danger: channel('--c-danger'),
      info: channel('--c-info'),
    },
    borderRadius: {
      none: '0',
      sm: '3px',
      DEFAULT: '4px',
      md: '6px',
      lg: '8px',
      full: '9999px',
    },
    fontFamily: {
      sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: [
        'JetBrains Mono',
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Consolas',
        'monospace',
      ],
    },
    extend: {
      fontSize: {
        // Tight technical scale.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      ringWidth: {
        DEFAULT: '1px',
      },
      ringColor: {
        DEFAULT: channel('--c-accent'),
      },
      boxShadow: {
        // Soft elevation only — no colored glows.
        panel: '0 1px 0 0 rgb(var(--c-line) / 0.6), 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        overlay: '0 16px 48px -16px rgb(0 0 0 / 0.75)',
      },
      backgroundImage: {
        // Faint structural grid — Tron's geometry without the glow. Use sparingly.
        grid: `linear-gradient(to right, rgb(var(--c-line) / 0.5) 1px, transparent 1px),
               linear-gradient(to bottom, rgb(var(--c-line) / 0.5) 1px, transparent 1px)`,
      },
      backgroundSize: {
        grid: '40px 40px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'scale-in': 'scale-in 120ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;

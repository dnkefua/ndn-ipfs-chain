/**
 * Design system theme tokens
 * Exported for use in non-Tailwind code (charts, custom calculations, etc)
 */

export const colors = {
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  accent: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
};

export const lightTheme = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
};

export const darkTheme = {
  bg: '#020617',
  surface: '#0f172a',
  surfaceElevated: '#1e293b',
  border: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
};

export const shadows = {
  elevated: '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
  floating: '0 20px 40px -12px rgba(15, 23, 42, 0.18)',
  glow: '0 0 0 1px rgba(99, 102, 241, 0.1), 0 8px 24px -4px rgba(99, 102, 241, 0.25)',
};

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.875rem',
  xl: '1rem',
  card: '0.875rem',
  full: '9999px',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  '3xl': '3rem',
  '4xl': '4rem',
};

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  'display-2': '3.5rem',
  'display-1': '4.5rem',
};

export const fontFamily = {
  sans: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export const transitions = {
  fast: '150ms ease-out',
  base: '200ms ease-out',
  slow: '300ms ease-out',
};

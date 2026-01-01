// ============================================
// SNE RADAR - DESIGN TOKENS v2.2
// Sistema de design formalizado
// ============================================

// ============================================
// COLORS - Cores SNE Labs
// ============================================

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0B0B0B',      // Fundo principal
    surface: '#111216',      // Superfícies elevadas
    elevated: '#1B1B1F',     // Elementos flutuantes
    overlay: 'rgba(0, 0, 0, 0.8)', // Overlays
  },

  // Text
  text: {
    primary: '#F7F7F8',      // Texto principal
    secondary: '#A6A6A6',    // Texto secundário
    muted: '#666666',        // Texto muted
    inverse: '#0B0B0B',      // Texto sobre fundos escuros
  },

  // Accent/Brand
  accent: {
    primary: '#FF6A00',      // Laranja SNE
    hover: '#E65A00',        // Hover state
    muted: 'rgba(255, 106, 0, 0.1)', // Fundo muted
  },

  // Semantic Colors
  semantic: {
    success: '#00C48C',      // Verde sucesso
    warning: '#FFC857',      // Amarelo aviso
    error: '#FF4D4F',        // Vermelho erro
    info: '#4A90E2',         // Azul info
  },

  // Borders & Dividers
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.2)',
    focus: 'rgba(255, 106, 0, 0.5)',
    error: 'rgba(255, 77, 79, 0.5)',
  },

  // Terminal Theme (compatibilidade)
  terminal: {
    green: '#00C48C',
    dark: '#0B0B0B',
    gray: '#1B1B1F',
    red: '#FF4D4F',
    yellow: '#FFC857',
  }
} as const

// ============================================
// TYPOGRAPHY - Sistema tipográfico
// ============================================

export const typography = {
  fonts: {
    primary: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
    data: "'JetBrains Mono', 'Courier New', monospace",
  },

  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  }
} as const

// ============================================
// SPACING - Sistema de espaçamento
// ============================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',

  // Semantic spacing
  card: '16px',
  section: '24px',
  container: '32px',
  page: '48px',
} as const

// ============================================
// BORDER RADIUS - Sistema de cantos
// ============================================

export const radius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
  full: '50%',
} as const

// ============================================
// SHADOWS - Sistema de sombras
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: '0 0 20px rgba(255, 106, 0, 0.3)',
  terminal: '0 4px 20px rgba(0, 196, 140, 0.1)',
} as const

// ============================================
// BREAKPOINTS - Sistema responsivo
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ============================================
// Z-INDEX - Sistema de camadas
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
} as const

// ============================================
// TRANSITIONS - Sistema de animações
// ============================================

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out',
  bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Converte valor de token para CSS custom property
 */
export const toCssVar = (value: string): string => {
  return `var(--${value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()})`
}

/**
 * Aplica tokens como CSS custom properties
 */
export const applyTokensToCss = (): void => {
  const root = document.documentElement.style

  // Colors
  Object.entries(colors).forEach(([category, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      root.setProperty(`--color-${category}-${key}`, value)
    })
  })

  // Typography
  Object.entries(typography.sizes).forEach(([key, value]) => {
    root.setProperty(`--font-size-${key}`, value)
  })

  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    root.setProperty(`--space-${key}`, value)
  })

  // Radius
  Object.entries(radius).forEach(([key, value]) => {
    root.setProperty(`--radius-${key}`, value)
  })

  // Shadows
  Object.entries(shadows).forEach(([key, value]) => {
    root.setProperty(`--shadow-${key}`, value)
  })
}

// ============================================
// TYPE EXPORTS
// ============================================

export type ColorScheme = typeof colors
export type TypographyScheme = typeof typography
export type SpacingScale = typeof spacing
export type RadiusScale = typeof radius
export type ShadowScheme = typeof shadows
export type BreakpointScale = typeof breakpoints
export type ZIndexScale = typeof zIndex
export type TransitionScheme = typeof transitions

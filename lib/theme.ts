/**
 * Design System Premium - Escola App
 * Tema: Claro Moderno (God Tier)
 * Inspirado em: Linear, Airbnb, Zenly
 */

// ============================================
// CORES PREMIUM
// ============================================
export const colors = {
  // Backgrounds (Off-White limpo)
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  
  // Texto (contraste perfeito)
  text: {
    primary: '#111827',      // Quase preto - máximo contraste
    secondary: '#6B7280',    // Cinza médio
    tertiary: '#9CA3AF',     // Cinza claro
    inverse: '#FFFFFF',
  },
  
  // Accent - Violeta/Indigo Premium
  accent: {
    primary: '#6366F1',      // Indigo vibrante
    light: '#EEF2FF',        // Indigo muito claro
    dark: '#4F46E5',         // Indigo escuro
  },
  
  // Success - Verde Esmeralda
  success: {
    primary: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
  },
  
  // Warning - Âmbar
  warning: {
    primary: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },
  
  // Danger - Vermelho
  danger: {
    primary: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },
  
  // Quest Types
  quest: {
    study: { bg: '#DBEAFE', text: '#1D4ED8', icon: '#3B82F6' },
    assignment: { bg: '#FEF3C7', text: '#92400E', icon: '#F59E0B' },
    exam: { bg: '#FEE2E2', text: '#991B1B', icon: '#EF4444' },
  },
  
  // Tier Colors
  tier: {
    bronze: { bg: '#FEF3C7', text: '#92400E', accent: '#CD7F32' },
    silver: { bg: '#F3F4F6', text: '#374151', accent: '#9CA3AF' },
    gold: { bg: '#FEF9C3', text: '#854D0E', accent: '#EAB308' },
    platinum: { bg: '#E0E7FF', text: '#3730A3', accent: '#818CF8' },
    diamond: { bg: '#CFFAFE', text: '#155E75', accent: '#06B6D4' },
  },
  
  // UI Elements
  border: '#E5E7EB',
  divider: '#F3F4F6',
  overlay: 'rgba(17, 24, 39, 0.5)',
};

// ============================================
// SOMBRAS PREMIUM (Subtis e Elegantes)
// ============================================
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
};

// ============================================
// TIPOGRAFIA
// ============================================
export const typography = {
  // Tamanhos
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },
  // Pesos
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line Heights
  leading: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// ============================================
// ESPAÇAMENTO
// ============================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ============================================
// RAIOS DE BORDA
// ============================================
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// ============================================
// HELPERS
// ============================================
export function getTierStyle(tier: string) {
  const key = tier.toLowerCase() as keyof typeof colors.tier;
  return colors.tier[key] || colors.tier.bronze;
}

export function getQuestStyle(type: 'study' | 'assignment' | 'exam') {
  return colors.quest[type];
}

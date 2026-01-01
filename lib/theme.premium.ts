/**
 * Premium Design System
 * Inspired by TripGlide / Apple / Airbnb
 * Ultra-Premium, Minimalist, Immersive, Soft & Organic
 */

// ============================================
// COLORS - Sophisticated Dark Mode Palette
// ============================================

export const COLORS = {
    // Backgrounds (Not pure black - warm undertones)
    background: '#0F1115',
    surface: '#181A20',
    surfaceElevated: '#1F2128',
    surfaceMuted: '#252830',

    // Text Hierarchy
    text: {
        primary: '#FFFFFF',
        secondary: '#A1A1AA',
        tertiary: '#6B7280',
        muted: '#4B5563',
        inverse: '#0F1115',
    },

    // Accent Colors
    accent: {
        primary: '#4F46E5', // Indigo
        light: '#818CF8',
        dark: '#3730A3',
        subtle: 'rgba(79, 70, 229, 0.15)',
    },

    // Brand
    brand: {
        primary: '#E1E1E1', // White-ish for dark mode
        gradient: ['#4F46E5', '#7C3AED'],
    },

    // Semantic
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Special
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shimmer: 'rgba(255, 255, 255, 0.03)',
};

// ============================================
// SPACING - Generous & Breathable
// ============================================

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
    '4xl': 64,
};

// ============================================
// BORDER RADIUS - Super Rounded / Organic
// ============================================

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
};

// ============================================
// TYPOGRAPHY - Inter Font Family (Premium)
// ============================================

export const TYPOGRAPHY = {
    // Font Family - Inter (Modern, Elegant, Premium)
    family: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
        extrabold: 'Inter_800ExtraBold',
    },

    // Font Sizes
    size: {
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        '2xl': 28,
        '3xl': 34,
        '4xl': 40,
        hero: 48,
    },

    // Font Weights
    weight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
    },

    // Line Heights
    lineHeight: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },

    // Letter Spacing (NEW - for premium feel)
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
        wider: 1,
    },
};

// ============================================
// SHADOWS - Soft, Diffused, Premium
// ============================================

export const SHADOWS = {
    none: {},
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 8,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 12,
    },
    glow: {
        shadowColor: COLORS.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
};

// ============================================
// GRADIENTS
// ============================================

export const GRADIENTS = {
    // Card overlay (transparent to black)
    cardOverlay: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)'],
    cardOverlaySubtle: ['transparent', 'rgba(0,0,0,0.6)'],

    // Brand gradients
    primary: ['#4F46E5', '#7C3AED'],
    secondary: ['#3B82F6', '#8B5CF6'],
    warm: ['#F59E0B', '#EF4444'],
    cool: ['#06B6D4', '#3B82F6'],

    // Glass effect
    glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
};

// ============================================
// ANIMATION
// ============================================

export const ANIMATION = {
    fast: 150,
    normal: 250,
    slow: 400,
    spring: {
        damping: 15,
        stiffness: 150,
    },
};

// ============================================
// LAYOUTS
// ============================================

export const LAYOUT = {
    screenPadding: SPACING.xl,
    cardPadding: SPACING.lg,
    sectionGap: SPACING['2xl'],
    itemGap: SPACING.md,
};

// ============================================
// BLUR
// ============================================

export const BLUR = {
    light: 20,
    medium: 40,
    heavy: 80,
};

// ============================================
// EXPORT DEFAULT
// ============================================

const theme = {
    colors: COLORS,
    spacing: SPACING,
    radius: RADIUS,
    typography: TYPOGRAPHY,
    shadows: SHADOWS,
    gradients: GRADIENTS,
    animation: ANIMATION,
    layout: LAYOUT,
    blur: BLUR,
};

export default theme;

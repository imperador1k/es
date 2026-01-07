/**
 * useBreakpoints Hook
 * Responsive design utilities for Desktop/Tablet/Mobile
 * Enables adaptive layouts across web and native
 */

import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

// ============================================
// BREAKPOINT VALUES
// ============================================

const BREAKPOINTS = {
    mobile: 768,    // < 768px = mobile
    tablet: 1024,   // 768-1024px = tablet
    desktop: 1024,  // >= 1024px = desktop
} as const;

// ============================================
// TYPES
// ============================================

export interface BreakpointInfo {
    /** Screen width < 768px */
    isMobile: boolean;
    /** Screen width >= 768px && < 1024px */
    isTablet: boolean;
    /** Screen width >= 1024px */
    isDesktop: boolean;
    /** Current screen width */
    width: number;
    /** Current screen height */
    height: number;
    /** Recommended columns for grid layouts (1, 2, or 3) */
    numColumns: 1 | 2 | 3;
    /** Whether running on web platform */
    isWeb: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBreakpointInfo(width: number, height: number): BreakpointInfo {
    const isMobile = width < BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop;
    const isDesktop = width >= BREAKPOINTS.desktop;
    
    // Calculate optimal columns based on screen size
    let numColumns: 1 | 2 | 3 = 1;
    if (width >= 1400) {
        numColumns = 3;
    } else if (width >= BREAKPOINTS.mobile) {
        numColumns = 2;
    }

    return {
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        numColumns,
        isWeb: Platform.OS === 'web',
    };
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for responsive breakpoint detection
 * Updates automatically on window resize
 * 
 * @example
 * const { isMobile, isDesktop, numColumns } = useBreakpoints();
 * 
 * // Conditional rendering
 * {isDesktop ? <Sidebar /> : <BottomTabBar />}
 * 
 * // Grid layouts
 * <FlatList
 *   key={isDesktop ? 'desktop' : 'mobile'}
 *   numColumns={numColumns}
 * />
 */
export function useBreakpoints(): BreakpointInfo {
    const [dimensions, setDimensions] = useState<ScaledSize>(() => Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });

        return () => subscription?.remove();
    }, []);

    return getBreakpointInfo(dimensions.width, dimensions.height);
}

// ============================================
// STATIC UTILITIES
// ============================================

/**
 * Get current breakpoint info without subscription
 * Useful for one-time checks or outside React components
 */
export function getBreakpoints(): BreakpointInfo {
    const { width, height } = Dimensions.get('window');
    return getBreakpointInfo(width, height);
}

/**
 * Breakpoint constants for manual checks
 */
export { BREAKPOINTS };

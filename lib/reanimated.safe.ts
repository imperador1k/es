/**
 * Safe Reanimated Wrapper for Web Compatibility
 * 
 * This module provides safe wrappers for react-native-reanimated functions
 * that work correctly on both native and web platforms.
 * 
 * On web, hooks return static values/no-op functions.
 * On native, they proxy to the real reanimated implementation.
 */

import { Platform, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

// Only import Reanimated on native platforms
const isWeb = Platform.OS === 'web';

// Lazy imports to avoid loading Reanimated on web
let ReanimatedModule: typeof import('react-native-reanimated') | null = null;

if (!isWeb) {
    ReanimatedModule = require('react-native-reanimated');
}

// ============================================
// useSharedValue
// ============================================

export function useSharedValueSafe<T>(initialValue: T): SharedValue<T> {
    if (isWeb) {
        // Return a plain object that mimics SharedValue on web
        return { value: initialValue } as SharedValue<T>;
    }
    return ReanimatedModule!.useSharedValue(initialValue);
}

// ============================================
// useAnimatedStyle
// ============================================

type AnimatedStyleResult = ReturnType<typeof import('react-native-reanimated').useAnimatedStyle>;

export function useAnimatedStyleSafe(
    updater: () => Record<string, any>,
    deps?: any[]
): AnimatedStyleResult | Record<string, any> {
    if (isWeb) {
        // On web, just return the static result of the updater function
        // This avoids Reanimated runtime errors
        try {
            return updater();
        } catch {
            return {};
        }
    }
    return ReanimatedModule!.useAnimatedStyle(updater, deps);
}

// ============================================
// withSpring, withTiming, etc.
// ============================================

export function withSpringSafe<T extends number | string>(
    toValue: T,
    config?: Parameters<typeof import('react-native-reanimated').withSpring>[1]
): T {
    if (isWeb) {
        return toValue;
    }
    return ReanimatedModule!.withSpring(toValue, config) as T;
}

export function withTimingSafe<T extends number | string>(
    toValue: T,
    config?: Parameters<typeof import('react-native-reanimated').withTiming>[1]
): T {
    if (isWeb) {
        return toValue;
    }
    return ReanimatedModule!.withTiming(toValue, config) as T;
}

export function withSequenceSafe<T extends number | string>(
    ...values: T[]
): T {
    if (isWeb) {
        return values[values.length - 1];
    }
    return ReanimatedModule!.withSequence(...values) as T;
}

export function withRepeatSafe<T extends number | string>(
    animation: T,
    numberOfReps?: number,
    reverse?: boolean
): T {
    if (isWeb) {
        return animation;
    }
    return ReanimatedModule!.withRepeat(animation, numberOfReps, reverse) as T;
}

// ============================================
// AnimatedView - Safe wrapper
// ============================================

/**
 * A View component that is animated on native but plain on web.
 * Use this instead of Animated.View for cross-platform compatibility.
 */
export const AnimatedViewSafe = isWeb
    ? View
    : (ReanimatedModule?.default?.createAnimatedComponent(View) || View);

// ============================================
// Re-export safe-to-use items (layout animations are problematic)
// ============================================

// Entering/Exiting animations are problematic on web
// Only use these on native!
export const FadeInDown = isWeb ? undefined : ReanimatedModule?.FadeInDown;
export const FadeInUp = isWeb ? undefined : ReanimatedModule?.FadeInUp;
export const FadeInRight = isWeb ? undefined : ReanimatedModule?.FadeInRight;
export const FadeIn = isWeb ? undefined : ReanimatedModule?.FadeIn;
export const FadeOut = isWeb ? undefined : ReanimatedModule?.FadeOut;
export const FadeOutUp = isWeb ? undefined : ReanimatedModule?.FadeOutUp;
export const ZoomIn = isWeb ? undefined : ReanimatedModule?.ZoomIn;

// Helper to conditionally apply entering animation
export function enteringAnimation(anim: any) {
    return isWeb ? undefined : anim;
}

/**
 * Web Mock for react-native-reanimated
 * 
 * This file provides a complete mock of react-native-reanimated for web.
 * When the app runs on web, webpack/metro will resolve to this file instead
 * of the real reanimated package.
 * 
 * IMPORTANT: This mock avoids the CSSStyleDeclaration error by NOT using
 * setNativeProps or any native animation APIs on web.
 */

// Debug: Verify mock is being loaded
console.log('✅ [REANIMATED MOCK] Web mock loaded successfully');


import React from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';

// ============================================
// Web-safe wrapper components
// These strip animation props and render plain RN components
// ============================================

function createSafeAnimatedComponent<T extends React.ComponentType<any>>(Component: T): T {
    const SafeComponent = React.forwardRef((props: any, ref: any) => {
        // Strip reanimated-specific props that cause issues
        const {
            entering,
            exiting,
            layout,
            animatedProps,
            sharedTransitionTag,
            sharedTransitionStyle,
            ...safeProps
        } = props;

        // Convert animated style to static style
        // If style contains .value properties, extract them
        let finalStyle = safeProps.style;
        if (finalStyle && typeof finalStyle === 'object') {
            if (Array.isArray(finalStyle)) {
                finalStyle = finalStyle.map(s => extractStaticStyle(s));
            } else {
                finalStyle = extractStaticStyle(finalStyle);
            }
        }

        return React.createElement(Component as any, { ...safeProps, style: finalStyle, ref });
    });

    SafeComponent.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
    return SafeComponent as unknown as T;
}

// Helper to extract static values from animated styles
function extractStaticStyle(style: any): any {
    if (!style || typeof style !== 'object') return style;
    
    const result: any = {};
    for (const key of Object.keys(style)) {
        const value = style[key];
        if (value && typeof value === 'object' && 'value' in value) {
            // It's a SharedValue, extract the current value
            result[key] = value.value;
        } else if (key === 'transform' && Array.isArray(value)) {
            // Handle transform array
            result[key] = value.map((t: any) => {
                const transformResult: any = {};
                for (const tKey of Object.keys(t)) {
                    const tValue = t[tKey];
                    if (tValue && typeof tValue === 'object' && 'value' in tValue) {
                        transformResult[tKey] = tValue.value;
                    } else {
                        transformResult[tKey] = tValue;
                    }
                }
                return transformResult;
            });
        } else {
            result[key] = value;
        }
    }
    return result;
}

// ============================================
// Mock Animated namespace
// ============================================

const Animated = {
    View: createSafeAnimatedComponent(View),
    Text: createSafeAnimatedComponent(Text),
    ScrollView: createSafeAnimatedComponent(ScrollView),
    Image: createSafeAnimatedComponent(Image),
    FlatList: createSafeAnimatedComponent(FlatList),
    Pressable: createSafeAnimatedComponent(Pressable),
    createAnimatedComponent: <T extends React.ComponentType<any>>(Component: T): T => {
        return createSafeAnimatedComponent(Component);
    },
};

// ============================================
// Mock hooks - return static/no-op values
// ============================================

export function useSharedValue<T>(initialValue: T): { value: T } {
    // Use React state to make it reactive but without worklets
    const ref = React.useRef({ value: initialValue });
    return ref.current;
}

export function useAnimatedStyle(updater: () => any, _deps?: any[]): any {
    // Call updater synchronously to get static styles
    try {
        const result = updater();
        return extractStaticStyle(result);
    } catch {
        return {};
    }
}

export function useDerivedValue<T>(processor: () => T, _deps?: any[]): { value: T } {
    try {
        return { value: processor() };
    } catch {
        return { value: undefined as any };
    }
}

export function useAnimatedGestureHandler() {
    return {};
}

export function useAnimatedScrollHandler(_handlers?: any) {
    return () => {};
}

export function useAnimatedRef<T = any>(): { current: T | null } {
    return React.useRef<T>(null);
}

export function useAnimatedReaction(
    _prepare: () => any,
    _react: (prepared: any, previous: any | null) => void,
    _deps?: any[]
): void {}

export function useAnimatedProps(_updater: () => any, _deps?: any[]): any {
    return {};
}

// ============================================
// Worklet runners (no-op on web)
// ============================================

export function runOnJS<T extends (...args: any[]) => any>(fn: T): T {
    return fn;
}

export function runOnUI<T extends (...args: any[]) => any>(fn: T): T {
    return fn;
}

// ============================================
// Animation functions - return final values directly
// ============================================

export function withSpring<T>(toValue: T, _config?: any, _callback?: any): T {
    return toValue;
}

export function withTiming<T>(toValue: T, _config?: any, _callback?: any): T {
    return toValue;
}

export function withDelay<T>(_delay: number, animation: T): T {
    return animation;
}

export function withSequence<T>(...animations: T[]): T {
    return animations[animations.length - 1];
}

export function withRepeat<T>(animation: T, _reps?: number, _reverse?: boolean, _callback?: any): T {
    return animation;
}

export function withDecay<T>(config: any): T {
    return (config.velocity || 0) as T;
}

export function cancelAnimation(_sharedValue: any): void {}

export function measure(_animatedRef: any): any {
    return null;
}

export function scrollTo(
    _animatedRef: any,
    _x: number,
    _y: number,
    _animated: boolean
): void {}

// ============================================
// Easing functions (pass-through on web)
// ============================================

export const Easing = {
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t * t,
    cubic: (t: number) => t * t * t,
    poly: (_n: number) => (t: number) => t,
    sin: (t: number) => Math.sin(t),
    circle: (t: number) => t,
    exp: (t: number) => t,
    elastic: (_bounciness?: number) => (t: number) => t,
    back: (_overshoot?: number) => (t: number) => t,
    bounce: (t: number) => t,
    bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
    bezierFn: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
    in: (easing: any) => easing,
    out: (easing: any) => easing,
    inOut: (easing: any) => easing,
};

// ============================================
// Layout Animations - return chainable mocks
// ============================================

type LayoutAnimationBuilder = {
    delay: (ms: number) => LayoutAnimationBuilder;
    duration: (ms: number) => LayoutAnimationBuilder;
    springify: (config?: any) => LayoutAnimationBuilder;
    damping: (value: number) => LayoutAnimationBuilder;
    stiffness: (value: number) => LayoutAnimationBuilder;
    mass: (value: number) => LayoutAnimationBuilder;
    overshootClamping: (value: boolean) => LayoutAnimationBuilder;
    restDisplacementThreshold: (value: number) => LayoutAnimationBuilder;
    restSpeedThreshold: (value: number) => LayoutAnimationBuilder;
    easing: (fn: any) => LayoutAnimationBuilder;
    withCallback: (fn: any) => LayoutAnimationBuilder;
    withInitialValues: (values: any) => LayoutAnimationBuilder;
    randomDelay: () => LayoutAnimationBuilder;
    build: () => undefined;
};

function createLayoutAnimation(): LayoutAnimationBuilder {
    const builder: LayoutAnimationBuilder = {
        delay: () => builder,
        duration: () => builder,
        springify: () => builder,
        damping: () => builder,
        stiffness: () => builder,
        mass: () => builder,
        overshootClamping: () => builder,
        restDisplacementThreshold: () => builder,
        restSpeedThreshold: () => builder,
        easing: () => builder,
        withCallback: () => builder,
        withInitialValues: () => builder,
        randomDelay: () => builder,
        build: () => undefined,
    };
    return builder;
}

// Entering animations
export const FadeIn = createLayoutAnimation();
export const FadeInDown = createLayoutAnimation();
export const FadeInUp = createLayoutAnimation();
export const FadeInLeft = createLayoutAnimation();
export const FadeInRight = createLayoutAnimation();
export const FadeOut = createLayoutAnimation();
export const FadeOutDown = createLayoutAnimation();
export const FadeOutUp = createLayoutAnimation();
export const FadeOutLeft = createLayoutAnimation();
export const FadeOutRight = createLayoutAnimation();
export const ZoomIn = createLayoutAnimation();
export const ZoomInDown = createLayoutAnimation();
export const ZoomInUp = createLayoutAnimation();
export const ZoomOut = createLayoutAnimation();
export const ZoomOutDown = createLayoutAnimation();
export const ZoomOutUp = createLayoutAnimation();
export const SlideInDown = createLayoutAnimation();
export const SlideInUp = createLayoutAnimation();
export const SlideInLeft = createLayoutAnimation();
export const SlideInRight = createLayoutAnimation();
export const SlideOutDown = createLayoutAnimation();
export const SlideOutUp = createLayoutAnimation();
export const SlideOutLeft = createLayoutAnimation();
export const SlideOutRight = createLayoutAnimation();
export const BounceIn = createLayoutAnimation();
export const BounceInDown = createLayoutAnimation();
export const BounceInUp = createLayoutAnimation();
export const BounceOut = createLayoutAnimation();
export const FlipInXUp = createLayoutAnimation();
export const FlipInXDown = createLayoutAnimation();
export const FlipInYLeft = createLayoutAnimation();
export const FlipInYRight = createLayoutAnimation();
export const FlipOutXUp = createLayoutAnimation();
export const FlipOutXDown = createLayoutAnimation();
export const FlipOutYLeft = createLayoutAnimation();
export const FlipOutYRight = createLayoutAnimation();
export const LightSpeedInLeft = createLayoutAnimation();
export const LightSpeedInRight = createLayoutAnimation();
export const LightSpeedOutLeft = createLayoutAnimation();
export const LightSpeedOutRight = createLayoutAnimation();
export const PinwheelIn = createLayoutAnimation();
export const PinwheelOut = createLayoutAnimation();
export const RotateInDownLeft = createLayoutAnimation();
export const RotateInDownRight = createLayoutAnimation();
export const RotateInUpLeft = createLayoutAnimation();
export const RotateInUpRight = createLayoutAnimation();
export const RotateOutDownLeft = createLayoutAnimation();
export const RotateOutDownRight = createLayoutAnimation();
export const RotateOutUpLeft = createLayoutAnimation();
export const RotateOutUpRight = createLayoutAnimation();
export const RollInLeft = createLayoutAnimation();
export const RollInRight = createLayoutAnimation();
export const RollOutLeft = createLayoutAnimation();
export const RollOutRight = createLayoutAnimation();
export const StretchInX = createLayoutAnimation();
export const StretchInY = createLayoutAnimation();
export const StretchOutX = createLayoutAnimation();
export const StretchOutY = createLayoutAnimation();

// Layout transitions
export const Layout = createLayoutAnimation();
export const LinearTransition = createLayoutAnimation();
export const SequencedTransition = createLayoutAnimation();
export const FadingTransition = createLayoutAnimation();
export const JumpingTransition = createLayoutAnimation();
export const CurvedTransition = createLayoutAnimation();
export const EntryExitTransition = createLayoutAnimation();

// ============================================
// Keyframe mock
// ============================================

export class Keyframe {
    constructor(_definitions: any) {}
    duration(_duration: number) { return this; }
    delay(_delay: number) { return this; }
    withCallback(_callback: any) { return this; }
}

// ============================================
// Interpolation
// ============================================

export function interpolate(
    value: number,
    inputRange: readonly number[],
    outputRange: readonly number[],
    _extrapolation?: any
): number {
    // Simple linear interpolation for web
    const idx = inputRange.findIndex((v, i) => 
        i < inputRange.length - 1 && value >= v && value <= inputRange[i + 1]
    );
    
    if (idx === -1) {
        if (value <= inputRange[0]) return outputRange[0];
        return outputRange[outputRange.length - 1];
    }
    
    const inputMin = inputRange[idx];
    const inputMax = inputRange[idx + 1];
    const outputMin = outputRange[idx];
    const outputMax = outputRange[idx + 1];
    
    const progress = (value - inputMin) / (inputMax - inputMin);
    return outputMin + progress * (outputMax - outputMin);
}

export const Extrapolation = {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
};

export function interpolateColor(
    value: number,
    inputRange: readonly number[],
    outputRange: readonly string[],
    _colorSpace?: any
): string {
    const idx = Math.min(
        Math.max(Math.floor(value), 0),
        outputRange.length - 1
    );
    return outputRange[idx];
}

// ============================================
// Default export
// ============================================

export default Animated;

// Re-export types that might be imported
export type { SharedValue } from 'react-native-reanimated';

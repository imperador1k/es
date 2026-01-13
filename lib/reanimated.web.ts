/**
 * Web Mock for react-native-reanimated
 * 
 * This file provides a complete mock of react-native-reanimated for web.
 * When the app runs on web, webpack/metro will resolve to this file instead
 * of the real reanimated package.
 */

import { View } from 'react-native';

// ============================================
// Mock Animated component
// ============================================

const Animated = {
    View: View,
    Text: View,
    ScrollView: View,
    Image: View,
    FlatList: View,
    createAnimatedComponent: (Component: any) => Component,
};

// ============================================
// Mock hooks - return no-op/static values
// ============================================

export function useSharedValue<T>(initialValue: T) {
    return { value: initialValue };
}

export function useAnimatedStyle(updater: () => any, _deps?: any[]) {
    try {
        return updater();
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

export function useAnimatedScrollHandler() {
    return {};
}

export function useAnimatedRef() {
    return { current: null };
}

export function useAnimatedReaction() {}

export function runOnJS(fn: Function) {
    return fn;
}

export function runOnUI(fn: Function) {
    return fn;
}

// ============================================
// Mock animation functions
// ============================================

export function withSpring<T>(toValue: T, _config?: any): T {
    return toValue;
}

export function withTiming<T>(toValue: T, _config?: any): T {
    return toValue;
}

export function withDelay<T>(_delay: number, animation: T): T {
    return animation;
}

export function withSequence<T>(...animations: T[]): T {
    return animations[animations.length - 1];
}

export function withRepeat<T>(animation: T, _reps?: number, _reverse?: boolean): T {
    return animation;
}

export function withDecay<T>(config: any): T {
    return config.velocity || 0;
}

export function cancelAnimation() {}

export function measure() {
    return null;
}

// ============================================
// Mock Easing
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
    bezier: () => (t: number) => t,
    in: (easing: any) => easing,
    out: (easing: any) => easing,
    inOut: (easing: any) => easing,
};

// ============================================
// Mock Layout Animations (entering/exiting)
// These are the main cause of web crashes!
// ============================================

const createLayoutAnimation = () => ({
    delay: () => createLayoutAnimation(),
    springify: () => createLayoutAnimation(),
    damping: () => createLayoutAnimation(),
    stiffness: () => createLayoutAnimation(),
    duration: () => createLayoutAnimation(),
    easing: () => createLayoutAnimation(),
    mass: () => createLayoutAnimation(),
    overshootClamping: () => createLayoutAnimation(),
    restDisplacementThreshold: () => createLayoutAnimation(),
    restSpeedThreshold: () => createLayoutAnimation(),
    withCallback: () => createLayoutAnimation(),
    withInitialValues: () => createLayoutAnimation(),
    build: () => undefined,
});

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
// Mock keyframe
// ============================================

export class Keyframe {
    constructor(_definitions: any) {}
    duration() { return this; }
    delay() { return this; }
    withCallback() { return this; }
}

// ============================================
// Default export
// ============================================

export default Animated;

// Also export AnimatedComponent for compatibility
export const AnimatedComponent = Animated;

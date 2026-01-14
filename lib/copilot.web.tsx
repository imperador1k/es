/**
 * Web Mock for react-native-copilot
 * 
 * This file provides a complete mock of react-native-copilot for web.
 * The library uses SVG masks that cause CSSStyleDeclaration errors on web.
 */

// Debug: Verify mock is being loaded
console.log('✅ [COPILOT MOCK] Web mock loaded successfully');

import React from 'react';

// Mock CopilotProvider - just pass through children
export function CopilotProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

// Mock CopilotStep - just render the children without the tooltip functionality
export function CopilotStep({
    children,
    text,
    order,
    name,
    active,
}: {
    children: React.ReactNode;
    text?: string;
    order?: number;
    name?: string;
    active?: boolean;
}) {
    // Just render the children without any copilot functionality
    return <>{children}</>;
}

// Mock walkthroughable HOC - returns the component as-is
export function walkthroughable<T extends React.ComponentType<any>>(Component: T): T {
    return Component;
}

// Mock useCopilot hook - returns no-op functions
export function useCopilot() {
    return {
        start: () => { },
        stop: () => { },
        goToNext: () => { },
        goToNth: () => { },
        goToPrev: () => { },
        visible: false,
        currentStep: null,
        isFirstStep: false,
        isLastStep: false,
        copilotEvents: {
            on: () => { },
            off: () => { },
            emit: () => { },
        },
    };
}

// Export default for any default imports
export default {
    CopilotProvider,
    CopilotStep,
    walkthroughable,
    useCopilot,
};

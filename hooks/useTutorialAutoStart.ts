/**
 * useTutorialAutoStart Hook
 * 
 * Hook to auto-start the tutorial when navigating between pages.
 * Each page with a CopilotStep should use this hook to check
 * if it should auto-start the tutorial at its step.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { useCopilot } from 'react-native-copilot';

const PENDING_STEP_KEY = '@tutorial_pending_step';

/**
 * Call this hook in each page that has a CopilotStep and needs
 * to auto-resume the tutorial after navigation.
 * 
 * @param stepName - The name of the CopilotStep on this page
 */
export function useTutorialAutoStart(stepName: string) {
    const { start } = useCopilot();
    const hasChecked = useRef(false);

    useEffect(() => {
        // Only check once per mount
        if (hasChecked.current) return;
        hasChecked.current = true;

        const checkPendingStep = async () => {
            try {
                const pendingStep = await AsyncStorage.getItem(PENDING_STEP_KEY);
                
                if (pendingStep === stepName) {
                    // Clear the pending step
                    await AsyncStorage.removeItem(PENDING_STEP_KEY);
                    
                    // Wait for component to fully mount and CopilotStep to register
                    setTimeout(() => {
                        start(stepName);
                    }, 500);
                }
            } catch (error) {
                console.error('Error checking pending tutorial step:', error);
            }
        };

        checkPendingStep();
    }, [stepName, start]);
}

/**
 * Helper to set a pending step (used by TutorialTooltip)
 */
export async function setPendingTutorialStep(stepName: string) {
    await AsyncStorage.setItem(PENDING_STEP_KEY, stepName);
}

/**
 * Helper to clear pending step
 */
export async function clearPendingTutorialStep() {
    await AsyncStorage.removeItem(PENDING_STEP_KEY);
}

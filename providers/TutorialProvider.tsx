
import { TutorialTooltip } from '@/components/TutorialTooltip';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { CopilotProvider, useCopilot } from 'react-native-copilot';

const HAS_SEEN_PREFIX = 'tutorial_seen_';

interface TutorialContextType {
    startTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
    startTutorial: () => { },
});

export const useTutorial = () => useContext(TutorialContext);

function TutorialOrchestrator({ children }: { children: React.ReactNode }) {
    const { start, copilotEvents } = useCopilot();
    const { user } = useAuthContext();
    const { showAlert } = useAlert();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Check if user has seen tutorial (Per User)
        const checkTutorial = async () => {
            if (!user) return;

            const storageKey = `${HAS_SEEN_PREFIX}${user.id}`;
            const hasSeen = await AsyncStorage.getItem(storageKey);

            if (!hasSeen) {
                // Start tutorial after a small delay to ensure UI is ready
                setTimeout(() => {
                    start();
                }, 1500);
            }
            setHasChecked(true);
        };

        checkTutorial();
    }, [user]);

    // Handle Tutorial Finish
    useEffect(() => {
        const handleStop = async () => {
            if (!user) return;

            const storageKey = `${HAS_SEEN_PREFIX}${user.id}`;
            await AsyncStorage.setItem(storageKey, 'true');

            // Gamification: Give "Recruta" badge persistent
            try {
                // 1. Get Badge ID
                const { data: badgeData, error: badgeError } = await supabase
                    .from('badges')
                    .select('id')
                    .eq('name', 'Recruta')
                    .single();

                if (badgeError || !badgeData) {
                    console.log('Badge Recruta not found in DB');
                    return;
                }

                // 2. Check if user already has it
                const { data: existing } = await supabase
                    .from('user_badges')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('badge_id', badgeData.id)
                    .single();

                if (!existing) {
                    const { error: insertError } = await supabase
                        .from('user_badges')
                        .insert({
                            user_id: user.id,
                            badge_id: badgeData.id,
                        });

                    if (!insertError) {
                        // 3. Show Celebration
                        showAlert({
                            title: 'Badge Recruta Desbloqueada! 🏅',
                            message: 'Completaste o tutorial inicial com sucesso.',
                        });
                    }
                }
            } catch (e) {
                console.error('Error awarding tutorial badge:', e);
            }
        };

        copilotEvents.on('stop', handleStop);

        return () => {
            copilotEvents.off('stop', handleStop);
        };
    }, [copilotEvents, user]);

    return (
        <TutorialContext.Provider value={{ startTutorial: start }}>
            {children}
        </TutorialContext.Provider>
    );
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    return (
        <CopilotProvider
            tooltipComponent={TutorialTooltip}
            overlay="svg"
            animated
            backdropColor="rgba(0,0,0,0.85)"
            verticalOffset={0}
            stepNumberComponent={() => null}
            arrowSize={12}
            arrowColor="#6366F1"
            stopOnOutsideClick={false}
            margin={16}
            tooltipStyle={{
                backgroundColor: 'transparent',
                padding: 0,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
                borderWidth: 0,
                shadowOpacity: 0,
            }}
        >
            <TutorialOrchestrator>{children}</TutorialOrchestrator>
        </CopilotProvider>
    );
}


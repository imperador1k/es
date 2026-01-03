import { AlertButton, CustomAlert } from '@/components/ui/CustomAlert';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface AlertOptions {
    title: string;
    message?: string;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertOptions>({ title: '' });

    const showAlert = useCallback((options: AlertOptions) => {
        setConfig(options);
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    // Intercept callback to close modal
    const buttonsWithClose = config.buttons?.map(btn => ({
        ...btn,
        onPress: () => {
            hideAlert();
            if (btn.onPress) {
                // Allow animation to start closing before action? 
                // Usually better to close immediately
                btn.onPress();
            }
        }
    }));

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert
                visible={visible}
                title={config.title}
                message={config.message}
                buttons={buttonsWithClose}
                onDismiss={hideAlert}
            />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}

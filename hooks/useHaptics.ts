/**
 * useHaptics - Hook para feedback tátil premium
 * 
 * Tipos de feedback:
 * - success: Tarefa concluída, XP ganho, compra feita
 * - warning: Aviso, confirmação necessária
 * - error: Erro, ação falhada
 * - light: Tap em botão, navegação
 * - medium: Seleção, toggle
 * - heavy: Ação importante, swipe confirmado
 * - selection: Mudança de opção (picker)
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics só funciona em dispositivos físicos (não simulador/web)
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Feedback de notificação (mais expressivo)
 */
export const hapticNotification = {
    /** ✅ Sucesso - tarefa concluída, XP ganho */
    success: () => {
        if (!isHapticsSupported) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    /** ⚠️ Aviso - confirmação, atenção */
    warning: () => {
        if (!isHapticsSupported) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    /** ❌ Erro - ação falhada */
    error: () => {
        if (!isHapticsSupported) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
};

/**
 * Feedback de impacto (para toques)
 */
export const hapticImpact = {
    /** Tap leve - botões, navegação */
    light: () => {
        if (!isHapticsSupported) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    /** Tap médio - seleção, toggle */
    medium: () => {
        if (!isHapticsSupported) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    /** Tap forte - ações importantes */
    heavy: () => {
        if (!isHapticsSupported) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    /** Tap suave - UI feedback */
    soft: () => {
        if (!isHapticsSupported) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    },
    /** Tap rígido - confirmações */
    rigid: () => {
        if (!isHapticsSupported) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    },
};

/**
 * Feedback de seleção (para pickers, sliders)
 */
export const hapticSelection = () => {
    if (!isHapticsSupported) return;
    Haptics.selectionAsync();
};

/**
 * Hook que retorna todas as funções de haptics
 */
export function useHaptics() {
    return {
        // Notificações
        success: hapticNotification.success,
        warning: hapticNotification.warning,
        error: hapticNotification.error,
        
        // Impactos
        light: hapticImpact.light,
        medium: hapticImpact.medium,
        heavy: hapticImpact.heavy,
        soft: hapticImpact.soft,
        rigid: hapticImpact.rigid,
        
        // Seleção
        selection: hapticSelection,
    };
}

// Export default para uso direto sem hook
export default {
    notification: hapticNotification,
    impact: hapticImpact,
    selection: hapticSelection,
};

/**
 * useTeamInvite - Hook para processar convites de equipa via deep link
 * 
 * Fluxo:
 * 1. App recebe URL: escolaa://invite/team/{code} ou escolaa://team/{code}
 * 2. Verifica se user está logado
 * 3. Procura team pelo código
 * 4. Adiciona membro e navega para a equipa
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

interface TeamInviteResult {
  success: boolean;
  teamId?: string;
  teamName?: string;
  error?: string;
  alreadyMember?: boolean;
}

const PENDING_INVITE_KEY = '@pending_team_invite';

export function useTeamInvite() {
  const { user, isLoading: authLoading } = useAuthContext();
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<TeamInviteResult | null>(null);

  /**
   * Guardar código de convite para processar após login
   */
  const savePendingInvite = useCallback(async (code: string) => {
    try {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
      console.log('📌 Convite pendente guardado:', code);
    } catch (err) {
      console.error('Erro ao guardar convite pendente:', err);
    }
  }, []);

  /**
   * Obter e limpar convite pendente
   */
  const getPendingInvite = useCallback(async (): Promise<string | null> => {
    try {
      const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (code) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        console.log('📌 Convite pendente recuperado:', code);
      }
      return code;
    } catch (err) {
      console.error('Erro ao obter convite pendente:', err);
      return null;
    }
  }, []);

  /**
   * Processar código de convite
   */
  const processInviteCode = useCallback(async (code: string): Promise<TeamInviteResult> => {
    if (!user?.id) {
      // Guardar para depois do login
      await savePendingInvite(code);
      return { success: false, error: 'login_required' };
    }

    setProcessing(true);
    console.log('🔗 A processar convite para equipa:', code);

    try {
      // Primeiro, obter info da team para mostrar nome no toast
      const { data: teamInfo } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('invite_code', code)
        .single();

      if (!teamInfo) {
        return { success: false, error: 'Código de convite inválido ou expirado.' };
      }

      // Verificar se já é membro
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamInfo.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        // Já é membro, navegar diretamente
        return { 
          success: true, 
          teamId: teamInfo.id, 
          teamName: teamInfo.name,
          alreadyMember: true 
        };
      }

      // Usar a RPC para adicionar membro
      const { data: joinedTeamId, error } = await supabase.rpc('join_team_via_code', {
        code_input: code,
        user_id_input: user.id,
      });

      if (error) {
        console.error('Erro ao entrar na equipa:', error);
        return { success: false, error: 'Não foi possível entrar na equipa.' };
      }

      if (!joinedTeamId) {
        return { success: false, error: 'Código inválido ou já és membro.' };
      }

      return { 
        success: true, 
        teamId: joinedTeamId, 
        teamName: teamInfo.name 
      };
    } catch (err) {
      console.error('Erro ao processar convite:', err);
      return { success: false, error: 'Erro ao processar convite.' };
    } finally {
      setProcessing(false);
    }
  }, [user?.id, savePendingInvite]);

  /**
   * Processar URL de deep link
   * Formatos suportados:
   * - escolaa://invite/team/{code}
   * - escolaa://team/{code}
   */
  const processDeepLink = useCallback(async (url: string): Promise<boolean> => {
    if (!url) return false;

    // Regex para extrair o código
    // escolaa://invite/team/{code} ou escolaa://team/{code}
    const inviteMatch = url.match(/escolaa:\/\/(?:invite\/)?team\/([a-zA-Z0-9]+)/i);
    
    if (!inviteMatch) return false;

    const code = inviteMatch[1];
    console.log('🔗 Deep link de convite detetado:', code);

    const result = await processInviteCode(code);
    setLastResult(result);

    if (result.success && result.teamId) {
      // Navegar para a equipa
      setTimeout(() => {
        router.push(`/team/${result.teamId}` as any);
      }, 500);
      return true;
    } else if (result.error === 'login_required') {
      // Redirecionar para login
      router.replace('/(auth)/login');
      return true;
    }

    return false;
  }, [processInviteCode]);

  /**
   * Verificar convites pendentes após login
   */
  useEffect(() => {
    const checkPendingInvite = async () => {
      if (!user?.id || authLoading) return;

      const pendingCode = await getPendingInvite();
      if (pendingCode) {
        console.log('📌 A processar convite pendente após login:', pendingCode);
        const result = await processInviteCode(pendingCode);
        setLastResult(result);

        if (result.success && result.teamId) {
          setTimeout(() => {
            router.push(`/team/${result.teamId}` as any);
          }, 500);
        }
      }
    };

    checkPendingInvite();
  }, [user?.id, authLoading, getPendingInvite, processInviteCode]);

  return {
    processDeepLink,
    processInviteCode,
    processing,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}

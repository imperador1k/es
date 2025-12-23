/**
 * Teams Provider - Real-Time Team Data
 * 
 * Context para gerir equipas do utilizador com subscriptions Supabase Realtime.
 * As equipas são carregadas uma vez e atualizadas em tempo real.
 */

import { supabase } from '@/lib/supabase';
import { Team, TeamRole } from '@/types/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuthContext } from './AuthProvider';

// ============================================
// TYPES
// ============================================

export interface TeamWithRole extends Team {
    role: TeamRole;
}

interface TeamsContextType {
    teams: TeamWithRole[];
    loading: boolean;
    error: string | null;
    refreshTeams: () => Promise<void>;
    getTeam: (id: string) => TeamWithRole | undefined;
    updateTeamLocally: (id: string, updates: Partial<Team>) => void;
}

// ============================================
// CONTEXT
// ============================================

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function TeamsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthContext();

    const [teams, setTeams] = useState<TeamWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ============================================
    // LOAD TEAMS
    // ============================================

    const loadTeams = useCallback(async () => {
        if (!user?.id) {
            setTeams([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Buscar equipas onde o utilizador é membro
            const { data, error: fetchError } = await supabase
                .from('team_members')
                .select(`
                    role,
                    teams (
                        id,
                        name,
                        description,
                        icon_url,
                        color,
                        invite_code,
                        is_public,
                        owner_id,
                        created_at
                    )
                `)
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            // Transformar dados
            const teamsWithRole: TeamWithRole[] = (data || [])
                .filter(item => item.teams)
                .map(item => ({
                    ...(item.teams as unknown as Team),
                    role: item.role as TeamRole,
                }));

            setTeams(teamsWithRole);
        } catch (err: any) {
            console.error('❌ Erro ao carregar equipas:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================

    useEffect(() => {
        if (!user?.id) return;

        // Carregar equipas inicialmente
        loadTeams();

        // Subscrever a mudanças em teams
        const teamsChannel = supabase
            .channel('teams-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'teams',
                },
                (payload: RealtimePostgresChangesPayload<Team>) => {
                    console.log('🔄 Teams realtime update:', payload.eventType);

                    if (payload.eventType === 'UPDATE') {
                        const updatedTeam = payload.new as Team;
                        setTeams(prev =>
                            prev.map(t =>
                                t.id === updatedTeam.id
                                    ? { ...t, ...updatedTeam }
                                    : t
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as { id: string }).id;
                        setTeams(prev => prev.filter(t => t.id !== deletedId));
                    } else if (payload.eventType === 'INSERT') {
                        // Para INSERT, precisamos recarregar porque pode ser nova equipa
                        loadTeams();
                    }
                }
            )
            .subscribe();

        // Subscrever a mudanças em team_members (para quando o user entra/sai de equipas)
        const membersChannel = supabase
            .channel('team-members-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_members',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    console.log('🔄 Team membership changed');
                    loadTeams();
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            supabase.removeChannel(teamsChannel);
            supabase.removeChannel(membersChannel);
        };
    }, [user?.id, loadTeams]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getTeam = useCallback(
        (id: string) => teams.find(t => t.id === id),
        [teams]
    );

    const updateTeamLocally = useCallback(
        (id: string, updates: Partial<Team>) => {
            setTeams(prev =>
                prev.map(t => (t.id === id ? { ...t, ...updates } : t))
            );
        },
        []
    );

    const refreshTeams = useCallback(async () => {
        await loadTeams();
    }, [loadTeams]);

    // ============================================
    // VALUE
    // ============================================

    const value: TeamsContextType = {
        teams,
        loading,
        error,
        refreshTeams,
        getTeam,
        updateTeamLocally,
    };

    return (
        <TeamsContext.Provider value={value}>
            {children}
        </TeamsContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useTeams() {
    const context = useContext(TeamsContext);
    if (!context) {
        throw new Error('useTeams must be used within TeamsProvider');
    }
    return context;
}

/**
 * Hook para obter uma equipa específica
 */
export function useTeam(teamId: string | undefined) {
    const { teams, loading } = useTeams();
    const team = teams.find(t => t.id === teamId);
    return { team, loading };
}

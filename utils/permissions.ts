/**
 * Sistema de Permissões de Equipa
 * Escola+ App
 * 
 * Define quem pode fazer o quê com base no role do utilizador na equipa.
 */

import { TeamRole } from '@/types/database.types';

// ============================================
// MATRIZ DE PERMISSÕES
// ============================================

/**
 * Define quais roles podem executar cada ação.
 * Ordem de privilégio: owner > admin > moderator > delegate > member
 */
export const PERMISSIONS = {
    // Gestão de Equipa
    ARCHIVE_TEAM: ['owner'] as const,
    DELETE_TEAM: ['owner'] as const,
    EDIT_TEAM_SETTINGS: ['owner', 'admin'] as const,
    
    // Gestão de Membros
    MANAGE_MEMBERS: ['owner', 'admin'] as const,
    KICK_MEMBERS: ['owner', 'admin', 'moderator'] as const,
    PROMOTE_TO_ADMIN: ['owner'] as const,
    PROMOTE_TO_MODERATOR: ['owner', 'admin'] as const,
    PROMOTE_TO_DELEGATE: ['owner', 'admin'] as const,
    
    // Canais
    CREATE_CHANNEL: ['owner', 'admin'] as const,
    DELETE_CHANNEL: ['owner', 'admin'] as const,
    EDIT_CHANNEL: ['owner', 'admin', 'moderator'] as const,
    
    // Mensagens
    DELETE_OWN_MESSAGES: ['owner', 'admin', 'moderator', 'delegate', 'member'] as const,
    DELETE_OTHERS_MESSAGES: ['owner', 'admin', 'moderator', 'delegate'] as const,
    PIN_MESSAGES: ['owner', 'admin', 'moderator', 'delegate'] as const,
    
    // Anúncios e Tarefas
    POST_ANNOUNCEMENTS: ['owner', 'admin', 'delegate'] as const,
    CREATE_TASK: ['owner', 'admin', 'moderator', 'delegate'] as const,
    DELETE_TASK: ['owner', 'admin', 'moderator', 'delegate'] as const,
    EDIT_TASK: ['owner', 'admin', 'moderator', 'delegate'] as const,
    
    // Visualização
    VIEW_MEMBER_LIST: ['owner', 'admin', 'moderator', 'delegate', 'member'] as const,
    VIEW_ANALYTICS: ['owner', 'admin'] as const,
    
    // Ficheiros
    UPLOAD_FILES: ['owner', 'admin', 'moderator', 'delegate'] as const,
    DELETE_FILES: ['owner', 'admin'] as const,
    DELETE_OWN_FILES: ['owner', 'admin', 'moderator', 'delegate', 'member'] as const,
    RENAME_FILES: ['owner', 'admin'] as const,
    RENAME_OWN_FILES: ['owner', 'admin', 'moderator', 'delegate', 'member'] as const,
} as const;

export type PermissionAction = keyof typeof PERMISSIONS;

// ============================================
// FUNÇÕES DE VERIFICAÇÃO
// ============================================

/**
 * Verifica se um role pode executar uma determinada ação.
 * 
 * @param role - O role do utilizador na equipa
 * @param action - A ação a verificar
 * @returns true se o role pode executar a ação
 * 
 * @example
 * ```ts
 * if (canUser(userRole, 'CREATE_TASK')) {
 *   // Mostrar botão de criar tarefa
 * }
 * ```
 */
export function canUser(role: TeamRole | string | null, action: PermissionAction): boolean {
    if (!role) return false;
    const allowedRoles = PERMISSIONS[action];
    return (allowedRoles as readonly string[]).includes(role);
}

/**
 * Verifica se o utilizador é admin (owner ou admin).
 */
export function isAdmin(role: TeamRole | string | null): boolean {
    return role === 'owner' || role === 'admin';
}

/**
 * Verifica se o utilizador é o dono da equipa.
 */
export function isOwner(role: TeamRole | string | null): boolean {
    return role === 'owner';
}

/**
 * Verifica se o utilizador tem cargo de liderança (owner, admin, moderator, delegate).
 */
export function isLeadership(role: TeamRole | string | null): boolean {
    return role === 'owner' || role === 'admin' || role === 'moderator' || role === 'delegate';
}

/**
 * Obtém o nível de privilégio de um role (maior = mais poder).
 */
export function getRoleLevel(role: TeamRole | string | null): number {
    const levels: Record<string, number> = {
        owner: 5,
        admin: 4,
        moderator: 3,
        delegate: 2,
        member: 1,
    };
    return levels[role || ''] || 0;
}

/**
 * Verifica se roleA pode modificar roleB (ex: promover/demover).
 */
export function canModifyRole(roleA: TeamRole | string | null, roleB: TeamRole | string | null): boolean {
    return getRoleLevel(roleA) > getRoleLevel(roleB);
}

// ============================================
// LABELS E CORES PARA UI
// ============================================

export const ROLE_LABELS: Record<string, string> = {
    owner: 'Dono',
    admin: 'Admin',
    moderator: 'Moderador',
    delegate: 'Delegado',
    member: 'Membro',
};

export const ROLE_COLORS: Record<string, string> = {
    owner: '#F59E0B',     // Amber/Gold
    admin: '#EF4444',     // Red
    moderator: '#8B5CF6', // Violet
    delegate: '#3B82F6',  // Blue
    member: '#6B7280',    // Gray
};

export const ROLE_ICONS: Record<string, string> = {
    owner: 'shield-checkmark',
    admin: 'shield',
    moderator: 'hammer',
    delegate: 'star',
    member: 'person',
};

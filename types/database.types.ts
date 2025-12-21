/**
 * Tipos da base de dados Supabase
 * Atualizado para incluir: Amigos, DMs e Gamificação Completa
 */

// ============================================
// ENUMS & TYPES GERAIS
// ============================================

// Tiers de progressão
export type Tier = 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante' | 'Elite';

// Roles de equipa
export type TeamRole = 'owner' | 'admin' | 'member';

// Status de Amizade
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// Tipos de Itens da Loja
export type ShopItemType = 'theme' | 'icon' | 'consumable' | 'frame';

// ============================================
// PROFILES (Utilizadores)
// ============================================

export interface Profile {
    id: string;                    // UUID
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    current_tier: Tier;
    current_xp: number;
    focus_minutes_total: number;
    // Novos campos de Gamificação e Social
    current_streak?: number;       // Dias seguidos
    longest_streak?: number;       // Recorde de dias
    last_activity_date?: string;   // Data da ultima atividade
    active_theme?: string;         // Tema visual equipado
    active_frame?: string;         // Moldura equipada
    created_at: string;
    updated_at: string;
}

export interface ProfileUpdate {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    current_tier?: Tier;
    current_xp?: number;
    focus_minutes_total?: number;
    active_theme?: string;
    active_frame?: string;
    updated_at?: string;
}

// ============================================
// SOCIAL: AMIGOS (Friendships) 🤝
// ============================================

export interface Friendship {
    id: string;
    requester_id: string; // Quem enviou o pedido
    addressee_id: string; // Quem recebeu
    status: FriendshipStatus;
    created_at: string;
}

export interface FriendshipInsert {
    requester_id: string;
    addressee_id: string;
    status?: FriendshipStatus;
}

// Tipo auxiliar para a UI (Amigo com dados do perfil)
export interface FriendWithProfile {
    friendship_id: string;
    friend_id: string;
    profile: Profile;
    status: FriendshipStatus;
    is_requester: boolean; // Se fui eu que enviei o pedido
}

// ============================================
// SOCIAL: DMs (Conversas Privadas) 💬
// ============================================

export interface DMConversation {
    id: string;
    user1_id: string;
    user2_id: string;
    created_at: string;
    last_message_at: string;
}

export interface DMMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    file_url: string | null;
    is_read: boolean;
    created_at: string;
}

export interface DMMessageInsert {
    conversation_id: string;
    sender_id: string;
    content: string;
    file_url?: string | null;
}

// ============================================
// TEAMS (Squads)
// ============================================

export interface Team {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    color: string | null;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface TeamInsert {
    name: string;
    description?: string | null;
    icon_url?: string | null;
    color?: string | null;
    owner_id: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: TeamRole;
    joined_at: string;
}

export interface TeamWithMemberCount extends Team {
    member_count: number;
}

// ============================================
// CHANNELS & GROUP MESSAGES
// ============================================

export type ChannelType = 'text' | 'voice' | 'announcements' | 'resources';

export interface Channel {
    id: string;
    team_id: string;
    name: string;
    description: string | null;
    type: ChannelType;
    is_private: boolean;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    file_url: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null; // Soft delete
}

export interface MessageWithAuthor extends Message {
    author: {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
        current_tier?: Tier; // Útil para mostrar status no chat
    } | null;
}

// ============================================
// TASKS & PRODUTIVIDADE ✅
// ============================================

export type TaskType = 'study' | 'exam' | 'assignment';

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    type: TaskType;
    xp_reward: number;
    created_at: string;
    updated_at: string;
}

export interface TaskInsert {
    user_id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    is_completed?: boolean;
    type: TaskType;
    xp_reward?: number;
}

// ============================================
// GAMIFICAÇÃO & LOJA (RPG Lifestyle) 🛍️
// ============================================

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_url: string;
    xp_bonus: number;
    category: string;
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string | null;
    cost: number;
    type: ShopItemType;
    config: Record<string, any> | null; // JSONB para configurações (cores, urls)
    is_active: boolean;
    created_at: string;
}

export interface UserInventory {
    id: string;
    user_id: string;
    item_id: string;
    purchased_at: string;
    is_equipped: boolean;
}

export interface XPHistory {
    id: string;
    user_id: string;
    amount: number;
    source: string; // 'task', 'streak', 'shop'
    description: string | null;
    created_at: string;
}

// ============================================
// INFRAESTRUTURA (Notificações)
// ============================================

export interface UserPushToken {
    id: string;
    user_id: string;
    token: string;
    device_type: string | null;
    created_at: string;
}
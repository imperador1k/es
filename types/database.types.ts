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
export type TeamRole = 'owner' | 'admin' | 'moderator' | 'delegate' | 'member';

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
    // Status
    status: 'online' | 'offline' | 'away' | 'dnd';
    last_seen_at: string | null;
    // Gamificação e Social
    current_streak?: number;       // Dias seguidos
    longest_streak?: number;       // Recorde de dias
    last_activity_date?: string;   // Data da ultima atividade
    active_theme?: string;         // Tema visual equipado
    active_frame?: string;         // Moldura equipada
    // Consumíveis
    streak_freezes?: number;           // Número de freezes disponíveis
    xp_multiplier?: number;            // Multiplicador XP atual (1.0 = normal)
    xp_multiplier_expires?: string;    // Quando expira o boost
    equipped_title?: string | null;    // Título equipado
    equipped_frame?: string | null;    // Frame UUID equipado
    current_theme?: string;            // Tema atual
    created_at: string;
    updated_at?: string;
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
    status: 'sent' | 'delivered' | 'read';
    reply_to_id?: string | null;
    created_at: string;
}

export interface DMMessageInsert {
    conversation_id: string;
    sender_id: string;
    content: string;
    file_url?: string | null;
    status?: 'sent' | 'delivered' | 'read';
    reply_to_id?: string | null;
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

// ============================================
// DISCIPLINAS & HORÁRIO 📚
// ============================================

// Tipo de aula
export type ClassType = 'T' | 'P' | 'TP' | 'S' | 'PL'; // Teórica, Prática, Teórico-Prática, Seminário, PráticaLab

// Dia da semana (0 = Domingo, 1 = Segunda, ...)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Disciplina do utilizador
export interface Subject {
    id: string;
    user_id: string;
    name: string;
    color: string;           // Hex code para visualização
    teacher_name: string | null;
    room: string | null;     // Sala default
    created_at: string;
    updated_at: string;
}

export interface SubjectInsert {
    user_id: string;
    name: string;
    color?: string;
    teacher_name?: string | null;
    room?: string | null;
}

export interface SubjectUpdate {
    name?: string;
    color?: string;
    teacher_name?: string | null;
    room?: string | null;
}

// Sessão de aula (entrada no horário)
export interface ClassSession {
    id: string;
    user_id: string;
    subject_id: string;
    day_of_week: DayOfWeek;  // 0=Dom, 1=Seg, ..., 6=Sáb
    start_time: string;      // formato 'HH:MM:SS' ou 'HH:MM'
    end_time: string;
    room: string | null;     // Sala específica (overrides subject.room)
    type: ClassType;
    notes: string | null;
    created_at: string;
}

export interface ClassSessionInsert {
    user_id: string;
    subject_id: string;
    day_of_week: DayOfWeek;
    start_time: string;
    end_time: string;
    room?: string | null;
    type?: ClassType;
    notes?: string | null;
}

export interface ClassSessionUpdate {
    day_of_week?: DayOfWeek;
    start_time?: string;
    end_time?: string;
    room?: string | null;
    type?: ClassType;
    notes?: string | null;
}

// Tipo auxiliar: Sessão com dados da disciplina (para UI)
export interface ClassSessionWithSubject extends ClassSession {
    subject: Subject;
}

// Tipo auxiliar: Disciplina com todas as sessões
export interface SubjectWithSchedule extends Subject {
    sessions: ClassSession[];
}

// Helper: Mapear DayOfWeek para nome
export const DAY_NAMES: Record<DayOfWeek, string> = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
};

export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
};

export const CLASS_TYPE_NAMES: Record<ClassType, string> = {
    'T': 'Teórica',
    'P': 'Prática',
    'TP': 'Teórico-Prática',
    'S': 'Seminário',
    'PL': 'Prática de Laboratório',
};

// ============================================
// NOTIFICATIONS (Feed de Atividade) 🔔
// ============================================

export type NotificationType = 
    | 'task_assigned'  // "Professor Marco adicionou tarefa..."
    | 'mention'        // "@all devem entregar..."
    | 'reply'          // "João respondeu ao teu comentário"
    | 'reaction'       // "Ana gostou da tua mensagem"
    | 'system'         // "Bem-vindo à Escola+"
    | 'direct_message' // "Gabriel enviou-te mensagem"
    | 'new_task'       // "Matemática A criou uma tarefa"
    | 'team_invite'    // "Foste adicionado à equipa X"
    | 'task_submitted';// "Aluno entregou tarefa"

export type NotificationResourceType = 'task' | 'message' | 'channel' | 'profile';

export interface Notification {
    id: string;
    user_id: string;               // Quem recebe
    actor_id: string | null;       // Quem provocou (ex: o Professor)
    type: NotificationType;
    title: string;                 // Ex: "Nova Tarefa de Matemática"
    content: string | null;        // Ex: "Resolver exercícios pág 30"
    resource_id: string | null;    // ID da Tarefa, Mensagem ou Canal
    resource_type: NotificationResourceType | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationInsert {
    user_id: string;
    actor_id?: string | null;
    type: NotificationType;
    title: string;
    content?: string | null;
    resource_id?: string | null;
    resource_type?: NotificationResourceType | null;
    is_read?: boolean;
}

// Tipo auxiliar: Notificação com dados do actor
export interface NotificationWithActor extends Notification {
    actor: Profile | null;
}

// ============================================
// TEAM TASKS (Tarefas de Equipa) 📝
// ============================================

// TaskType já definido acima (linha ~193)

export interface TeamTask {
    id: string;
    user_id: string;             // Para tarefas pessoais (quando team_id é null)
    team_id: string | null;      // ID da equipa (se for tarefa de equipa)
    created_by: string | null;   // Quem criou (para tarefas de equipa)
    title: string;
    description: string | null;
    due_date: string | null;     // timestamp with time zone
    is_completed: boolean;       // Para tarefas pessoais
    type: TaskType;
    xp_reward: number;
    subject_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface TeamTaskInsert {
    team_id: string;
    created_by: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    type?: TaskType;
    xp_reward?: number;
}

export interface TeamTaskUpdate {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    type?: TaskType;
    xp_reward?: number;
}

// Tracking de conclusão individual
export interface TeamTaskCompletion {
    id: string;
    task_id: string;
    user_id: string;
    completed_at: string;
}

export interface TeamTaskCompletionInsert {
    task_id: string;
    user_id: string;
}

// Tipo auxiliar: Tarefa com dados do criador e status de conclusão
export interface TeamTaskWithCreator extends TeamTask {
    creator?: Profile | null;
    completions?: TeamTaskCompletion[];
    my_completion?: TeamTaskCompletion | null;  // Se eu já completei
    completion_count?: number;                   // Quantas pessoas completaram
    total_members?: number;                      // Total de membros da equipa
}

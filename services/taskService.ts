/**
 * Task Service
 * Gestão de tarefas LMS - CRUD, grupos, atribuições e submissões
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type AssignmentType = 'individual' | 'team' | 'groups';
export type TaskStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned';

export interface TaskConfig {
    requires_file_upload: boolean;
    allowed_file_types: string[];
    max_score: number;
    assignment_type: AssignmentType;
    allow_late_submissions: boolean;
    instructor_attachments?: {
        name: string;
        url: string;
        type: string;
        size: number;
    }[];
}

export interface Task {
    id: string;
    team_id: string;
    created_by: string;
    title: string;
    description: string | null;
    due_date: string | null;
    xp_reward: number;
    status: TaskStatus;
    config: TaskConfig;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskGroup {
    id: string;
    task_id: string;
    name: string;
    color: string;
    created_at: string;
    members?: TaskGroupMember[];
}

export interface TaskGroupMember {
    id: string;
    group_id: string;
    user_id: string;
    joined_at: string;
    profile?: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

export interface TaskAssignment {
    id: string;
    task_id: string;
    user_id: string | null;
    group_id: string | null;
    assigned_at: string;
    assigned_by: string;
}

export interface TaskSubmission {
    id: string;
    task_id: string;
    user_id: string;
    group_id: string | null;
    content: string | null;
    file_url: string | null;
    file_name: string | null;
    file_type: string | null;
    file_size: number | null;
    link_url: string | null;
    status: SubmissionStatus;
    score: number | null;
    feedback: string | null;
    graded_by: string | null;
    graded_at: string | null;
    submitted_at: string;
    is_late: boolean;
}

export interface CreateTaskInput {
    team_id: string;
    title: string;
    description?: string;
    due_date?: string;
    xp_reward?: number;
    config: TaskConfig;
    status?: TaskStatus;
}

// ============================================
// TASK CRUD
// ============================================

/**
 * Criar nova tarefa
 */
export async function createTask(input: CreateTaskInput, createdBy: string): Promise<Task | null> {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                team_id: input.team_id,
                created_by: createdBy,
                user_id: createdBy, // Required by schema
                title: input.title,
                description: input.description,
                due_date: input.due_date,
                xp_reward: input.xp_reward || 50,
                config: input.config,
                status: input.status || 'draft',
                type: 'assignment',
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating task:', error);
            return null;
        }

        console.log('✅ Task created:', data.id);
        return data as Task;
    } catch (err) {
        console.error('❌ Unexpected error creating task:', err);
        return null;
    }
}

/**
 * Obter tarefa por ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) {
            console.error('❌ Error fetching task:', error);
            return null;
        }

        return data as Task;
    } catch (err) {
        console.error('❌ Unexpected error fetching task:', err);
        return null;
    }
}

/**
 * Listar tarefas de uma equipa
 */
export async function getTeamTasks(teamId: string): Promise<Task[]> {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('team_id', teamId)
            .eq('type', 'assignment')
            .is('deleted_at', null)
            .order('due_date', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('❌ Error fetching team tasks:', error);
            return [];
        }

        return (data || []) as Task[];
    } catch (err) {
        console.error('❌ Unexpected error fetching team tasks:', err);
        return [];
    }
}

/**
 * Publicar tarefa
 */
export async function publishTask(taskId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({
                status: 'published',
                published_at: new Date().toISOString(),
            })
            .eq('id', taskId);

        if (error) {
            console.error('❌ Error publishing task:', error);
            return false;
        }

        console.log('✅ Task published:', taskId);
        return true;
    } catch (err) {
        console.error('❌ Unexpected error publishing task:', err);
        return false;
    }
}

// ============================================
// GROUPS
// ============================================

/**
 * Gerar grupos aleatórios usando RPC
 */
export async function generateRandomGroups(
    taskId: string,
    teamId: string,
    membersPerGroup: number
): Promise<TaskGroup[]> {
    try {
        const { data, error } = await supabase.rpc('generate_random_groups', {
            p_task_id: taskId,
            p_team_id: teamId,
            p_members_per_group: membersPerGroup,
        });

        if (error) {
            console.error('❌ Error generating groups:', error);
            return [];
        }

        console.log('✅ Groups generated:', data?.length);

        // Fetch full group data with members
        return getTaskGroups(taskId);
    } catch (err) {
        console.error('❌ Unexpected error generating groups:', err);
        return [];
    }
}

/**
 * Obter grupos de uma tarefa
 */
export async function getTaskGroups(taskId: string): Promise<TaskGroup[]> {
    try {
        const { data, error } = await supabase
            .from('task_groups')
            .select(`
                *,
                members:task_group_members(
                    *,
                    profile:profiles(username, full_name, avatar_url)
                )
            `)
            .eq('task_id', taskId)
            .order('name');

        if (error) {
            console.error('❌ Error fetching groups:', error);
            return [];
        }

        return (data || []) as TaskGroup[];
    } catch (err) {
        console.error('❌ Unexpected error fetching groups:', err);
        return [];
    }
}

/**
 * Criar grupo manualmente
 */
export async function createGroup(
    taskId: string,
    name: string,
    color: string,
    memberIds: string[]
): Promise<TaskGroup | null> {
    try {
        // Create group
        const { data: group, error: groupError } = await supabase
            .from('task_groups')
            .insert({ task_id: taskId, name, color })
            .select()
            .single();

        if (groupError) {
            console.error('❌ Error creating group:', groupError);
            return null;
        }

        // Add members
        if (memberIds.length > 0) {
            const { error: membersError } = await supabase
                .from('task_group_members')
                .insert(memberIds.map(userId => ({
                    group_id: group.id,
                    user_id: userId,
                })));

            if (membersError) {
                console.error('❌ Error adding members:', membersError);
            }
        }

        // Create assignment for the group
        await supabase
            .from('task_assignments')
            .insert({
                task_id: taskId,
                group_id: group.id,
            });

        return group as TaskGroup;
    } catch (err) {
        console.error('❌ Unexpected error creating group:', err);
        return null;
    }
}

// ============================================
// ASSIGNMENTS
// ============================================

/**
 * Atribuir tarefa a toda a equipa
 */
export async function assignToTeam(taskId: string, teamId: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('assign_task_to_team', {
            p_task_id: taskId,
            p_team_id: teamId,
        });

        if (error) {
            console.error('❌ Error assigning to team:', error);
            return 0;
        }

        console.log('✅ Assigned to team members:', data);
        return data || 0;
    } catch (err) {
        console.error('❌ Unexpected error assigning to team:', err);
        return 0;
    }
}

/**
 * Atribuir tarefa a utilizadores específicos
 */
export async function assignToUsers(taskId: string, userIds: string[]): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('task_assignments')
            .insert(userIds.map(userId => ({
                task_id: taskId,
                user_id: userId,
            })));

        if (error) {
            console.error('❌ Error assigning to users:', error);
            return false;
        }

        console.log('✅ Assigned to users:', userIds.length);
        return true;
    } catch (err) {
        console.error('❌ Unexpected error assigning to users:', err);
        return false;
    }
}

/**
 * Obter atribuições de uma tarefa
 */
export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
    try {
        const { data, error } = await supabase
            .from('task_assignments')
            .select('*')
            .eq('task_id', taskId);

        if (error) {
            console.error('❌ Error fetching assignments:', error);
            return [];
        }

        return (data || []) as TaskAssignment[];
    } catch (err) {
        console.error('❌ Unexpected error fetching assignments:', err);
        return [];
    }
}

// ============================================
// SUBMISSIONS
// ============================================

/**
 * Criar/Atualizar submissão
 */
export async function submitTask(
    taskId: string,
    userId: string,
    submission: {
        content?: string;
        file_url?: string;
        file_name?: string;
        file_type?: string;
        file_size?: number;
        link_url?: string;
        group_id?: string;
    },
    dueDate?: string
): Promise<TaskSubmission | null> {
    try {
        const isLate = dueDate ? new Date() > new Date(dueDate) : false;

        // Check if submission exists
        const { data: existing } = await supabase
            .from('task_submissions')
            .select('id')
            .eq('task_id', taskId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('task_submissions')
                .update({
                    ...submission,
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    is_late: isLate,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data as TaskSubmission;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('task_submissions')
                .insert({
                    task_id: taskId,
                    user_id: userId,
                    ...submission,
                    status: 'submitted',
                    is_late: isLate,
                })
                .select()
                .single();

            if (error) throw error;
            return data as TaskSubmission;
        }
    } catch (err) {
        console.error('❌ Error submitting task:', err);
        return null;
    }
}

/**
 * Obter submissão do utilizador
 */
export async function getUserSubmission(
    taskId: string,
    userId: string
): Promise<TaskSubmission | null> {
    try {
        const { data, error } = await supabase
            .from('task_submissions')
            .select('*')
            .eq('task_id', taskId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error fetching submission:', error);
            return null;
        }

        return data as TaskSubmission | null;
    } catch (err) {
        console.error('❌ Unexpected error fetching submission:', err);
        return null;
    }
}

/**
 * Obter todas as submissões de uma tarefa (para professor)
 * Nota: Busca profiles separadamente para evitar erros de FK
 */
export async function getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    try {
        const { data, error } = await supabase
            .from('task_submissions')
            .select(`
                *,
                user:profiles(id, username, full_name, avatar_url)
            `)
            .eq('task_id', taskId)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching submissions:', error);
            return [];
        }

        return (data || []).map(sub => ({
            ...sub,
            user: Array.isArray(sub.user) ? sub.user[0] : sub.user
        })) as TaskSubmission[];
    } catch (err) {
        console.error('❌ Unexpected error fetching submissions:', err);
        return [];
    }
}

/**
 * Avaliar submissão (professor)
 */
export async function gradeSubmission(
    submissionId: string,
    graderId: string,
    score: number,
    feedback?: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('task_submissions')
            .update({
                score,
                feedback,
                status: 'graded',
                graded_by: graderId,
                graded_at: new Date().toISOString(),
            })
            .eq('id', submissionId);

        if (error) {
            console.error('❌ Error grading submission:', error);
            return false;
        }

        console.log('✅ Submission graded:', submissionId);
        return true;
    } catch (err) {
        console.error('❌ Unexpected error grading submission:', err);
        return false;
    }
}

// ============================================
// FILE UPLOAD
// ============================================

/**
 * Upload ficheiro para Storage - Compatível com React Native
 */
export async function uploadSubmissionFile(
    teamId: string,
    taskId: string,
    userId: string,
    file: {
        uri: string;
        name: string;
        type: string;
    }
): Promise<{ url: string; path: string } | null> {
    try {
        const filePath = `${teamId}/${taskId}/${userId}/${Date.now()}_${file.name}`;
        
        // Para React Native, usar FormData com fetch direto para o Storage
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.type || 'application/octet-stream',
        } as any);

        // Obter a URL de upload do Supabase
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session?.session?.access_token;
        
        if (!accessToken) {
            console.error('❌ No access token for upload');
            return null;
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            console.error('❌ EXPO_PUBLIC_SUPABASE_URL not set');
            return null;
        }
        const uploadUrl = `${supabaseUrl}/storage/v1/object/task-submissions/${filePath}`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-upsert': 'false',
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Upload failed:', errorText);
            return null;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
            .from('task-submissions')
            .getPublicUrl(filePath);

        console.log('✅ File uploaded:', filePath);
        return {
            url: urlData.publicUrl,
            path: filePath,
        };
    } catch (err) {
        console.error('❌ Unexpected error uploading file:', err);
        return null;
    }
}

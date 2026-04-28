/**
 * Create Task Wizard - ULTRA PREMIUM Design
 * Wizard de 3 passos para criar tarefas com design absurdamente profissional
 * Passo 1: Detalhes | Passo 2: Configuração | Passo 3: Atribuição
 */

import { DatePicker, UniversalTimePicker } from '@/components/ui/DateTimePicker';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type AssignmentType = 'individual' | 'team' | 'groups';

interface TeamMember {
    user_id: string;
    role: string;
    profile: { username: string; full_name: string; avatar_url: string };
}

interface Attachment {
    name: string;
    uri: string;
    mimeType?: string;
    size?: number;
    url?: string;
    type?: string;
}

const FILE_TYPES = [
    { id: 'pdf', label: 'PDF', icon: 'document-text', color: '#EF4444' },
    { id: 'jpg', label: 'Imagem', icon: 'image', color: '#8B5CF6' },
    { id: 'docx', label: 'Word', icon: 'document', color: '#3B82F6' },
    { id: 'zip', label: 'ZIP', icon: 'archive', color: '#6B7280' },
];

const STEP_CONFIG = [
    { num: 1, icon: 'create-outline', label: 'Detalhes', emoji: '📝' },
    { num: 2, icon: 'settings-outline', label: 'Regras', emoji: '⚙️' },
    { num: 3, icon: 'people-outline', label: 'Atribuir', emoji: '👥' },
];

// ============================================
// COMPONENT
// ============================================

export default function CreateTaskScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const { showAlert } = useAlert();

    const [step, setStep] = useState(1);
    const [publishing, setPublishing] = useState(false);
    const progressAnim = useRef(new Animated.Value(1)).current;

    // Step 1
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [xpReward, setXpReward] = useState('50');

    // Step 2
    const [requiresFile, setRequiresFile] = useState(false);
    const [allowedTypes, setAllowedTypes] = useState<string[]>(['pdf']);
    const [allowLate, setAllowLate] = useState(false);
    const [maxScore, setMaxScore] = useState('20');

    // Step 3
    const [assignmentType, setAssignmentType] = useState<AssignmentType>('team');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [memberGroups, setMemberGroups] = useState<Map<string, number>>(new Map());
    const [numGroups, setNumGroups] = useState('2');
    const [instructorAttachments, setInstructorAttachments] = useState<Attachment[]>([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);

    useEffect(() => {
        if (teamId) fetchTeamMembers();
    }, [teamId]);

    useEffect(() => {
        Animated.spring(progressAnim, { toValue: step, useNativeDriver: false }).start();
    }, [step]);

    const fetchTeamMembers = async () => {
        const { data } = await supabase
            .from('team_members')
            .select(`user_id, role, profile:profiles(username, full_name, avatar_url)`)
            .eq('team_id', teamId)
            .neq('role', 'owner');

        if (data) {
            const members = data.filter((m) => m.profile && !Array.isArray(m.profile)).map((m) => ({
                user_id: m.user_id,
                role: m.role,
                profile: m.profile as unknown as { username: string; full_name: string; avatar_url: string },
            }));
            setTeamMembers(members);
            const initial = new Map<string, number>();
            members.forEach((m) => initial.set(m.user_id, 1));
            setMemberGroups(initial);
        }
    };

    const canContinue = () => (step === 1 ? title.trim().length > 0 : true);

    const handleNext = () => {
        if (!canContinue()) {
            showAlert({ title: 'Atenção', message: 'Preenche os campos obrigatórios.' });
            return;
        }
        setStep((prev) => Math.min(prev + 1, 3));
    };

    const handleBack = () => (step === 1 ? router.back() : setStep((prev) => prev - 1));

    const toggleFileType = (type: string) => {
        setAllowedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
    };

    const handlePickAttachment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setInstructorAttachments(prev => [...prev, result.assets[0]]);
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const removeAttachment = (index: number) => {
        setInstructorAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const uploadInstructorAttachments = async () => {
        const uploadedFiles = [];
        for (const file of instructorAttachments) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${teamId}/${fileName}`;

            try {
                const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
                const arrayBuffer = require('base64-arraybuffer').decode(base64);

                const { data, error } = await supabase.storage
                    .from('task-files')
                    .upload(filePath, arrayBuffer, {
                        contentType: file.mimeType || 'application/octet-stream'
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('task-files')
                    .getPublicUrl(filePath);

                uploadedFiles.push({
                    name: file.name,
                    url: publicUrl,
                    type: file.mimeType,
                    size: file.size
                });
            } catch (err) {
                console.error('Error uploading instructor attachment:', err);
            }
        }
        return uploadedFiles;
    };

    const handlePublish = async () => {
        if (!teamId || !user?.id) return;

        setPublishing(true);
        try {
            // 1. Upload Attachments if any
            let attachments: any[] = [];
            if (instructorAttachments.length > 0) {
                attachments = await uploadInstructorAttachments();
            }

            // 2. Insert Task
            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    team_id: teamId,
                    created_by: user.id,
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    due_date: dueDate?.toISOString() || null,
                    xp_reward: parseInt(xpReward) || 50,
                    type: 'assignment',
                    status: 'published',
                    published_at: new Date().toISOString(),
                    config: {
                        requires_file_upload: requiresFile,
                        allowed_file_types: allowedTypes,
                        max_score: parseInt(maxScore) || 20,
                        assignment_type: assignmentType,
                        allow_late_submissions: allowLate,
                        instructor_attachments: attachments, // ADDED
                    },
                })
                .select()
                .single();

            if (taskError) {
                console.error('Supabase Insert Error:', taskError);
                throw new Error(`Erro ao inserir tarefa: ${taskError.message}`);
            }

            // 3. Assignments
            if (assignmentType === 'team') {
                const { error: assignError } = await supabase.rpc('assign_task_to_team', { p_task_id: task.id, p_team_id: teamId });
                if (assignError) console.error('Assign RPC Error:', assignError);
            } else if (assignmentType === 'groups') {
                const { error: groupsError } = await supabase.rpc('generate_random_groups', {
                    p_task_id: task.id,
                    p_team_id: teamId,
                    p_members_per_group: 4,
                });
                if (groupsError) console.error('Groups RPC Error:', groupsError);
            }

            showAlert({
                title: '🚀 Tarefa Publicada!',
                message: 'A tarefa foi criada com sucesso.',
                buttons: [{ text: 'OK', onPress: () => router.back() }]
            });
        } catch (error: any) {
            console.error('Error publishing task:', error);
            showAlert({ 
                title: 'Erro Crítico', 
                message: error.message || 'Não foi possível criar a tarefa. Verifica as tuas permissões.' 
            });
        } finally {
            setPublishing(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🚀 Nova Tarefa</Text>
                    </View>
                </View>

                {/* Step Indicator */}
                <View style={styles.stepsContainer}>
                    {STEP_CONFIG.map((s, i) => (
                        <React.Fragment key={s.num}>
                            <Pressable
                                style={[styles.stepItem, step >= s.num && styles.stepItemActive]}
                                onPress={() => s.num <= step && setStep(s.num)}
                            >
                                <View style={[styles.stepCircle, step >= s.num && styles.stepCircleActive, step === s.num && styles.stepCircleCurrent]}>
                                    {step > s.num ? (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : (
                                        <Text style={styles.stepEmoji}>{s.emoji}</Text>
                                    )}
                                </View>
                                <Text style={[styles.stepLabel, step >= s.num && styles.stepLabelActive]}>{s.label}</Text>
                            </Pressable>
                            {i < STEP_CONFIG.length - 1 && (
                                <View style={[styles.stepLine, step > s.num && styles.stepLineActive]} />
                            )}
                        </React.Fragment>
                    ))}
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* STEP 1: DETALHES */}
                        {step === 1 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <Text style={styles.stepTitle}>📝 Detalhes da Tarefa</Text>
                                    <Text style={styles.stepSubtitle}>Define as informações básicas</Text>
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Título *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Ex: Trabalho de Grupo - Capítulo 5"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Descrição</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Instruções, objetivos, critérios..."
                                        placeholderTextColor={COLORS.text.tertiary}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Data de Entrega</Text>
                                    <View style={styles.dateTimeRow}>
                                        <DatePicker
                                            value={dueDate}
                                            onChange={(date) => setDueDate(date)}
                                            placeholder="Escolher data"
                                            minimumDate={new Date()}
                                        />
                                        <UniversalTimePicker
                                            value={dueDate}
                                            onChange={(date) => setDueDate(date)}
                                            placeholder="Hora"
                                            disabled={!dueDate}
                                        />
                                        {dueDate && (
                                            <Pressable onPress={() => setDueDate(null)} style={styles.clearDateBtn}>
                                                <Ionicons name="close-circle" size={24} color={COLORS.text.tertiary} />
                                            </Pressable>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Recompensa XP</Text>
                                    <View style={styles.xpRow}>
                                        {['25', '50', '100', '150'].map((xp) => (
                                            <Pressable
                                                key={xp}
                                                style={[styles.xpOption, xpReward === xp && styles.xpOptionActive]}
                                                onPress={() => setXpReward(xp)}
                                            >
                                                <Ionicons name="flash" size={16} color={xpReward === xp ? '#FFD700' : COLORS.text.tertiary} />
                                                <Text style={[styles.xpOptionText, xpReward === xp && styles.xpOptionTextActive]}>{xp}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Material de Apoio (Instruções, PDFs, etc.)</Text>
                                    <Pressable style={styles.attachButton} onPress={handlePickAttachment}>
                                        <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                                        <Text style={styles.attachButtonText}>Anexar Ficheiro</Text>
                                    </Pressable>

                                    {instructorAttachments.length > 0 && (
                                        <View style={styles.attachmentsList}>
                                            {instructorAttachments.map((file, idx) => (
                                                <View key={idx} style={styles.attachmentItem}>
                                                    <Ionicons name="document-text" size={18} color={COLORS.text.secondary} />
                                                    <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                                                    <Pressable onPress={() => removeAttachment(idx)}>
                                                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* STEP 2: CONFIGURAÇÃO */}
                        {step === 2 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <Text style={styles.stepTitle}>⚙️ Configuração</Text>
                                    <Text style={styles.stepSubtitle}>Define as regras de entrega</Text>
                                </View>

                                {/* Require File */}
                                <View style={styles.switchCard}>
                                    <LinearGradient
                                        colors={requiresFile ? ['#6366F1', '#4F46E5'] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                                        style={styles.switchIcon}
                                    >
                                        <Ionicons name="attach" size={22} color={requiresFile ? '#FFF' : COLORS.text.tertiary} />
                                    </LinearGradient>
                                    <View style={styles.switchText}>
                                        <Text style={styles.switchLabel}>Exigir Ficheiro</Text>
                                        <Text style={styles.switchDesc}>Alunos devem anexar ficheiro</Text>
                                    </View>
                                    <Switch
                                        value={requiresFile}
                                        onValueChange={setRequiresFile}
                                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#6366F1' }}
                                        thumbColor="#FFF"
                                    />
                                </View>

                                {requiresFile && (
                                    <View style={styles.fileTypesCard}>
                                        <Text style={styles.fileTypesLabel}>Tipos permitidos:</Text>
                                        <View style={styles.fileTypesRow}>
                                            {FILE_TYPES.map((type) => (
                                                <Pressable
                                                    key={type.id}
                                                    style={[styles.fileTypeChip, allowedTypes.includes(type.id) && { backgroundColor: type.color }]}
                                                    onPress={() => toggleFileType(type.id)}
                                                >
                                                    <Ionicons name={type.icon as any} size={16} color={allowedTypes.includes(type.id) ? '#FFF' : COLORS.text.secondary} />
                                                    <Text style={[styles.fileTypeText, allowedTypes.includes(type.id) && styles.fileTypeTextActive]}>
                                                        {type.label}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Allow Late */}
                                <View style={styles.switchCard}>
                                    <LinearGradient
                                        colors={allowLate ? ['#F59E0B', '#D97706'] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                                        style={styles.switchIcon}
                                    >
                                        <Ionicons name="time" size={22} color={allowLate ? '#FFF' : COLORS.text.tertiary} />
                                    </LinearGradient>
                                    <View style={styles.switchText}>
                                        <Text style={styles.switchLabel}>Permitir Atraso</Text>
                                        <Text style={styles.switchDesc}>Aceitar entregas após prazo</Text>
                                    </View>
                                    <Switch
                                        value={allowLate}
                                        onValueChange={setAllowLate}
                                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#F59E0B' }}
                                        thumbColor="#FFF"
                                    />
                                </View>

                                {/* Max Score */}
                                <View style={styles.card}>
                                    <Text style={styles.cardLabel}>Nota Máxima</Text>
                                    <View style={styles.scoreRow}>
                                        {['10', '20', '100'].map((score) => (
                                            <Pressable
                                                key={score}
                                                style={[styles.scoreOption, maxScore === score && styles.scoreOptionActive]}
                                                onPress={() => setMaxScore(score)}
                                            >
                                                <Text style={[styles.scoreOptionText, maxScore === score && styles.scoreOptionTextActive]}>{score}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* STEP 3: ATRIBUIÇÃO */}
                        {step === 3 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <Text style={styles.stepTitle}>👥 Atribuição</Text>
                                    <Text style={styles.stepSubtitle}>Quem vai realizar esta tarefa?</Text>
                                </View>

                                {/* Assignment Type */}
                                <View style={styles.assignmentGrid}>
                                    {[
                                        { id: 'team' as AssignmentType, icon: 'people', label: 'Toda Equipa', desc: `${teamMembers.length} membros`, color: '#6366F1' },
                                        { id: 'individual' as AssignmentType, icon: 'person', label: 'Individual', desc: 'Atribuir depois', color: '#F59E0B' },
                                        { id: 'groups' as AssignmentType, icon: 'git-branch', label: 'Grupos', desc: 'Dividir em grupos', color: '#22C55E' },
                                    ].map((opt) => (
                                        <Pressable
                                            key={opt.id}
                                            style={[styles.assignmentCard, assignmentType === opt.id && styles.assignmentCardActive]}
                                            onPress={() => setAssignmentType(opt.id)}
                                        >
                                            <LinearGradient
                                                colors={assignmentType === opt.id ? [opt.color, opt.color] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                                                style={styles.assignmentIcon}
                                            >
                                                <Ionicons name={opt.icon as any} size={24} color={assignmentType === opt.id ? '#FFF' : COLORS.text.tertiary} />
                                            </LinearGradient>
                                            <Text style={[styles.assignmentLabel, assignmentType === opt.id && styles.assignmentLabelActive]}>{opt.label}</Text>
                                            <Text style={styles.assignmentDesc}>{opt.desc}</Text>
                                        </Pressable>
                                    ))}
                                </View>

                                {/* Team Info */}
                                {assignmentType === 'team' && (
                                    <View style={styles.infoCard}>
                                        <LinearGradient colors={['rgba(99,102,241,0.2)', 'rgba(99,102,241,0.05)']} style={styles.infoCardGradient}>
                                            <Ionicons name="people" size={32} color="#6366F1" />
                                            <Text style={styles.infoCardText}>
                                                A tarefa será atribuída a todos os <Text style={styles.infoCardHighlight}>{teamMembers.length} membros</Text> da equipa
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                )}

                                {assignmentType === 'individual' && (
                                    <View style={styles.infoCard}>
                                        <LinearGradient colors={['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.05)']} style={styles.infoCardGradient}>
                                            <Ionicons name="person" size={32} color="#F59E0B" />
                                            <Text style={styles.infoCardText}>Poderás atribuir a alunos específicos depois de criar a tarefa</Text>
                                        </LinearGradient>
                                    </View>
                                )}

                                {assignmentType === 'groups' && (
                                    <View style={styles.groupsSection}>
                                        <Text style={styles.groupsLabel}>Número de grupos:</Text>
                                        <View style={styles.groupsRow}>
                                            {['2', '3', '4', '5', '6'].map((num) => (
                                                <Pressable
                                                    key={num}
                                                    style={[styles.groupOption, numGroups === num && styles.groupOptionActive]}
                                                    onPress={() => setNumGroups(num)}
                                                >
                                                    <Text style={[styles.groupOptionText, numGroups === num && styles.groupOptionTextActive]}>{num}</Text>
                                                </Pressable>
                                            ))}
                                        </View>

                                        <Text style={styles.groupsInfo}>
                                            <Ionicons name="information-circle" size={14} color="#22C55E" /> {parseInt(numGroups)} grupos com ~
                                            {Math.ceil(teamMembers.length / parseInt(numGroups))} membros cada
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {step < 3 ? (
                            <Pressable onPress={handleNext} disabled={!canContinue()}>
                                <LinearGradient
                                    colors={canContinue() ? ['#6366F1', '#4F46E5'] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                                    style={styles.footerButton}
                                >
                                    <Text style={[styles.footerButtonText, !canContinue() && { color: COLORS.text.tertiary }]}>Continuar</Text>
                                    <Ionicons name="arrow-forward" size={20} color={canContinue() ? '#FFF' : COLORS.text.tertiary} />
                                </LinearGradient>
                            </Pressable>
                        ) : (
                            <Pressable onPress={handlePublish} disabled={publishing}>
                                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.footerButton}>
                                    {publishing ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="rocket" size={20} color="#FFF" />
                                            <Text style={styles.footerButtonText}>Publicar Tarefa</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },

    // Steps
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    stepItem: {
        alignItems: 'center',
        gap: SPACING.xs,
    },
    stepItemActive: {},
    stepCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stepCircleActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    stepCircleCurrent: {
        borderWidth: 3,
        borderColor: 'rgba(99, 102, 241, 0.5)',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    stepEmoji: {
        fontSize: 18,
    },
    stepLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    stepLabelActive: {
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: COLORS.surfaceElevated,
        maxWidth: 40,
    },
    stepLineActive: {
        backgroundColor: '#6366F1',
    },

    // Scroll
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 120,
    },
    stepContent: {
        gap: SPACING.lg,
    },
    stepHeader: {
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    stepTitle: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    stepSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },

    // Card
    card: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.md,
    },
    input: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },

    // Date
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    dateIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },
    dateTextActive: {
        color: COLORS.text.primary,
    },
    datePickerWrap: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
    },
    datePickerDone: {
        alignItems: 'center',
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    datePickerDoneText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    clearDateBtn: {
        padding: SPACING.xs,
    },

    // XP
    xpRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    xpOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    xpOptionActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
    },
    xpOptionText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    xpOptionTextActive: {
        color: '#FFD700',
    },

    // Switch Card
    switchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    switchIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    switchText: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    switchLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    switchDesc: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // File Types
    fileTypesCard: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    fileTypesLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.md,
    },
    fileTypesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    fileTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surfaceMuted,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    fileTypeText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    fileTypeTextActive: {
        color: '#FFF',
    },

    // Score
    scoreRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    scoreOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    scoreOptionActive: {
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    scoreOptionText: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.secondary,
    },
    scoreOptionTextActive: {
        color: '#6366F1',
    },

    // Assignment Grid
    assignmentGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    assignmentCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: SPACING.sm,
    },
    assignmentCardActive: {
        borderColor: '#6366F1',
    },
    assignmentIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assignmentLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    assignmentLabelActive: {
        color: '#6366F1',
    },
    assignmentDesc: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },

    // Info Card
    infoCard: {
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
    },
    infoCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.lg,
    },
    infoCardText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    infoCardHighlight: {
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },

    // Groups
    groupsSection: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: SPACING.md,
    },
    groupsLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    groupsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    groupOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    groupOptionActive: {
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    groupOptionText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.secondary,
    },
    groupOptionTextActive: {
        color: '#22C55E',
    },
    groupsInfo: {
        fontSize: TYPOGRAPHY.size.sm,
        color: '#22C55E',
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        paddingBottom: 40,
        backgroundColor: COLORS.background,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS['2xl'],
    },
    footerButtonText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // Attachments
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#6366F1',
        marginTop: SPACING.xs,
    },
    attachButtonText: {
        color: '#6366F1',
        fontWeight: TYPOGRAPHY.weight.semibold,
        fontSize: TYPOGRAPHY.size.sm,
    },
    attachmentsList: {
        marginTop: SPACING.md,
        gap: SPACING.xs,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
    },
    attachmentName: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
});

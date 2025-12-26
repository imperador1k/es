/**
 * Create Task Wizard - Clean Version
 * Wizard de 3 passos para criar tarefas
 * Passo 1: Detalhes | Passo 2: Configuração | Passo 3: Atribuição
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    profile: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

// ============================================
// CONSTANTS
// ============================================

const FILE_TYPES = [
    { id: 'pdf', label: 'PDF', icon: 'document-text-outline' },
    { id: 'jpg', label: 'Imagem', icon: 'image-outline' },
    { id: 'docx', label: 'Word', icon: 'document-outline' },
    { id: 'zip', label: 'ZIP', icon: 'archive-outline' },
];

// ============================================
// COMPONENT
// ============================================

export default function CreateTaskScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    // Wizard Step (1, 2, 3)
    const [step, setStep] = useState(1);
    const [publishing, setPublishing] = useState(false);

    // ============================================
    // STEP 1: DETALHES
    // ============================================
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [xpReward, setXpReward] = useState('50');

    // ============================================
    // STEP 2: CONFIGURAÇÃO
    // ============================================
    const [requiresFile, setRequiresFile] = useState(false);
    const [allowedTypes, setAllowedTypes] = useState<string[]>(['pdf']);
    const [allowLate, setAllowLate] = useState(false);
    const [maxScore, setMaxScore] = useState('20');

    // ============================================
    // STEP 3: ATRIBUIÇÃO
    // ============================================
    const [assignmentType, setAssignmentType] = useState<AssignmentType>('team');
    const [membersPerGroup, setMembersPerGroup] = useState('4');
    const [teamMemberCount, setTeamMemberCount] = useState(0);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [memberGroups, setMemberGroups] = useState<Map<string, number>>(new Map());
    const [numGroups, setNumGroups] = useState('2');

    // Fetch team members
    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
        }
    }, [teamId]);

    const fetchTeamMembers = async () => {
        const { data, count } = await supabase
            .from('team_members')
            .select(`
                user_id,
                role,
                profile:profiles(username, full_name, avatar_url)
            `, { count: 'exact' })
            .eq('team_id', teamId)
            .neq('role', 'owner'); // Exclude owner from assignments

        setTeamMemberCount((count || 0) + 1); // Total including owner

        if (data) {
            const members = data
                .filter(m => m.profile && !Array.isArray(m.profile))
                .map(m => {
                    const profile = m.profile as unknown as { username: string; full_name: string; avatar_url: string };
                    return {
                        user_id: m.user_id,
                        role: m.role,
                        profile,
                    };
                });
            setTeamMembers(members);

            // Initialize all members to group 1
            const initial = new Map<string, number>();
            members.forEach(m => initial.set(m.user_id, 1));
            setMemberGroups(initial);
        }
    };

    // ============================================
    // NAVIGATION
    // ============================================

    const canContinue = () => {
        if (step === 1) {
            return title.trim().length > 0;
        }
        return true;
    };

    const handleNext = () => {
        if (!canContinue()) {
            Alert.alert('Atenção', 'Preenche os campos obrigatórios.');
            return;
        }
        setStep(prev => Math.min(prev + 1, 3));
    };

    const handleBack = () => {
        if (step === 1) {
            router.back();
        } else {
            setStep(prev => prev - 1);
        }
    };

    // ============================================
    // HELPERS
    // ============================================

    const toggleFileType = (type: string) => {
        setAllowedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const calculateGroups = () => {
        const perGroup = parseInt(membersPerGroup) || 4;
        const members = teamMemberCount - 1; // Exclui owner
        return Math.ceil(members / perGroup);
    };

    // ============================================
    // PUBLISH
    // ============================================

    const handlePublish = async () => {
        if (!teamId || !user?.id) return;

        setPublishing(true);
        try {
            // 1. Criar a tarefa
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
                    },
                })
                .select()
                .single();

            if (taskError) throw taskError;

            // 2. Atribuir baseado no tipo
            if (assignmentType === 'team') {
                // Atribuir a toda a equipa
                const { error: assignError } = await supabase.rpc('assign_task_to_team', {
                    p_task_id: task.id,
                    p_team_id: teamId,
                });
                if (assignError) console.error('Assign error:', assignError);
            } else if (assignmentType === 'groups') {
                // Gerar grupos aleatórios
                const { error: groupError } = await supabase.rpc('generate_random_groups', {
                    p_task_id: task.id,
                    p_team_id: teamId,
                    p_members_per_group: parseInt(membersPerGroup) || 4,
                });
                if (groupError) console.error('Group error:', groupError);
            }
            // Se for 'individual', o professor atribui depois

            Alert.alert(
                '✅ Tarefa Publicada!',
                'A tarefa foi criada com sucesso.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Error publishing task:', error);
            Alert.alert('Erro', 'Não foi possível criar a tarefa.');
        } finally {
            setPublishing(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Nova Tarefa</Text>
                <Text style={styles.stepIndicator}>{step}/3</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ================== STEP 1: DETALHES ================== */}
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>📝 Detalhes da Tarefa</Text>
                            <Text style={styles.stepSubtitle}>
                                Define as informações básicas
                            </Text>

                            {/* Título */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Título *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Ex: Trabalho de Grupo - Capítulo 5"
                                    placeholderTextColor={colors.text.tertiary}
                                />
                            </View>

                            {/* Descrição */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Descrição</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Instruções, objetivos, critérios de avaliação..."
                                    placeholderTextColor={colors.text.tertiary}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Data de Entrega */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Data de Entrega</Text>
                                <Pressable
                                    style={styles.dateButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={dueDate ? colors.accent.primary : colors.text.tertiary}
                                    />
                                    <Text style={[
                                        styles.dateText,
                                        dueDate && styles.dateTextActive
                                    ]}>
                                        {dueDate
                                            ? dueDate.toLocaleDateString('pt-PT', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : 'Sem prazo definido'}
                                    </Text>
                                    {dueDate && (
                                        <Pressable onPress={(e) => {
                                            e.stopPropagation();
                                            setDueDate(null);
                                        }}>
                                            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                                        </Pressable>
                                    )}
                                </Pressable>
                                {showDatePicker && (
                                    <View style={styles.datePickerContainer}>
                                        <DateTimePicker
                                            value={dueDate || new Date()}
                                            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                                            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                                            minimumDate={new Date()}
                                            onChange={(event, date) => {
                                                if (Platform.OS === 'android') {
                                                    setShowDatePicker(false);
                                                    if (event.type === 'set' && date) {
                                                        setDueDate(date);
                                                        // Show time picker after date is selected
                                                        setShowTimePicker(true);
                                                    }
                                                } else if (date) {
                                                    setDueDate(date);
                                                }
                                            }}
                                        />
                                        {Platform.OS === 'ios' && (
                                            <Pressable
                                                style={styles.datePickerDoneButton}
                                                onPress={() => setShowDatePicker(false)}
                                            >
                                                <Text style={styles.datePickerDoneText}>Confirmar</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                )}
                                {/* Time picker for Android */}
                                {showTimePicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={dueDate || new Date()}
                                        mode="time"
                                        display="clock"
                                        onChange={(event, date) => {
                                            setShowTimePicker(false);
                                            if (event.type === 'set' && date) {
                                                setDueDate(date);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {/* XP Reward */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Recompensa XP</Text>
                                <View style={styles.xpRow}>
                                    <TextInput
                                        style={[styles.input, styles.xpInput]}
                                        value={xpReward}
                                        onChangeText={setXpReward}
                                        keyboardType="number-pad"
                                        placeholder="50"
                                        placeholderTextColor={colors.text.tertiary}
                                    />
                                    <View style={styles.xpBadge}>
                                        <Ionicons name="flash" size={16} color={colors.warning.primary} />
                                        <Text style={styles.xpBadgeText}>XP</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ================== STEP 2: CONFIGURAÇÃO ================== */}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>⚙️ Configuração</Text>
                            <Text style={styles.stepSubtitle}>
                                Define as regras de entrega
                            </Text>

                            {/* Exigir Ficheiro */}
                            <View style={styles.switchCard}>
                                <View style={styles.switchContent}>
                                    <Ionicons
                                        name="attach"
                                        size={24}
                                        color={requiresFile ? colors.accent.primary : colors.text.tertiary}
                                    />
                                    <View style={styles.switchText}>
                                        <Text style={styles.switchLabel}>Exigir Ficheiro</Text>
                                        <Text style={styles.switchDescription}>
                                            Alunos devem anexar um ficheiro
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={requiresFile}
                                    onValueChange={setRequiresFile}
                                    trackColor={{ false: colors.divider, true: colors.accent.primary }}
                                    thumbColor="#FFF"
                                />
                            </View>

                            {/* Tipos de Ficheiro */}
                            {requiresFile && (
                                <View style={styles.fileTypesContainer}>
                                    <Text style={styles.smallLabel}>Tipos permitidos:</Text>
                                    <View style={styles.fileTypesRow}>
                                        {FILE_TYPES.map(type => (
                                            <Pressable
                                                key={type.id}
                                                style={[
                                                    styles.fileTypeChip,
                                                    allowedTypes.includes(type.id) && styles.fileTypeChipActive,
                                                ]}
                                                onPress={() => toggleFileType(type.id)}
                                            >
                                                <Ionicons
                                                    name={type.icon as any}
                                                    size={16}
                                                    color={allowedTypes.includes(type.id) ? '#FFF' : colors.text.secondary}
                                                />
                                                <Text style={[
                                                    styles.fileTypeText,
                                                    allowedTypes.includes(type.id) && styles.fileTypeTextActive,
                                                ]}>
                                                    {type.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Permitir Atraso */}
                            <View style={styles.switchCard}>
                                <View style={styles.switchContent}>
                                    <Ionicons
                                        name="time-outline"
                                        size={24}
                                        color={allowLate ? colors.warning.primary : colors.text.tertiary}
                                    />
                                    <View style={styles.switchText}>
                                        <Text style={styles.switchLabel}>Permitir Atraso</Text>
                                        <Text style={styles.switchDescription}>
                                            Aceitar entregas após o prazo
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={allowLate}
                                    onValueChange={setAllowLate}
                                    trackColor={{ false: colors.divider, true: colors.warning.primary }}
                                    thumbColor="#FFF"
                                />
                            </View>

                            {/* Nota Máxima */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Nota Máxima</Text>
                                <View style={styles.scoreOptionsRow}>
                                    {['10', '20', '100'].map(score => (
                                        <Pressable
                                            key={score}
                                            style={[
                                                styles.scoreOption,
                                                maxScore === score && styles.scoreOptionActive,
                                            ]}
                                            onPress={() => setMaxScore(score)}
                                        >
                                            <Text style={[
                                                styles.scoreOptionText,
                                                maxScore === score && styles.scoreOptionTextActive,
                                            ]}>
                                                {score}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ================== STEP 3: ATRIBUIÇÃO ================== */}
                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>👥 Atribuição</Text>
                            <Text style={styles.stepSubtitle}>
                                Quem vai realizar esta tarefa?
                            </Text>

                            {/* Segmented Control */}
                            <View style={styles.segmentedControl}>
                                {[
                                    { id: 'individual', label: 'Individual', icon: 'person-outline' },
                                    { id: 'team', label: 'Toda a Equipa', icon: 'people-outline' },
                                    { id: 'groups', label: 'Grupos', icon: 'git-branch-outline' },
                                ].map(option => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.segmentOption,
                                            assignmentType === option.id && styles.segmentOptionActive,
                                        ]}
                                        onPress={() => setAssignmentType(option.id as AssignmentType)}
                                    >
                                        <Ionicons
                                            name={option.icon as any}
                                            size={20}
                                            color={assignmentType === option.id ? '#FFF' : colors.text.tertiary}
                                        />
                                        <Text style={[
                                            styles.segmentLabel,
                                            assignmentType === option.id && styles.segmentLabelActive,
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* Info Cards */}
                            {assignmentType === 'team' && (
                                <View style={styles.infoCard}>
                                    <Ionicons name="people" size={32} color={colors.accent.primary} />
                                    <Text style={styles.infoCardText}>
                                        A tarefa será atribuída a todos os{' '}
                                        <Text style={styles.infoCardHighlight}>{teamMemberCount - 1} membros</Text>
                                        {' '}da equipa.
                                    </Text>
                                </View>
                            )}

                            {assignmentType === 'individual' && (
                                <View style={[styles.infoCard, { backgroundColor: colors.warning.light }]}>
                                    <Ionicons name="person" size={32} color={colors.warning.primary} />
                                    <Text style={styles.infoCardText}>
                                        Poderás atribuir a alunos específicos depois de criar a tarefa.
                                    </Text>
                                </View>
                            )}

                            {assignmentType === 'groups' && (
                                <View style={styles.groupsConfig}>
                                    {/* Number of groups selector */}
                                    <View style={styles.groupsInputRow}>
                                        <Text style={styles.groupsLabel}>
                                            Número de grupos:
                                        </Text>
                                        <View style={styles.groupNumberSelector}>
                                            {['2', '3', '4', '5', '6'].map(num => (
                                                <Pressable
                                                    key={num}
                                                    style={[
                                                        styles.groupNumberOption,
                                                        numGroups === num && styles.groupNumberOptionActive
                                                    ]}
                                                    onPress={() => setNumGroups(num)}
                                                >
                                                    <Text style={[
                                                        styles.groupNumberText,
                                                        numGroups === num && styles.groupNumberTextActive
                                                    ]}>{num}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Member list with group assignment */}
                                    <Text style={styles.groupsSectionTitle}>
                                        Atribuir membros aos grupos:
                                    </Text>

                                    <View style={styles.membersList}>
                                        {teamMembers.map(member => (
                                            <View key={member.user_id} style={styles.memberGroupRow}>
                                                <View style={styles.memberInfo}>
                                                    <View style={[styles.memberAvatar, { backgroundColor: colors.accent.light }]}>
                                                        <Text style={styles.memberAvatarText}>
                                                            {(member.profile.full_name || member.profile.username || '?').charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.memberName} numberOfLines={1}>
                                                        {member.profile.full_name || member.profile.username}
                                                    </Text>
                                                </View>
                                                <View style={styles.groupSelector}>
                                                    {Array.from({ length: parseInt(numGroups) }, (_, i) => i + 1).map(groupNum => (
                                                        <Pressable
                                                            key={groupNum}
                                                            style={[
                                                                styles.groupSelectorOption,
                                                                memberGroups.get(member.user_id) === groupNum && styles.groupSelectorOptionActive
                                                            ]}
                                                            onPress={() => {
                                                                const newMap = new Map(memberGroups);
                                                                newMap.set(member.user_id, groupNum);
                                                                setMemberGroups(newMap);
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.groupSelectorText,
                                                                memberGroups.get(member.user_id) === groupNum && styles.groupSelectorTextActive
                                                            ]}>G{groupNum}</Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Group summary */}
                                    <View style={styles.groupsSummary}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.accent.primary} />
                                        <Text style={styles.groupsSummaryText}>
                                            {parseInt(numGroups)} grupos • {teamMembers.length} membros atribuídos
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    {step < 3 ? (
                        <Pressable
                            style={[styles.button, styles.buttonPrimary, !canContinue() && styles.buttonDisabled]}
                            onPress={handleNext}
                            disabled={!canContinue()}
                        >
                            <Text style={styles.buttonPrimaryText}>Continuar</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFF" />
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.button, styles.buttonSuccess, publishing && styles.buttonDisabled]}
                            onPress={handlePublish}
                            disabled={publishing}
                        >
                            {publishing ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="rocket-outline" size={20} color="#FFF" />
                                    <Text style={styles.buttonSuccessText}>Publicar Tarefa</Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    stepIndicator: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
        backgroundColor: colors.accent.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },

    // Progress Bar
    progressContainer: {
        height: 4,
        backgroundColor: colors.divider,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.accent.primary,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 100,
    },

    // Step Container
    stepContainer: {
        gap: spacing.lg,
    },
    stepTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    stepSubtitle: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        marginTop: -spacing.sm,
    },

    // Fields
    field: {
        gap: spacing.xs,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    smallLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 140,
        paddingTop: spacing.md,
    },

    // Date Button
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    dateText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },
    dateTextActive: {
        color: colors.text.primary,
    },
    datePickerContainer: {
        marginTop: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
    },
    datePickerDoneButton: {
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    datePickerDoneText: {
        color: '#FFF',
        fontWeight: typography.weight.semibold,
        fontSize: typography.size.base,
    },

    // XP
    xpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    xpInput: {
        width: 80,
        textAlign: 'center',
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.warning.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    xpBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.warning.primary,
    },

    // Switch Cards
    switchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...shadows.sm,
    },
    switchContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    switchText: {
        flex: 1,
    },
    switchLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    switchDescription: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // File Types
    fileTypesContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: -spacing.sm,
    },
    fileTypesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    fileTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.background,
    },
    fileTypeChipActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    fileTypeText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    fileTypeTextActive: {
        color: '#FFF',
    },

    // Score Options
    scoreOptionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    scoreOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.divider,
        backgroundColor: colors.surface,
    },
    scoreOptionActive: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.light,
    },
    scoreOptionText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    scoreOptionTextActive: {
        color: colors.accent.primary,
    },

    // Segmented Control
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xs,
        gap: spacing.xs,
    },
    segmentOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    segmentOptionActive: {
        backgroundColor: colors.accent.primary,
    },
    segmentLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
    },
    segmentLabelActive: {
        color: '#FFF',
    },

    // Info Card
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    infoCardText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    infoCardHighlight: {
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },

    // Groups Config
    groupsConfig: {
        gap: spacing.md,
    },
    groupsInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    groupsLabel: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    groupsInput: {
        width: 60,
        textAlign: 'center',
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    groupsPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: colors.accent.primary,
        borderStyle: 'dashed',
    },
    groupsPreviewIcon: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.lg,
    },
    diceEmoji: {
        fontSize: 24,
    },
    groupsPreviewContent: {
        flex: 1,
    },
    groupsPreviewTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
    },
    groupsPreviewText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        marginTop: 2,
    },
    groupsPreviewHighlight: {
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    groupsNote: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
    },
    groupNumberSelector: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    groupNumberOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupNumberOptionActive: {
        backgroundColor: colors.accent.primary,
    },
    groupNumberText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
    },
    groupNumberTextActive: {
        color: '#FFF',
    },
    groupsSectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        marginTop: spacing.sm,
    },
    membersList: {
        gap: spacing.sm,
    },
    memberGroupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    memberAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberAvatarText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    memberName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        flex: 1,
    },
    groupSelector: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    groupSelectorOption: {
        width: 36,
        height: 32,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupSelectorOptionActive: {
        backgroundColor: colors.accent.primary,
    },
    groupSelectorText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
    },
    groupSelectorTextActive: {
        color: '#FFF',
    },
    groupsSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
    },
    groupsSummaryText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    buttonPrimary: {
        backgroundColor: colors.accent.primary,
    },
    buttonSuccess: {
        backgroundColor: colors.success.primary,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonPrimaryText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    buttonSuccessText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
});

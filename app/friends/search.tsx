/**
 * 🔍 Search Friends Screen - PREMIUM REDESIGN V3
 * Smart filters: Level first → School/University → Course
 */

import { CachedAvatar } from '@/components/CachedImage';
import { useStartConversation } from '@/hooks/useDMs';
import { useFriends, useSearchUsers } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// TYPES & CONSTANTS
// ============================================

type FilterOption = { id: string; name: string };

const EDUCATION_LEVELS = [
    { id: 'basico_2', label: '2º Ciclo', type: 'school', icon: '📚' },
    { id: 'basico_3', label: '3º Ciclo', type: 'school', icon: '📖' },
    { id: 'secundario', label: 'Secundário', type: 'school', icon: '🎒' },
    { id: 'licenciatura', label: 'Licenciatura', type: 'university', icon: '🎓' },
    { id: 'mestrado', label: 'Mestrado', type: 'university', icon: '📜' },
    { id: 'doutoramento', label: 'Doutoramento', type: 'university', icon: '🏆' },
];

// ============================================
// USER RESULT CARD
// ============================================

function UserCard({ user, isFriend, sending, onAdd, onMessage, index }: {
    user: Profile & {
        education?: {
            school_name?: string;
            university_name?: string;
            degree_name?: string;
            level?: string;
            year?: number;
        } | null
    };
    isFriend: boolean;
    sending: boolean;
    onAdd: () => void;
    onMessage: () => void;
    index: number;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 80,
            useNativeDriver: true,
        }).start();
    }, [index]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    const eduLabel = user.education?.university_name || user.education?.school_name;
    const courseLabel = user.education?.degree_name || (user.education?.year ? `${user.education.year}º Ano` : null);
    const levelLabel = EDUCATION_LEVELS.find(l => l.id === user.education?.level)?.label;

    return (
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                style={styles.userCard}
                onPress={() => router.push(`/public-profile/${user.id}` as any)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {user.avatar_url ? (
                    <CachedAvatar uri={user.avatar_url} size={52} />
                ) : (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
                        <Text style={styles.avatarInitial}>
                            {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}

                <View style={styles.userContent}>
                    <View style={styles.userNameRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user.full_name || user.username}
                        </Text>
                        {isFriend && (
                            <View style={styles.friendBadge}>
                                <Ionicons name="checkmark" size={10} color="#10B981" />
                                <Text style={styles.friendBadgeText}>Amigo</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userUsername}>@{user.username || 'utilizador'}</Text>

                    {(eduLabel || levelLabel) && (
                        <View style={styles.educationRow}>
                            <Ionicons
                                name={user.education?.university_name ? "school" : "business"}
                                size={12}
                                color={COLORS.text.tertiary}
                            />
                            <Text style={styles.educationText} numberOfLines={1}>
                                {levelLabel && `${levelLabel} • `}{eduLabel}{courseLabel ? ` • ${courseLabel}` : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {isFriend ? (
                    <Pressable style={styles.messageBtn} onPress={onMessage}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.actionBtnGradient}>
                            <Ionicons name="chatbubble" size={16} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.addBtn, sending && styles.addBtnDisabled]}
                        onPress={onAdd}
                        disabled={sending}
                    >
                        {sending ? (
                            <View style={styles.actionBtnLoading}>
                                <ActivityIndicator size="small" color="#6366F1" />
                            </View>
                        ) : (
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.actionBtnGradient}>
                                <Ionicons name="person-add" size={16} color="#FFF" />
                            </LinearGradient>
                        )}
                    </Pressable>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// FILTER CHIP
// ============================================

function FilterChip({ label, active, onPress, icon }: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon?: string;
}) {
    return (
        <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
            {icon && <Ionicons name={icon as any} size={14} color={active ? '#FFF' : COLORS.text.secondary} />}
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
            {active && <Ionicons name="close-circle" size={14} color="#FFF" />}
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SearchFriendsScreen() {
    const { results, searching, search, clear, filters, updateFilters } = useSearchUsers();
    const { sendFriendRequest, friends } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [sending, setSending] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Filter state - Step by step
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [selectedSchool, setSelectedSchool] = useState<FilterOption | null>(null);
    const [selectedUniversity, setSelectedUniversity] = useState<FilterOption | null>(null);
    const [selectedDegree, setSelectedDegree] = useState<FilterOption | null>(null);

    // Search within filters
    const [schoolSearch, setSchoolSearch] = useState('');
    const [uniSearch, setUniSearch] = useState('');
    const [degreeSearch, setDegreeSearch] = useState('');

    // Search results for institutions
    const [schoolResults, setSchoolResults] = useState<FilterOption[]>([]);
    const [uniResults, setUniResults] = useState<FilterOption[]>([]);
    const [degreeResults, setDegreeResults] = useState<FilterOption[]>([]);
    const [searchingSchools, setSearchingSchools] = useState(false);
    const [searchingUnis, setSearchingUnis] = useState(false);
    const [searchingDegrees, setSearchingDegrees] = useState(false);

    // Blocked Users Filter
    const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchBlocked = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('user_blocks')
                .select('*')
                .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

            if (data) {
                const ids = new Set<string>();
                data.forEach(b => {
                    ids.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
                });
                setBlockedIds(ids);
            }
        };
        fetchBlocked();
    }, []);

    // Filter results to exclude blocked
    const filteredResults = results.filter(u => !blockedIds.has(u.id));

    const headerAnim = useRef(new Animated.Value(0)).current;
    const searchAnim = useRef(new Animated.Value(0)).current;

    // Determine if we should show school or university based on level
    const currentLevelConfig = EDUCATION_LEVELS.find(l => l.id === selectedLevel);
    const isUniversityLevel = currentLevelConfig?.type === 'university';

    // Search schools
    useEffect(() => {
        if (!schoolSearch.trim() || schoolSearch.length < 2) {
            setSchoolResults([]);
            return;
        }
        const searchSchools = async () => {
            setSearchingSchools(true);
            const { data } = await supabase
                .from('schools')
                .select('id, name')
                .ilike('name', `%${schoolSearch}%`)
                .limit(15);
            setSchoolResults(data || []);
            setSearchingSchools(false);
        };
        const timeout = setTimeout(searchSchools, 300);
        return () => clearTimeout(timeout);
    }, [schoolSearch]);

    // Search universities  
    useEffect(() => {
        if (!uniSearch.trim() || uniSearch.length < 2) {
            setUniResults([]);
            return;
        }
        const searchUnis = async () => {
            setSearchingUnis(true);
            const { data } = await supabase
                .from('universities')
                .select('id, name')
                .ilike('name', `%${uniSearch}%`)
                .limit(15);
            setUniResults(data || []);
            setSearchingUnis(false);
        };
        const timeout = setTimeout(searchUnis, 300);
        return () => clearTimeout(timeout);
    }, [uniSearch]);

    // Search degrees (courses)
    useEffect(() => {
        if (!degreeSearch.trim() || degreeSearch.length < 2) {
            setDegreeResults([]);
            return;
        }
        const searchDegrees = async () => {
            setSearchingDegrees(true);
            let queryBuilder = supabase
                .from('degrees')
                .select('id, name')
                .ilike('name', `%${degreeSearch}%`)
                .limit(15);

            // Filter by university if selected
            if (selectedUniversity) {
                queryBuilder = queryBuilder.eq('university_id', selectedUniversity.id);
            }

            const { data } = await queryBuilder;
            setDegreeResults(data || []);
            setSearchingDegrees(false);
        };
        const timeout = setTimeout(searchDegrees, 300);
        return () => clearTimeout(timeout);
    }, [degreeSearch, selectedUniversity]);

    useEffect(() => {
        Animated.stagger(100, [
            Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(searchAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSearch = (text: string) => {
        setQuery(text);
        const activeFilters = {
            schoolId: selectedSchool?.id,
            universityId: selectedUniversity?.id,
            level: selectedLevel || undefined,
        };
        search(text, activeFilters);
    };

    const handleApplyFilters = () => {
        setShowFilterModal(false);
        const activeFilters = {
            schoolId: selectedSchool?.id,
            universityId: selectedUniversity?.id,
            level: selectedLevel || undefined,
        };
        updateFilters(activeFilters);
        search(query, activeFilters);
    };

    const handleClearFilters = () => {
        setSelectedLevel(null);
        setSelectedSchool(null);
        setSelectedUniversity(null);
        setSelectedDegree(null);
        setSchoolSearch('');
        setUniSearch('');
        setDegreeSearch('');
        updateFilters({});
        if (query) search(query, {});
    };

    const handleLevelSelect = (levelId: string) => {
        if (selectedLevel === levelId) {
            setSelectedLevel(null);
        } else {
            setSelectedLevel(levelId);
            // Reset institution selections when changing level
            setSelectedSchool(null);
            setSelectedUniversity(null);
            setSelectedDegree(null);
        }
    };

    const hasActiveFilters = selectedLevel || selectedSchool || selectedUniversity || selectedDegree;

    const handleAddFriend = async (userId: string) => {
        setSending(userId);
        const success = await sendFriendRequest(userId);
        setSending(null);
        if (success) {
            showAlert({ title: '✅ Pedido Enviado!', message: 'O teu pedido de amizade foi enviado.' });
        } else {
            showAlert({ title: 'Aviso', message: 'Já existe um pedido ou amizade com este utilizador.' });
        }
    };

    const handleMessage = async (userId: string) => {
        const convId = await startOrGetConversation(userId);
        if (convId) router.push(`/dm/${convId}` as any);
    };

    const isFriend = (userId: string) => friends.some(f => f.friend_id === userId);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <Animated.View style={[styles.header, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
                }]}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerEmoji}>🔍</Text>
                        <Text style={styles.headerTitle}>Procurar</Text>
                    </View>
                    <Pressable style={styles.qrBtn} onPress={() => router.push('/qr-scanner' as any)}>
                        <Ionicons name="qr-code" size={20} color="#6366F1" />
                    </Pressable>
                </Animated.View>

                {/* Search */}
                <Animated.View style={[styles.searchSection, {
                    opacity: searchAnim,
                    transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                }]}>
                    <View style={styles.searchInputWrap}>
                        <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Nome ou @username..."
                            placeholderTextColor={COLORS.text.tertiary}
                            value={query}
                            onChangeText={handleSearch}
                            autoFocus
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <Pressable style={styles.clearBtn} onPress={() => { setQuery(''); clear(); }}>
                                <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Ionicons name="options" size={20} color={hasActiveFilters ? '#FFF' : COLORS.text.secondary} />
                    </Pressable>
                </Animated.View>

                {/* Active Filters */}
                {hasActiveFilters && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersContainer} contentContainerStyle={styles.activeFiltersContent}>
                        {selectedLevel && (
                            <FilterChip
                                label={EDUCATION_LEVELS.find(l => l.id === selectedLevel)?.label || ''}
                                active
                                icon="ribbon"
                                onPress={() => { setSelectedLevel(null); handleApplyFilters(); }}
                            />
                        )}
                        {selectedSchool && (
                            <FilterChip label={selectedSchool.name} active icon="business" onPress={() => { setSelectedSchool(null); handleApplyFilters(); }} />
                        )}
                        {selectedUniversity && (
                            <FilterChip label={selectedUniversity.name} active icon="school" onPress={() => { setSelectedUniversity(null); handleApplyFilters(); }} />
                        )}
                        {selectedDegree && (
                            <FilterChip label={selectedDegree.name} active icon="book" onPress={() => { setSelectedDegree(null); handleApplyFilters(); }} />
                        )}
                        <Pressable style={styles.clearAllBtn} onPress={handleClearFilters}>
                            <Text style={styles.clearAllText}>Limpar</Text>
                        </Pressable>
                    </ScrollView>
                )}

                {/* Results */}
                {searching ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.loadingText}>A procurar...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <UserCard
                                user={item}
                                index={index}
                                isFriend={isFriend(item.id)}
                                sending={sending === item.id}
                                onAdd={() => handleAddFriend(item.id)}
                                onMessage={() => handleMessage(item.id)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            query.length > 0 || hasActiveFilters ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="search" size={48} color={COLORS.text.tertiary} />
                                    <Text style={styles.emptyTitle}>Sem resultados</Text>
                                    <Text style={styles.emptySubtitle}>Tenta outro nome ou ajusta os filtros</Text>
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <LinearGradient colors={['#6366F120', '#8B5CF620']} style={styles.emptyIconBg}>
                                        <Ionicons name="person-add" size={48} color="#6366F1" />
                                    </LinearGradient>
                                    <Text style={styles.emptyTitle}>Encontra amigos</Text>
                                    <Text style={styles.emptySubtitle}>Escreve o nome ou usa os filtros</Text>
                                    <Pressable style={styles.filterPromptBtn} onPress={() => setShowFilterModal(true)}>
                                        <Ionicons name="options" size={18} color="#6366F1" />
                                        <Text style={styles.filterPromptText}>Filtrar por escola/universidade</Text>
                                    </Pressable>
                                </View>
                            )
                        }
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
                    <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={[styles.modalContainer, { paddingBottom: insets.bottom }]}
                        >
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filtros</Text>
                                <Pressable onPress={() => setShowFilterModal(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {/* Step 1: Education Level */}
                                <View style={styles.filterSection}>
                                    <View style={styles.filterSectionHeader}>
                                        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
                                        <Text style={styles.filterSectionTitle}>Nível de Ensino</Text>
                                    </View>
                                    <View style={styles.levelGrid}>
                                        {EDUCATION_LEVELS.map(level => (
                                            <Pressable
                                                key={level.id}
                                                style={[styles.levelCard, selectedLevel === level.id && styles.levelCardActive]}
                                                onPress={() => handleLevelSelect(level.id)}
                                            >
                                                <Text style={styles.levelEmoji}>{level.icon}</Text>
                                                <Text style={[styles.levelLabel, selectedLevel === level.id && styles.levelLabelActive]}>
                                                    {level.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Step 2: School or University based on level */}
                                {selectedLevel && (
                                    <View style={styles.filterSection}>
                                        <View style={styles.filterSectionHeader}>
                                            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                                            <Text style={styles.filterSectionTitle}>
                                                {isUniversityLevel ? 'Universidade' : 'Escola'}
                                            </Text>
                                        </View>

                                        {isUniversityLevel ? (
                                            <>
                                                {/* University Search */}
                                                <View style={styles.filterSearchWrap}>
                                                    <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                                                    <TextInput
                                                        style={styles.filterSearchInput}
                                                        placeholder="Procurar universidade..."
                                                        placeholderTextColor={COLORS.text.tertiary}
                                                        value={uniSearch}
                                                        onChangeText={setUniSearch}
                                                    />
                                                    {searchingUnis && <ActivityIndicator size="small" color="#6366F1" />}
                                                </View>

                                                {selectedUniversity && (
                                                    <View style={styles.selectedInstitution}>
                                                        <Ionicons name="school" size={16} color="#6366F1" />
                                                        <Text style={styles.selectedInstitutionText}>{selectedUniversity.name}</Text>
                                                        <Pressable onPress={() => setSelectedUniversity(null)}>
                                                            <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                                                        </Pressable>
                                                    </View>
                                                )}

                                                {uniResults.length > 0 && !selectedUniversity && (
                                                    <View style={styles.searchResults}>
                                                        {uniResults.map(uni => (
                                                            <Pressable
                                                                key={uni.id}
                                                                style={styles.searchResultItem}
                                                                onPress={() => { setSelectedUniversity(uni); setUniSearch(''); }}
                                                            >
                                                                <Ionicons name="school-outline" size={18} color={COLORS.text.secondary} />
                                                                <Text style={styles.searchResultText} numberOfLines={1}>{uni.name}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {/* School Search */}
                                                <View style={styles.filterSearchWrap}>
                                                    <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                                                    <TextInput
                                                        style={styles.filterSearchInput}
                                                        placeholder="Procurar escola..."
                                                        placeholderTextColor={COLORS.text.tertiary}
                                                        value={schoolSearch}
                                                        onChangeText={setSchoolSearch}
                                                    />
                                                    {searchingSchools && <ActivityIndicator size="small" color="#6366F1" />}
                                                </View>

                                                {selectedSchool && (
                                                    <View style={styles.selectedInstitution}>
                                                        <Ionicons name="business" size={16} color="#6366F1" />
                                                        <Text style={styles.selectedInstitutionText}>{selectedSchool.name}</Text>
                                                        <Pressable onPress={() => setSelectedSchool(null)}>
                                                            <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                                                        </Pressable>
                                                    </View>
                                                )}

                                                {schoolResults.length > 0 && !selectedSchool && (
                                                    <View style={styles.searchResults}>
                                                        {schoolResults.map(school => (
                                                            <Pressable
                                                                key={school.id}
                                                                style={styles.searchResultItem}
                                                                onPress={() => { setSelectedSchool(school); setSchoolSearch(''); }}
                                                            >
                                                                <Ionicons name="business-outline" size={18} color={COLORS.text.secondary} />
                                                                <Text style={styles.searchResultText} numberOfLines={1}>{school.name}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                )}

                                {/* Step 3: Course/Degree (only for university) */}
                                {isUniversityLevel && selectedUniversity && (
                                    <View style={styles.filterSection}>
                                        <View style={styles.filterSectionHeader}>
                                            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
                                            <Text style={styles.filterSectionTitle}>Curso</Text>
                                            <Text style={styles.optionalBadge}>Opcional</Text>
                                        </View>

                                        <View style={styles.filterSearchWrap}>
                                            <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                                            <TextInput
                                                style={styles.filterSearchInput}
                                                placeholder="Procurar curso..."
                                                placeholderTextColor={COLORS.text.tertiary}
                                                value={degreeSearch}
                                                onChangeText={setDegreeSearch}
                                            />
                                            {searchingDegrees && <ActivityIndicator size="small" color="#6366F1" />}
                                        </View>

                                        {selectedDegree && (
                                            <View style={styles.selectedInstitution}>
                                                <Ionicons name="book" size={16} color="#6366F1" />
                                                <Text style={styles.selectedInstitutionText}>{selectedDegree.name}</Text>
                                                <Pressable onPress={() => setSelectedDegree(null)}>
                                                    <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                                                </Pressable>
                                            </View>
                                        )}

                                        {degreeResults.length > 0 && !selectedDegree && (
                                            <View style={styles.searchResults}>
                                                {degreeResults.map(degree => (
                                                    <Pressable
                                                        key={degree.id}
                                                        style={styles.searchResultItem}
                                                        onPress={() => { setSelectedDegree(degree); setDegreeSearch(''); }}
                                                    >
                                                        <Ionicons name="book-outline" size={18} color={COLORS.text.secondary} />
                                                        <Text style={styles.searchResultText} numberOfLines={1}>{degree.name}</Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </ScrollView>

                            {/* Footer */}
                            <View style={styles.modalFooter}>
                                <Pressable style={styles.clearFiltersBtn} onPress={handleClearFilters}>
                                    <Text style={styles.clearFiltersText}>Limpar</Text>
                                </Pressable>
                                <Pressable style={styles.applyFiltersBtn} onPress={handleApplyFilters}>
                                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.applyFiltersGradient}>
                                        <Text style={styles.applyFiltersText}>Aplicar</Text>
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </BlurView>
                </Modal>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginLeft: SPACING.md },
    headerEmoji: { fontSize: 24 },
    headerTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    qrBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

    // Search
    searchSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
    searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm, ...SHADOWS.sm },
    searchInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, paddingVertical: SPACING.xs },
    clearBtn: { padding: 4 },
    filterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    filterBtnActive: { backgroundColor: '#6366F1' },

    // Active Filters
    activeFiltersContainer: { maxHeight: 50 },
    activeFiltersContent: { paddingHorizontal: SPACING.md, gap: SPACING.sm, flexDirection: 'row', alignItems: 'center' },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
    filterChipActive: { backgroundColor: '#6366F1' },
    filterChipText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    filterChipTextActive: { color: '#FFF' },
    clearAllBtn: { paddingHorizontal: SPACING.md },
    clearAllText: { fontSize: TYPOGRAPHY.size.sm, color: '#EF4444', fontWeight: TYPOGRAPHY.weight.medium },

    // List
    listContent: { paddingHorizontal: SPACING.md, paddingBottom: 120, flexGrow: 1 },

    // User Card
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    userContent: { flex: 1, marginLeft: SPACING.md },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    userName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, flex: 1 },
    userUsername: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    educationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    educationText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, flex: 1 },
    friendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
    friendBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#10B981' },

    // Action Buttons
    messageBtn: { borderRadius: 20, overflow: 'hidden' },
    addBtn: { borderRadius: 20, overflow: 'hidden' },
    addBtnDisabled: { opacity: 0.7 },
    actionBtnGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    actionBtnLoading: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: 20 },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: SPACING['4xl'], gap: SPACING.md },
    emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center' },
    filterPromptBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, marginTop: SPACING.md },
    filterPromptText: { fontSize: TYPOGRAPHY.size.sm, color: '#6366F1', fontWeight: TYPOGRAPHY.weight.medium },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceMuted },
    modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    modalContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    modalFooter: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.surfaceMuted },

    // Filter Section
    filterSection: { marginBottom: SPACING.xl },
    filterSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    filterSectionTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
    stepBadgeText: { fontSize: 12, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    optionalBadge: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, backgroundColor: COLORS.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, marginLeft: 'auto' },

    // Level Grid
    levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    levelCard: { width: '31%', paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: 'transparent' },
    levelCardActive: { borderColor: '#6366F1', backgroundColor: '#6366F110' },
    levelEmoji: { fontSize: 24, marginBottom: 4 },
    levelLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.secondary, textAlign: 'center' },
    levelLabelActive: { color: '#6366F1', fontWeight: TYPOGRAPHY.weight.semibold },

    // Institution Search
    filterSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
    filterSearchInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
    selectedInstitution: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#6366F115', padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
    selectedInstitutionText: { flex: 1, fontSize: TYPOGRAPHY.size.sm, color: '#6366F1', fontWeight: TYPOGRAPHY.weight.medium },
    searchResults: { marginTop: SPACING.sm, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, overflow: 'hidden' },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceMuted },
    searchResultText: { flex: 1, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.primary },

    // Modal Buttons
    clearFiltersBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceElevated },
    clearFiltersText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.secondary },
    applyFiltersBtn: { flex: 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
    applyFiltersGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
    applyFiltersText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
});

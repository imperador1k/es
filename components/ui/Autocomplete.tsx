import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AutocompleteItem {
    id: string;
    label: string;
    sublabel?: string;
}

interface AutocompleteProps {
    label: string;
    placeholder?: string;
    value: AutocompleteItem | null;
    onSelect: (item: AutocompleteItem | null) => void;
    onSearch: (query: string) => Promise<AutocompleteItem[]>;
    error?: string;
    disabled?: boolean;
}

/**
 * Componente Autocomplete para pesquisa em grandes listas
 * (Escolas, Universidades, Cursos)
 * AGORA: Carrega resultados iniciais ao abrir!
 * ATUALIZADO: Tema Premium
 */
export function Autocomplete({
    label,
    placeholder = 'Pesquisar...',
    value,
    onSelect,
    onSearch,
    error,
    disabled = false,
}: AutocompleteProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AutocompleteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<number | null>(null);
    const [initialLoaded, setInitialLoaded] = useState(false);

    // Carregar resultados iniciais quando abre o modal
    const loadInitialResults = useCallback(async () => {
        if (initialLoaded) return;

        setLoading(true);
        try {
            // Pesquisa vazia para obter lista inicial
            const items = await onSearch('');
            setResults(items);
            setInitialLoaded(true);
        } catch (err) {
            console.error('Erro ao carregar lista inicial:', err);
        } finally {
            setLoading(false);
        }
    }, [onSearch, initialLoaded]);

    // Quando o modal abre, carrega resultados iniciais
    const handleOpenModal = useCallback(() => {
        setModalVisible(true);
        loadInitialResults();
    }, [loadInitialResults]);

    // Pesquisar com debounce
    const handleSearch = useCallback((text: string) => {
        setQuery(text);

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const items = await onSearch(text);
                setResults(items);
            } catch (err) {
                console.error('Erro na pesquisa:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300) as unknown as number;

        setDebounceTimer(timer);
    }, [onSearch, debounceTimer]);

    const handleSelect = (item: AutocompleteItem) => {
        onSelect(item);
        setModalVisible(false);
        setQuery('');
        setResults([]);
    };

    const handleClear = () => {
        onSelect(null);
    };

    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <Pressable
                style={[
                    styles.selector,
                    error && styles.selectorError,
                    disabled && styles.selectorDisabled,
                ]}
                onPress={() => !disabled && handleOpenModal()}
            >
                {value ? (
                    <View style={styles.selectedValue}>
                        <View style={styles.selectedTextContainer}>
                            <Text style={styles.selectedLabel} numberOfLines={1}>
                                {value.label}
                            </Text>
                            {value.sublabel && (
                                <Text style={styles.selectedSublabel} numberOfLines={1}>
                                    {value.sublabel}
                                </Text>
                            )}
                        </View>
                        <Pressable onPress={(e) => { e.stopPropagation(); handleClear(); }} hitSlop={10}>
                            <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                        <Text style={styles.placeholder}>{placeholder}</Text>
                    </View>
                )}
            </Pressable>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Modal de Pesquisa */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#0F1115', '#161922', '#0A0B0E']}
                        style={StyleSheet.absoluteFill}
                    />

                    <SafeAreaView style={{ flex: 1 }}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ flex: 1 }}
                        >
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{label || 'Pesquisar'}</Text>
                                <Pressable
                                    onPress={() => setModalVisible(false)}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={20} color={COLORS.text.primary} />
                                </Pressable>
                            </View>

                            {/* Search Input */}
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Escreve para pesquisar..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={query}
                                    onChangeText={handleSearch}
                                    autoFocus
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {loading && <ActivityIndicator size="small" color={COLORS.accent.primary} />}
                            </View>

                            {/* Results */}
                            <FlatList
                                data={results}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.resultItem,
                                            pressed && styles.resultItemPressed
                                        ]}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text style={styles.resultLabel}>{item.label}</Text>
                                        {item.sublabel && (
                                            <Text style={styles.resultSublabel}>{item.sublabel}</Text>
                                        )}
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    loading ? null : (
                                        <View style={styles.emptyContainer}>
                                            <Ionicons name="search-outline" size={48} color={COLORS.text.tertiary} />
                                            <Text style={styles.emptyText}>
                                                {query.length > 0
                                                    ? 'Nenhum resultado encontrado'
                                                    : 'Nenhum item disponível'}
                                            </Text>
                                        </View>
                                    )
                                }
                                contentContainerStyle={styles.resultsList}
                                keyboardShouldPersistTaps="handled"
                                ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
                            />
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: TYPOGRAPHY.size.sm,
        fontFamily: TYPOGRAPHY.family.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    selector: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceElevated,
        minHeight: 56,
        justifyContent: 'center',
    },
    selectorError: {
        borderColor: COLORS.error,
        borderWidth: 1,
    },
    selectorDisabled: {
        opacity: 0.5,
    },
    selectedValue: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedTextContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    selectedLabel: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    selectedSublabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    placeholderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    placeholder: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginLeft: SPACING.sm,
        fontFamily: TYPOGRAPHY.family.regular,
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceMuted,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        marginHorizontal: SPACING.lg,
        marginVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceMuted,
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        paddingVertical: SPACING.md,
        marginLeft: SPACING.sm,
        height: 50,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    resultsList: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    resultItem: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceMuted,
    },
    resultItemPressed: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.accent.primary,
    },
    resultLabel: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    resultSublabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING['3xl'],
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginTop: SPACING.md,
        textAlign: 'center',
        fontFamily: TYPOGRAPHY.family.regular,
    },
});

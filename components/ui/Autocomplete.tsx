import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
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
            <Text style={styles.label}>{label}</Text>

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
                        <Pressable onPress={handleClear} hitSlop={10}>
                            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Ionicons name="search" size={18} color={colors.text.tertiary} />
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
                <SafeAreaView style={styles.modalContainer}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.primary} />
                            </Pressable>
                        </View>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.text.tertiary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Escreve para pesquisar..."
                                placeholderTextColor={colors.text.tertiary}
                                value={query}
                                onChangeText={handleSearch}
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {loading && <ActivityIndicator size="small" color={colors.accent.primary} />}
                        </View>

                        {/* Results */}
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.resultItem}
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
                                        <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
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
                        />
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    selector: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.divider,
        minHeight: 56,
        justifyContent: 'center',
    },
    selectorError: {
        borderColor: colors.danger.primary,
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
        marginRight: spacing.sm,
    },
    selectedLabel: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
    selectedSublabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    placeholderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    placeholder: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
        marginLeft: spacing.sm,
    },
    errorText: {
        fontSize: typography.size.xs,
        color: colors.danger.primary,
        marginTop: spacing.xs,
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
        paddingVertical: spacing.md,
        marginLeft: spacing.sm,
    },
    resultsList: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    resultItem: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    resultLabel: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
    resultSublabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['3xl'],
    },
    emptyText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});

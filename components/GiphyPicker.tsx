/**
 * GiphyPicker Component
 * Modal for searching and selecting GIFs from Giphy API
 */

import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// Giphy API Key
const GIPHY_API_KEY = '74c6iCSODciLIqRR3Gv4E1F2Q11xeMYt';

interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_height: {
            url: string;
            width: string;
            height: string;
        };
        original: {
            url: string;
        };
    };
}

interface GiphyPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (gifUrl: string) => void;
}

export function GiphyPicker({ visible, onClose, onSelect }: GiphyPickerProps) {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Search GIFs
    const searchGifs = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            // Load trending if no query
            setLoading(true);
            try {
                const response = await fetch(
                    `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
                );
                const data = await response.json();
                setGifs(data.data || []);
                setSearched(true);
            } catch (err) {
                console.error('Error fetching trending:', err);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
            );
            const data = await response.json();
            setGifs(data.data || []);
            setSearched(true);
        } catch (err) {
            console.error('Error searching GIFs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle select GIF
    const handleSelect = (gif: GiphyGif) => {
        onSelect(gif.images.fixed_height.url);
        onClose();
        setQuery('');
        setGifs([]);
        setSearched(false);
    };

    // Load trending on open
    const handleOpen = () => {
        if (!searched) {
            searchGifs('');
        }
    };

    // Render GIF item
    const renderItem = ({ item }: { item: GiphyGif }) => (
        <Pressable style={styles.gifItem} onPress={() => handleSelect(item)}>
            <Image
                source={{ uri: item.images.fixed_height.url }}
                style={styles.gifImage}
                resizeMode="cover"
            />
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
            onShow={handleOpen}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>🎬 GIFs</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text.primary} />
                        </Pressable>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar GIFs..."
                            placeholderTextColor={colors.text.tertiary}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={() => searchGifs(query)}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => { setQuery(''); searchGifs(''); }}>
                                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                            </Pressable>
                        )}
                    </View>

                    {/* GIFs Grid */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.accent.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={gifs}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            numColumns={2}
                            contentContainerStyle={styles.gridContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                searched ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Nenhum GIF encontrado</Text>
                                    </View>
                                ) : null
                            }
                        />
                    )}

                    {/* Powered by Giphy */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Powered by GIPHY</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        maxHeight: '80%',
        minHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        margin: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    gridContent: {
        padding: spacing.sm,
    },
    gifItem: {
        flex: 1,
        aspectRatio: 1,
        margin: spacing.xs,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    gifImage: {
        width: '100%',
        height: '100%',
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },
    footer: {
        padding: spacing.sm,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
});

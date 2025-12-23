/**
 * Ecrã de Ficheiros de Equipa
 * Estilo Google Drive / Microsoft Teams
 * Com suporte a Pastas, Navegação e Breadcrumbs
 * Escola+ App
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamRole } from '@/types/database.types';
import { canUser } from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface TeamFile {
    id: string;
    team_id: string;
    uploader_id: string;
    name: string;
    file_path: string;
    file_type: string;
    size_bytes: number;
    created_at: string;
    is_folder: boolean;
    parent_id: string | null;
}

interface Breadcrumb {
    id: string | null;
    name: string;
}

// ============================================
// FILE TYPE HELPERS
// ============================================

const FILE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    folder: { icon: 'folder', color: '#F59E0B' },
    pdf: { icon: 'document-text', color: '#EF4444' },
    doc: { icon: 'document', color: '#3B82F6' },
    docx: { icon: 'document', color: '#3B82F6' },
    xls: { icon: 'grid', color: '#22C55E' },
    xlsx: { icon: 'grid', color: '#22C55E' },
    ppt: { icon: 'easel', color: '#F97316' },
    pptx: { icon: 'easel', color: '#F97316' },
    jpg: { icon: 'image', color: '#8B5CF6' },
    jpeg: { icon: 'image', color: '#8B5CF6' },
    png: { icon: 'image', color: '#8B5CF6' },
    gif: { icon: 'image', color: '#8B5CF6' },
    mp4: { icon: 'videocam', color: '#EC4899' },
    mp3: { icon: 'musical-notes', color: '#14B8A6' },
    zip: { icon: 'archive', color: '#6B7280' },
    rar: { icon: 'archive', color: '#6B7280' },
    txt: { icon: 'document-text', color: '#6B7280' },
    default: { icon: 'document-outline', color: '#6B7280' },
};

function getFileIcon(item: TeamFile): { icon: keyof typeof Ionicons.glyphMap; color: string } {
    if (item.is_folder) return FILE_ICONS.folder;
    return FILE_ICONS[item.file_type?.toLowerCase()] || FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const fileDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Hoje: mostrar hora
    if (fileDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    // Ontem
    if (fileDate.getTime() === yesterday.getTime()) {
        return 'Ontem';
    }

    // Este ano: dia e mês
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    }

    // Ano diferente: data completa
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isImageFile(fileType: string): boolean {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    return imageTypes.includes(fileType?.toLowerCase());
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamFilesScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    // Lista e estados base
    const [files, setFiles] = useState<TeamFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');

    // Estados de Navegação por Pastas
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
        { id: null, name: 'Ficheiros' }
    ]);

    // Modal de Nova Pasta
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Pesquisa
    const [searchQuery, setSearchQuery] = useState('');

    // Modal de Renomear
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameTarget, setRenameTarget] = useState<TeamFile | null>(null);
    const [newName, setNewName] = useState('');
    const [renaming, setRenaming] = useState(false);

    // Cache de URLs de imagens
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

    // Vista e Ordenação
    type ViewMode = 'list' | 'grid';
    type SortOption = 'recent' | 'oldest' | 'name' | 'size';
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortBy, setSortBy] = useState<SortOption>('recent');

    // ============================================
    // LOAD DATA
    // ============================================

    const loadFiles = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Buscar ficheiros
            let query = supabase
                .from('team_files')
                .select('*')
                .eq('team_id', teamId);

            // Se estamos na raiz E há pesquisa, buscar TODOS os ficheiros (recursivo)
            // Se estamos na raiz SEM pesquisa, buscar só nível raiz
            // Se estamos dentro de pasta, buscar só essa pasta
            if (searchQuery.trim()) {
                // Com pesquisa: buscar tudo e filtrar pelo nome
                // Na raiz: buscar todos
                // Dentro de pasta: buscar só essa pasta
                if (currentFolderId) {
                    query = query.eq('parent_id', currentFolderId);
                }
                // Se na raiz, não filtra por parent_id - busca tudo
            } else {
                // Sem pesquisa: comportamento normal por pasta
                if (currentFolderId) {
                    query = query.eq('parent_id', currentFolderId);
                } else {
                    query = query.is('parent_id', null);
                }
            }

            const { data: filesData, error } = await query;

            if (error) throw error;

            // Ordenar: pastas primeiro, depois por data
            const sorted = (filesData || []).sort((a, b) => {
                if (a.is_folder && !b.is_folder) return -1;
                if (!a.is_folder && b.is_folder) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setFiles(sorted);

            // Buscar role do utilizador (só uma vez)
            if (!userRole) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('team_id', teamId)
                    .eq('user_id', user.id)
                    .single();

                if (memberData) {
                    setUserRole(memberData.role as TeamRole);
                }
            }

            // Buscar nome da equipa (só uma vez)
            if (!teamName) {
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('name')
                    .eq('id', teamId)
                    .single();
                if (teamData) setTeamName(teamData.name);
            }

        } catch (err) {
            console.error('Erro ao carregar ficheiros:', err);
            Alert.alert('Erro', 'Não foi possível carregar os ficheiros.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id, currentFolderId, userRole, teamName, searchQuery]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Debounce da pesquisa (recarregar quando para de digitar)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                loadFiles();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadFiles();
    };

    // ============================================
    // NAVEGAÇÃO POR PASTAS
    // ============================================

    const openFolder = (folder: TeamFile) => {
        setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
        setCurrentFolderId(folder.id);
    };

    const navigateToBreadcrumb = (index: number) => {
        const crumb = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        setCurrentFolderId(crumb.id);
    };

    // ============================================
    // ORDENAÇÃO
    // ============================================

    const SORT_OPTIONS: { key: SortOption; label: string }[] = [
        { key: 'recent', label: 'Mais Recentes' },
        { key: 'oldest', label: 'Mais Antigos' },
        { key: 'name', label: 'Nome (A-Z)' },
        { key: 'size', label: 'Tamanho (Maior)' },
    ];

    const showSortOptions = () => {
        Alert.alert(
            'Ordenar por',
            undefined,
            [
                ...SORT_OPTIONS.map(option => ({
                    text: option.key === sortBy ? `✓ ${option.label}` : option.label,
                    onPress: () => setSortBy(option.key),
                })),
                { text: 'Cancelar', style: 'cancel' as const },
            ]
        );
    };

    // Função para ordenar ficheiros (pastas sempre primeiro)
    const getSortedFiles = (fileList: TeamFile[]): TeamFile[] => {
        const folders = fileList.filter(f => f.is_folder);
        const nonFolders = fileList.filter(f => !f.is_folder);

        const sortFn = (a: TeamFile, b: TeamFile) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return (b.size_bytes || 0) - (a.size_bytes || 0);
                case 'recent':
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        };

        return [...folders.sort(sortFn), ...nonFolders.sort(sortFn)];
    };

    // ============================================
    // CRIAR PASTA
    // ============================================

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            Alert.alert('Erro', 'Introduz um nome para a pasta.');
            return;
        }

        setCreatingFolder(true);

        try {
            const { error } = await supabase.from('team_files').insert({
                team_id: teamId,
                uploader_id: user!.id,
                name: newFolderName.trim(),
                file_path: '',
                file_type: 'folder',
                size_bytes: 0,
                is_folder: true,
                parent_id: currentFolderId,
            });

            if (error) throw error;

            setFolderModalVisible(false);
            setNewFolderName('');
            loadFiles();
        } catch (err) {
            console.error('Erro ao criar pasta:', err);
            Alert.alert('Erro', 'Não foi possível criar a pasta.');
        } finally {
            setCreatingFolder(false);
        }
    };

    const openFolderModal = () => {
        if (!canUser(userRole, 'UPLOAD_FILES')) {
            Alert.alert('Sem Permissão', 'Não tens permissão para criar pastas.');
            return;
        }
        setNewFolderName('');
        setFolderModalVisible(true);
    };

    // ============================================
    // RENOMEAR
    // ============================================

    // Extrai nome base (sem extensão) e extensão separadamente
    const getBaseName = (filename: string) => {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1 || lastDot === 0) return filename;
        return filename.substring(0, lastDot);
    };

    const getExtension = (filename: string) => {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1 || lastDot === 0) return '';
        return filename.substring(lastDot); // inclui o ponto
    };

    const openRenameModal = (file: TeamFile) => {
        setRenameTarget(file);
        // Só mostra o nome base (sem extensão) para edição
        if (file.is_folder) {
            setNewName(file.name);
        } else {
            setNewName(getBaseName(file.name));
        }
        setRenameModalVisible(true);
    };

    const handleRename = async () => {
        if (!renameTarget || !newName.trim()) {
            Alert.alert('Erro', 'Introduz um nome válido.');
            return;
        }

        setRenaming(true);

        try {
            // Para ficheiros, adiciona a extensão de volta; para pastas, usa o nome tal como está
            const finalName = renameTarget.is_folder
                ? newName.trim()
                : newName.trim() + getExtension(renameTarget.name);

            console.log('🔄 Renomeando:', renameTarget.id, 'para:', finalName);
            console.log('📋 renameTarget:', JSON.stringify(renameTarget, null, 2));

            const { data, error, count } = await supabase
                .from('team_files')
                .update({ name: finalName })
                .eq('id', renameTarget.id)
                .select();

            console.log('📦 Resposta Supabase - data:', data, 'error:', error, 'count:', count);

            if (error) {
                console.error('❌ Erro Supabase:', error);
                throw error;
            }

            // Verificar se realmente atualizou
            if (!data || data.length === 0) {
                console.error('⚠️ UPDATE não afetou nenhuma linha! Possível problema de RLS.');
                Alert.alert(
                    'Erro',
                    'Não tens permissão para renomear este item. Só o uploader ou admins podem renomear.'
                );
                return;
            }

            console.log('✅ Renomeado com sucesso:', data[0]);
            Alert.alert('✅ Sucesso', 'Nome atualizado!');
            setRenameModalVisible(false);
            setRenameTarget(null);
            setNewName('');
            loadFiles();
        } catch (err) {
            console.error('💥 Erro ao renomear:', err);
            Alert.alert('Erro', 'Não foi possível renomear. Verifica a ligação.');
        } finally {
            setRenaming(false);
        }
    };

    // ============================================
    // THUMBNAIL URL
    // ============================================

    const getImageUrl = useCallback(async (file: TeamFile) => {
        if (imageUrls[file.id]) return imageUrls[file.id];

        try {
            const { data } = await supabase.storage
                .from('team-files')
                .createSignedUrl(file.file_path, 3600);

            if (data?.signedUrl) {
                setImageUrls(prev => ({ ...prev, [file.id]: data.signedUrl }));
                return data.signedUrl;
            }
        } catch (err) {
            console.warn('Erro ao obter URL da imagem:', err);
        }
        return null;
    }, [imageUrls]);

    // Carregar URLs de imagem ao carregar ficheiros
    useEffect(() => {
        files.filter(f => isImageFile(f.file_type) && !f.is_folder).forEach(file => {
            if (!imageUrls[file.id]) {
                getImageUrl(file);
            }
        });
    }, [files, getImageUrl, imageUrls]);

    // ============================================
    // UPLOAD
    // ============================================

    const handleUpload = async () => {
        if (!canUser(userRole, 'UPLOAD_FILES')) {
            Alert.alert('Sem Permissão', 'Não tens permissão para fazer upload de ficheiros.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setUploading(true);

            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'file';
            const uniqueName = `${teamId}/${Date.now()}_${file.name}`;

            // Ler ficheiro como Base64
            const base64Data = await FileSystem.readAsStringAsync(file.uri, {
                encoding: 'base64',
            });

            const arrayBuffer = decode(base64Data);

            // Upload para Storage
            const { error: uploadError } = await supabase.storage
                .from('team-files')
                .upload(uniqueName, arrayBuffer, {
                    contentType: file.mimeType || 'application/octet-stream',
                });

            if (uploadError) throw uploadError;

            // Inserir na tabela COM parent_id
            const { error: dbError } = await supabase.from('team_files').insert({
                team_id: teamId,
                uploader_id: user!.id,
                name: file.name,
                file_path: uniqueName,
                file_type: fileExtension,
                size_bytes: file.size || 0,
                is_folder: false,
                parent_id: currentFolderId, // Ficheiro vai para a pasta atual
            });

            if (dbError) throw dbError;

            Alert.alert('✅ Sucesso', 'Ficheiro carregado com sucesso!');
            loadFiles();

        } catch (err) {
            console.error('Erro no upload:', err);
            Alert.alert('Erro', 'Não foi possível carregar o ficheiro.');
        } finally {
            setUploading(false);
        }
    };

    // ============================================
    // DOWNLOAD & OPEN
    // ============================================

    const handleOpenFile = async (file: TeamFile) => {
        // Se for pasta, entrar nela
        if (file.is_folder) {
            openFolder(file);
            return;
        }

        try {
            setDownloadingId(file.id);

            const localUri = `${(FileSystem as any).cacheDirectory}${file.name}`;
            const fileInfo = await FileSystem.getInfoAsync(localUri);

            if (!fileInfo.exists) {
                const { data: urlData } = await supabase.storage
                    .from('team-files')
                    .createSignedUrl(file.file_path, 3600);

                if (!urlData?.signedUrl) {
                    throw new Error('Não foi possível obter o URL do ficheiro.');
                }

                const downloadResult = await FileSystem.downloadAsync(
                    urlData.signedUrl,
                    localUri
                );

                if (downloadResult.status !== 200) {
                    throw new Error('Falha no download do ficheiro.');
                }
            }

            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(localUri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1,
                });
            } else {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(localUri);
                } else {
                    Alert.alert('Erro', 'Não é possível abrir este ficheiro no iOS.');
                }
            }

        } catch (err) {
            console.error('Erro ao abrir ficheiro:', err);
            Alert.alert('Erro', 'Não foi possível abrir o ficheiro.');
        } finally {
            setDownloadingId(null);
        }
    };

    // ============================================
    // DELETE
    // ============================================

    const handleDelete = async (file: TeamFile) => {
        const canDeleteAny = canUser(userRole, 'DELETE_FILES');
        const isOwnFile = file.uploader_id === user?.id;

        if (!canDeleteAny && !isOwnFile) {
            Alert.alert('Sem Permissão', 'Não podes apagar este item.');
            return;
        }

        const itemType = file.is_folder ? 'pasta' : 'ficheiro';

        Alert.alert(
            `Apagar ${itemType}`,
            `Tens a certeza que queres apagar "${file.name}"?${file.is_folder ? '\n\nTodo o conteúdo dentro será apagado!' : ''}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Se não for pasta, apagar do storage
                            if (!file.is_folder && file.file_path) {
                                await supabase.storage
                                    .from('team-files')
                                    .remove([file.file_path]);
                            }

                            // Apagar da tabela (CASCADE apaga filhos)
                            const { error: dbError } = await supabase
                                .from('team_files')
                                .delete()
                                .eq('id', file.id);

                            if (dbError) throw dbError;

                            setFiles(prev => prev.filter(f => f.id !== file.id));
                            Alert.alert('✅ Apagado', `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} apagado com sucesso.`);

                        } catch (err) {
                            console.error('Erro ao apagar:', err);
                            Alert.alert('Erro', `Não foi possível apagar o ${itemType}.`);
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // RENDER FILE ITEM
    // ============================================

    const renderFileItem = ({ item }: { item: TeamFile }) => {
        const { icon, color } = getFileIcon(item);
        const isDownloading = downloadingId === item.id;
        const canModify = canUser(userRole, 'DELETE_FILES') || item.uploader_id === user?.id;
        const isImage = isImageFile(item.file_type) && !item.is_folder;
        const thumbnailUrl = imageUrls[item.id];

        // Menu de opções no longPress
        const showOptionsMenu = () => {
            const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
                { text: 'Cancelar', style: 'cancel' },
            ];

            if (canModify) {
                options.push({
                    text: 'Renomear',
                    onPress: () => openRenameModal(item),
                });
                options.push({
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: () => handleDelete(item),
                });
            }

            Alert.alert(
                item.name,
                item.is_folder ? 'Pasta' : formatFileSize(item.size_bytes),
                options
            );
        };

        // Metadados formatados: "Data • Tamanho"
        const getMetaText = () => {
            if (item.is_folder) return 'Pasta';
            const date = formatDate(item.created_at);
            const size = formatFileSize(item.size_bytes);
            return size ? `${date} • ${size}` : date;
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.fileCard,
                    pressed && styles.fileCardPressed,
                ]}
                onPress={() => handleOpenFile(item)}
                onLongPress={showOptionsMenu}
                android_ripple={{ color: colors.accent.subtle }}
            >
                {/* Thumbnail ou Icon */}
                {isImage && thumbnailUrl ? (
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                        {isDownloading ? (
                            <ActivityIndicator size="small" color={color} />
                        ) : (
                            <Ionicons name={icon} size={22} color={color} />
                        )}
                    </View>
                )}

                {/* Info - Coluna de Texto */}
                <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={styles.fileMeta} numberOfLines={1}>
                        {getMetaText()}
                    </Text>
                </View>

                {/* Ação à direita */}
                <Pressable
                    style={styles.moreButton}
                    onPress={showOptionsMenu}
                    hitSlop={8}
                >
                    {item.is_folder ? (
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    ) : (
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.tertiary} />
                    )}
                </Pressable>
            </Pressable>
        );
    };

    // ============================================
    // RENDER GRID ITEM
    // ============================================

    const renderGridItem = ({ item }: { item: TeamFile }) => {
        const { icon, color } = getFileIcon(item);
        const isImage = isImageFile(item.file_type) && !item.is_folder;
        const thumbnailUrl = imageUrls[item.id];
        const canModify = canUser(userRole, 'DELETE_FILES') || item.uploader_id === user?.id;

        const showOptionsMenu = () => {
            const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
                { text: 'Cancelar', style: 'cancel' },
            ];
            if (canModify) {
                options.push({ text: 'Renomear', onPress: () => openRenameModal(item) });
                options.push({ text: 'Apagar', style: 'destructive', onPress: () => handleDelete(item) });
            }
            Alert.alert(item.name, item.is_folder ? 'Pasta' : formatFileSize(item.size_bytes), options);
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.gridCard,
                    pressed && styles.gridCardPressed,
                ]}
                onPress={() => handleOpenFile(item)}
                onLongPress={showOptionsMenu}
                android_ripple={{ color: colors.accent.subtle }}
            >
                {/* Thumbnail ou Icon */}
                {isImage && thumbnailUrl ? (
                    <Image source={{ uri: thumbnailUrl }} style={styles.gridThumbnail} resizeMode="cover" />
                ) : (
                    <View style={[styles.gridIconContainer, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={icon} size={36} color={color} />
                    </View>
                )}

                {/* Nome */}
                <Text style={styles.gridFileName} numberOfLines={2}>
                    {item.name}
                </Text>
            </Pressable>
        );
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Contar ficheiros vs pastas
    const folderCount = files.filter(f => f.is_folder).length;
    const fileCount = files.filter(f => !f.is_folder).length;

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Ficheiros</Text>
                    <Text style={styles.headerSubtitle}>
                        {teamName} • {folderCount > 0 ? `${folderCount} pastas, ` : ''}{fileCount} ficheiros
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {/* Botão Ordenar */}
                    <Pressable style={styles.headerActionButton} onPress={showSortOptions}>
                        <Ionicons name="swap-vertical" size={20} color={colors.text.secondary} />
                    </Pressable>
                    {/* Botão Toggle View */}
                    <Pressable
                        style={styles.headerActionButton}
                        onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    >
                        <Ionicons
                            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                            size={20}
                            color={colors.text.secondary}
                        />
                    </Pressable>
                    {canUser(userRole, 'UPLOAD_FILES') && (
                        <>
                            <Pressable style={styles.headerActionButton} onPress={openFolderModal}>
                                <Ionicons name="folder-outline" size={20} color={colors.accent.primary} />
                            </Pressable>
                            <Pressable
                                style={styles.uploadButton}
                                onPress={handleUpload}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Ionicons name="cloud-upload" size={20} color={colors.text.inverse} />
                                )}
                            </Pressable>
                        </>
                    )}
                </View>
            </View>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
                <View style={styles.breadcrumbContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {breadcrumbs.map((crumb, index) => (
                            <View key={crumb.id || 'root'} style={styles.breadcrumbItem}>
                                <Pressable onPress={() => navigateToBreadcrumb(index)}>
                                    <Text
                                        style={[
                                            styles.breadcrumbText,
                                            index === breadcrumbs.length - 1 && styles.breadcrumbTextActive,
                                        ]}
                                    >
                                        {crumb.name}
                                    </Text>
                                </Pressable>
                                {index < breadcrumbs.length - 1 && (
                                    <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} style={{ marginHorizontal: 4 }} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={colors.text.tertiary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar ficheiros..."
                    placeholderTextColor={colors.text.tertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                    </Pressable>
                )}
            </View>

            {/* File List */}
            <FlatList
                key={viewMode} // Força re-render ao mudar de modo
                data={getSortedFiles(files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())))}
                keyExtractor={(item) => item.id}
                renderItem={viewMode === 'grid' ? renderGridItem : renderFileItem}
                numColumns={viewMode === 'grid' ? 2 : 1}
                columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
                contentContainerStyle={[
                    viewMode === 'grid' ? styles.gridContent : styles.listContent,
                    files.length === 0 && styles.listContentEmpty,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ItemSeparatorComponent={viewMode === 'list' ? () => <View style={styles.separator} /> : undefined}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {currentFolderId ? 'Pasta vazia' : 'Sem ficheiros'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {currentFolderId
                                ? 'Esta pasta ainda não tem conteúdo.'
                                : 'Esta equipa ainda não tem ficheiros.\n'}
                            {canUser(userRole, 'UPLOAD_FILES') ? 'Carrega o primeiro!' : ''}
                        </Text>
                        {canUser(userRole, 'UPLOAD_FILES') && (
                            <View style={styles.emptyActions}>
                                <Pressable style={styles.emptyButtonSecondary} onPress={openFolderModal}>
                                    <Ionicons name="folder-outline" size={20} color={colors.accent.primary} />
                                    <Text style={styles.emptyButtonSecondaryText}>Nova Pasta</Text>
                                </Pressable>
                                <Pressable style={styles.emptyButton} onPress={handleUpload}>
                                    <Ionicons name="cloud-upload-outline" size={20} color={colors.text.inverse} />
                                    <Text style={styles.emptyButtonText}>Carregar</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                }
            />

            {/* Modal Nova Pasta */}
            <Modal
                visible={folderModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nova Pasta</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Nome da pasta"
                            placeholderTextColor={colors.text.tertiary}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.modalButtonCancel}
                                onPress={() => setFolderModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={styles.modalButtonConfirm}
                                onPress={handleCreateFolder}
                                disabled={creatingFolder}
                            >
                                {creatingFolder ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>Criar</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Renomear */}
            <Modal
                visible={renameModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRenameModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Renomear</Text>
                        <View style={styles.renameInputRow}>
                            <TextInput
                                style={[styles.modalInput, styles.renameInput]}
                                placeholder="Novo nome"
                                placeholderTextColor={colors.text.tertiary}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                            />
                            {renameTarget && !renameTarget.is_folder && (
                                <Text style={styles.extensionLabel}>
                                    {getExtension(renameTarget.name)}
                                </Text>
                            )}
                        </View>
                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.modalButtonCancel}
                                onPress={() => setRenameModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={styles.modalButtonConfirm}
                                onPress={handleRename}
                                disabled={renaming}
                            >
                                {renaming ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>Guardar</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerActionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
        paddingVertical: 0,
    },

    // Breadcrumbs
    breadcrumbContainer: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },
    breadcrumbTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    listContentEmpty: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: 60, // Alinha com o texto (após thumbnail)
    },

    // File Card
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    fileCardPressed: {
        backgroundColor: colors.surfaceSubtle,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    fileInfo: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    fileName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginBottom: 2,
    },
    fileMeta: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    moreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    emptyActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    emptyButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
    emptyButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.subtle,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    emptyButtonSecondaryText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: spacing.lg,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
    modalButtonCancel: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    modalButtonCancelText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    modalButtonConfirm: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        minWidth: 80,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Rename Modal
    renameInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    renameInput: {
        flex: 1,
        marginBottom: 0,
    },
    extensionLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },

    // Grid View
    gridContent: {
        padding: spacing.md,
    },
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    gridCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    gridCardPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    gridThumbnail: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    gridIconContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    gridFileName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        textAlign: 'center',
    },
});

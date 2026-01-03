/**
 * Team Files Screen - Ultra Premium Design
 * Estilo Google Drive / Dropbox Premium
 * Com pastas, navegação, breadcrumbs, upload/download
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamRole } from '@/types/database.types';
import { canUser } from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
// FILE TYPE CONFIG
// ============================================

const FILE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; gradient: [string, string] }> = {
    folder: { icon: 'folder', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
    pdf: { icon: 'document-text', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
    doc: { icon: 'document', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    docx: { icon: 'document', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    xls: { icon: 'grid', color: '#22C55E', gradient: ['#22C55E', '#16A34A'] },
    xlsx: { icon: 'grid', color: '#22C55E', gradient: ['#22C55E', '#16A34A'] },
    ppt: { icon: 'easel', color: '#F97316', gradient: ['#F97316', '#EA580C'] },
    pptx: { icon: 'easel', color: '#F97316', gradient: ['#F97316', '#EA580C'] },
    jpg: { icon: 'image', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    jpeg: { icon: 'image', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    png: { icon: 'image', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    gif: { icon: 'image', color: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
    mp4: { icon: 'videocam', color: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
    mp3: { icon: 'musical-notes', color: '#14B8A6', gradient: ['#14B8A6', '#0D9488'] },
    zip: { icon: 'archive', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] },
    rar: { icon: 'archive', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] },
    txt: { icon: 'document-text', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] },
    default: { icon: 'document-outline', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] },
};

function getFileConfig(item: TeamFile) {
    if (item.is_folder) return FILE_CONFIG.folder;
    return FILE_CONFIG[item.file_type?.toLowerCase()] || FILE_CONFIG.default;
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

    if (fileDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }
    if (fileDate.getTime() === yesterday.getTime()) return 'Ontem';
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isImageFile(fileType: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileType?.toLowerCase());
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamFilesScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();

    const { user } = useAuthContext();
    const { showAlert } = useAlert();

    const [files, setFiles] = useState<TeamFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Ficheiros' }]);

    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

    // ============================================
    // LOAD DATA
    // ============================================

    const loadFiles = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            let query = supabase.from('team_files').select('*').eq('team_id', teamId);

            if (searchQuery.trim()) {
                if (currentFolderId) {
                    query = query.eq('parent_id', currentFolderId);
                }
            } else {
                if (currentFolderId) {
                    query = query.eq('parent_id', currentFolderId);
                } else {
                    query = query.is('parent_id', null);
                }
            }

            const { data: filesData, error } = await query;
            if (error) throw error;

            const sorted = (filesData || []).sort((a, b) => {
                if (a.is_folder && !b.is_folder) return -1;
                if (!a.is_folder && b.is_folder) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setFiles(sorted);

            if (!userRole) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('team_id', teamId)
                    .eq('user_id', user.id)
                    .single();
                if (memberData) setUserRole(memberData.role as TeamRole);
            }

            if (!teamName) {
                const { data: teamData } = await supabase.from('teams').select('name').eq('id', teamId).single();
                if (teamData) setTeamName(teamData.name);
            }
        } catch (err) {
            console.error('Error loading files:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id, currentFolderId, userRole, teamName, searchQuery]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) loadFiles();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadFiles();
    };

    // ============================================
    // NAVIGATION
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
    // CREATE FOLDER
    // ============================================

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            showAlert({ title: 'Erro', message: 'Introduz um nome para a pasta.' });
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

            console.error('Error creating folder:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível criar a pasta.' });
        } finally {
            setCreatingFolder(false);
        }
    };

    // ============================================
    // UPLOAD
    // ============================================

    const handleUpload = async () => {
        if (!canUser(userRole, 'UPLOAD_FILES')) {
            showAlert({ title: 'Sem Permissão', message: 'Não tens permissão para fazer upload.' });
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setUploading(true);

            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'file';
            const uniqueName = `${teamId}/${Date.now()}_${file.name}`;
            const base64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
            const arrayBuffer = decode(base64Data);

            const { error: uploadError } = await supabase.storage
                .from('team-files')
                .upload(uniqueName, arrayBuffer, { contentType: file.mimeType || 'application/octet-stream' });

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from('team_files').insert({
                team_id: teamId,
                uploader_id: user!.id,
                name: file.name,
                file_path: uniqueName,
                file_type: fileExtension,
                size_bytes: file.size || 0,
                is_folder: false,
                parent_id: currentFolderId,
            });

            if (dbError) throw dbError;
            showAlert({ title: '✅ Sucesso', message: 'Ficheiro carregado!' });
            loadFiles();
        } catch (err) {
            console.error('Error uploading:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível carregar o ficheiro.' });
        } finally {
            setUploading(false);
        }
    };

    // ============================================
    // OPEN FILE
    // ============================================

    const handleOpenFile = async (file: TeamFile) => {
        if (file.is_folder) {
            openFolder(file);
            return;
        }

        try {
            setDownloadingId(file.id);
            const localUri = `${(FileSystem as any).cacheDirectory}${file.name}`;
            const fileInfo = await FileSystem.getInfoAsync(localUri);

            if (!fileInfo.exists) {
                const { data: urlData } = await supabase.storage.from('team-files').createSignedUrl(file.file_path, 3600);
                if (!urlData?.signedUrl) throw new Error('URL não obtido');
                const downloadResult = await FileSystem.downloadAsync(urlData.signedUrl, localUri);
                if (downloadResult.status !== 200) throw new Error('Download falhou');
            }

            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(localUri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1 });
            } else {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) await Sharing.shareAsync(localUri);
            }
        } catch (err) {

            console.error('Error opening file:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível abrir o ficheiro.' });
        } finally {
            setDownloadingId(null);
        }
    };

    // ============================================
    // DELETE
    // ============================================

    const handleDelete = (file: TeamFile) => {
        const canDeleteAny = canUser(userRole, 'DELETE_FILES');
        const isOwnFile = file.uploader_id === user?.id;

        if (!canDeleteAny && !isOwnFile) {
            showAlert({ title: 'Sem Permissão', message: 'Não podes apagar este item.' });
            return;
        }

        showAlert({
            title: `Apagar ${file.is_folder ? 'Pasta' : 'Ficheiro'}`,
            message: `Tens a certeza que queres apagar "${file.name}"?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!file.is_folder && file.file_path) {
                                await supabase.storage.from('team-files').remove([file.file_path]);
                            }
                            const { error } = await supabase.from('team_files').delete().eq('id', file.id);
                            if (error) throw error;
                            setFiles((prev) => prev.filter((f) => f.id !== file.id));
                        } catch (err) {
                            console.error('Error deleting:', err);
                            showAlert({ title: 'Erro', message: 'Não foi possível apagar.' });
                        }
                    },
                },
            ]
        });
    };

    // ============================================
    // IMAGE URLS
    // ============================================

    const getImageUrl = useCallback(async (file: TeamFile) => {
        if (imageUrls[file.id]) return imageUrls[file.id];
        try {
            const { data } = await supabase.storage.from('team-files').createSignedUrl(file.file_path, 3600);
            if (data?.signedUrl) {
                setImageUrls((prev) => ({ ...prev, [file.id]: data.signedUrl }));
                return data.signedUrl;
            }
        } catch (err) {
            console.warn('Error getting image URL:', err);
        }
        return null;
    }, [imageUrls]);

    useEffect(() => {
        files.filter((f) => isImageFile(f.file_type) && !f.is_folder).forEach((file) => {
            if (!imageUrls[file.id]) getImageUrl(file);
        });
    }, [files, getImageUrl, imageUrls]);

    // ============================================
    // FILTER
    // ============================================

    const filteredFiles = searchQuery.trim()
        ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : files;

    const folders = filteredFiles.filter((f) => f.is_folder);
    const regularFiles = filteredFiles.filter((f) => !f.is_folder);

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar ficheiros...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>📁 Ficheiros</Text>
                        <Text style={styles.headerSubtitle}>{teamName}</Text>
                    </View>
                    <Pressable style={styles.headerAction} onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                        <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={20} color={COLORS.text.secondary} />
                    </Pressable>
                </View>

                {/* Search & Actions */}
                <View style={styles.actionsRow}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Procurar ficheiros..."
                            placeholderTextColor={COLORS.text.tertiary}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Breadcrumbs */}
                {breadcrumbs.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbsContainer} contentContainerStyle={styles.breadcrumbsContent}>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.id || 'root'}>
                                <Pressable onPress={() => navigateToBreadcrumb(index)}>
                                    <Text style={[styles.breadcrumbText, index === breadcrumbs.length - 1 && styles.breadcrumbActive]}>
                                        {crumb.name}
                                    </Text>
                                </Pressable>
                                {index < breadcrumbs.length - 1 && (
                                    <Ionicons name="chevron-forward" size={14} color={COLORS.text.tertiary} style={{ marginHorizontal: 4 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                )}

                {/* Content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />}
                >
                    {/* Quick Actions */}
                    {canUser(userRole, 'UPLOAD_FILES') && (
                        <View style={styles.quickActions}>
                            <Pressable style={styles.quickActionBtn} onPress={handleUpload} disabled={uploading}>
                                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.quickActionGradient}>
                                    {uploading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="cloud-upload" size={22} color="#FFF" />}
                                </LinearGradient>
                                <Text style={styles.quickActionLabel}>Upload</Text>
                            </Pressable>
                            <Pressable style={styles.quickActionBtn} onPress={() => setFolderModalVisible(true)}>
                                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.quickActionGradient}>
                                    <Ionicons name="folder-open" size={22} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.quickActionLabel}>Nova Pasta</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Pastas ({folders.length})</Text>
                            <View style={viewMode === 'grid' ? styles.gridContainer : undefined}>
                                {folders.map((folder) => (
                                    <FileCard
                                        key={folder.id}
                                        file={folder}
                                        viewMode={viewMode}
                                        onPress={() => openFolder(folder)}
                                        onDelete={() => handleDelete(folder)}
                                        imageUrl={null}
                                        isDownloading={false}
                                        canModify={canUser(userRole, 'DELETE_FILES') || folder.uploader_id === user?.id}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Files Section */}
                    {regularFiles.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Ficheiros ({regularFiles.length})</Text>
                            <View style={viewMode === 'grid' ? styles.gridContainer : undefined}>
                                {regularFiles.map((file) => (
                                    <FileCard
                                        key={file.id}
                                        file={file}
                                        viewMode={viewMode}
                                        onPress={() => handleOpenFile(file)}
                                        onDelete={() => handleDelete(file)}
                                        imageUrl={imageUrls[file.id]}
                                        isDownloading={downloadingId === file.id}
                                        canModify={canUser(userRole, 'DELETE_FILES') || file.uploader_id === user?.id}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Empty State */}
                    {filteredFiles.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons name="folder-open-outline" size={48} color={COLORS.text.tertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Sem ficheiros</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery ? 'Nenhum resultado encontrado' : 'Faz upload para começar'}
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* New Folder Modal */}
                <Modal visible={folderModalVisible} animationType="slide" transparent onRequestClose={() => setFolderModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setFolderModalVisible(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Nova Pasta</Text>

                            <TextInput
                                style={styles.modalInput}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                placeholder="Nome da pasta"
                                placeholderTextColor={COLORS.text.tertiary}
                                autoFocus
                            />

                            <View style={styles.modalButtons}>
                                <Pressable style={styles.modalBtnCancel} onPress={() => setFolderModalVisible(false)}>
                                    <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                                </Pressable>
                                <Pressable style={styles.modalBtnConfirm} onPress={handleCreateFolder} disabled={creatingFolder}>
                                    {creatingFolder ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <Text style={styles.modalBtnConfirmText}>Criar</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// FILE CARD COMPONENT
// ============================================

function FileCard({
    file,
    viewMode,
    onPress,
    onDelete,
    imageUrl,
    isDownloading,
    canModify,
}: {
    file: TeamFile;
    viewMode: 'list' | 'grid';
    onPress: () => void;
    onDelete: () => void;
    imageUrl: string | null;
    isDownloading: boolean;
    canModify: boolean;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const config = getFileConfig(file);
    const isImage = isImageFile(file.file_type) && !file.is_folder && imageUrl;
    const { showAlert } = useAlert();

    const showMenu = () => {
        if (!canModify) return;
        showAlert({
            title: file.name,
            message: file.is_folder ? 'Pasta' : formatFileSize(file.size_bytes),
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: onDelete },
            ]
        });
    };

    if (viewMode === 'grid') {
        return (
            <Pressable
                onPress={onPress}
                onLongPress={showMenu}
                onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
                style={styles.gridCardWrapper}
            >
                <Animated.View style={[styles.gridCard, { transform: [{ scale }] }]}>
                    {isImage ? (
                        <Image source={{ uri: imageUrl }} style={styles.gridThumbnail} resizeMode="cover" />
                    ) : (
                        <LinearGradient colors={config.gradient} style={styles.gridIconBg}>
                            {isDownloading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Ionicons name={config.icon} size={28} color="#FFF" />
                            )}
                        </LinearGradient>
                    )}
                    <Text style={styles.gridFileName} numberOfLines={2}>{file.name}</Text>
                </Animated.View>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            onLongPress={showMenu}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.listCard, { transform: [{ scale }] }]}>
                {isImage ? (
                    <Image source={{ uri: imageUrl }} style={styles.listThumbnail} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={config.gradient} style={styles.listIconBg}>
                        {isDownloading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Ionicons name={config.icon} size={22} color="#FFF" />
                        )}
                    </LinearGradient>
                )}

                <View style={styles.listInfo}>
                    <Text style={styles.listFileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.listFileMeta}>
                        {file.is_folder ? 'Pasta' : `${formatDate(file.created_at)} • ${formatFileSize(file.size_bytes)}`}
                    </Text>
                </View>

                <Ionicons
                    name={file.is_folder ? 'chevron-forward' : 'ellipsis-horizontal'}
                    size={18}
                    color={COLORS.text.tertiary}
                />
            </Animated.View>
        </Pressable>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingHorizontal: SPACING.lg,
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
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Actions Row
    actionsRow: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },

    // Breadcrumbs
    breadcrumbsContainer: {
        maxHeight: 40,
        marginBottom: SPACING.sm,
    },
    breadcrumbsContent: {
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    breadcrumbText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    breadcrumbActive: {
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    quickActionBtn: {
        alignItems: 'center',
        gap: SPACING.xs,
    },
    quickActionGradient: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.secondary,
    },

    // Section Title
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.md,
        marginTop: SPACING.lg,
    },

    // Grid
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    gridCardWrapper: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3,
    },
    gridCard: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    gridIconBg: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    gridThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginBottom: SPACING.sm,
    },
    gridFileName: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        textAlign: 'center',
    },

    // List
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    listIconBg: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 12,
    },
    listInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    listFileName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    listFileMeta: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },

    // Modal
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        padding: SPACING.xl,
        paddingBottom: 50,
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: SPACING.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    modalBtnCancel: {
        flex: 1,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.xl,
    },
    modalBtnCancelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    modalBtnConfirm: {
        flex: 1,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        backgroundColor: '#6366F1',
        borderRadius: RADIUS.xl,
    },
    modalBtnConfirmText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});

/**
 * 🔄 Update Checker Component
 * Checks for new app versions on startup and shows a modal if update is available.
 * Only works on web/desktop platforms.
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

// Storage key for "remind later" feature
const REMIND_LATER_KEY = 'update_remind_later_version';

// Version manifest URL (hosted on Vercel)
const VERSION_URL = 'https://escolauni.vercel.app/version.json';

interface VersionInfo {
    version: string;
    downloadUrl: string;
    releaseDate?: string;
    changelog?: string;
}

/**
 * Compare two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

/**
 * Get current app version from expo-constants or package.json
 */
function getCurrentVersion(): string {
    // Try to get from expo-constants first
    const expoVersion = Constants.expoConfig?.version;
    if (expoVersion) return expoVersion;

    // Fallback to hardcoded version (update this when releasing)
    return '1.0.0';
}

export function UpdateChecker() {
    const [showModal, setShowModal] = useState(false);
    const [remoteVersion, setRemoteVersion] = useState<VersionInfo | null>(null);
    const [checking, setChecking] = useState(false);

    // Only run on web/desktop
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        setChecking(true);

        try {
            const currentVersion = getCurrentVersion();

            // Check if user clicked "remind later" for this version
            const remindLaterVersion = await AsyncStorage.getItem(REMIND_LATER_KEY);

            // Fetch remote version
            const response = await fetch(VERSION_URL, {
                cache: 'no-store', // Bypass cache
                headers: { 'Cache-Control': 'no-cache' },
            });

            if (!response.ok) {
                console.log('[UpdateChecker] Failed to fetch version.json');
                return;
            }

            const versionInfo: VersionInfo = await response.json();

            // Compare versions
            if (compareVersions(versionInfo.version, currentVersion) > 0) {
                // Check if user dismissed this version
                if (remindLaterVersion === versionInfo.version) {
                    console.log('[UpdateChecker] User dismissed this version earlier');
                    return;
                }

                console.log(`[UpdateChecker] New version available: ${versionInfo.version} (current: ${currentVersion})`);
                setRemoteVersion(versionInfo);
                setShowModal(true);
            } else {
                console.log(`[UpdateChecker] App is up to date (v${currentVersion})`);
            }
        } catch (error) {
            console.error('[UpdateChecker] Error checking for updates:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleDownload = () => {
        if (remoteVersion?.downloadUrl) {
            Linking.openURL(remoteVersion.downloadUrl);
        }
        setShowModal(false);
    };

    const handleRemindLater = async () => {
        if (remoteVersion?.version) {
            await AsyncStorage.setItem(REMIND_LATER_KEY, remoteVersion.version);
        }
        setShowModal(false);
    };

    const handleClose = () => {
        setShowModal(false);
    };

    // Don't render anything on native
    if (Platform.OS !== 'web') return null;

    const currentVersion = getCurrentVersion();

    return (
        <Modal
            visible={showModal}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header with gradient */}
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="rocket" size={32} color="#FFF" />
                        </View>
                        <Text style={styles.title}>Nova Versão Disponível! 🚀</Text>
                        <Text style={styles.subtitle}>
                            v{remoteVersion?.version} está disponível
                        </Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.content}>
                        <View style={styles.versionRow}>
                            <View style={styles.versionItem}>
                                <Text style={styles.versionLabel}>Versão Atual</Text>
                                <Text style={styles.versionValue}>{currentVersion}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.text.tertiary} />
                            <View style={styles.versionItem}>
                                <Text style={styles.versionLabel}>Nova Versão</Text>
                                <Text style={[styles.versionValue, styles.versionNew]}>
                                    {remoteVersion?.version}
                                </Text>
                            </View>
                        </View>

                        {remoteVersion?.changelog && (
                            <View style={styles.changelogSection}>
                                <Text style={styles.changelogTitle}>Novidades:</Text>
                                <Text style={styles.changelogText}>{remoteVersion.changelog}</Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <Pressable
                                style={styles.downloadBtn}
                                onPress={handleDownload}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.downloadBtnGradient}
                                >
                                    <Ionicons name="download" size={20} color="#FFF" />
                                    <Text style={styles.downloadBtnText}>Baixar Agora</Text>
                                </LinearGradient>
                            </Pressable>

                            <Pressable
                                style={styles.remindBtn}
                                onPress={handleRemindLater}
                            >
                                <Text style={styles.remindBtnText}>Lembrar Mais Tarde</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Close button */}
                    <Pressable style={styles.closeBtn} onPress={handleClose}>
                        <Ionicons name="close" size={24} color={COLORS.text.tertiary} />
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modal: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS['2xl'],
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        ...SHADOWS.xl,
    },
    header: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: SPACING.xs,
    },
    content: {
        padding: SPACING.lg,
    },
    versionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    versionItem: {
        alignItems: 'center',
    },
    versionLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
    versionValue: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.secondary,
    },
    versionNew: {
        color: '#10B981',
    },
    changelogSection: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    changelogTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    changelogText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    actions: {
        gap: SPACING.sm,
    },
    downloadBtn: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
    },
    downloadBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    downloadBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    remindBtn: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    remindBtnText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    closeBtn: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

/**
 * 📥 Download Page
 * Landing page for Windows desktop app download
 * Route: /download
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

// ⚠️ ATUALIZA ESTE LINK QUANDO TIVERES O FICHEIRO NO GOOGLE DRIVE
const DOWNLOAD_LINK = "https://SEU_LINK_DO_DRIVE_AQUI";

// Versão atual da app desktop
const APP_VERSION = "1.0.0";

const { width } = Dimensions.get('window');

export default function DownloadPage() {
    const handleDownload = () => {
        Linking.openURL(DOWNLOAD_LINK);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Background gradient overlay */}
            <LinearGradient
                colors={['#0A0A0F', '#12121A', '#0A0A0F']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {/* Animated icon background */}
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6', '#A855F7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Ionicons name="desktop-outline" size={64} color="#FFF" />
                        </LinearGradient>
                        {/* Glow effect */}
                        <View style={styles.iconGlow} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>
                        Baixar Escola+ para Windows 🚀
                    </Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>
                        A melhor experiência escolar, agora no teu PC.
                    </Text>

                    {/* Features */}
                    <View style={styles.featuresContainer}>
                        <FeatureItem
                            icon="flash"
                            text="Performance otimizada"
                        />
                        <FeatureItem
                            icon="notifications"
                            text="Notificações nativas"
                        />
                        <FeatureItem
                            icon="cloud-offline"
                            text="Modo offline"
                        />
                    </View>
                </View>

                {/* Download Section */}
                <View style={styles.downloadSection}>
                    {/* Download Button */}
                    <Pressable
                        onPress={handleDownload}
                        style={({ pressed }) => [
                            styles.downloadButton,
                            pressed && styles.downloadButtonPressed,
                        ]}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.downloadButtonGradient}
                        >
                            <Ionicons name="download" size={24} color="#FFF" />
                            <Text style={styles.downloadButtonText}>
                                Download Setup (.exe)
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    {/* Size info */}
                    <Text style={styles.sizeText}>
                        ~80 MB • Instalação rápida
                    </Text>
                </View>

                {/* Requirements Section */}
                <View style={styles.requirementsSection}>
                    <Text style={styles.sectionTitle}>Requisitos do Sistema</Text>

                    <View style={styles.requirementsList}>
                        <RequirementItem
                            icon="checkmark-circle"
                            text="Windows 10 ou 11"
                        />
                        <RequirementItem
                            icon="checkmark-circle"
                            text="4 GB RAM mínimo"
                        />
                        <RequirementItem
                            icon="checkmark-circle"
                            text="100 MB de espaço livre"
                        />
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Versão {APP_VERSION} • Compatível com Windows 10/11
                    </Text>
                    <Text style={styles.footerCopyright}>
                        © 2026 Escola+ • Todos os direitos reservados
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

// Feature Item Component
function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
                <Ionicons name={icon} size={20} color="#6366F1" />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

// Requirement Item Component
function RequirementItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.requirementItem}>
            <Ionicons name={icon} size={18} color="#10B981" />
            <Text style={styles.requirementText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: Platform.OS === 'web' ? 80 : 60,
        paddingBottom: SPACING.xl,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl * 2,
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: SPACING.xl,
    },
    iconGradient: {
        width: 120,
        height: 120,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.xl,
    },
    iconGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 40,
        backgroundColor: '#6366F1',
        opacity: 0.2,
        zIndex: -1,
    },
    title: {
        fontSize: Platform.OS === 'web' ? 36 : 28,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: SPACING.md,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    featuresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.full,
        gap: SPACING.xs,
    },
    featureIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.primary,
        fontWeight: '500',
    },
    downloadSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl * 2,
        width: '100%',
        maxWidth: 400,
    },
    downloadButton: {
        width: '100%',
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    downloadButtonPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    downloadButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
    },
    downloadButtonText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    sizeText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.md,
    },
    requirementsSection: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },
    requirementsList: {
        gap: SPACING.sm,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    requirementText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    footer: {
        alignItems: 'center',
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        width: '100%',
        maxWidth: 400,
    },
    footerText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
    footerCopyright: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.muted,
    },
});

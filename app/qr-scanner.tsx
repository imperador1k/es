import { useFriends } from '@/hooks/useFriends';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QRScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const { sendFriendRequest } = useFriends();
    const { user } = useAuthContext();
    const [scanned, setScanned] = useState(false);
    const [showMyQR, setShowMyQR] = useState(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        // Formato esperado: escola+://user/{userId}
        const match = data.match(/escola\+:\/\/user\/(.+)/);

        if (match && match[1]) {
            const userId = match[1];

            if (userId === user?.id) {
                Alert.alert('Oops!', 'Não podes adicionar a ti próprio 😅');
                setScanned(false);
                return;
            }

            const success = await sendFriendRequest(userId);

            if (success) {
                Alert.alert(
                    '🎉 Pedido Enviado!',
                    'O teu pedido de amizade foi enviado.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Aviso', 'Já existe um pedido ou amizade com este utilizador.');
                setScanned(false);
            }
        } else {
            Alert.alert('QR Inválido', 'Este QR code não é válido.');
            setScanned(false);
        }
    };

    if (!permission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>A verificar permissões...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-outline" size={48} color={colors.accent.primary} />
                    </View>
                    <Text style={styles.permissionTitle}>Acesso à Câmara</Text>
                    <Text style={styles.permissionText}>
                        Precisamos de acesso à câmara para scanear QR codes de amigos.
                    </Text>
                    <Pressable style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.inverse} />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {showMyQR ? 'O Meu QR' : 'Scanear QR'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {showMyQR ? (
                // Mostrar o meu QR Code
                <View style={styles.myQRContainer}>
                    <View style={styles.qrCard}>
                        <View style={styles.qrPlaceholder}>
                            <Ionicons name="qr-code" size={120} color={colors.text.primary} />
                        </View>
                        <Text style={styles.qrHint}>
                            escola+://user/{user?.id}
                        </Text>
                        <Text style={styles.qrInstruction}>
                            Mostra este código a um amigo para ele te adicionar
                        </Text>
                    </View>
                    <Pressable style={styles.switchButton} onPress={() => setShowMyQR(false)}>
                        <Ionicons name="scan" size={20} color={colors.text.inverse} />
                        <Text style={styles.switchButtonText}>Scanear Código</Text>
                    </Pressable>
                </View>
            ) : (
                // Scanner de QR Code
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    />

                    {/* Overlay com área de scan */}
                    <View style={styles.overlay}>
                        <View style={styles.overlayTop} />
                        <View style={styles.overlayMiddle}>
                            <View style={styles.overlaySide} />
                            <View style={styles.scanArea}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>
                            <View style={styles.overlaySide} />
                        </View>
                        <View style={styles.overlayBottom}>
                            <Text style={styles.scanHint}>
                                Aponta para o QR Code de um amigo
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomActions}>
                        <Pressable style={styles.switchButton} onPress={() => setShowMyQR(true)}>
                            <Ionicons name="qr-code" size={20} color={colors.text.inverse} />
                            <Text style={styles.switchButtonText}>O Meu QR</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Permission
    permissionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    permissionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
        marginBottom: spacing.sm,
    },
    permissionText: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    permissionButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    permissionButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Scanner
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddle: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanArea: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: colors.accent.primary,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 8,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 8,
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: spacing.xl,
    },
    scanHint: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
    },

    // My QR
    myQRContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    qrCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        width: '100%',
    },
    qrPlaceholder: {
        width: 200,
        height: 200,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    qrHint: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        fontFamily: 'monospace',
        marginBottom: spacing.sm,
    },
    qrInstruction: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Bottom Actions
    bottomActions: {
        position: 'absolute',
        bottom: spacing['3xl'],
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    switchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    switchButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
